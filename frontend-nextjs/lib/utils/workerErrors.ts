/** Canonical worker error message strings */
export const WORKER_ERROR = {
  SUPERSEDED: 'Request superseded',
  CANCELLED: 'Cancelled',
} as const;

/** Check whether an error represents a worker cancellation (superseded or cancelled) */
export function isWorkerCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message === WORKER_ERROR.SUPERSEDED || error.message === WORKER_ERROR.CANCELLED;
}
