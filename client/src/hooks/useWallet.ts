import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { hyperliquidClient } from '@/lib/hyperliquid';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  balance: number;
  isConnecting: boolean;
  signer: any | null; // Add signer to the interface
}

export type WalletType = 'metamask' | 'walletconnect' | 'rabby';

export function useWallet() {
  const { toast } = useToast();
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    balance: 0,
    isConnecting: false,
    signer: null // Initialize signer as null
  });

  // Initialize wallet state from client on mount
  useEffect(() => {
    const walletInfo = hyperliquidClient.getWalletInfo();
    if (walletInfo?.isConnected) {
      updateWalletState();
    }
  }, []);

  // Update full wallet state including balance
  const updateWalletState = useCallback(async () => {
    const walletInfo = hyperliquidClient.getWalletInfo();
    if (walletInfo?.isConnected) {
      const balance = await hyperliquidClient.getUSDCBalance();
      const signer = hyperliquidClient.getSigner(); // Get signer from hyperliquidClient
      
      setWalletState({
        address: walletInfo.address,
        isConnected: true,
        balance,
        isConnecting: false,
        signer // Include the signer in the state
      });
    } else {
      setWalletState({
        address: null,
        isConnected: false,
        balance: 0,
        isConnecting: false,
        signer: null
      });
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async (type: WalletType) => {
    try {
      setWalletState(prev => ({ ...prev, isConnecting: true }));
      await hyperliquidClient.connectWallet(type);
      await updateWalletState();
      
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully.",
      });
    } catch (error) {
      console.error("Wallet connection error:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
      });
    }
  }, [toast, updateWalletState]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await hyperliquidClient.disconnectWallet();
      setWalletState({
        address: null,
        isConnected: false,
        balance: 0,
        isConnecting: false,
        signer: null // Clear the signer on disconnect
      });
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
      });
    } catch (error) {
      console.error("Wallet disconnection error:", error);
      
      toast({
        variant: "destructive",
        title: "Disconnection Failed",
        description: "Failed to disconnect wallet",
      });
    }
  }, [toast]);

  return {
    ...walletState,
    connect,
    disconnect,
    updateWalletState
  };
}

export default useWallet;
