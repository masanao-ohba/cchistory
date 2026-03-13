/**
 * Singleton Worker Pool for markdown processing.
 * Replaces per-MessageItem Worker instances with a fixed pool of workers.
 * Expected memory savings: ~200-500MB → ~8-20MB
 */

import { WORKER_ERROR } from '../utils/workerErrors';
import { WORKER_POOL_MAX_SIZE } from '../constants/ui';

type ProcessCallback = (html: string) => void;

interface PendingRequest {
  resolve: ProcessCallback;
  reject: (error: Error) => void;
  workerIndex: number;
}

class MarkdownWorkerPool {
  private workers: Worker[] = [];
  private pending = new Map<string, PendingRequest>();
  private nextWorkerIndex = 0;
  private initialized = false;

  private init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    for (let i = 0; i < WORKER_POOL_MAX_SIZE; i++) {
      const worker = new Worker(
        new URL('@/lib/workers/markdown.worker', import.meta.url)
      );

      worker.onmessage = (e: MessageEvent<{ id: string; html: string }>) => {
        const { id, html } = e.data;
        const request = this.pending.get(id);
        if (request) {
          this.pending.delete(id);
          request.resolve(html);
        }
      };

      worker.onerror = (event) => {
        const workerIdx = i;
        console.error(`Worker ${workerIdx} error:`, event);
        const error = new Error(`Worker ${workerIdx} error: ${event.message}`);
        for (const [id, req] of this.pending) {
          if (req.workerIndex === workerIdx) {
            this.pending.delete(id);
            req.reject(error);
          }
        }
      };

      this.workers.push(worker);
    }
  }

  /**
   * Process markdown content through the worker pool.
   * @param id - Unique identifier for the request (message UUID)
   * @param content - Raw markdown content
   * @param searchKeyword - Optional search keyword for highlighting
   * @returns Promise resolving to rendered HTML string
   */
  process(id: string, content: string, searchKeyword: string | null): Promise<string> {
    // Cancel any existing pending request with the same id
    const existing = this.pending.get(id);
    if (existing) {
      this.pending.delete(id);
      existing.reject(new Error(WORKER_ERROR.SUPERSEDED));
    }

    return new Promise<string>((resolve, reject) => {
      // init() inside the Promise so synchronous throws become rejections
      try {
        this.init();
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }

      if (this.workers.length === 0) {
        reject(new Error('Worker pool cannot be initialized (server-side context)'));
        return;
      }

      const workerIndex = this.nextWorkerIndex % this.workers.length;
      this.pending.set(id, { resolve, reject, workerIndex });

      // Round-robin distribution
      const worker = this.workers[workerIndex];
      this.nextWorkerIndex = (workerIndex + 1) % this.workers.length;

      worker.postMessage({ id, content, searchKeyword });
    });
  }

  /**
   * Cancel a pending request (e.g., when component unmounts or content goes off-screen).
   */
  cancel(id: string) {
    const req = this.pending.get(id);
    if (req) {
      this.pending.delete(id);
      req.reject(new Error(WORKER_ERROR.CANCELLED));
    }
  }

}

// Singleton instance
export const markdownWorkerPool = new MarkdownWorkerPool();
