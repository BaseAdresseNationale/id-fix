import { logger } from './logger.js';

// Erreurs réseau indiquant que la socket a été fermée par l'autre partie.
// Cas typique : une socket keep-alive réutilisée alors que l'API BAN l'a déjà fermée
// (keepAliveTimeout côté serveur), ce qui arrive quand la boucle d'événements d'id-fix
// a été bloquée par un calcul synchrone long (ex. balToBan sur une grosse commune).
const RETRYABLE_SOCKET_ERROR_CODES = new Set([
  'EPIPE',
  'ECONNRESET',
  'UND_ERR_SOCKET',
  'UND_ERR_CLOSED',
]);

type ErrorWithCode = Error & { code?: string };

const getCause = (error: unknown): ErrorWithCode | undefined => {
  const cause = (error as { cause?: unknown })?.cause;
  return cause instanceof Error ? (cause as ErrorWithCode) : undefined;
};

export const isRetryableSocketError = (error: unknown): boolean => {
  const code = getCause(error)?.code;
  return Boolean(code && RETRYABLE_SOCKET_ERROR_CODES.has(code));
};

// `fetch` natif (undici) renvoie "fetch failed" et place la vraie raison dans `error.cause`
export const describeFetchError = (error: unknown): string => {
  const { message } = error as Error;
  const cause = getCause(error);
  if (!cause) {
    return message;
  }

  return `${message} (cause : ${cause.code ? `${cause.code} - ` : ''}${cause.message})`;
};

// Rend la main à la boucle d'événements pour qu'undici traite les fermetures de sockets
// en attente avant de choisir une connexion du pool.
const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

export type BanFetchOptions = {
  // false pour les requêtes non idempotentes (création) : un retry pourrait doublonner
  retry?: boolean;
};

export const banFetch = async (
  url: string,
  init?: RequestInit,
  { retry = true }: BanFetchOptions = {}
): Promise<Response> => {
  await yieldToEventLoop();
  try {
    return await fetch(url, init);
  } catch (error) {
    if (retry && isRetryableSocketError(error)) {
      logger.warn(`[ban-fetch] ${describeFetchError(error)} sur ${init?.method || 'GET'} ${url}, nouvel essai`);
      await yieldToEventLoop();
      try {
        return await fetch(url, init);
      } catch (retryError) {
        throw new Error(describeFetchError(retryError), { cause: retryError });
      }
    }

    throw new Error(describeFetchError(error), { cause: error });
  }
};
