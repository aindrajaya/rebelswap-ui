import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import useWallet from '@/hooks/useWallet';
import useStrategies from '@/hooks/useStrategies';
import { 
  calculateTrades, 
  TradeCalculationParams, 
  AssetTrade, 
  TradeCalculationResult,
  executeOrder,
  ExecuteOrderParams 
} from '@/lib/api';
import { hyperliquidClient } from '@/lib/hyperliquid';
import StrategySelector from './StrategySelector';

// Utility function to convert string to hex (Browser-compatible alternative to Buffer.from)
const stringToHex = (str: string): string => {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const hexValue = charCode.toString(16);
    // Ensure two-digit hex values
    hex += hexValue.padStart(2, '0');
  }
  return '0x' + hex;
};

interface TradeFormValues {
  amount: string;
}

interface TradeParameterDetails {
  asset: string;
  estimated_asset_price: number;
  estimated_nominal_usd: number;
  is_buy: boolean;
  leverage: number;
  size_asset: string;
}

interface TradeCalculationDetails {
  calculation_timestamp_utc: string;
  message: string;
  strategy_id: string;
  trade_parameters: TradeParameterDetails[];
  user_address_context?: string;
}

const slippageOptions = [0.5, 1.0, 1.5, 2.0];

const TradeForm: React.FC = () => {
  const { toast } = useToast();
  const { address, isConnected, balance, signer, connect, updateWalletState } = useWallet();
  const { strategies } = useStrategies();
  
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [slippage, setSlippage] = useState(1.5);
  const [tradePreview, setTradePreview] = useState<AssetTrade[] | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isDetailedPreviewOpen, setIsDetailedPreviewOpen] = useState(false);
  const [detailedTradeData, setDetailedTradeData] = useState<TradeCalculationDetails | null>(null);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TradeFormValues>({
    defaultValues: {
      amount: ''
    }
  });
  
  const amount = watch('amount');
  
  // Reset the preview when inputs change
  useEffect(() => {
    setTradePreview(null);
    setIsPreviewMode(true);
  }, [amount, selectedStrategy]);
  
  // Calculate trade mutation
  const calculateMutation = useMutation({
    mutationFn: (params: TradeCalculationParams) => {
      console.log("Sending trade calculation request with strategy:", params.strategy_id);
      return calculateTrades(params);
    },
    onSuccess: (data: TradeCalculationResult) => {
      // Log the full API response data for debugging
      console.log("Preview Trade API response:", data);
      
      // Log the strategy ID and assets received to check for mismatch
      console.log("Strategy requested:", selectedStrategy);
      if (data.trade_parameters) {
        console.log("Assets in response:", data.trade_parameters.map(p => p.asset).join(', '));
      }
      
      // Ensure backward compatibility for old code
      if (data.trades) {
        setTradePreview(data.trades);
      }
      
      if (data.total_nominal_usd) {
        setTotalAmount(data.total_nominal_usd);
      } else if (data.trade_parameters) {
        // Calculate total from trade parameters if total_nominal_usd is not provided
        setTotalAmount(data.trade_parameters.reduce(
          (sum, param) => sum + param.estimated_nominal_usd, 0
        ));
      }
      
      setIsPreviewMode(false);
      
      // Set detailed trade data directly from the API response
      setDetailedTradeData(data);
      setIsDetailedPreviewOpen(true);
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
    mutationFn: async (trades: AssetTrade[]) => {
      // Verify that signer is available
      if (!signer) {
        throw new Error("Wallet signer not available. Please reconnect your wallet.");
      }
      
      try {
        // Create a message to sign for the trade execution
        const strategyId = trades[0]?.strategy_id;
        const message = `Execute trades for strategy ${strategyId} at ${new Date().toISOString()}`;
        
        // Sign the message with the wallet
        console.log("Requesting signature for message:", message);
        const signature = await signer.signMessage(message);
        
        console.log("Sending to backend:", {
          trades,
          signature,
          signedMessage: message,
          walletAddress: address
        });
        
        // Execute trades with signature and message
        return hyperliquidClient.executeTradesFromCalculation(trades, signature, message);
      } catch (error) {
        console.error("Error during trade execution signing:", error);
        throw new Error("Failed to sign transaction with wallet");
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Trade Executed Successfully",
          description: `Transaction hash: ${data.txHash?.slice(0, 10)}...`,
        });
        
        // Reset form
        setValue('amount', '');
        setTradePreview(null);
        setIsPreviewMode(true);
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
  
  // Execute order directly mutation using Hyperliquid SDK
  const executeOrderMutation = useMutation({
    mutationFn: async (params: ExecuteOrderParams) => {
      console.log("executeOrderMutation started with params:", {
        asset: params.asset, 
        is_buy: params.is_buy ? 'BUY' : 'SELL',
        size: params.size
      });
      
      // Verify that wallet is connected
      if (!isConnected) {
        console.error("Wallet not connected");
        throw new Error("Wallet not connected. Please connect your wallet.");
      }
      
      try {
        // Create structured data for EIP-712 signing instead of simple message signing
        const orderAction = {
          asset: params.asset,
          is_buy: params.is_buy,
          size: params.size,
          price: params.price,
          timestamp: Math.floor(Date.now() / 1000),
          userAddress: address?.toLowerCase()
        };

        // Define the payload types for EIP-712 signing
        const orderPayloadTypes = [
          { name: "asset", type: "string" },
          { name: "is_buy", type: "bool" },
          { name: "size", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "userAddress", type: "address" }
        ];

        console.log("Executing order via Hyperliquid client");
        console.log("Order details:", orderAction);
        
        // Use direct provider level eth_signTypedData_v4 if possible
        if (window.ethereum && window.ethereum.request) {
          try {
            console.log("Attempting to sign with native provider eth_signTypedData_v4");
            
            // Create a formatted copy of the order with proper number handling
            const formattedOrder = { ...orderAction };
            
            // Convert floating point numbers to integers for blockchain compatibility
            if (typeof formattedOrder.size === 'number') {
              // Use 1e6 as precision multiplier (e.g., 0.012168 becomes "12168000")
              const precision = 1000000;
              formattedOrder.size = Math.floor(formattedOrder.size * precision).toString();
              console.log("Formatted size:", formattedOrder.size);
            }
            
            if (typeof formattedOrder.price === 'number') {
              // Use 1e8 for price precision
              const precision = 100000000;
              formattedOrder.price = Math.floor(formattedOrder.price * precision).toString();
              console.log("Formatted price:", formattedOrder.price);
            }
            
            if (typeof formattedOrder.timestamp === 'number') {
              formattedOrder.timestamp = Math.floor(formattedOrder.timestamp).toString();
            }
            
            const domain = {
              name: "HyperliquidSignTransaction",
              version: "1",
              chainId: 421614, // Arbitrum testnet
              verifyingContract: "0xFbEA9559AE33214a080c03c68EcF1D3AF0f58A7D" // Default contract address
            };
            
            const typedData = {
              domain,
              types: {
                EIP712Domain: [
                  { name: "name", type: "string" },
                  { name: "version", type: "string" },
                  { name: "chainId", type: "uint256" },
                  { name: "verifyingContract", type: "address" }
                ],
                Order: orderPayloadTypes
              },
              primaryType: "Order",
              message: formattedOrder
            };
            
            console.log("Typing data payload:", JSON.stringify(typedData, null, 2));
            
            // Sign directly with provider
            const signature = await window.ethereum.request({
              method: 'eth_signTypedData_v4',
              params: [address, JSON.stringify(typedData)]
            });
            
            console.log("Direct signature obtained:", signature);
            
            // Use absolute URL instead of relative path
            const apiUrl = window.location.origin + '/api/place-order';
            console.log("Sending order to API endpoint:", apiUrl, {
              order: orderAction,
              signature: signature?.substring(0, 20) + "...", // Log part of the signature for brevity
              user_address: address,
            });
            
            // Send the signed order to the backend
            const result = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                order: orderAction,
                signature: signature,
                user_address: address,
              }),
            });
            
            console.log("Fetch response received:", {
              status: result.status,
              statusText: result.statusText,
              ok: result.ok
            });
            
            if (!result.ok) {
              const errorText = await result.text();
              console.error("API error response:", errorText);
              throw new Error(`API responded with status: ${result.status}`);
            }
            
            const responseData = await result.json();
            console.log("API success response:", responseData);
            
            return {
              order_id: responseData.order_id || responseData.orderId || "Order executed",
              status: "FILLED",
              message: "Order executed successfully"
            };
          } catch (directSignError) {
            console.warn("Direct provider signing failed, falling back to client method:", directSignError);
            // Fall back to hyperliquidClient if direct signing fails
          }
        }
        
        // Fall back to the standard client method if direct signing is not available
        console.log("Using hyperliquidClient.placeOrder as fallback");
        const result = await hyperliquidClient.placeOrder(
          params.asset,
          params.is_buy,
          params.size,
          params.price
        );
        
        if (!result.success) {
          throw new Error(result.error || "Failed to execute order");
        }
        
        return {
          order_id: result.orderId || "Order executed",
          status: "FILLED",
          message: "Order executed successfully"
        };
      } catch (error) {
        console.error("Error during order execution:", error);
        if (error instanceof Error) {
          console.error("Error details:", error.message, error.stack);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Order executed successfully:", data);
      toast({
        title: "Order Executed Successfully",
        description: `Order ID: ${data.order_id}`,
      });
      
      // Reset form
      setValue('amount', '');
      setTradePreview(null);
      setIsPreviewMode(true);
      setIsDetailedPreviewOpen(false);
    },
    onError: (error) => {
      console.error("Order execution failed:", error);
      toast({
        variant: "destructive",
        title: "Order Execution Failed",
        description: error instanceof Error ? error.message : "Failed to execute order",
      });
    }
  });
  
  // Function to execute a single trade
  const handleExecuteSingleTrade = async (param: TradeParameterDetails) => {
    console.log("Execute Trade button clicked for asset:", param.asset);
    
    // Check if wallet is connected
    if (!isConnected || !address) {
      console.log("Wallet not connected, attempting to connect...");
      
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to execute trades.",
        variant: "default"
      });
      
      try {
        // Connect wallet directly using MetaMask
        await connect('metamask');
        
        // Double check if we now have a signer
        if (!signer) {
          console.error("No signer available even after connection");
          toast({
            variant: "destructive",
            title: "Signing Capability Required",
            description: "Your wallet doesn't provide signing capability needed for trades.",
          });
          return;
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: error instanceof Error ? error.message : "Failed to connect wallet",
        });
        return;
      }
    }
    
    const sizeNumber = parseFloat(param.size_asset);
    if (isNaN(sizeNumber)) {
      console.error("Invalid size:", param.size_asset);
      toast({
        variant: "destructive",
        title: "Invalid Size",
        description: "Trade size is invalid",
      });
      return;
    }
    
    try {
      console.log("Preparing to execute order with params:", {
        asset: param.asset,
        size: sizeNumber,
        is_buy: param.is_buy,
        price: param.estimated_asset_price,
        user_address: address
      });
      
      const data = executeOrderMutation.mutate({
        asset: param.asset,
        size: sizeNumber,
        is_buy: param.is_buy,
        price: param.estimated_asset_price,
        user_address: address
      });

      console.log("Order execution response GO:", data);
    } catch (error) {
      console.error("Error when calling executeOrderMutation:", error);
      toast({
        variant: "destructive",
        title: "Execution Error",
        description: error instanceof Error ? error.message : "An error occurred during trade execution",
      });
    }
  };

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
    
    // If we are in preview mode, calculate the preview
    if (isPreviewMode) {
      calculateMutation.mutate({
        strategy_id: selectedStrategy,
        total_usd_size: amountNum,
        user_address: address || undefined
      });
      return;
    }
    
    // Check if wallet is connected for execution
    if (!isConnected) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet with signing capability to execute trades.",
      });
      return;
    }
    
    // If we have detailed trade data from the API, use it for execution
    if (detailedTradeData) {
      // Convert trade parameters to trades format
      const tradesFromDetails = detailedTradeData.trade_parameters.map(param => ({
        asset: param.asset,
        is_buy: param.is_buy,
        leverage: param.leverage,
        price: param.estimated_asset_price,
        size_asset: param.size_asset,
        estimated_nominal_usd: param.estimated_nominal_usd,
        strategy_id: detailedTradeData.strategy_id
      }));
      
      executeMutation.mutate(tradesFromDetails);
    } else if (tradePreview) {
      // Fallback to older format if detailed data is not available
      executeMutation.mutate(tradePreview);
    }
  };
  
  const handleSetMaxAmount = () => {
    if (balance > 0) {
      setValue('amount', balance.toString());
    }
  };
  
  const handleResetPreview = () => {
    setTradePreview(null);
    setIsPreviewMode(true);
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
        
        {/* Connection Warning */}
        {!isConnected && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-900/30 border border-yellow-700 text-yellow-500 text-sm">
            <div className="flex items-start">
              <span className="material-icons text-lg mr-2">warning</span>
              <div>
                <p>You need to connect your wallet to execute trades.</p>
                <p className="text-xs mt-1">Preview is still available without connecting.</p>
              </div>
            </div>
          </div>
        )}
        
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
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Trade Preview</h4>
                <button 
                  type="button" 
                  className="text-xs text-muted-foreground hover:text-white"
                  onClick={handleResetPreview}
                >
                  <span className="material-icons text-sm">refresh</span>
                </button>
              </div>
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
              !isPreviewMode 
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
            ) : !isPreviewMode ? (
              'Execute Trade'
            ) : (
              'Preview Trade'
            )}
          </Button>
        </div>
      </form>

      {/* Detailed Trade Preview Dialog */}
      <Dialog open={isDetailedPreviewOpen} onOpenChange={setIsDetailedPreviewOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trade Calculation Details</DialogTitle>
          </DialogHeader>
          
          {detailedTradeData && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Strategy</span>
                <span className="font-bold">{detailedTradeData.strategy_id}</span>
              </div>
              
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-muted-foreground">Calculation Time</span>
                <span>{new Date(detailedTradeData.calculation_timestamp_utc).toLocaleString()}</span>
              </div>
              
              <div className="bg-neutral-800/50 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">Message</div>
                <div className="text-sm">{detailedTradeData.message}</div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-3">Trade Parameters</h3>
                <div className="space-y-3">
                  {detailedTradeData.trade_parameters.map((param, index) => (
                    <div key={index} className="bg-neutral-800/30 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className="font-medium">{param.asset}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${param.is_buy ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {param.is_buy ? 'BUY' : 'SELL'}
                          </span>
                        </div>
                        <span className="text-xs text-teal-400">{param.leverage}x</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Size</div>
                          <div className="font-medium">{param.size_asset} {param.asset}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Est. Price</div>
                          <div className="font-medium">${param.estimated_asset_price.toFixed(6)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Est. Nominal USD</div>
                          <div className="font-medium">${param.estimated_nominal_usd.toFixed(2)}</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleExecuteSingleTrade(param)}
                        className="mt-3 w-full"
                        disabled={executeOrderMutation.isPending}
                      >
                        {executeOrderMutation.isPending ? (
                          <>
                            <span className="animate-spin inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                            Executing...
                          </>
                        ) : (
                          'Execute Trade'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              {detailedTradeData.user_address_context && (
                <div className="text-xs text-muted-foreground mt-4">
                  <div>User Address</div>
                  <div className="font-mono break-all">{detailedTradeData.user_address_context}</div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => setIsDetailedPreviewOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TradeForm;

