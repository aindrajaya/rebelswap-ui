import { useQuery } from '@tanstack/react-query';
import { getAssets } from '@/lib/api';

export interface AssetsState {
  assets: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useAssets(): AssetsState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/assets'],
    queryFn: () => getAssets(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    assets: data || [],
    isLoading,
    error: error as Error | null
  };
}

export default useAssets;
