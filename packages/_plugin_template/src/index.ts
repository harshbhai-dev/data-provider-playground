import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { z } from "every-plugin/zod";

import { contract } from "./contract";
import { DataProviderService } from "./service";

/**
 * Wormhole Data Provider Plugin - Collects and normalizes market data from Wormhole cross-chain bridge.
 *
 * This plugin implements the data provider contract for Wormhole, providing:
 * - Volume metrics (24h, 7d, 30d)
 * - Rate quotes with fee calculations
 * - Liquidity depth at 50bps and 100bps thresholds
 * - List of supported assets across chains
 */
export default createPlugin({
  id: "@near-intents/wormhole-provider",

  variables: z.object({
    baseUrl: z.string().url().default("https://api.wormhole.com"),
    timeout: z.number().min(1000).max(60000).default(10000),
    maxRequestsPerSecond: z.number().min(1).max(100).default(10).optional(),
    retryMaxAttempts: z.number().min(1).max(10).default(3).optional(),
  }),

  secrets: z.object({
    apiKey: z.string().min(1, "API key is required for Wormhole API access"),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new DataProviderService(
        config.variables.baseUrl,
        config.secrets.apiKey,
        config.variables.timeout,
        config.variables.maxRequestsPerSecond,
        {
          maxRetries: config.variables.retryMaxAttempts || 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
        }
      );

      // Test connection during initialization
      yield* service.ping();

      return { service };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service } = context;

    return {
      getSnapshot: builder.getSnapshot.handler(async ({ input, errors }) => {
        try {
          const snapshot = await Effect.runPromise(service.getSnapshot(input));
          return snapshot;
        } catch (error) {
          if (error instanceof Error && error.message.includes("Rate limited")) {
            throw errors.RATE_LIMITED({
              message: "Wormhole API rate limit exceeded",
              data: { retryAfter: 60 },
            });
          }

          if (error instanceof Error && (error.message.includes("timeout") || error.message.includes("aborted"))) {
            throw errors.SERVICE_UNAVAILABLE({
              message: "Request timeout",
              data: { retryAfter: 30 },
            });
          }

          throw errors.SERVICE_UNAVAILABLE({
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),

      ping: builder.ping.handler(async () => {
        return await Effect.runPromise(service.ping());
      }),
    };
  },
});
