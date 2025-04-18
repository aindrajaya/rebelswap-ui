import { AssetTrade } from "./api";
import { getUserBalance, getUserPositions, getUserOrders } from './api';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletInfo {
  address: string;
  isConnected: boolean;
}

// Interface with Hyperliquid SDK and MetaMask
export class HyperliquidClient {
  private walletInfo: WalletInfo | null = null;
  private provider: any = null;
  
  constructor() {
    // Check if wallet was previously connected
    this.checkPersistedConnection();
  }
  
  private checkPersistedConnection() {
    try {
      const savedWallet = localStorage.getItem('wallet_connection');
      if (savedWallet) {
        const walletData = JSON.parse(savedWallet);
        if (walletData && walletData.address && walletData.isConnected) {
          this.walletInfo = walletData;
        }
      }
    } catch (e) {
      console.error("Failed to retrieve persisted wallet connection:", e);
    }
  }
  
  private persistConnection() {
    if (this.walletInfo) {
      localStorage.setItem('wallet_connection', JSON.stringify(this.walletInfo));
    } else {
      localStorage.removeItem('wallet_connection');
    }
  }
  
  async connectWallet(walletType: 'metamask' | 'walletconnect' | 'rabby'): Promise<WalletInfo> {
    try {
      if (walletType === 'metamask') {
        if (!window.ethereum) {
          throw new Error("MetaMask not found. Please install the MetaMask extension.");
        }
        
        this.provider = window.ethereum;
        
        // Request account access
        const accounts = await this.provider.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts found. Please ensure MetaMask is connected correctly.");
        }
        
        const address = accounts[0];
        this.walletInfo = { address, isConnected: true };
        
        // Persist connection
        this.persistConnection();
        
        // Setup event listeners for account changes
        this.provider.on('accountsChanged', this.handleAccountsChanged.bind(this));
        this.provider.on('disconnect', this.handleDisconnect.bind(this));
        
        return this.walletInfo;
      } else if (walletType === 'walletconnect') {
        throw new Error("WalletConnect is not implemented yet.");
      } else if (walletType === 'rabby') {
        throw new Error("Rabby wallet is not implemented yet.");
      } else {
        throw new Error("Unsupported wallet type.");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to connect wallet.");
    }
  }
  
  private handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      // User disconnected
      this.disconnectWallet();
    } else {
      // Account changed
      if (this.walletInfo) {
        this.walletInfo.address = accounts[0];
        this.persistConnection();
      }
    }
  }
  
  private handleDisconnect() {
    this.disconnectWallet();
  }
  
  async disconnectWallet(): Promise<void> {
    // Remove event listeners if possible
    if (this.provider) {
      this.provider.removeAllListeners?.('accountsChanged');
      this.provider.removeAllListeners?.('disconnect');
    }
    
    this.walletInfo = null;
    this.provider = null;
    
    // Clear persisted data
    this.persistConnection();
  }
  
  getWalletInfo(): WalletInfo | null {
    return this.walletInfo;
  }
  
  async executeTradesFromCalculation(trades: AssetTrade[]): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletInfo?.isConnected) {
      throw new Error("Wallet not connected. Please connect your wallet first.");
    }
    
    if (!this.provider) {
      throw new Error("Web3 provider not available. Please reconnect your wallet.");
    }
    
    try {
      // Extract the strategy id from the first trade
      const strategyId = trades[0]?.strategy_id;
      
      if (!strategyId) {
        throw new Error("Strategy ID is missing from trade data");
      }
      
      // Convert trades to trade parameters format that the backend expects
      const tradeParameters = trades.map(trade => ({
        asset: trade.asset,
        estimated_asset_price: trade.price,
        estimated_nominal_usd: trade.nominal_usd,
        is_buy: trade.is_buy,
        leverage: trade.leverage,
        size_asset: trade.size_asset
      }));
      
      // Message to sign - typically includes user address and some nonce for security
      const messageToSign = JSON.stringify({
        action: "execute_trades",
        strategy_id: strategyId,
        user_address: this.walletInfo.address,
        timestamp: Date.now(),
        trade_parameters: tradeParameters
      });
      
      console.log("Requesting signature for message:", messageToSign);
      
      // Request signature from wallet
      const signature = await this.provider.request({
        method: 'personal_sign',
        params: [
          `0x${Buffer.from(messageToSign).toString('hex')}`,
          this.walletInfo.address
        ]
      });
      
      if (!signature) {
        throw new Error("Failed to sign message with wallet");
      }
      
      // Send the signed request to our API
      const response = await fetch('/api/trades/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy_id: strategyId,
          trade_parameters: tradeParameters,
          signature,
          user_address: this.walletInfo.address
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        txHash: result.tx_hash
      };
    } catch (error) {
      console.error("Failed to execute trades:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error executing trades"
      };
    }
  }
  
  // Get user's wallet balance (in USDC)
  async getUSDCBalance(): Promise<number> {
    if (!this.walletInfo?.isConnected) {
      return 0;
    }
    
    try {
      // Get balance from API endpoint with real user address
      const balanceData = await getUserBalance(this.walletInfo.address);
      // Return the available balance
      return balanceData.available;
    } catch (error) {
      console.error("Failed to fetch USDC balance:", error);
      
      // Check if the backend might be unavailable or returning HTML instead of JSON
      if (error instanceof SyntaxError && error.message.includes("Unexpected token '<'")) {
        console.warn("Backend API appears to be unavailable or returning HTML instead of JSON. This typically happens when the API server is down or misconfigured.");
        // Return 0 as a fallback value
      }
      
      return 0;
    }
  }
  
  // Get user's positions
  async getUserPositions() {
    if (!this.walletInfo?.isConnected) {
      return [];
    }
    
    try {
      const positions = await getUserPositions(this.walletInfo.address);
      return positions;
    } catch (error) {
      console.error("Failed to fetch positions:", error);
      return [];
    }
  }
  
  // Get user's open orders
  async getUserOrders() {
    if (!this.walletInfo?.isConnected) {
      return [];
    }
    
    try {
      const orders = await getUserOrders(this.walletInfo.address);
      return orders;
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      return [];
    }
  }
}

// Singleton instance
export const hyperliquidClient = new HyperliquidClient();
