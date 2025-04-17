import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMarketData } from '@/hooks/useAssets';

const MarketOverview: React.FC = () => {
  const marketData = getMarketData();
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Market Overview</CardTitle>
      </CardHeader>
      <CardContent>
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
              {marketData.map((asset) => (
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
                    {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    ${asset.volume24h}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketOverview;
