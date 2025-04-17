import { useQuery } from '@tanstack/react-query';
import { getStrategies, Strategy } from '@/lib/api';

export interface StrategiesState {
  strategies: Record<string, Strategy>;
  isLoading: boolean;
  error: Error | null;
}

export function useStrategies(): StrategiesState {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/strategies'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    strategies: data || {},
    isLoading,
    error: error as Error | null
  };
}

export default useStrategies;
