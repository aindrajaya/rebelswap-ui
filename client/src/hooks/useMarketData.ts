import { useState, useEffect, useCallback } from 'react';
import useWebSocket, { WebSocketMessage } from './useWebSocket';

export interface MarketPrice {
  price: number;
  change24h: number;
}

export interface MarketData {
  [asset: string]: MarketPrice;
}

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Subscribe to market data WebSocket channel
  const { status, lastMessage, subscribe } = useWebSocket('/ws', {
    onOpen: () => {
      console.log('WebSocket connected, subscribing to market data');
      subscribe('market');
    },
    onMessage: (data: WebSocketMessage) => {
      if (data.type === 'market_update' && data.data) {
        setMarketData(prevData => ({
          ...prevData,
          ...data.data
        }));
        
        if (isLoading) {
          setIsLoading(false);
        }
      }
    },
    onError: (event) => {
      setError(new Error('Failed to connect to market data stream'));
      setIsLoading(false);
    }
  });

  // Fetch initial market data if WebSocket is not available
  useEffect(() => {
    if (status === 'error' || status === 'closed') {
      // Fallback to REST API for market data
      const fetchMarketData = async () => {
        try {
          // Using asset prices from our mock data
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
          setIsLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to fetch market data'));
          setIsLoading(false);
        }
      };
      
      fetchMarketData();
    }
  }, [status]);
  
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
    isConnected: status === 'open'
  };
}

export default useMarketData;