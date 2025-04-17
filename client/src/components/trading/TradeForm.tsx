import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import useWallet from '@/hooks/useWallet';
import useStrategies from '@/hooks/useStrategies';
import { calculateTrades, TradeCalculationParams, AssetTrade, TradeCalculationResult } from '@/lib/api';
import { hyperliquidClient } from '@/lib/hyperliquid';
import StrategySelector from './StrategySelector';

interface TradeFormValues {
  amount: string;
}

const slippageOptions = [0.5, 1.0, 1.5, 2.0];

const TradeForm: React.FC = () => {
  const { toast } = useToast();
  const { address, isConnected, balance } = useWallet();
  const { strategies } = useStrategies();
  
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [slippage, setSlippage] = useState(1.5);
  const [tradePreview, setTradePreview] = useState<AssetTrade[] | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TradeFormValues>({
    defaultValues: {
      amount: ''
    }
  });
  
  const amount = watch('amount');
  
  // Reset the preview when inputs change
  useEffect(() => {
    setTradePreview(null);
  }, [amount, selectedStrategy]);
  
  // Calculate trade mutation
  const calculateMutation = useMutation({
    mutationFn: (params: TradeCalculationParams) => calculateTrades(params),
    onSuccess: (data: TradeCalculationResult) => {
      setTradePreview(data.trades);
      setTotalAmount(data.total_nominal_usd);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Calculation Failed",
        description: error instanceof Error ? error.message : "Failed to calculate trade",
      });
    }
  });
  
  // Execute trade mutation
  const executeMutation = useMutation({
    mutationFn: (trades: AssetTrade[]) => hyperliquidClient.executeTradesFromCalculation(trades),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Trade Executed Successfully",
          description: `Transaction hash: ${data.txHash?.slice(0, 10)}...`,
        });
        
        // Reset form
        setValue('amount', '');
        setTradePreview(null);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Trade Execution Failed",
        description: error instanceof Error ? error.message : "Failed to execute trade",
      });
    }
  });
  
  const onSubmit = (values: TradeFormValues) => {
    if (!selectedStrategy) {
      toast({
        variant: "destructive",
        title: "Strategy Required",
        description: "Please select a strategy first.",
      });
      return;
    }
    
    const amountNum = parseFloat(values.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid investment amount.",
      });
      return;
    }
    
    // If we already have a preview, execute the trade
    if (tradePreview) {
      executeMutation.mutate(tradePreview);
      return;
    }
    
    // Otherwise calculate the preview
    calculateMutation.mutate({
      strategy_id: selectedStrategy,
      total_usd_size: amountNum,
      user_address: address || undefined
    });
  };
  
  const handleSetMaxAmount = () => {
    if (balance > 0) {
      setValue('amount', balance.toString());
    }
  };
  
  const getDirectionLabel = (isBuy: boolean) => {
    return isBuy ? (
      <span className="text-xs text-green-500">LONG</span>
    ) : (
      <span className="text-xs text-red-500">SHORT</span>
    );
  };
  
  const strategy = selectedStrategy ? strategies[selectedStrategy] : null;
  
  return (
    <div className="bg-card rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Strategy Selection</h2>
      
      {/* Strategy Selector */}
      <div className="mb-6">
        <StrategySelector
          selectedStrategy={selectedStrategy}
          onSelectStrategy={setSelectedStrategy}
        />
      </div>
      
      {/* Trade Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <h3 className="text-lg font-medium mb-3">Trade Configuration</h3>
        
        {/* Selected Strategy Display */}
        {selectedStrategy && strategy && (
          <div className="bg-background p-3 rounded-lg flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className={`material-icons text-lg ${strategy.direction === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                {strategy.direction === 'long' ? 'trending_up' : 'trending_down'}
              </span>
              <div>
                <div className="font-semibold">{selectedStrategy}</div>
                <div className="text-xs text-muted-foreground">{strategy.description}</div>
              </div>
            </div>
            <button 
              type="button" 
              className="text-xs text-muted-foreground hover:text-white"
              onClick={() => setSelectedStrategy(null)}
            >
              <span className="material-icons text-sm">edit</span>
            </button>
          </div>
        )}
        
        {/* Investment Amount Input */}
        <div className="mb-4">
          <Label htmlFor="investment-amount" className="text-sm font-medium mb-1 text-muted-foreground">
            Investment Amount (USDC)
          </Label>
          <div className="relative">
            <Input
              id="investment-amount"
              type="number"
              className="bg-background text-white w-full px-4 py-3 rounded-lg border border-neutral-700 focus:border-primary"
              placeholder="Enter amount"
              min="10"
              step="10"
              disabled={calculateMutation.isPending || executeMutation.isPending}
              {...register('amount', { 
                required: "Amount is required",
                min: { value: 10, message: "Minimum amount is 10 USDC" }
              })}
            />
            <Button 
              type="button"
              variant="ghost" 
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-neutral-700 hover:bg-neutral-600 px-2 py-1 rounded text-white h-6"
              onClick={handleSetMaxAmount}
              disabled={!isConnected || balance <= 0}
            >
              MAX
            </Button>
          </div>
          {errors.amount && (
            <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Balance: {isConnected ? balance.toFixed(2) : '0.00'} USDC
          </div>
        </div>
        
        {/* Leverage Display */}
        {strategy && (
          <div className="flex items-center justify-between py-2 border-t border-b border-neutral-800 my-4">
            <span className="text-sm text-muted-foreground">Leverage</span>
            <span className="font-semibold text-teal-400">{strategy.leverage}x</span>
          </div>
        )}
        
        {/* Slippage Control */}
        <div className="mb-6">
          <Label className="block text-sm font-medium mb-1 text-muted-foreground">
            Slippage Tolerance
          </Label>
          <div className="flex space-x-2">
            {slippageOptions.map((option) => (
              <Button
                key={option}
                type="button"
                variant="outline"
                className={`flex-1 py-2 ${slippage === option ? 'bg-primary border-primary' : 'bg-background border-neutral-700 hover:bg-neutral-700'}`}
                onClick={() => setSlippage(option)}
              >
                {option}%
              </Button>
            ))}
          </div>
        </div>
        
        {/* Trade Preview & Execute Button */}
        <div>
          {tradePreview && (
            <div className="mb-4 p-4 bg-background rounded-lg border border-neutral-700">
              <h4 className="font-medium mb-2">Trade Preview</h4>
              <div className="space-y-2 text-sm">
                {tradePreview.map((trade, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-white">{trade.asset}</span>
                      <span className="ml-2">{getDirectionLabel(trade.is_buy)}</span>
                    </div>
                    <div className="font-medium">{trade.size_asset} {trade.asset}</div>
                  </div>
                ))}
                
                <div className="mt-3 pt-2 border-t border-neutral-800 flex justify-between items-center">
                  <span>Total (inc. fees)</span>
                  <span className="font-semibold text-white">{totalAmount.toFixed(2)} USDC</span>
                </div>
              </div>
            </div>
          )}
          
          <Button
            type="submit"
            className={`w-full py-3 ${
              tradePreview 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-primary hover:bg-primary/80'
            }`}
            disabled={calculateMutation.isPending || executeMutation.isPending || !selectedStrategy || !amount}
          >
            {calculateMutation.isPending ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                Calculating...
              </>
            ) : executeMutation.isPending ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                Executing...
              </>
            ) : tradePreview ? (
              'Execute Trade'
            ) : (
              'Preview Trade'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TradeForm;
