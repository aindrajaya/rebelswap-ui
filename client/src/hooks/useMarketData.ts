import { useState, useEffect, useCallback } from 'react';
import useWebSocket from './useWebSocket';
import { getMarketData, MarketData } from '@/lib/api';

export interface MarketPrice {
  price: number;
  change24h: number;
}

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // WebSocket is disabled, but we keep the interface for compatibility
  const { status } = useWebSocket('/ws');

  // Fetch market data from the API endpoint
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Add logging to debug the response
        console.log('Fetching market data...');
        const data = await getMarketData();
        const resData = data;
        console.log('Market data fetched successfully:', data);
        setMarketData(resData);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch market data:', err);
        
        // Log more detailed error information
        if (err instanceof Error) {
          console.error('Error message:', err.message);
          console.error('Error stack:', err.stack);
        }
        
        setError(err instanceof Error ? err : new Error('Failed to fetch market data'));
        setIsLoading(false);
        
        // Fallback to static market data if API fails
        console.log('Using fallback market data');
        const marketPrices: MarketData = {
          BTC: { price: 67200, change24h: 1.2 },
          ETH: { price: 3350, change24h: -0.5 },
          SOL: { price: 169.5, change24h: 2.3 },
          DOGE: { price: 0.14, change24h: -1.8 },
          SHIB: { price: 0.000025, change24h: 4.2 },
          PEPE: { price: 0.0000096, change24h: 7.5 },
          BONK: { price: 0.00002, change24h: -3.1 }
        };
        
        setMarketData(marketPrices);
      }
    };
    
    fetchMarketData();
  }, []);
  
  // Helper to get price for a specific asset
  const getAssetPrice = useCallback((asset: string): number => {
    return marketData[asset]?.price || 0;
  }, [marketData]);
  
  // Helper to get 24h change for a specific asset
  const getAssetChange = useCallback((asset: string): number => {
    return marketData[asset]?.change24h || 0;
  }, [marketData]);
  
  return {
    marketData,
    isLoading,
    error,
    getAssetPrice,
    getAssetChange,
    isConnected: false // Always return false as WebSocket is disabled
  };
}

export default useMarketData;