import { useQuery } from '@tanstack/react-query';
import { getAssets } from '@/lib/api';

export interface AssetsState {
  assets: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useAssets(): AssetsState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/assets'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    assets: data || [],
    isLoading,
    error: error as Error | null
  };
}

// Sample mock market data for the market overview
// These would come from an API in production
export const getMarketData = () => [
  { name: 'BTC', price: 64283.45, change24h: 2.4, volume24h: '24.5B' },
  { name: 'ETH', price: 3429.81, change24h: 1.2, volume24h: '12.8B' },
  { name: 'SOL', price: 146.78, change24h: -3.1, volume24h: '4.2B' },
  { name: 'DOGE', price: 0.1283, change24h: 5.7, volume24h: '1.8B' },
  { name: 'SHIB', price: 0.00002145, change24h: 8.3, volume24h: '945M' }
];

export default useAssets;
