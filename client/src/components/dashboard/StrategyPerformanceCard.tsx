import React from 'react';
import { Strategy } from '@/lib/api';

interface StrategyPerformanceCardProps {
  strategyId: string;
  strategy: Strategy;
  performance: {
    change: number;
    data: number[];
  };
}

const StrategyPerformanceCard: React.FC<StrategyPerformanceCardProps> = ({
  strategyId,
  strategy,
  performance
}) => {
  // Get strategy color based on ID
  const getStrategyColor = (id: string) => {
    switch (id) {
      case 'MEGA':
        return {
          text: 'text-primary',
          bg: 'bg-primary-light',
          bgLight: 'bg-primary/20'
        };
      case 'DOWN':
        return {
          text: 'text-rose-500',
          bg: 'bg-rose-500',
          bgLight: 'bg-rose-500/20'
        };
      case 'Z00M':
        return {
          text: 'text-teal-400',
          bg: 'bg-teal-400',
          bgLight: 'bg-teal-400/20'
        };
      case 'DUMP':
        return {
          text: 'text-red-500',
          bg: 'bg-red-500',
          bgLight: 'bg-red-500/20'
        };
      default:
        return {
          text: 'text-white',
          bg: 'bg-neutral-400',
          bgLight: 'bg-neutral-400/20'
        };
    }
  };
  
  const colors = getStrategyColor(strategyId);
  
  return (
    <div className="bg-background rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <span className={`${colors.text} font-bold mr-2`}>{strategyId}</span>
          <span className="text-xs text-muted-foreground">
            {strategy.leverage}x {strategy.direction === 'long' ? 'Long' : 'Short'}
          </span>
        </div>
        <div className={`${performance.change > 0 ? 'text-green-500' : 'text-red-500'} font-medium`}>
          {performance.change > 0 ? '+' : ''}{performance.change.toFixed(1)}%
        </div>
      </div>
      
      <div className="h-20 bg-card rounded flex items-end p-1 space-x-1">
        {/* Mini performance chart bars */}
        {performance.data.map((value, index) => (
          <div 
            key={index} 
            className={`flex-1 ${colors.bg} rounded-sm`} 
            style={{ height: `${value}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default StrategyPerformanceCard;
