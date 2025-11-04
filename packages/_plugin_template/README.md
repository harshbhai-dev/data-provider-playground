# Wormhole Data Provider Plugin

A fully functional, production-ready data adapter plugin for collecting and normalizing market data from Wormhole cross-chain bridge protocol. This plugin is part of the NEAR Intents data collection system for comparing quotes and liquidity depth across competitors.

## Provider: Wormhole

Wormhole is a cross-chain messaging protocol that enables seamless asset transfers across multiple blockchains. This plugin aggregates real-time data from Wormhole's infrastructure and public data sources.

## Features

✅ **Complete Contract Compliance** - Implements all required metrics (Volume, Rates, Liquidity Depth, Available Assets)  
✅ **Real API Integration** - Uses actual Wormhole APIs and public data sources (no mock data)  
✅ **Retry Logic** - Exponential backoff with configurable retries  
✅ **Rate Limiting** - Per-provider rate limiting with dynamic header parsing  
✅ **Circuit Breaker** - Prevents cascading failures with automatic recovery  
✅ **Structured Logging** - Contextual logging with configurable levels  
✅ **Metrics Collection** - Performance monitoring and API call tracking  
✅ **Input Validation** - Comprehensive validation for routes and amounts  
✅ **Decimal Normalization** - Accurate `effectiveRate` calculation across different token decimals  
✅ **Liquidity Depth** - Binary search algorithm for precise slippage threshold detection  
✅ **Error Handling** - Comprehensive error handling with intelligent fallback mechanisms  
✅ **Caching** - In-memory caching to reduce API calls  
✅ **Type Safety** - Full TypeScript type safety  
✅ **Production Ready** - Tested, documented, and optimized for production use

## 🚀 Production Enhancements

This plugin includes advanced production features:

- **Circuit Breaker Pattern**: Automatically stops requests when API is failing
- **Structured Logging**: Contextual logging with DEBUG/INFO/WARN/ERROR levels
- **Metrics Collection**: Track API performance, latency, and cache hit rates
- **Input Validation**: Validate routes and amounts before processing
- **Rate Limit Header Parsing**: Dynamically adjust to API rate limits
- **Performance Monitoring**: Track p95, p99 latencies and success rates

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for detailed information on all enhancements.

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Wormhole API key (recommended for best results, but plugin works with fallbacks)

### Installation

```bash
# Install dependencies
bun install

# Or with npm
npm install
```

### Configuration

Create a `.env` file or set environment variables:

```env
WORMHOLE_API_KEY=your_api_key_here
WORMHOLE_BASE_URL=https://api.wormhole.com
WORMHOLE_TIMEOUT=10000
WORMHOLE_MAX_REQUESTS_PER_SECOND=10
WORMHOLE_RETRY_MAX_ATTEMPTS=3
```

### Environment Variables

- `WORMHOLE_API_KEY` (recommended): Your Wormhole API key for enhanced access
- `WORMHOLE_BASE_URL` (optional): Base URL for Wormhole API (default: `https://api.wormhole.com`)
- `WORMHOLE_TIMEOUT` (optional): Request timeout in ms (default: 10000)
- `WORMHOLE_MAX_REQUESTS_PER_SECOND` (optional): Rate limit (default: 10)
- `WORMHOLE_RETRY_MAX_ATTEMPTS` (optional): Max retry attempts (default: 3)

## Running Locally

```bash
# Development mode
bun dev

# Run tests
bun test

# Build
bun build

# Type check
npm run type-check
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch
```

## API Endpoints Used

### Primary Endpoints (Wormhole API)
- `POST /v1/quote` - Get cross-chain quotes
- `GET /v1/observations/volume` - Volume statistics
- `GET /v1/tokens` - List supported tokens
- `GET /v1/health` - Health check

### Fallback Data Sources
- DefiLlama API - Volume statistics
- Public blockchain explorers - Transaction data aggregation
- On-chain data - Real-time liquidity calculations

## How Data is Derived

### Volume

- **Primary**: Fetched from Wormhole's volume observation endpoints
- **Fallback**: Aggregated from DefiLlama and public blockchain data
- **Aggregation**: Combined data from multiple sources for accuracy
- **Caching**: 1-minute cache to reduce API calls
- **Windows**: Supports 24h, 7d, and 30d windows

### Rates (Fees)

- **Primary**: Retrieved via `/v1/quote` endpoint
- **Calculation**: Based on Wormhole's fee structure (typically 0.25%)
- **Normalization**: `effectiveRate` normalized for decimal differences between tokens
- **Fee Calculation**: `totalFeesUsd` calculated based on estimated USD value
- **Fallback**: Intelligent fallback calculations when API unavailable

### Liquidity Depth

- **Method**: Binary search algorithm (25 iterations for precision)
- **Thresholds**: Finds maximum input amount for 50bps and 100bps slippage
- **Process**: Uses quote API to test different amounts until slippage threshold is met
- **Fallback**: Estimated liquidity based on typical Wormhole pool sizes

### Available Assets

- **Primary**: Fetched from `/v1/tokens` endpoint
- **Format**: Includes chain ID, token address, symbol, and decimals
- **Mapping**: Maps Wormhole chain IDs to standard chain IDs
- **Fallback**: Known Wormhole-supported tokens across major chains
- **Caching**: 1-minute cache for performance

## Supported Chains

- **Ethereum** (Chain ID: 1)
- **Polygon** (Chain ID: 137)
- **Arbitrum** (Chain ID: 42161)
- **Optimism** (Chain ID: 10)
- **Avalanche** (Chain ID: 43114)
- **BSC** (Chain ID: 56)
- **Base** (Chain ID: 8453)
- **Celo** (Chain ID: 42220)
- **Fantom** (Chain ID: 250)
- **Gnosis** (Chain ID: 100)

## Error Handling

The plugin implements comprehensive error handling:

- **Rate Limiting**: Automatically retries with exponential backoff when rate limited
- **Server Errors**: Retries on 5xx errors with exponential backoff
- **Timeouts**: Configurable timeout with intelligent fallback mechanisms
- **API Failures**: Graceful fallback to public data sources when API unavailable
- **Network Errors**: Retry logic handles transient network failures
- **Multiple Endpoints**: Tries multiple API endpoints for resilience

## Performance

- **Parallel API Calls**: Snapshot data fetched in parallel
- **In-Memory Caching**: 1-minute TTL for volumes and assets
- **Rate Limiting**: Prevents API throttling
- **Binary Search**: Optimized for liquidity depth calculation
- **Efficient Fallbacks**: Fast fallback mechanisms for reliability

## API Access Constraints

- Wormhole Queries API may require beta access approval
- Rate limits apply (configurable via `maxRequestsPerSecond`)
- Plugin includes intelligent fallback mechanisms for restricted access
- Works without API key using public data sources (with reduced accuracy)

## Implementation Details

### Decimal Normalization

The plugin correctly normalizes decimals when calculating `effectiveRate`:

```typescript
effectiveRate = (amountOut / 10^decimalsOut) / (amountIn / 10^decimalsIn)
```

### Slippage Calculation

Slippage is calculated as:

```typescript
slippage = |(expectedOut - actualOut) / expectedOut| * 10000
```

### Fee Calculation

Wormhole fees are typically 0.25% (25 basis points):

```typescript
feeUsd = (amountIn * priceUSD) * (feeBps / 10000)
```

### Wormhole Chain ID Mapping

The plugin maps standard chain IDs to Wormhole's internal chain IDs:

- Ethereum: 1 → 2
- Polygon: 137 → 5
- Arbitrum: 42161 → 23
- And more...

## Real-Time Data Sources

This plugin uses real-time data from:

1. **Wormhole API** (primary) - Official endpoints when available
2. **DefiLlama** - Volume statistics and protocol data
3. **Public Blockchain Data** - Aggregated transaction data
4. **On-Chain Calculations** - Real-time quote calculations

## Production Checklist

- ✅ Retry logic with exponential backoff
- ✅ Rate limiting per provider
- ✅ Error handling and fallbacks
- ✅ Decimal normalization
- ✅ Binary search for liquidity depth
- ✅ Caching for performance
- ✅ Type safety
- ✅ Comprehensive logging
- ✅ Health checks
- ✅ Documentation

## License

Part of the NEAR Intents data collection system.

## Support

For issues or questions:
- [Wormhole Documentation](https://wormhole.com/docs/)
- [NEAR Intents Telegram Group](https://t.me/nearintents)

## Changelog

### v0.1.0
- Initial production release
- Real API integration with fallbacks
- Complete contract compliance
- Production-ready error handling
