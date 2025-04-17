import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import useWallet from '@/hooks/useWallet';
import { hyperliquidClient } from '@/lib/hyperliquid';

interface Position {
  id: string;
  strategy: string;
  description: string;
  value: number;
  pnl: number;
  borderColor: string;
}

const PositionSummary: React.FC = () => {
  const { isConnected } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const loadPositions = async () => {
    if (!isConnected) {
      setPositions([]);
      return;
    }
    
    setIsLoading(true);
    try {
      // This would call the Hyperliquid API in production
      // For now we simulate some positions
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sample positions - in production these would come from the API
      if (Math.random() > 0.3) { // Sometimes show empty state for demo
        setPositions([
          {
            id: '1',
            strategy: 'MEGA',
            description: '3x Long BTC, ETH, SOL',
            value: 120.45,
            pnl: 12.4,
            borderColor: 'border-primary'
          },
          {
            id: '2',
            strategy: 'Z00M',
            description: '3x Long Meme Coins',
            value: 94.20,
            pnl: -5.8,
            borderColor: 'border-teal-400'
          }
        ]);
      } else {
        setPositions([]);
      }
    } catch (error) {
      console.error('Failed to load positions:', error);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadPositions();
  }, [isConnected]);
  
  const handleRefresh = () => {
    loadPositions();
  };
  
  return (
    <div className="bg-card rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Positions</h2>
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs bg-background hover:bg-neutral-700 px-3 py-1 h-8"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <span className={`material-icons text-sm mr-1 ${isLoading ? 'animate-spin' : ''}`}>
            {isLoading ? 'sync' : 'refresh'}
          </span> 
          Refresh
        </Button>
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !isConnected ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="bg-background rounded-full p-3 mb-3">
            <span className="material-icons text-muted-foreground text-2xl">account_balance_wallet</span>
          </div>
          <h3 className="font-medium text-lg mb-1">Connect Wallet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Connect your wallet to view your active positions.
          </p>
        </div>
      ) : positions.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="bg-background rounded-full p-3 mb-3">
            <span className="material-icons text-muted-foreground text-2xl">account_balance</span>
          </div>
          <h3 className="font-medium text-lg mb-1">No Active Positions</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Make your first trade to see your positions here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((position) => (
            <div key={position.id} className={`bg-background rounded-lg p-3 border-l-4 ${position.borderColor}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">{position.strategy} Strategy</div>
                <div className={`text-xs px-2 py-1 ${
                  position.pnl > 0 
                    ? 'bg-green-500/20 text-green-500' 
                    : 'bg-red-500/20 text-red-500'
                } rounded`}>
                  {position.pnl > 0 ? '+' : ''}{position.pnl.toFixed(1)}%
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{position.description}</span>
                <span>${position.value.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PositionSummary;
