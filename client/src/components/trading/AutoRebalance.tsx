import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import useAutoRebalance, { StrategyAllocation } from '@/hooks/useAutoRebalance';
import useWallet from '@/hooks/useWallet';

const AutoRebalance: React.FC = () => {
  const { isConnected } = useWallet();
  const {
    config,
    isRebalancing,
    allocations,
    rebalanceHistory,
    isLoading,
    lastChecked,
    rebalanceStrategy,
    toggleAutoRebalance,
    updateConfig
  } = useAutoRebalance();
  
  const [activeTab, setActiveTab] = useState('overview');
  
  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Calculate time since last check
  const getLastCheckedText = () => {
    if (!lastChecked) return 'Never';
    
    const seconds = Math.floor((Date.now() - lastChecked) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return formatTimestamp(lastChecked);
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Auto-Rebalancing</CardTitle>
            <CardDescription>
              Automatically maintain your desired asset allocation
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${config.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
              {config.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch 
              checked={config.enabled} 
              onCheckedChange={toggleAutoRebalance} 
              disabled={!isConnected || isLoading}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!isConnected ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="bg-background rounded-full p-3 mb-3">
              <span className="material-icons text-muted-foreground text-2xl">account_balance_wallet</span>
            </div>
            <h3 className="font-medium text-lg mb-1">Connect Wallet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Connect your wallet to configure auto-rebalancing.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-background p-3 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground mb-1">Drift Threshold</div>
                  <div className="font-semibold">{config.driftThreshold}%</div>
                </div>
                <div className="bg-background p-3 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground mb-1">Check Interval</div>
                  <div className="font-semibold">{config.checkInterval / 1000}s</div>
                </div>
                <div className="bg-background p-3 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground mb-1">Last Checked</div>
                  <div className="font-semibold text-xs">{getLastCheckedText()}</div>
                </div>
              </div>
              
              <h3 className="text-md font-medium mt-4 mb-2">Strategy Allocations</h3>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 bg-background rounded-md"></div>
                  ))}
                </div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No allocations found
                </div>
              ) : (
                <div className="space-y-3">
                  {allocations.map((allocation) => (
                    <div key={allocation.strategyId} className="flex items-center justify-between bg-background p-3 rounded-lg">
                      <div>
                        <div className="font-medium flex items-center">
                          {allocation.strategyId}
                          {allocation.needsRebalance && (
                            <Badge variant="outline" className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              Needs rebalance
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current: ${allocation.currentValue.toFixed(2)} ({allocation.allocation.toFixed(1)}%)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Target: ${allocation.targetValue.toFixed(2)} (Drift: {allocation.drift.toFixed(1)}%)
                        </div>
                      </div>
                      
                      {allocation.needsRebalance && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => rebalanceStrategy(allocation.strategyId)}
                          disabled={isRebalancing}
                        >
                          {isRebalancing ? (
                            <>
                              <span className="animate-spin inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                              Rebalancing...
                            </>
                          ) : (
                            'Rebalance'
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Drift Threshold (%)</h3>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[config.driftThreshold]}
                      min={1}
                      max={15}
                      step={0.5}
                      onValueChange={([value]) => updateConfig({ driftThreshold: value })}
                    />
                    <span className="w-12 text-center">{config.driftThreshold}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rebalance when a strategy drifts this percentage from its target
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Check Interval (seconds)</h3>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[config.checkInterval / 1000]}
                      min={30}
                      max={300}
                      step={30}
                      onValueChange={([value]) => updateConfig({ checkInterval: value * 1000 })}
                    />
                    <span className="w-12 text-center">{config.checkInterval / 1000}s</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    How often to check if rebalancing is needed
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Max Rebalances Per Day</h3>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[config.maxRebalancesPerDay]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={([value]) => updateConfig({ maxRebalancesPerDay: value })}
                    />
                    <span className="w-12 text-center">{config.maxRebalancesPerDay}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Limit the number of automatic rebalances per day
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="history">
              {rebalanceHistory.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No rebalancing history
                </div>
              ) : (
                <div className="space-y-3">
                  {rebalanceHistory.slice().reverse().map((item, index) => (
                    <div key={index} className="bg-background p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{item.strategyId}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between text-sm">
                        <span>From: ${item.from.toFixed(2)}</span>
                        <span>To: ${item.to.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoRebalance;