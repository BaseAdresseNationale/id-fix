import { spawn, type ChildProcess } from 'node:child_process';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { banFetch, describeFetchError, isRetryableSocketError } from './ban-fetch.js';

const socketError = (code: string) =>
  new TypeError('fetch failed', { cause: Object.assign(new Error(`write ${code}`), { code }) });

describe('describeFetchError', () => {
  test('ajoute le code et le message de la cause', () => {
    expect(describeFetchError(socketError('EPIPE'))).toBe('fetch failed (cause : EPIPE - write EPIPE)');
  });

  test('renvoie le message seul sans cause', () => {
    expect(describeFetchError(new Error('boom'))).toBe('boom');
  });
});

describe('isRetryableSocketError', () => {
  test.each(['EPIPE', 'ECONNRESET', 'UND_ERR_SOCKET', 'UND_ERR_CLOSED'])('%s est rejouable', (code) => {
    expect(isRetryableSocketError(socketError(code))).toBe(true);
  });

  test('une autre erreur ne l\'est pas', () => {
    expect(isRetryableSocketError(socketError('ENOTFOUND'))).toBe(false);
    expect(isRetryableSocketError(new Error('boom'))).toBe(false);
  });
});

describe('banFetch avec fetch simulé', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('rejoue une fois sur erreur socket', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(socketError('EPIPE'))
      .mockResolvedValueOnce(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await banFetch('http://ban.test/address/delta-report', { method: 'POST' });

    expect(await response.text()).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('ne rejoue pas si retry: false, et expose la cause', async () => {
    const fetchMock = vi.fn().mockRejectedValue(socketError('ECONNRESET'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(banFetch('http://ban.test/address', { method: 'POST' }, { retry: false }))
      .rejects.toThrow('fetch failed (cause : ECONNRESET - write ECONNRESET)');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('ne rejoue pas une erreur non socket', async () => {
    const fetchMock = vi.fn().mockRejectedValue(socketError('ENOTFOUND'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(banFetch('http://ban.test/address/delta-report')).rejects.toThrow('ENOTFOUND');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// Reproduit le scénario de production : la boucle d'événements est bloquée plus longtemps que
// le keepAliveTimeout du serveur, puis on envoie un gros POST sur une socket du pool déjà fermée.
describe('banFetch après blocage de la boucle d\'événements', () => {
  // Le serveur tourne dans un processus séparé : il doit pouvoir fermer ses sockets
  // pendant que la boucle d'événements du test est bloquée.
  let server: ChildProcess;
  let baseUrl: string;

  beforeAll(async () => {
    server = spawn(process.execPath, ['-e', `
      const server = require('node:http').createServer((req, res) => {
        req.resume();
        req.on('end', () => res.end('ok'));
      });
      // undici ne réutilise pas une socket dont le keep-alive annoncé est trop court :
      // il faut au moins ~3 s pour retomber dans le cas de l'API BAN (5 s)
      server.keepAliveTimeout = 3000;
      server.listen(0, '127.0.0.1', () => console.log(server.address().port));
    `]);
    const port = await new Promise<string>((resolve) => {
      server.stdout!.once('data', (data) => resolve(String(data).trim()));
    });
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    server.kill();
  });

  test('les POST suivants aboutissent', async () => {
    await Promise.all([
      banFetch(`${baseUrl}/district`).then((r) => r.text()),
      banFetch(`${baseUrl}/district-config`).then((r) => r.text()),
    ]);

    const start = Date.now();
    while (Date.now() - start < 4000) {
      // calcul synchrone qui bloque la boucle d'événements, comme balToBan
    }

    const body = 'x'.repeat(5 * 1024 * 1024);
    const responses = await Promise.all([
      banFetch(`${baseUrl}/address/delta-report`, { method: 'POST', body }),
      banFetch(`${baseUrl}/common-toponym/delta-report`, { method: 'POST', body: 'small' }),
    ]);

    expect(await Promise.all(responses.map((r) => r.text()))).toEqual(['ok', 'ok']);
  }, 15000);
});
