import React from 'react';
import TradeForm from '@/components/trading/TradeForm';
import PositionSummary from '@/components/trading/PositionSummary';
import PerformanceDashboard from '@/components/dashboard/PerformanceDashboard';
import MarketOverview from '@/components/dashboard/MarketOverview';

const Home: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Trading Interface */}
      <div className="lg:col-span-1 space-y-6">
        <TradeForm />
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
