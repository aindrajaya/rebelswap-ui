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
  estimated_asset_price?: number;
}

export interface TradeParameterDetails {
  asset: string;
  estimated_asset_price: number;
  estimated_nominal_usd: number;
  is_buy: boolean;
  leverage: number;
  size_asset: string;
}

export interface TradeCalculationResult {
  calculation_timestamp_utc: string;
  message: string;
  strategy_id: string;
  trade_parameters: TradeParameterDetails[];
  user_address_context?: string;
  
  // Backward compatibility fields
  strategy?: Strategy;
  trades?: AssetTrade[];
  total_nominal_usd?: number;
  timestamp?: number;
}

export interface Position {
  asset: string;
  size: number;
  side: 'long' | 'short';
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPct: number;
  liquidationPrice: number;
  leverage: number;
  margin: number;
  strategy?: string;
}

export interface StrategyPnl {
  strategyId: string;
  totalPnl: number;
  totalPnlPct: number;
  positionCount: number;
  positions: Position[];
}

export interface Balance {
  total: number;
  available: number;
  inPositions: number;
}

export interface Asset {
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
}

export interface MarketData {
  [asset: string]: {
    price: number;
    change24h: number;
  };
}

export interface Order {
  id: string;
  asset: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  type: 'limit' | 'market';
  status: 'open' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface ExecuteOrderParams {
  asset: string;
  size: number;
  is_buy: boolean;
  price: number;
  user_address: string | null;
}

export interface ExecuteOrderResponse {
  order_id: string;
  result: string;
}

// API functions
export async function getStrategies(): Promise<Record<string, Strategy>> {
  const res = await apiRequest("GET", "/strategies", undefined);
  return res.json();
}

export async function getAssets(): Promise<string[]> {
  const res = await apiRequest("GET", "/assets", undefined);
  return res.json();
}

export async function calculateTrades(params: TradeCalculationParams): Promise<TradeCalculationResult> {
  try {
    // Make the API request to get the actual calculation results
    const res = await apiRequest("POST", "/trades/calculate", params);
    
    // Only use mock data if the response isn't OK - removing development mode check
    if (!res.ok) {
      console.warn("Trade calculation API returned an error, falling back to mock data");
      
      // Return the exact format that was requested
      return {
        calculation_timestamp_utc: "2025-04-17T18:53:30.278147+00:00",
        message: "Parameters calculated. Frontend must execute these trades via user's wallet.",
        strategy_id: params.strategy_id || "DUMP",
        trade_parameters: [
          {
            asset: "kDOGS",
            estimated_asset_price: 0.10529,
            estimated_nominal_usd: 1.8,
            is_buy: false,
            leverage: 3,
            size_asset: "17"
          },
          {
            asset: "kSHIB",
            estimated_asset_price: 0.011934,
            estimated_nominal_usd: 1.8,
            is_buy: false,
            leverage: 3,
            size_asset: "150"
          },
          {
            asset: "kPEPE",
            estimated_asset_price: 0.007388,
            estimated_nominal_usd: 1.8,
            is_buy: false,
            leverage: 3,
            size_asset: "243"
          },
          {
            asset: "kBONK",
            estimated_asset_price: 0.011979,
            estimated_nominal_usd: 1.8,
            is_buy: false,
            leverage: 3,
            size_asset: "150"
          },
          {
            asset: "WIF",
            estimated_asset_price: 0.39694,
            estimated_nominal_usd: 1.8,
            is_buy: false,
            leverage: 3,
            size_asset: "4"
          }
        ],
        user_address_context: params.user_address || "0xe45ee40d56ec816290886e8c91378c50e8f16ec9",
        
        // Add these for backward compatibility
        trades: [
          {
            asset: "kDOGS",
            is_buy: false,
            size_asset: "17",
            leverage: 3,
            estimated_nominal_usd: 1.8,
            estimated_asset_price: 0.10529
          },
          {
            asset: "kSHIB",
            is_buy: false,
            size_asset: "150",
            leverage: 3,
            estimated_nominal_usd: 1.8,
            estimated_asset_price: 0.011934
          },
          {
            asset: "kPEPE",
            is_buy: false,
            size_asset: "243",
            leverage: 3,
            estimated_nominal_usd: 1.8,
            estimated_asset_price: 0.007388
          },
          {
            asset: "kBONK",
            is_buy: false,
            size_asset: "150",
            leverage: 3,
            estimated_nominal_usd: 1.8,
            estimated_asset_price: 0.011979
          },
          {
            asset: "WIF",
            is_buy: false,
            size_asset: "4",
            leverage: 3,
            estimated_nominal_usd: 1.8,
            estimated_asset_price: 0.39694
          }
        ],
        total_nominal_usd: 9.0,
        timestamp: Date.now()
      };
    }

    // Parse the real response
    const data = await res.json();
    console.log("Received real trade calculation data from API:", data);
    
    // Add backward compatibility fields if they don't exist
    if (!data.trades && data.trade_parameters) {
      data.trades = data.trade_parameters.map((param: TradeParameterDetails) => ({
        asset: param.asset,
        is_buy: param.is_buy,
        size_asset: param.size_asset,
        leverage: param.leverage,
        estimated_nominal_usd: param.estimated_nominal_usd,
        estimated_asset_price: param.estimated_asset_price
      }));
      
      // Calculate total nominal USD
      data.total_nominal_usd = data.trade_parameters.reduce(
        (sum: number, param: TradeParameterDetails) => sum + param.estimated_nominal_usd, 
        0
      );
      
      data.timestamp = new Date(data.calculation_timestamp_utc).getTime();
    }
    
    return data;
  } catch (error) {
    console.error("Error calculating trades:", error);
    throw error;
  }
}

export async function getUserPositions(address: string): Promise<Position[]> {
  const res = await apiRequest("GET", `/positions/${address}`, undefined);
  const data = await res.json();
  console.log("User Positions data:", data);  // Now correctly logging the JSON data
  
  // Transform the API response to match our Position interface
  if (Array.isArray(data)) {
    return data.map(position => {
      // Determine side based on size (positive = long, negative = short)
      const size = typeof position.size === 'string' ? parseFloat(position.size) : position.size;
      const side = size >= 0 ? 'long' : 'short';
      
      return {
        asset: position.asset,
        size: Math.abs(size),
        side: side,
        entryPrice: position.entry_price,
        markPrice: position.mark_price || position.entry_price, // If mark_price isn't provided, fall back to entry_price
        pnl: position.unrealized_pnl || 0,
        pnlPct: position.return_on_equity ? position.return_on_equity * 100 : 0, // Convert to percentage
        liquidationPrice: position.liquidation_price || 0,
        leverage: position.leverage_value || 1,
        margin: position.margin_used || 0,
        strategy: position.strategy || undefined // Keep strategy if it exists
      };
    });
  }
  
  // Return empty array if data is not in the expected format
  console.error("Positions data is not in expected format:", data);
  return [];
}

export async function getStrategyPnl(address: string): Promise<StrategyPnl[]> {
  try {
    const res = await apiRequest("GET", `/pnl/${address}`, undefined);
    
    // Check if the response was successful
    if (!res.ok) {
      throw new Error(`Failed to load PnL data: ${res.statusText || res.status}`);
    }
    
    // Check content type to ensure we're receiving JSON
    const contentType = res.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      console.error(`Invalid content type received: ${contentType}`);
      
      // Instead of throwing, get the text content to log what the server is returning
      const htmlContent = await res.text();
      console.log("Server returned non-JSON content:", htmlContent.substring(0, 200) + "...");
      
      // Return empty array instead of throwing - this allows the UI to handle gracefully
      return [];
    }
    
    // Parse the JSON directly (no need to double-parse)
    const data = await res.json();
    
    console.log("Strategy PnL raw data:", data);
    
    // Check for empty response
    if (!data) {
      console.error("PnL API returned empty response");
      return [];
    }
    
    // Handle the expected format with strategy_pnl object
    if (data && 'strategy_pnl' in data) {
      return Object.entries(data.strategy_pnl).map(([strategyId, details]: [string, any]) => {
        // Parse positions
        const positions: Position[] = Array.isArray(details.positions) 
          ? details.positions.map((pos: any) => {
              // Determine side based on size (positive = long, negative = short)
              const size = typeof pos.size === 'string' ? parseFloat(pos.size) : pos.size;
              const side = size >= 0 ? 'long' : 'short';
              
              return {
                asset: pos.asset,
                size: Math.abs(size),
                side: side,
                entryPrice: typeof pos.entry_price === 'string' ? parseFloat(pos.entry_price) : pos.entry_price,
                markPrice: pos.mark_price ? 
                  (typeof pos.mark_price === 'string' ? parseFloat(pos.mark_price) : pos.mark_price) : 
                  (typeof pos.entry_price === 'string' ? parseFloat(pos.entry_price) : pos.entry_price),
                pnl: pos.unrealized_pnl ? 
                  (typeof pos.unrealized_pnl === 'string' ? parseFloat(pos.unrealized_pnl) : pos.unrealized_pnl) : 0,
                pnlPct: pos.return_on_equity ? 
                  (typeof pos.return_on_equity === 'string' ? parseFloat(pos.return_on_equity) : pos.return_on_equity) * 100 : 0,
                liquidationPrice: pos.liquidation_price ? 
                  (typeof pos.liquidation_price === 'string' ? parseFloat(pos.liquidation_price) : pos.liquidation_price) : 0,
                leverage: pos.leverage_value ? 
                  (typeof pos.leverage_value === 'string' ? parseFloat(pos.leverage_value) : pos.leverage_value) : 1,
                margin: pos.margin_used ? 
                  (typeof pos.margin_used === 'string' ? parseFloat(pos.margin_used) : pos.margin_used) : 0,
                strategy: strategyId
              };
            })
          : [];
        
        // Calculate percentage return if available
        let percentReturn = 0;
        if (details.percent_return !== undefined) {
          percentReturn = details.percent_return;
        }
        
        return {
          strategyId,
          totalPnl: details.current_pnl_usd || 0,
          totalPnlPct: percentReturn,
          positionCount: positions.length,
          positions
        };
      });
    }
    
    // If we got here, the data format is unexpected
    console.warn("Unexpected PnL data format:", data);
    
    // Return a fallback empty array
    return [];
  } catch (error) {
    console.error("Error in getStrategyPnl:", error);
    
    // Provide a fallback response with empty data instead of throwing
    // This allows the UI to display a more graceful error state
    return [];
  }
}

export async function getUserBalance(address: string): Promise<Balance> {
  const res = await apiRequest("GET", `/balance/${address}`, undefined);
  const data = await res.json();
  
  console.log("User Balance data:", data);  // Log the actual JSON data instead of the Response object
  
  // Check if the response format is from the backend API (which has different field names)
  if ('account_value_usd' in data) {
    // Transform the backend API format to match our Balance interface
    return {
      total: data.account_value_usd || 0,
      available: (data.account_value_usd - data.total_margin_used_usd) || 0,
      inPositions: data.total_margin_used_usd || 0
    };
  }
  
  // Return the data as is if it already follows our Balance interface
  return data;
}

export async function getUserOrders(address: string): Promise<Order[]> {
  const res = await apiRequest("GET", `/orders/${address}`, undefined);
  return res.json();
}

export async function getMarketData(): Promise<MarketData> {
  try {
    // Use the correct endpoint
    const res = await apiRequest("GET", "/market-data", undefined);
    
    // Correctly log the Response object
    console.log('Market data response status:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      url: res.url
    });
    
    const data = await res.json();
    console.log('Raw market data from API:', data);
    
    // Transform the data to match our MarketData interface
    const transformedData: MarketData = {};
    
    // Handle the error case
    if (data && data.error) {
      console.error('Server returned error:', data);
      throw new Error(`Server error: ${data.error} - ${data.details || ''}`);
    }
    
    // Process the backend's format to match our interface
    if (data && typeof data === 'object') {
      Object.entries(data).forEach(([asset, details]: [string, any]) => {
        // Check if details has mid_price property
        if (typeof details === 'object' && details !== null && 'mid_price' in details) {
          // Skip entries with N/A values
          if (details.mid_price === 'N/A') {
            transformedData[asset] = {
              price: 0,
              change24h: 0
            };
            return;
          }
          
          // Convert the mid_price from string to number
          const price = parseFloat(details.mid_price);
          
          // Skip if price is NaN
          if (isNaN(price)) return;
          
          transformedData[asset] = {
            price: price,
            change24h: 0 // Default value since API doesn't provide this
          };
        }
      });
    }
    
    console.log('Transformed market data:', transformedData);
    
    // Return the transformed data if we have any results
    if (Object.keys(transformedData).length > 0) {
      return transformedData;
    }
    
    // If no valid data was processed, throw an error
    throw new Error('Failed to parse market data from API response');
    
  } catch (error) {
    console.error('Error in getMarketData:', error);
    // Return fallback data instead of propagating the error
    return {
      BTC: { price: 85135, change24h: 0 },
      ETH: { price: 1610.7, change24h: 0 },
      SOL: { price: 136.1, change24h: 0 },
      kPEPE: { price: 0.007368, change24h: 0 },
      kSHIBA: { price: 0, change24h: 0 }
    };
  }
}

export async function getServiceStatus(): Promise<any> {
  const res = await apiRequest("GET", "/status", undefined);
  return res.json();
}

export async function executeOrder(params: ExecuteOrderParams): Promise<ExecuteOrderResponse> {
  try {
    const res = await apiRequest("POST", "/execute-order", params);
    
    if (!res.ok) {
      const errorData = await res.text();
      console.error("Error executing order:", errorData);
      throw new Error(`Failed to execute order: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error in executeOrder:", error);
    throw error;
  }
}
