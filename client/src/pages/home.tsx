import React from 'react';
import TradeForm from '@/components/trading/TradeForm';
import PositionSummary from '@/components/trading/PositionSummary';
import AutoRebalance from '@/components/trading/AutoRebalance';
import PerformanceDashboard from '@/components/dashboard/PerformanceDashboard';
import MarketOverview from '@/components/dashboard/MarketOverview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Home: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Trading Interface */}
      <div className="lg:col-span-1 space-y-6">
        <Tabs defaultValue="trade" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="trade">Manual Trade</TabsTrigger>
            <TabsTrigger value="auto">Auto-Rebalance</TabsTrigger>
          </TabsList>
          <TabsContent value="trade">
            <TradeForm />
          </TabsContent>
          <TabsContent value="auto">
            <AutoRebalance />
          </TabsContent>
        </Tabs>
        
        <PositionSummary />
      </div>
      
      {/* Right Column: Performance Dashboard */}
      <div className="lg:col-span-2 space-y-6">
        <PerformanceDashboard />
        <MarketOverview />
      </div>
    </div>
  );
};

export default Home;
