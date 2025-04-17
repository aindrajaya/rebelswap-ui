import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StrategyPerformanceCard from './StrategyPerformanceCard';
import useWallet from '@/hooks/useWallet';
import useStrategies from '@/hooks/useStrategies';

type TimeRange = '24H' | '7D' | '30D' | 'ALL';

const PerformanceDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const { isConnected } = useWallet();
  const { strategies } = useStrategies();
  
  // Sample performance data - in production these would come from an API
  const performanceData = {
    'MEGA': { change: 28.5, data: [30, 45, 25, 60, 40, 70, 85] },
    'DOWN': { change: -12.4, data: [60, 80, 50, 40, 30, 20, 30] },
    'Z00M': { change: 85.2, data: [20, 35, 65, 80, 60, 95, 90] },
    'DUMP': { change: -42.7, data: [75, 60, 45, 30, 20, 15, 10] }
  };
  
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
          ) : (
            <div className="text-center">
              <span className="material-icons text-4xl text-muted-foreground mb-2">analytics</span>
              <p className="text-muted-foreground">Performance charts for {timeRange}</p>
            </div>
          )}
        </div>
        
        {/* Strategy Performance Grid */}
        <h3 className="text-lg font-medium mb-3">Strategy Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(strategies).map((strategyId) => (
            <StrategyPerformanceCard
              key={strategyId}
              strategyId={strategyId}
              strategy={strategies[strategyId]}
              performance={performanceData[strategyId as keyof typeof performanceData]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceDashboard;
