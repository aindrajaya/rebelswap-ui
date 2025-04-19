import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import useMarketData from '@/hooks/useMarketData';
import useAssets from '@/hooks/useAssets';

const MarketOverview: React.FC = () => {
  const { assets, isLoading: isLoadingAssets } = useAssets();
  const { marketData, isLoading: isLoadingMarketData, isConnected } = useMarketData();
  
  // Optional: Mock volumes (these would come from the API in production)
  const assetVolumes: Record<string, string> = {
    BTC: '42.8B',
    ETH: '18.3B',
    SOL: '3.2B',
    DOGE: '1.5B',
    SHIB: '921.5M',
    PEPE: '456.2M',
    BONK: '124.3M'
  };
  
  const isLoading = isLoadingAssets || isLoadingMarketData;
  
  // Format assets for display
  const displayAssets = assets.filter(asset => Object.keys(marketData).includes(asset))
    .map(asset => ({
      name: asset,
      price: marketData[asset]?.price || 0,
      change24h: marketData[asset]?.change24h || 0,
      volume24h: assetVolumes[asset] || '$0'
    }))
    .sort((a, b) => b.price - a.price); // Sort by price descending
  
  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold">Market Overview</CardTitle>
        {isConnected && (
          <div className="flex items-center text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            <span>Live Updates</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-800">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">24h Change</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume</th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-neutral-800">
                {displayAssets.map((asset) => (
                  <tr key={asset.name} className="hover:bg-background/70">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-medium">{asset.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                      ${asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: asset.price < 0.01 ? 8 : 2
                      })}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-right ${
                      asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {asset.volume24h}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketOverview;
