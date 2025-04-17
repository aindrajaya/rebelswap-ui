import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import useWallet from './useWallet';
import useWebSocket from './useWebSocket';
import useMarketData from './useMarketData';
import { 
  getUserPositions, 
  getStrategyPnl, 
  Position, 
  TradeCalculationParams, 
  calculateTrades, 
  Strategy 
} from '@/lib/api';
import { hyperliquidClient } from '@/lib/hyperliquid';
import { useToast } from '@/hooks/use-toast';

export interface RebalanceConfig {
  enabled: boolean;
  driftThreshold: number; // Percentage of deviation that triggers rebalance (e.g., 5 = 5%)
  checkInterval: number; // How often to check for rebalance needs (in ms)
  maxRebalancesPerDay: number; // Limit on rebalances per day
}

export interface StrategyAllocation {
  strategyId: string;
  allocation: number; // Percentage of portfolio (0-100)
  currentValue: number; // Current USD value
  targetValue: number; // Target USD value
  drift: number; // Current drift percentage from target
  needsRebalance: boolean;
}

export function useAutoRebalance() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const { marketData, isLoading: isLoadingMarketData } = useMarketData();
  
  // Rebalance configuration state
  const [config, setConfig] = useState<RebalanceConfig>({
    enabled: false,
    driftThreshold: 5, // 5% drift threshold
    checkInterval: 60000, // Check every minute
    maxRebalancesPerDay: 3
  });
  
  // Rebalance history
  const [rebalanceHistory, setRebalanceHistory] = useState<{
    timestamp: number;
    strategyId: string;
    from: number;
    to: number;
  }[]>([]);
  
  // Current allocations and rebalance status
  const [allocations, setAllocations] = useState<StrategyAllocation[]>([]);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  
  // Get positions data
  const { 
    data: positions, 
    isLoading: isLoadingPositions,
    refetch: refetchPositions
  } = useQuery({
    queryKey: ['positions', address],
    queryFn: () => address ? getUserPositions(address) : Promise.resolve([]),
    enabled: !!address && isConnected,
    staleTime: 30000, // 30 seconds
  });
  
  // Get strategy PnL data
  const { 
    data: strategyPnlData, 
    isLoading: isLoadingPnl,
    refetch: refetchPnl
  } = useQuery({
    queryKey: ['strategy_pnl', address],
    queryFn: () => address ? getStrategyPnl(address) : Promise.resolve([]),
    enabled: !!address && isConnected,
    staleTime: 30000, // 30 seconds
  });
  
  // Trade calculation mutation
  const calculateTradesMutation = useMutation({
    mutationFn: (params: TradeCalculationParams) => calculateTrades(params),
  });
  
  // Trade execution mutation
  const executeTradesMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }
      
      // 1. Calculate current strategy value and drift
      const allocation = allocations.find(a => a.strategyId === strategyId);
      if (!allocation || !allocation.needsRebalance) {
        throw new Error("Strategy doesn't need rebalancing");
      }
      
      // 2. Calculate needed trades to rebalance
      const params: TradeCalculationParams = {
        strategy_id: strategyId,
        total_usd_size: allocation.targetValue,
        user_address: address
      };
      
      const tradeCalc = await calculateTradesMutation.mutateAsync(params);
      
      // 3. Execute the trades via Hyperliquid
      const result = await hyperliquidClient.executeTradesFromCalculation(tradeCalc.trades);
      
      if (!result.success) {
        throw new Error(result.error || "Trade execution failed");
      }
      
      // 4. Record the rebalance
      setRebalanceHistory(prev => [
        ...prev,
        {
          timestamp: Date.now(),
          strategyId,
          from: allocation.currentValue,
          to: allocation.targetValue
        }
      ]);
      
      // 5. Refresh positions data
      await Promise.all([refetchPositions(), refetchPnl()]);
      
      return result;
    },
    onSuccess: (data, strategyId) => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['strategy_pnl'] });
      
      toast({
        title: "Strategy Rebalanced",
        description: `Successfully rebalanced ${strategyId} strategy.`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Rebalance Failed",
        description: error instanceof Error ? error.message : "Failed to rebalance strategy",
      });
    }
  });
  
  // WebSocket for real-time market data and auto-rebalancing
  useWebSocket('/ws', {
    onOpen: () => {
      console.log('Connected to rebalancing WebSocket');
    },
    onMessage: (data) => {
      if (data.type === 'market_update' && config.enabled) {
        // Check if we need to rebalance based on new market data
        checkRebalanceNeeded();
      }
    }
  });
  
  // Calculate allocations and check for rebalance needs
  const checkRebalanceNeeded = useCallback(() => {
    if (!positions || !strategyPnlData || isRebalancing || !config.enabled) {
      return;
    }
    
    setLastChecked(Date.now());
    
    // Group positions by strategy
    const strategyMap = new Map<string, Position[]>();
    positions.forEach(position => {
      if (position.strategy) {
        if (!strategyMap.has(position.strategy)) {
          strategyMap.set(position.strategy, []);
        }
        strategyMap.get(position.strategy)?.push(position);
      }
    });
    
    // Calculate total portfolio value
    const totalValue = strategyPnlData.reduce((sum, strategy) => {
      return sum + strategy.positions.reduce((strategySum, pos) => strategySum + pos.margin, 0);
    }, 0);
    
    // Calculate allocations and drift
    const newAllocations: StrategyAllocation[] = strategyPnlData.map(strategy => {
      const currentValue = strategy.positions.reduce((sum, pos) => sum + pos.margin, 0);
      const allocation = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      
      // Hardcoded target allocations (in a real app, this would be configurable)
      let targetAllocation = 25; // Default to equal allocation
      if (strategy.strategyId === 'MEGA') targetAllocation = 40;
      else if (strategy.strategyId === 'DOWN') targetAllocation = 25;
      else if (strategy.strategyId === 'Z00M') targetAllocation = 20;
      else if (strategy.strategyId === 'DUMP') targetAllocation = 15;
      
      const targetValue = (targetAllocation / 100) * totalValue;
      const drift = Math.abs(((currentValue - targetValue) / targetValue) * 100);
      const needsRebalance = drift > config.driftThreshold;
      
      return {
        strategyId: strategy.strategyId,
        allocation,
        currentValue,
        targetValue,
        drift,
        needsRebalance
      };
    });
    
    setAllocations(newAllocations);
    
    // Auto-rebalance if needed
    if (config.enabled && newAllocations.some(a => a.needsRebalance)) {
      const rebalancesToday = rebalanceHistory.filter(
        r => r.timestamp > Date.now() - 24 * 60 * 60 * 1000
      ).length;
      
      if (rebalancesToday < config.maxRebalancesPerDay) {
        const strategyToRebalance = newAllocations
          .filter(a => a.needsRebalance)
          .sort((a, b) => b.drift - a.drift)[0]; // Rebalance the one with the highest drift
          
        if (strategyToRebalance) {
          rebalanceStrategy(strategyToRebalance.strategyId);
        }
      } else {
        console.log('Rebalance needed but daily limit reached');
      }
    }
  }, [positions, strategyPnlData, config, isRebalancing]);
  
  // Manual rebalance function
  const rebalanceStrategy = useCallback(async (strategyId: string) => {
    if (!address || isRebalancing) return;
    
    setIsRebalancing(true);
    try {
      await executeTradesMutation.mutateAsync(strategyId);
    } finally {
      setIsRebalancing(false);
    }
  }, [address, executeTradesMutation, isRebalancing]);
  
  // Toggle auto-rebalancing
  const toggleAutoRebalance = useCallback((enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      enabled
    }));
    
    if (enabled) {
      checkRebalanceNeeded();
    }
  }, [checkRebalanceNeeded]);
  
  // Update config
  const updateConfig = useCallback((newConfig: Partial<RebalanceConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...newConfig
    }));
  }, []);
  
  // Periodically check for rebalance needs
  useEffect(() => {
    if (!config.enabled) return;
    
    const interval = setInterval(() => {
      checkRebalanceNeeded();
    }, config.checkInterval);
    
    return () => clearInterval(interval);
  }, [config.enabled, config.checkInterval, checkRebalanceNeeded]);
  
  return {
    config,
    isRebalancing,
    allocations,
    rebalanceHistory,
    isLoading: isLoadingPositions || isLoadingPnl || isLoadingMarketData,
    lastChecked,
    rebalanceStrategy,
    toggleAutoRebalance,
    updateConfig,
    checkRebalanceNeeded
  };
}

export default useAutoRebalance;