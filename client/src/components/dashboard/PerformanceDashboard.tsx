import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import StrategyPerformanceCard from './StrategyPerformanceCard';
import useWallet from '@/hooks/useWallet';
import useStrategies from '@/hooks/useStrategies';
import { getStrategyPnl, StrategyPnl } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

type TimeRange = '24H' | '7D' | '30D' | 'ALL';

interface PerformanceData {
  [strategyId: string]: {
    change: number;
    data: number[];
  };
}

const PerformanceDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const { address, isConnected } = useWallet();
  const { strategies, isLoading: isLoadingStrategies } = useStrategies();
  
  // Get strategy PnL data
  const { 
    data: strategyPnlData, 
    isLoading: isLoadingPnl, 
    isError
  } = useQuery({
    queryKey: ['strategy_pnl', address, timeRange],
    queryFn: () => address ? getStrategyPnl(address) : Promise.resolve([]),
    enabled: !!address && isConnected,
    staleTime: 60000, // 1 minute
  });
  
  // Convert API strategy PnL to performance data format
  const formatPerformanceData = (pnlData: StrategyPnl[]): PerformanceData => {
    const performanceData: PerformanceData = {};
    
    // Process real data from API
    pnlData.forEach(strategy => {
      // Generate mock chart data points based on PnL trend
      // In a real implementation, this would use historical data points from the API
      const generateDataPoints = (pnlPct: number): number[] => {
        // Generate 7 data points with overall trend matching the pnl percentage
        const startPoint = 50; // Start in the middle
        const endPoint = Math.min(Math.max(startPoint + (pnlPct * 1.5), 10), 90); // Ensure between 10-90
        
        // Linear interpolation between start and end points
        const step = (endPoint - startPoint) / 6;
        
        // Add some random noise to make it look more realistic
        return Array(7).fill(0).map((_, i) => {
          const baseValue = startPoint + (step * i);
          const noise = Math.random() * 10 - 5; // Random value between -5 and 5
          return Math.min(Math.max(baseValue + noise, 5), 95); // Ensure between 5-95
        });
      };
      
      performanceData[strategy.strategyId] = {
        change: strategy.totalPnlPct,
        data: generateDataPoints(strategy.totalPnlPct)
      };
    });
    
    // If some strategies are missing in the real data, add them with neutral performance
    // This ensures all strategies are displayed even if user doesn't have positions in them
    Object.keys(strategies).forEach(strategyId => {
      if (!performanceData[strategyId]) {
        performanceData[strategyId] = {
          change: 0,
          data: [50, 50, 50, 50, 50, 50, 50] // Flat line for strategies with no data
        };
      }
    });
    
    return performanceData;
  };
  
  // Generate performance data
  const performanceData = strategyPnlData && !isLoadingPnl
    ? formatPerformanceData(strategyPnlData)
    : {
        'MEGA': { change: 0, data: [50, 50, 50, 50, 50, 50, 50] },
        'DOWN': { change: 0, data: [50, 50, 50, 50, 50, 50, 50] },
        'Z00M': { change: 0, data: [50, 50, 50, 50, 50, 50, 50] },
        'DUMP': { change: 0, data: [50, 50, 50, 50, 50, 50, 50] }
      };
  
  const isLoading = isLoadingStrategies || isLoadingPnl;
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <CardTitle className="text-xl font-semibold">Performance Dashboard</CardTitle>
          <div className="flex space-x-2 mt-2 sm:mt-0">
            {(['24H', '7D', '30D', 'ALL'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                className={`text-xs ${
                  timeRange === range 
                    ? 'bg-primary text-white' 
                    : 'bg-background hover:bg-neutral-700'
                }`}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Chart Placeholder */}
        <div className="w-full h-64 bg-background rounded-lg flex items-center justify-center mb-6">
          {!isConnected ? (
            <div className="text-center">
              <span className="material-icons text-4xl text-muted-foreground mb-2">insert_chart</span>
              <p className="text-muted-foreground">Connect wallet to view performance charts</p>
            </div>
          ) : isLoading ? (
            <div className="text-center">
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          ) : isError ? (
            <div className="text-center">
              <span className="material-icons text-4xl text-red-500 mb-2">error</span>
              <p className="text-muted-foreground">Error loading performance data</p>
            </div>
          ) : (
            <div className="text-center">
              <span className="material-icons text-4xl text-muted-foreground mb-2">analytics</span>
              <p className="text-muted-foreground">Performance charts for {timeRange}</p>
            </div>
          )}
        </div>
        
        {/* Strategy Performance Grid */}
        <h3 className="text-lg font-medium mb-3">Strategy Performance</h3>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(strategies).map((strategyId) => (
              <StrategyPerformanceCard
                key={strategyId}
                strategyId={strategyId}
                strategy={strategies[strategyId]}
                performance={performanceData[strategyId] || { change: 0, data: [50, 50, 50, 50, 50, 50, 50] }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceDashboard;
