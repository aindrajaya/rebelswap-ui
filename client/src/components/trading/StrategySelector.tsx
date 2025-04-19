import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import useStrategies from '@/hooks/useStrategies';

interface StrategySelectorProps {
  selectedStrategy: string | null;
  onSelectStrategy: (strategyId: string) => void;
}

const StrategySelector: React.FC<StrategySelectorProps> = ({ 
  selectedStrategy, 
  onSelectStrategy 
}) => {
  const { strategies, isLoading } = useStrategies();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  
  // Get strategy color based on type
  const getStrategyColor = (strategyId: string) => {
    switch (strategyId) {
      case 'MEGA':
        return 'text-primary';
      case 'DOWN':
        return 'text-rose-500';
      case 'Z00M':
        return 'text-teal-400';
      case 'DUMP':
        return 'text-red-500';
      default:
        return 'text-white';
    }
  };
  
  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.keys(strategies).map((strategyId) => {
        const strategy = strategies[strategyId];
        const isSelected = selectedStrategy === strategyId;
        const colorClass = getStrategyColor(strategyId);
        
        return (
          <Button
            key={strategyId}
            variant="outline"
            className={`flex flex-col items-center justify-center p-4 h-24 border hover:bg-background/90 transition-colors duration-200 ${
              isSelected ? 'border-primary bg-primary/5' : 'border-neutral-700'
            }`}
            onClick={() => onSelectStrategy(strategyId)}
          >
            <span className={`font-bold text-xl ${colorClass}`}>{strategyId}</span>
            <span className="text-[.7rem] text-muted-foreground mt-1/2 text-center">
              {strategy.description.includes('(equal weight)') 
                ? strategy.description.replace(' (equal weight)', '') 
                : strategy.description}
            </span>
            {strategy.description.includes('(equal weight)') && (
              <span className="text-xs text-muted-foreground text-center italic opacity-70 mt-0.5">
                (equal weight)
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default StrategySelector;
