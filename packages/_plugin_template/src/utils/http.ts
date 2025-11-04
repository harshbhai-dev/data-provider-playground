export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private requestCount = 0;
  private windowStart = Date.now();
  private lastRateLimitInfo?: RateLimitInfo;

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.process();
    });
  }

  updateRateLimitInfo(info: RateLimitInfo): void {
    this.lastRateLimitInfo = info;
    // Adjust our rate limiter based on server limits
    if (info.remaining < this.maxRequests / 2) {
      // Slow down if we're approaching limit
      this.windowStart = Date.now() - (this.windowMs / 2);
    }
  }

  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.lastRateLimitInfo;
  }

  private process() {
    if (this.processing && this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    
    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Process queue if under limit
    if (this.requestCount < this.maxRequests && this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      this.requestCount++;
      resolve();
    }

    // Schedule next check
    if (this.queue.length > 0) {
      this.processing = true;
      const delay = Math.max(10, this.windowMs / this.maxRequests);
      setTimeout(() => this.process(), delay);
    } else {
      this.processing = false;
    }
  }
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get("X-RateLimit-Limit");
  const remaining = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");

  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10) * 1000, // Convert to milliseconds
    };
  }

  return null;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
  rateLimiter?: RateLimiter
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse rate limit headers
      if (rateLimiter) {
        const rateLimitInfo = parseRateLimitHeaders(response.headers);
        if (rateLimitInfo) {
          rateLimiter.updateRateLimitInfo(rateLimitInfo);
        }
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
        throw new Error(`Rate limited: retry after ${retryAfter}s`);
      }

      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retryConfig.maxRetries) {
        const isRateLimit = error instanceof Error && error.message.includes("Rate limited");
        const delay = isRateLimit
          ? parseInt(error.message.match(/\d+/)?.[0] || "60") * 1000
          : Math.min(
              retryConfig.baseDelayMs * Math.pow(2, attempt),
              retryConfig.maxDelayMs
            );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Request failed");
}
