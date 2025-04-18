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
  
  async executeTradesFromCalculation(
    trades: AssetTrade[], 
    signature?: string, 
    signedMessage?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string; orderId?: string }> {
    if (!this.walletInfo?.isConnected) {
      throw new Error("Wallet not connected. Please connect your wallet first.");
    }
    
    if (!this.provider) {
      throw new Error("Web3 provider not available. Please reconnect your wallet.");
    }
    
    try {
      // For simplicity, we'll handle one trade at a time
      if (trades.length === 0) {
        throw new Error("No trades provided");
      }
      
      const trade = trades[0]; // Process the first trade
      
      // Check if signature was provided, if not obtain one
      let usedSignature = signature;
      let usedMessage = signedMessage;
      
      if (!usedSignature || !usedMessage) {
        // Request signature from wallet for authentication
        usedMessage = JSON.stringify({
          action: "execute_order",
          asset: trade.asset,
          size: trade.size_asset,
          is_buy: trade.is_buy,
          price: trade.estimated_asset_price,
          timestamp: Date.now(),
        });
        
        console.log("Requesting signature for message:", usedMessage);
        
        usedSignature = await this.provider.request({
          method: 'personal_sign',
          params: [
            `0x${Buffer.from(usedMessage).toString('hex')}`,
            this.walletInfo.address
          ]
        });
        
        if (!usedSignature) {
          throw new Error("Failed to sign message with wallet");
        }
      }
      
      // Send the order to the API
      const response = await fetch('/execute-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset: trade.asset,
          size: trade.size_asset,
          is_buy: trade.is_buy,
          price: trade.estimated_asset_price,
          user_address: this.walletInfo.address,
          signature: usedSignature,
          signedMessage: usedMessage
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        orderId: result.order_id,
        txHash: result.tx_hash || result.result
      };
    } catch (error) {
      console.error("Failed to execute trades:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error executing trades"
      };
    }
  }
  
  async placeOrder(
    asset: string,
    is_buy: boolean,
    size: number,
    price: number
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    if (!this.walletInfo?.isConnected) {
      throw new Error("Wallet not connected. Please connect your wallet first.");
    }
    
    if (!this.provider) {
      throw new Error("Web3 provider not available. Please reconnect your wallet.");
    }
    
    try {
      // Create a message to sign for authentication
      const message = JSON.stringify({
        action: "place_order",
        asset: asset,
        is_buy: is_buy,
        size: size,
        price: price,
        timestamp: Date.now(),
      });
      
      console.log("Requesting signature for order:", {
        asset,
        is_buy,
        size,
        price
      });
      
      // Request signature from wallet
      const signature = await this.provider.request({
        method: 'personal_sign',
        params: [
          `0x${Buffer.from(message).toString('hex')}`,
          this.walletInfo.address
        ]
      });
      
      if (!signature) {
        throw new Error("Failed to sign order with wallet");
      }
      
      // Send the order to the API
      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset: asset,
          is_buy: is_buy,
          size: size,
          price: price,
          user_address: this.walletInfo.address,
          signature: signature,
          signedMessage: message
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        orderId: result.order_id || result.orderId
      };
    } catch (error) {
      console.error("Failed to place order:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error placing order"
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
