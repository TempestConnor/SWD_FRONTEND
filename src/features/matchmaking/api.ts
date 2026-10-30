import { api } from '../../api/client'
import { unwrap } from '../../api/errors'
import type { components } from '../../api/schema'

export type JoinQueueRequest = components['schemas']['JoinQueueDTO']
export type QueueRequest = components['schemas']['QueueRequestDTO']

/** Idempotent on the backend: an open request is refreshed and returned instead of a second one (BR-RATE-015). */
export async function joinQueue(body: JoinQueueRequest): Promise<QueueRequest> {
  return unwrap(await api.POST('/api/matchmaking/join', { body }))
}

/**
 * Keeps an open request alive. Without one it returns the latest request unchanged, so it also tells a page
 * whether the player is still queued; 404 QUEUE_REQUEST_NOT_FOUND means the player never queued.
 */
export async function heartbeatQueue(): Promise<QueueRequest> {
  return unwrap(await api.POST('/api/matchmaking/heartbeat'))
}

/** Leaves at once (BR-RATE-018); a repeated cancel returns the latest request unchanged. */
export async function cancelQueue(): Promise<QueueRequest> {
  return unwrap(await api.POST('/api/matchmaking/cancel'))
}
