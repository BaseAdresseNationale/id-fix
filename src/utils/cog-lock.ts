import Redis from 'ioredis'
import { logger } from './logger.js'

let redisClient: Redis | null = null
let redisReadyLogged = false

function getRedis(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redisClient = new Redis(redisUrl)
    redisClient.on('ready', () => {
      if (!redisReadyLogged) {
        redisReadyLogged = true
        try {
          const { hostname, port } = new URL(redisUrl)
          logger.info(`[cog-lock] Connecté à Redis (${hostname}:${port})`)
        } catch {
          logger.info('[cog-lock] Connecté à Redis')
        }
      }
    })
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
    if (result === 'OK') {
      logger.info(`[cog-lock] Lock acquis pour COG ${cog}`)
      return true
    }
    logger.info(`[cog-lock] Lock déjà pris pour COG ${cog}`)
    return false
  } catch (err) {
    logger.warn(`[cog-lock] Redis indisponible pour COG ${cog}, traitement sans lock: ${(err as Error).message}`)
    return true
  }
}

export const releaseCogLock = async (cog: string): Promise<void> => {
  try {
    await getRedis().del(`idfix:lock:cog:${cog}`)
    logger.info(`[cog-lock] Lock libéré pour COG ${cog}`)
  } catch (err) {
    logger.warn(`[cog-lock] Impossible de libérer le lock COG ${cog}: ${(err as Error).message}`)
  }
}
