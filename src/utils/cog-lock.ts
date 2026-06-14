import Redis from 'ioredis'
import { logger } from './logger.js'

let redisClient: Redis | null = null

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
    redisClient.on('error', err => {
      logger.warn(`[cog-lock] Erreur Redis: ${err.message}`)
    })
  }

  return redisClient
}

// TTL 1800s (30 min) : computeFromCog peut prendre > 10 min sur une grande commune
// Fallback : si Redis est indisponible, on autorise le traitement sans lock (risque de doublon faible vs arrêt total)
export const acquireCogLock = async (cog: string): Promise<boolean> => {
  try {
    const result = await getRedis().set(
      `idfix:lock:cog:${cog}`, '1', 'EX', 1800, 'NX'
    )
    return result === 'OK'
  } catch (err) {
    logger.warn(`[cog-lock] Redis indisponible pour COG ${cog}, traitement sans lock: ${(err as Error).message}`)
    return true
  }
}

export const releaseCogLock = async (cog: string): Promise<void> => {
  try {
    await getRedis().del(`idfix:lock:cog:${cog}`)
  } catch (err) {
    logger.warn(`[cog-lock] Impossible de libérer le lock COG ${cog}: ${(err as Error).message}`)
  }
}
