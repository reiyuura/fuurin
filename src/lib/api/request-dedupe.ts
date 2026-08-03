/**
 * request-dedupe — coalesces identical in-flight GET requests.
 * Key = method + normalized URL + serialized query. Body excluded.
 */

export class RequestDedupe {
  private readonly inflight = new Map<string, Promise<unknown>>()

  match<T>(key: string): { promise: Promise<T>; own: false } | null {
    const promise = this.inflight.get(key)
    return promise ? { promise: promise as Promise<T>, own: false } : null
  }

  /**
   * Run producer once for a key. Every concurrent caller receives the
   * same promise; entry is removed after settlement to avoid stale data.
   */
  run<T>(key: string, producer: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key)
    if (existing) return existing as Promise<T>
    const promise = producer().finally(() => this.inflight.delete(key))
    this.inflight.set(key, promise)
    return promise
  }

  static key(method: string, url: string, query: URLSearchParams): string {
    const queryStr = [...query.entries()]
      .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return `${method.toUpperCase()} ${url}${queryStr ? `?${queryStr}` : ''}`
  }
}
