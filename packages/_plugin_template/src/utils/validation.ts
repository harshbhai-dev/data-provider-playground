import type { z } from "every-plugin/zod";
import type { Asset } from "../contract";

type AssetType = z.infer<typeof Asset>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRoute(route: { source: AssetType; destination: AssetType }): ValidationResult {
  const errors: string[] = [];

  // Validate source asset
  if (!route.source.chainId || route.source.chainId.trim() === "") {
    errors.push("Source chainId is required");
  }
  if (!route.source.assetId || route.source.assetId.trim() === "") {
    errors.push("Source assetId is required");
  }
  if (!route.source.symbol || route.source.symbol.trim() === "") {
    errors.push("Source symbol is required");
  }
  if (route.source.decimals < 0 || route.source.decimals > 18) {
    errors.push("Source decimals must be between 0 and 18");
  }

  // Validate destination asset
  if (!route.destination.chainId || route.destination.chainId.trim() === "") {
    errors.push("Destination chainId is required");
  }
  if (!route.destination.assetId || route.destination.assetId.trim() === "") {
    errors.push("Destination assetId is required");
  }
  if (!route.destination.symbol || route.destination.symbol.trim() === "") {
    errors.push("Destination symbol is required");
  }
  if (route.destination.decimals < 0 || route.destination.decimals > 18) {
    errors.push("Destination decimals must be between 0 and 18");
  }

  // Validate same chain
  if (route.source.chainId === route.destination.chainId) {
    errors.push("Source and destination cannot be on the same chain");
  }

  // Validate address format (basic check)
  if (route.source.assetId && !route.source.assetId.match(/^0x[a-fA-F0-9]{40}$/)) {
    errors.push("Source assetId must be a valid Ethereum address");
  }
  if (route.destination.assetId && !route.destination.assetId.match(/^0x[a-fA-F0-9]{40}$/)) {
    errors.push("Destination assetId must be a valid Ethereum address");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateNotional(notional: string): ValidationResult {
  const errors: string[] = [];

  if (!notional || notional.trim() === "") {
    errors.push("Notional amount is required");
    return { valid: false, errors };
  }

  try {
    const amount = BigInt(notional);
    if (amount <= 0n) {
      errors.push("Notional amount must be greater than 0");
    }
    if (amount > BigInt("1000000000000000000000000")) { // 1M tokens max
      errors.push("Notional amount exceeds maximum allowed");
    }
  } catch {
    errors.push("Notional amount must be a valid number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateRoutes(routes: Array<{ source: AssetType; destination: AssetType }>): ValidationResult {
  const errors: string[] = [];

  if (!routes || routes.length === 0) {
    errors.push("At least one route is required");
    return { valid: false, errors };
  }

  for (let i = 0; i < routes.length; i++) {
    const routeResult = validateRoute(routes[i]);
    if (!routeResult.valid) {
      errors.push(`Route ${i + 1}: ${routeResult.errors.join(", ")}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateNotionals(notionals: string[]): ValidationResult {
  const errors: string[] = [];

  if (!notionals || notionals.length === 0) {
    errors.push("At least one notional amount is required");
    return { valid: false, errors };
  }

  for (let i = 0; i < notionals.length; i++) {
    const notionalResult = validateNotional(notionals[i]);
    if (!notionalResult.valid) {
      errors.push(`Notional ${i + 1}: ${notionalResult.errors.join(", ")}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

