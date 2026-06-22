import Redis from 'ioredis'
import { logger } from './logger.js'

let redisClient: Redis | null = null

function getRedis(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redisClient = new Redis(redisUrl)
    redisClient.on('error', err => {
      logger.warn(`[pipeline-lock] Erreur Redis: ${err.message}`)
    })
  }

  return redisClient
}

const LOCK_TTL_SECONDS = Number(process.env.API_PIPELINE_LOCK_TTL_SECONDS) || 3600

const lockKey = (districtID: string) => `ban:lock:pipeline:district:${districtID}`
const pendingKey = (districtID: string) => `ban:pipeline:district:${districtID}:pending`

export const acquirePipelineDistrictLock = async (districtID: string): Promise<boolean> => {
  try {
    const result = await getRedis().set(
      lockKey(districtID), '1', 'EX', LOCK_TTL_SECONDS, 'NX'
    )
    if (result === 'OK') {
      logger.info(`[pipeline-lock] Lock acquis pour district ${districtID}`)
      return true
    }
    logger.info(`[pipeline-lock] Lock déjà pris pour district ${districtID}`)
    return false
  } catch (err) {
    logger.warn(`[pipeline-lock] Redis indisponible pour district ${districtID}, traitement sans lock: ${(err as Error).message}`)
    return true
  }
}

export const releasePipelineDistrictLock = async (districtID: string): Promise<void> => {
  try {
    await getRedis().del(lockKey(districtID))
    await getRedis().del(pendingKey(districtID))
    logger.info(`[pipeline-lock] Lock libéré pour district ${districtID}`)
  } catch (err) {
    logger.warn(`[pipeline-lock] Impossible de libérer le lock district ${districtID}: ${(err as Error).message}`)
  }
}

export const setPipelinePendingCount = async (districtID: string, count: number): Promise<void> => {
  try {
    await getRedis().set(pendingKey(districtID), String(count), 'EX', LOCK_TTL_SECONDS)
    logger.info(`[pipeline-lock] Pending ${count} jobs api pour district ${districtID}`)
  } catch (err) {
    logger.warn(`[pipeline-lock] Impossible de définir pending pour district ${districtID}: ${(err as Error).message}`)
  }
}
