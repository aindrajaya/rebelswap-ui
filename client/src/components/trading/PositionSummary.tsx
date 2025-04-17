import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import useWallet from '@/hooks/useWallet';
import { hyperliquidClient } from '@/lib/hyperliquid';
import { getUserPositions, Position } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface DisplayPosition {
  id: string;
  strategy: string;
  description: string;
  value: number;
  pnl: number;
  pnlPct: number;
  asset: string;
  side: 'long' | 'short';
  borderColor: string;
}

const PositionSummary: React.FC = () => {
  const { address, isConnected } = useWallet();
  
  // Get positions data using React Query
  const { 
    data: positions, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['positions', address],
    queryFn: () => address ? getUserPositions(address) : Promise.resolve([]),
    enabled: !!address && isConnected,
    staleTime: 30000, // 30 seconds
  });
  
  // Convert API positions to display format
  const formatPositions = (apiPositions: Position[]): DisplayPosition[] => {
    return apiPositions.map((position, index) => {
      // Get color based on strategy (if available) or asset
      const getColor = (asset: string, strategy?: string) => {
        if (strategy) {
          switch (strategy) {
            case 'MEGA': return 'border-primary';
            case 'DOWN': return 'border-rose-500';
            case 'Z00M': return 'border-teal-400';
            case 'DUMP': return 'border-red-500';
            default: break;
          }
        }
        
        // If no strategy or unrecognized, use asset-based colors
        switch (asset) {
          case 'BTC': return 'border-orange-500';
          case 'ETH': return 'border-blue-500';
          case 'SOL': return 'border-purple-500';
          default: return 'border-neutral-500';
        }
      };
      
      // Generate description based on position data
      const getDescription = (pos: Position): string => {
        return `${pos.leverage}x ${pos.side === 'long' ? 'Long' : 'Short'} ${pos.asset}`;
      };
      
      return {
        id: `${position.asset}-${index}`,
        strategy: position.strategy || position.asset,
        asset: position.asset,
        side: position.side,
        description: getDescription(position),
        value: position.margin,
        pnl: position.pnl,
        pnlPct: position.pnlPct,
        borderColor: getColor(position.asset, position.strategy)
      };
    });
  };
  
  const displayPositions = positions ? formatPositions(positions) : [];
  
  const handleRefresh = () => {
    refetch();
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
      ) : isError ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="bg-background rounded-full p-3 mb-3">
            <span className="material-icons text-muted-foreground text-2xl text-red-500">error</span>
          </div>
          <h3 className="font-medium text-lg mb-1">Error Loading Positions</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            There was an error loading your positions. Please try again.
          </p>
        </div>
      ) : displayPositions.length === 0 ? (
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
          {displayPositions.map((position) => (
            <div key={position.id} className={`bg-background rounded-lg p-3 border-l-4 ${position.borderColor}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">
                  {position.strategy} 
                  <span className="ml-2 text-xs text-muted-foreground">
                    {position.side === 'long' ? '(Long)' : '(Short)'}
                  </span>
                </div>
                <div className={`text-xs px-2 py-1 ${
                  position.pnlPct > 0 
                    ? 'bg-green-500/20 text-green-500' 
                    : 'bg-red-500/20 text-red-500'
                } rounded`}>
                  {position.pnlPct > 0 ? '+' : ''}{position.pnlPct.toFixed(2)}%
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{position.description}</span>
                <div className="text-right">
                  <div>${position.value.toFixed(2)}</div>
                  <div className={position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)} USDC
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PositionSummary;
