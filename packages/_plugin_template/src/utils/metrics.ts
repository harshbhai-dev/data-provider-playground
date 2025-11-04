// Metrics collection for monitoring
export interface Metrics {
  apiCalls: {
    total: number;
    success: number;
    failures: number;
    timeouts: number;
    rateLimited: number;
  };
  latency: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  lastUpdated: number;
}

export class MetricsCollector {
  private metrics: Metrics = {
    apiCalls: {
      total: 0,
      success: 0,
      failures: 0,
      timeouts: 0,
      rateLimited: 0,
    },
    latency: {
      min: Infinity,
      max: 0,
      avg: 0,
      p95: 0,
      p99: 0,
    },
    cache: {
      hits: 0,
      misses: 0,
      hitRate: 0,
    },
    lastUpdated: Date.now(),
  };

  private latencyHistory: number[] = [];

  recordApiCall(success: boolean, latency: number, errorType?: "timeout" | "rateLimited"): void {
    this.metrics.apiCalls.total++;
    
    if (success) {
      this.metrics.apiCalls.success++;
    } else {
      this.metrics.apiCalls.failures++;
      if (errorType === "timeout") {
        this.metrics.apiCalls.timeouts++;
      } else if (errorType === "rateLimited") {
        this.metrics.apiCalls.rateLimited++;
      }
    }

    // Track latency
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 1000) {
      this.latencyHistory.shift(); // Keep last 1000 measurements
    }

    this.updateLatencyMetrics();
    this.metrics.lastUpdated = Date.now();
  }

  recordCacheHit(hit: boolean): void {
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? this.metrics.cache.hits / total : 0;
  }

  private updateLatencyMetrics(): void {
    if (this.latencyHistory.length === 0) return;

    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    
    this.metrics.latency.min = sorted[0];
    this.metrics.latency.max = sorted[sorted.length - 1];
    this.metrics.latency.avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    this.metrics.latency.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    this.metrics.latency.p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      apiCalls: {
        total: 0,
        success: 0,
        failures: 0,
        timeouts: 0,
        rateLimited: 0,
      },
      latency: {
        min: Infinity,
        max: 0,
        avg: 0,
        p95: 0,
        p99: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      lastUpdated: Date.now(),
    };
    this.latencyHistory = [];
  }
}

