import { parse } from "path";
import { AssetTrade } from "./api";
import { getUserBalance, getUserPositions, getUserOrders } from "./api";
import { ethers } from "ethers";

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
  private signer: ethers.Signer | null = null;

  constructor() {
    // Check if wallet was previously connected
    this.checkPersistedConnection();
  }

  private async checkPersistedConnection() {
    try {
      const savedWallet = localStorage.getItem("wallet_connection");
      if (savedWallet) {
        const walletData = JSON.parse(savedWallet);
        if (walletData && walletData.address && walletData.isConnected) {
          this.walletInfo = walletData;
          
          // Try to reconnect to the provider when restoring from localStorage
          if (window.ethereum) {
            this.provider = window.ethereum;
            
            // Setup event listeners for account changes
            this.provider.on(
              "accountsChanged",
              this.handleAccountsChanged.bind(this)
            );
            this.provider.on("disconnect", this.handleDisconnect.bind(this));
            
            // Initialize the signer since it can't be stored in localStorage
            try {
              const ethersProvider = new ethers.BrowserProvider(window.ethereum);
              this.signer = await ethersProvider.getSigner();
              console.log("Signer initialized from persisted connection:", this.signer);
            } catch (signerError) {
              console.warn("Could not initialize signer from persisted connection:", signerError);
              // Continue without signer, it will be reinitialized when needed
            }
            
            // Verify the connection is still valid
            this.verifyConnection();
          }
        }
      }
    } catch (e) {
      console.error("Failed to retrieve persisted wallet connection:", e);
    }
  }
  
  // Verify that the stored wallet connection is still valid
  private async verifyConnection() {
    if (!this.provider) return;
    
    try {
      // Check if we're still connected to the wallet
      const accounts = await this.provider.request({ 
        method: 'eth_accounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        // If no accounts, we're not connected anymore
        console.log("Stored wallet connection is no longer valid");
        this.disconnectWallet();
      } else if (this.walletInfo && accounts[0].toLowerCase() !== this.walletInfo.address.toLowerCase()) {
        // If the account changed, update it
        this.walletInfo.address = accounts[0];
        this.persistConnection();
      }
    } catch (error) {
      console.error("Error verifying wallet connection:", error);
      this.disconnectWallet();
    }
  }

  private persistConnection() {
    if (this.walletInfo) {
      localStorage.setItem(
        "wallet_connection",
        JSON.stringify(this.walletInfo),
      );
    } else {
      localStorage.removeItem("wallet_connection");
    }
  }

  // Get ethers signer and update walletInfo
  async getSignerAndConnect(): Promise<WalletInfo> {
    try {
      if (!window.ethereum) {
        throw new Error("No crypto wallet found");
      }
      
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      await ethersProvider.send("eth_requestAccounts", []);
      this.signer = await ethersProvider.getSigner();

      console.log("Signer:", this.signer);
      
      // Get the address from signer
      const address = await this.signer.getAddress();
      
      // Update provider and wallet info
      this.provider = window.ethereum;
      this.walletInfo = { address, isConnected: true };
      
      // Persist connection
      this.persistConnection();
      
      // Setup event listeners for account changes
      this.provider.on(
        "accountsChanged",
        this.handleAccountsChanged.bind(this)
      );
      this.provider.on("disconnect", this.handleDisconnect.bind(this));
      
      return this.walletInfo;
    } catch (error) {
      console.error("Failed to connect wallet with signer:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to connect wallet with signer."
      );
    }
  }

  // Get the ethers signer if available
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  async connectWallet(
    walletType: "metamask" | "walletconnect" | "rabby",
  ): Promise<WalletInfo> {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (walletType === "metamask") {
        // For MetaMask, first try the native wallet or extension
        if (window.ethereum?.isMetaMask) {
          this.provider = window.ethereum;
          const accounts = await this.provider.request({ method: 'eth_requestAccounts' });
          if (!accounts || accounts.length === 0) {
            throw new Error("No accounts found. Please ensure MetaMask is connected correctly.");
          }
          const address = accounts[0];
          this.walletInfo = { address, isConnected: true };
          
          // Initialize the signer
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          this.signer = await ethersProvider.getSigner();
          console.log("Signer initialized:", this.signer);
          
          // Persist connection
          this.persistConnection();
          
          // Setup event listeners for account changes
          this.provider.on(
            "accountsChanged",
            this.handleAccountsChanged.bind(this),
          );
          this.provider.on("disconnect", this.handleDisconnect.bind(this));
          
          return this.walletInfo;
        }
        // If MetaMask is not available and we're on mobile, try WalletConnect
        else if (isMobile) {
          walletType = "walletconnect";
        } else {
          throw new Error("MetaMask not detected. Please install the MetaMask extension.");
        }
      }

      // Use WalletConnect
      if (walletType === "walletconnect") {
        // Use WalletConnect
        const { EthereumProvider } = await import(
          "@walletconnect/ethereum-provider"
        );
        this.provider = await EthereumProvider.init({
          projectId: "e98a926432923ad3a689e9e93eea792f", // WalletConnect project ID
          chains: [1], // Ethereum mainnet
          showQrModal: true,
        });

        const accounts = await this.provider.enable();
        if (!accounts || accounts.length === 0) {
          throw new Error(
            "No accounts found. Please ensure your wallet is connected correctly."
          );
        }

        const address = accounts[0];
        this.walletInfo = { address, isConnected: true };

        // Initialize the signer for WalletConnect
        const ethersProvider = new ethers.BrowserProvider(this.provider);
        this.signer = await ethersProvider.getSigner();
        console.log("WalletConnect signer initialized:", this.signer);

        // Persist connection

        this.persistConnection();

        // Setup event listeners for account changes
        this.provider.on(
          "accountsChanged",
          this.handleAccountsChanged.bind(this),
        );
        this.provider.on("disconnect", this.handleDisconnect.bind(this));

        return this.walletInfo;
      } else if (walletType === "rabby") {
        // Implement Rabby wallet connection
        if (window.ethereum) {
          this.provider = window.ethereum;
          const accounts = await this.provider.request({ method: 'eth_requestAccounts' });
          if (!accounts || accounts.length === 0) {
            throw new Error("No accounts found. Please ensure Rabby is connected correctly.");
          }
          const address = accounts[0];
          this.walletInfo = { address, isConnected: true };
          
          // Initialize the signer for Rabby
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          this.signer = await ethersProvider.getSigner();
          console.log("Rabby signer initialized:", this.signer);
          
          // Persist connection
          this.persistConnection();
          
          // Setup event listeners for account changes
          this.provider.on(
            "accountsChanged",
            this.handleAccountsChanged.bind(this),
          );
          this.provider.on("disconnect", this.handleDisconnect.bind(this));
          
          return this.walletInfo;
        } else {
          throw new Error("Rabby wallet not detected.");
        }
      } else {
        throw new Error("Unsupported wallet type.");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to connect wallet.",
      );
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
      this.provider.removeAllListeners?.("accountsChanged");
      this.provider.removeAllListeners?.("disconnect");
    }

    this.walletInfo = null;
    this.provider = null;
    this.signer = null; // Explicitly clear the signer

    // Clear persisted data
    this.persistConnection();
  }

  getWalletInfo(): WalletInfo | null {
    return this.walletInfo;
  }

  // Private method to handle API calls to place orders
  private async sendOrderToAPI(orderData: any, signature: {r: string, s: string, v: number}): Promise<{
    success: boolean;
    orderId?: string;
    txHash?: string;
    error?: string;
  }> {

    console.log("sendOrderToAPI called with:", {
      orderSummary: {
        asset: orderData.asset,
        is_buy: orderData.is_buy,
        size: orderData.size,
      },
      signaturePreview: signature
    });
    
    if (!this.walletInfo?.isConnected) {
      throw new Error("Wallet not connected. Please connect your wallet first.");
    }

    try {
      // Use absolute URL instead of relative path
      const apiUrl = window.location.origin + '/api/place-order';
      console.log("Sending request to API endpoint:", apiUrl);
      
      // Send the order to the API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: orderData,
          signature: signature,
          user_address: this.walletInfo.address,
        }),
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `Server responded with status: ${response.status}`;
        try {
          // Try to get error details from response if possible
          const errorText = await response.text();
          console.error("Error response text:", errorText);
          
          // Try to parse as JSON if possible
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // If not JSON, use the text directly
            if (errorText) errorMessage = errorText;
          }
        } catch (readError) {
          console.error("Failed to read error response:", readError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("API success response:", result);

      return {
        success: true,
        orderId: result.order_id || result.orderId,
        txHash: result.tx_hash || result.result,
      };
    } catch (error) {
      console.error("Failed to send order to API:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error sending order",
      };
    }
  }

  async executeTradesFromCalculation(
    trades: AssetTrade[],
    signature?: string,
    signedMessage?: string,
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    orderId?: string;
  }> {
    console.log("Executing trades from calculation:", trades);

    if (!this.walletInfo?.isConnected) {
      throw new Error(
        "Wallet not connected. Please connect your wallet first.",
      );
    }

    if (!this.provider) {
      throw new Error(
        "Web3 provider not available. Please reconnect your wallet.",
      );
    }

    try {
      // For simplicity, we'll handle one trade at a time
      if (trades.length === 0) {
        throw new Error("No trades provided");
      }
      let parsedSignature = {r: '', s: '', v: 0};
      const trade = trades[0]; // Process the first trade

      // If signature already provided, use it
      if (signature && signedMessage) {
        console.log("Using provided signature");
      } else {
        // Use EIP-712 signing for better security instead of personal_sign
        console.log("Creating EIP-712 signature for trade");
        
        // Create structured data for signing
        const tradeAction = {
          asset: trade.asset,
          is_buy: trade.is_buy,
          size: parseFloat(trade.size_asset),
          price: trade.estimated_asset_price,
          timestamp: Math.floor(Date.now() / 1000),
          userAddress: this.walletInfo.address.toLowerCase()
        };
        
        // Define payload types
        const tradePayloadTypes = [
          { name: "asset", type: "string" },
          { name: "is_buy", type: "bool" },
          { name: "size", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "userAddress", type: "address" }
        ];
        
        // Get signature using the improved signAction method
        signature = await this.signAction(
          tradeAction,
          tradePayloadTypes,
          "Trade",
          421614,
          "0xFbEA9559AE33214a080c03c68EcF1D3AF0f58A7D"
        );

        // Parse signature string into r, s, v components if it's a string
        if (typeof signature === 'string') {
          // Check if it's a hex string starting with 0x
          if (signature.startsWith('0x') && signature.length === 132) {
            const r = signature.slice(0, 66);
            const s = '0x' + signature.slice(66, 130);
            const v = parseInt(signature.slice(130, 132), 16);
            parsedSignature = { r, s, v };
          } else {
            // Instead of using res.status(), throw an error that will be caught by the catch block
            throw new Error(`Invalid signature format: Signature string could not be parsed into r, s, v components`);
          }
        } else if (!parsedSignature.r || !parsedSignature.s || typeof parsedSignature.v === 'undefined') {
          // Same here, throw an error instead
          throw new Error(`Invalid signature format: Signature must contain r, s, and v components`);
        }
        
        
        // Store the JSON string of the message for sending to backend
        signedMessage = JSON.stringify(tradeAction);
      }

      if (!signature) {
        throw new Error("Failed to sign message with wallet");
      }

      // Prepare order data for API
      const orderData = {
        asset: trade.asset,
        is_buy: trade.is_buy,
        size: parseFloat(trade.size_asset),
        price: trade.estimated_asset_price,
        timestamp: Math.floor(Date.now() / 1000),
        userAddress: this.walletInfo.address.toLowerCase(),
        strategy_id: trade.strategy_id
      };

      // Send the order to the API using the consolidated method
      return await this.sendOrderToAPI(orderData, parsedSignature);
    } catch (error) {
      console.error("Failed to execute trades:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error executing trades",
      };
    }
  }

  // The execute trade button run this function
  async placeOrder(
    asset: string,
    is_buy: boolean,
    size: number,
    price: number,
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    console.log("This placeOrder clicked and Executing trades:", size);
    console.log("Current signer status:", this.signer ? "Available" : "Not available");

    if (!this.walletInfo?.isConnected) {
      throw new Error(
        "Wallet not connected. Please connect your wallet first.",
      );
    }

    if (!this.provider) {
      throw new Error(
        "Web3 provider not available. Please reconnect your wallet.",
      );
    }

    // Check if signer is available, if not attempt to reinitialize it
    if (!this.signer) {
      console.log("Signer not available, attempting to reinitialize...");
      try {
        const ethersProvider = new ethers.BrowserProvider(this.provider);
        this.signer = await ethersProvider.getSigner();
        console.log("Signer reinitialized:", this.signer);
      } catch (error) {
        console.error("Failed to reinitialize signer:", error);
        throw new Error("Failed to initialize transaction signer. Please reconnect your wallet.");
      }
    }

    try {
      // Create the order payload
      const orderAction = {
        asset: asset,
        is_buy: is_buy,
        size: size,
        price: price,
        timestamp: Math.floor(Date.now() / 1000),
        userAddress: this.walletInfo.address.toLowerCase()
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

      // Sign the order with EIP-712
      console.log("Signing order with EIP-712:", orderAction);
      const signature = await this.signAction(
        orderAction,
        orderPayloadTypes,
        "Order",
        421614, // Arbitrum testnet chainId
        "0xFbEA9559AE33214a080c03c68EcF1D3AF0f58A7D" // Example contract address - replace with actual address
      );

      // Parse signature string into r, s, v components if it's a string
      let parsedSignature  = {r: '', s: '', v: 0};
      if (typeof signature === 'string') {
        // Check if it's a hex string starting with 0x
        if (signature.startsWith('0x') && signature.length === 132) {
          const r = signature.slice(0, 66);
          const s = '0x' + signature.slice(66, 130);
          const v = parseInt(signature.slice(130, 132), 16);
          parsedSignature = { r, s, v };
        } else {
          // Instead of using res.status(), throw an error that will be caught by the catch block
          throw new Error(`Invalid signature format: Signature string could not be parsed into r, s, v components`);
        }
      } else if (!parsedSignature.r || !parsedSignature.s || typeof parsedSignature.v === 'undefined') {
        // Same here, throw an error instead
        throw new Error(`Invalid signature format: Signature must contain r, s, and v components`);
      }

      console.log("Parsed signature:", parsedSignature);

      const signatureType = typeof signature;
      console.log("Signature type:", signatureType);
      const signatureLenght = signatureType === 'string' ? signature.length : 0;
      console.log("Signature length:", signatureLenght === 132 ? "Valid" : "Invalid");
      const signatureStartWith0x = signature.startsWith('0x');
      console.log("Signature starts with 0x:", signatureStartWith0x);

      console.log("Order signed with signature:", parsedSignature);

      if (!parsedSignature) {
        throw new Error("Failed to sign order with wallet");
      }

      // Send the order to the API using the consolidated method
      return await this.sendOrderToAPI(orderAction, parsedSignature);
    } catch (error) {
      console.error("Failed to place order:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error placing order",
      };
    }
  }

  // Method to sign actions with EIP-712 typed data
  async signAction(
    action: any, 
    payloadTypes: any[], 
    primaryType: string, 
    chainId: number = 421614, // Default to Arbitrum testnet
    verifyingContract: string = "0xFbEA9559AE33214a080c03c68EcF1D3AF0f58A7D" // Default contract address
  ): Promise<string> {
    if (!this.signer) {
      try {
        const ethersProvider = new ethers.BrowserProvider(this.provider);
        this.signer = await ethersProvider.getSigner();
      } catch (error) {
        console.error("Failed to initialize signer:", error);
        throw new Error("Wallet signer not available. Please reconnect your wallet.");
      }
    }

    // Handle numeric values properly for blockchain signing
    const formattedAction = { ...action };
    
    // Convert floating point numbers to integers (scaled by precision multiplier)
    if (typeof formattedAction.size === 'number') {
      // Convert to integer by multiplying by 1e6 and then to string
      const precision = 1000000; // 1e6
      formattedAction.size = Math.floor(formattedAction.size * precision).toString();
      console.log("Formatted size for signing:", formattedAction.size);
    }
    
    if (typeof formattedAction.price === 'number') {
      // For price, use higher precision (1e8)
      const precision = 100000000; // 1e8
      formattedAction.price = Math.floor(formattedAction.price * precision).toString();
      console.log("Formatted price for signing:", formattedAction.price);
    }
    
    if (typeof formattedAction.timestamp === 'number') {
      formattedAction.timestamp = Math.floor(formattedAction.timestamp).toString();
    }
    
    // Format the domain data
    const domain = {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: chainId,
      verifyingContract: verifyingContract,
    };

    // Format the EIP-712 data structure correctly
    const types = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      [primaryType]: payloadTypes
    };

    // ALWAYS prefer direct provider signing when available
    if (this.provider && this.provider.request) {
      try {
        console.log("Using direct provider-level eth_signTypedData_v4 (recommended)");
        
        const typedData = {
          domain,
          types,
          primaryType,
          message: formattedAction
        };
        
        const signature = await this.provider.request({
          method: 'eth_signTypedData_v4',
          params: [this.walletInfo?.address, JSON.stringify(typedData)]
        });
        
        console.log("Direct signature obtained:", signature);
        return signature;
      } catch (error) {
        console.warn("Direct provider signing failed:", error);
        // Fall through to ethers.js method as fallback
      }
    }
    
    // Fallback to ethers.js if direct method fails
    try {
      console.log("Falling back to ethers.js signTypedData");
      const signature = await this.signer.signTypedData(
        domain,
        { [primaryType]: payloadTypes },
        formattedAction
      );
      
      console.log("Ethers.js signature obtained:", signature);
      return signature;
    } catch (error) {
      console.error("Failed to sign typed data:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
      }
      throw new Error("Failed to sign transaction. Please try again.");
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
      if (
        error instanceof SyntaxError &&
        error.message.includes("Unexpected token '<'")
      ) {
        console.warn(
          "Backend API appears to be unavailable or returning HTML instead of JSON. This typically happens when the API server is down or misconfigured.",
        );
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