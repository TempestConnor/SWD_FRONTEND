import type { components } from '../../api/schema'

export type JoinQueueRequest = components['schemas']['JoinQueueDTO']
export type QueueRequest = components['schemas']['QueueRequestDTO']

export async function joinQueue(_body: JoinQueueRequest): Promise<QueueRequest> {
  throw new Error('not implemented')
}

export async function heartbeatQueue(): Promise<QueueRequest> {
  throw new Error('not implemented')
}

export async function cancelQueue(): Promise<QueueRequest> {
  throw new Error('not implemented')
}
