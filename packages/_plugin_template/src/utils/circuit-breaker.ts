// Circuit breaker pattern for API resilience
export enum CircuitState {
  CLOSED = "CLOSED",      // Normal operation
  OPEN = "OPEN",          // Failing, reject requests
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Open circuit after N failures
  successThreshold: number;       // Close circuit after N successes
  timeout: number;                // Time before trying half-open (ms)
  resetTimeout: number;           // Time before resetting failure count (ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastResetTime = Date.now();

  constructor(
    private readonly config: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      resetTimeout: 300000, // 5 minutes
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Reset failure count periodically
    if (Date.now() - this.lastResetTime > this.config.resetTimeout) {
      this.failureCount = 0;
      this.lastResetTime = Date.now();
    }

    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN - service unavailable");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

