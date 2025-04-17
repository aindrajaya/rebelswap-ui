import { apiRequest } from "./queryClient";

// Types
export interface Strategy {
  ticker: string;
  description: string;
  assets: string[];
  direction: "long" | "short";
  leverage: number;
  weighting: string;
}

export interface TradeCalculationParams {
  strategy_id: string;
  total_usd_size: number;
  user_address?: string;
}

export interface AssetTrade {
  asset: string;
  is_buy: boolean;
  size_asset: string;
  leverage: number;
  estimated_nominal_usd: number;
}

export interface TradeCalculationResult {
  strategy: Strategy;
  trades: AssetTrade[];
  total_nominal_usd: number;
  timestamp: number;
}

export interface Asset {
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
}

// API functions
export async function getStrategies(): Promise<Record<string, Strategy>> {
  const res = await apiRequest("GET", "/api/strategies", undefined);
  return res.json();
}

export async function getAssets(): Promise<string[]> {
  const res = await apiRequest("GET", "/api/assets", undefined);
  return res.json();
}

export async function calculateTrades(params: TradeCalculationParams): Promise<TradeCalculationResult> {
  const res = await apiRequest("POST", "/api/trades/calculate", params);
  return res.json();
}

export async function getServiceStatus(): Promise<any> {
  const res = await apiRequest("GET", "/api/status", undefined);
  return res.json();
}
