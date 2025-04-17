import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { storage } from "./storage";
import axios from "axios";

// API endpoints for backend services
const BACKEND_API_URL = "http://api.hyperliquid.xyz"; // Hyperliquid API URL
const USE_MOCK_DATA = true; // Toggle to use mock data while developing

export async function registerRoutes(app: Express): Promise<Server> {
  // Service status endpoint
  app.get("/api/status", async (req, res) => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/status`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch backend status:", error);
      res.status(503).json({
        status: "ERROR",
        message: "Backend service is not available.",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all available assets
  app.get("/api/assets", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock assets data
      return res.json(["BTC", "ETH", "SOL", "DOGE", "SHIB", "PEPE", "BONK"]);
    }
    
    try {
      const response = await axios.get(`${BACKEND_API_URL}/assets`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      res.status(500).json({
        error: "Failed to fetch assets",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all strategies
  app.get("/api/strategies", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock strategy data
      return res.json({
        "MEGA": {
          ticker: "MEGA",
          description: "Major crypto assets basket",
          assets: ["BTC", "ETH", "SOL"],
          direction: "long",
          leverage: 3,
          weighting: "equal"
        },
        "DOWN": {
          ticker: "DOWN",
          description: "Short market downturns",
          assets: ["BTC", "ETH", "DOGE"],
          direction: "short",
          leverage: 2,
          weighting: "market_cap"
        },
        "Z00M": {
          ticker: "Z00M",
          description: "Meme coins growth strategy",
          assets: ["DOGE", "SHIB", "PEPE"],
          direction: "long", 
          leverage: 3,
          weighting: "equal"
        },
        "DUMP": {
          ticker: "DUMP",
          description: "Inverse meme coins",
          assets: ["DOGE", "SHIB", "BONK"],
          direction: "short",
          leverage: 2,
          weighting: "volatility"
        }
      });
    }
    
    try {
      const response = await axios.get(`${BACKEND_API_URL}/strategies`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch strategies:", error);
      res.status(500).json({
        error: "Failed to fetch strategies",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Calculate trades for a strategy
  app.post("/api/trades/calculate", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Extract request params
      const { strategy_id, total_usd_size, user_address } = req.body;
      
      if (!strategy_id || total_usd_size === undefined) {
        return res.status(400).json({
          error: "Missing required parameters",
          details: "strategy_id and total_usd_size are required"
        });
      }
      
      // Get the strategy from our mock data
      const strategies = {
        "MEGA": {
          ticker: "MEGA",
          description: "Major crypto assets basket",
          assets: ["BTC", "ETH", "SOL"],
          direction: "long",
          leverage: 3,
          weighting: "equal"
        },
        "DOWN": {
          ticker: "DOWN",
          description: "Short market downturns",
          assets: ["BTC", "ETH", "DOGE"],
          direction: "short",
          leverage: 2,
          weighting: "market_cap"
        },
        "Z00M": {
          ticker: "Z00M",
          description: "Meme coins growth strategy",
          assets: ["DOGE", "SHIB", "PEPE"],
          direction: "long", 
          leverage: 3,
          weighting: "equal"
        },
        "DUMP": {
          ticker: "DUMP",
          description: "Inverse meme coins",
          assets: ["DOGE", "SHIB", "BONK"],
          direction: "short",
          leverage: 2,
          weighting: "volatility"
        }
      };
      
      const strategy = strategies[strategy_id];
      if (!strategy) {
        return res.status(404).json({
          error: "Strategy not found",
          details: `Strategy with ID '${strategy_id}' does not exist`
        });
      }
      
      // Asset prices for calculation (mock)
      const assetPrices = {
        BTC: 67200,
        ETH: 3350,
        SOL: 169.5,
        DOGE: 0.14,
        SHIB: 0.000025,
        PEPE: 0.0000096,
        BONK: 0.00002
      };
      
      // Generate trades
      const trades = [];
      const assetCount = strategy.assets.length;
      const sizePerAsset = total_usd_size / assetCount;
      
      for (const asset of strategy.assets) {
        const price = assetPrices[asset] || 0;
        const is_buy = strategy.direction === 'long';
        const size_asset = (sizePerAsset * strategy.leverage / price).toFixed(8);
        const estimated_nominal_usd = sizePerAsset * strategy.leverage;
        
        trades.push({
          asset,
          is_buy,
          size_asset,
          leverage: strategy.leverage,
          estimated_nominal_usd
        });
      }
      
      return res.json({
        strategy,
        trades,
        total_nominal_usd: total_usd_size * strategy.leverage,
        timestamp: Date.now()
      });
    }
    
    try {
      const { strategy_id, total_usd_size, user_address } = req.body;
      
      if (!strategy_id || total_usd_size === undefined) {
        return res.status(400).json({
          error: "Missing required parameters",
          details: "strategy_id and total_usd_size are required"
        });
      }
      
      const response = await axios.post(`${BACKEND_API_URL}/trades/calculate`, {
        strategy_id,
        total_usd_size,
        user_address
      });
      
      res.json(response.data);
    } catch (error) {
      console.error("Failed to calculate trades:", error);
      
      // Handle API-specific error responses
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      res.status(500).json({
        error: "Failed to calculate trades",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get user positions
  app.get("/api/positions/:address", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock position data
      // Creating positions that match our strategies
      return res.json([
        {
          asset: "BTC",
          size: 0.05,
          side: "long",
          entryPrice: 65000,
          markPrice: 67200,
          pnl: 110,
          pnlPct: 3.38,
          liquidationPrice: 45000,
          leverage: 3,
          margin: 1083.33,
          strategy: "MEGA"
        },
        {
          asset: "ETH",
          size: 0.8,
          side: "long",
          entryPrice: 3200,
          markPrice: 3350,
          pnl: 120,
          pnlPct: 4.69,
          liquidationPrice: 2200,
          leverage: 3,
          margin: 853.33,
          strategy: "MEGA"
        },
        {
          asset: "DOGE",
          size: 12000,
          side: "short",
          entryPrice: 0.15,
          markPrice: 0.14,
          pnl: 120,
          pnlPct: 6.67,
          liquidationPrice: 0.22,
          leverage: 2,
          margin: 900,
          strategy: "DOWN"
        }
      ]);
    }
    
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({
          error: "Missing user address",
          details: "A valid wallet address is required"
        });
      }
      
      const response = await axios.get(`${BACKEND_API_URL}/positions/${address}`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch positions:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      res.status(500).json({
        error: "Failed to fetch positions",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get user strategy P&L
  app.get("/api/strategy_pnl/:address", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock strategy PnL data
      return res.json([
        {
          strategyId: "MEGA",
          totalPnl: 230,
          totalPnlPct: 3.84,
          positionCount: 2,
          positions: [
            {
              asset: "BTC",
              size: 0.05,
              side: "long",
              entryPrice: 65000,
              markPrice: 67200,
              pnl: 110,
              pnlPct: 3.38,
              liquidationPrice: 45000,
              leverage: 3,
              margin: 1083.33,
              strategy: "MEGA"
            },
            {
              asset: "ETH",
              size: 0.8,
              side: "long",
              entryPrice: 3200,
              markPrice: 3350,
              pnl: 120,
              pnlPct: 4.69,
              liquidationPrice: 2200,
              leverage: 3,
              margin: 853.33,
              strategy: "MEGA"
            }
          ]
        },
        {
          strategyId: "DOWN",
          totalPnl: 120,
          totalPnlPct: 6.67,
          positionCount: 1,
          positions: [
            {
              asset: "DOGE",
              size: 12000,
              side: "short",
              entryPrice: 0.15,
              markPrice: 0.14,
              pnl: 120,
              pnlPct: 6.67,
              liquidationPrice: 0.22,
              leverage: 2,
              margin: 900,
              strategy: "DOWN"
            }
          ]
        }
      ]);
    }
    
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({
          error: "Missing user address",
          details: "A valid wallet address is required"
        });
      }
      
      const response = await axios.get(`${BACKEND_API_URL}/strategy_pnl/${address}`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch strategy P&L:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      res.status(500).json({
        error: "Failed to fetch strategy P&L",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get user balance
  app.get("/api/balance/:address", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock balance data
      return res.json({
        total: 5000.00,
        available: 2163.34,
        inPositions: 2836.66
      });
    }
    
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({
          error: "Missing user address",
          details: "A valid wallet address is required"
        });
      }
      
      const response = await axios.get(`${BACKEND_API_URL}/balance/${address}`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch user balance:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      res.status(500).json({
        error: "Failed to fetch user balance",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get open orders
  app.get("/api/orders/:address", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock orders data
      return res.json([
        {
          id: "ord-1234567",
          asset: "SOL",
          side: "buy",
          size: 10,
          price: 168.50,
          type: "limit",
          status: "open",
          timestamp: Date.now() - 3600000 // 1 hour ago
        },
        {
          id: "ord-7654321",
          asset: "SHIB",
          side: "sell",
          size: 100000,
          price: 0.000027,
          type: "limit",
          status: "open",
          timestamp: Date.now() - 1800000 // 30 minutes ago
        }
      ]);
    }
    
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({
          error: "Missing user address",
          details: "A valid wallet address is required"
        });
      }
      
      const response = await axios.get(`${BACKEND_API_URL}/orders/${address}`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch open orders:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      res.status(500).json({
        error: "Failed to fetch open orders",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Fix TypeScript issues
  app.post("/api/trades/calculate", (req, res) => {
    if (USE_MOCK_DATA) {
      const { strategy_id, total_usd_size } = req.body;
      
      if (!strategy_id || total_usd_size === undefined) {
        return res.status(400).json({
          error: "Missing required parameters",
          details: "strategy_id and total_usd_size are required"
        });
      }
      
      // Type-safe access to strategies
      const strategies: Record<string, any> = {
        "MEGA": {
          ticker: "MEGA",
          description: "Major crypto assets basket",
          assets: ["BTC", "ETH", "SOL"],
          direction: "long",
          leverage: 3,
          weighting: "equal"
        },
        "DOWN": {
          ticker: "DOWN",
          description: "Short market downturns",
          assets: ["BTC", "ETH", "DOGE"],
          direction: "short",
          leverage: 2,
          weighting: "market_cap"
        },
        "Z00M": {
          ticker: "Z00M",
          description: "Meme coins growth strategy",
          assets: ["DOGE", "SHIB", "PEPE"],
          direction: "long", 
          leverage: 3,
          weighting: "equal"
        },
        "DUMP": {
          ticker: "DUMP",
          description: "Inverse meme coins",
          assets: ["DOGE", "SHIB", "BONK"],
          direction: "short",
          leverage: 2,
          weighting: "volatility"
        }
      };
      
      const strategy = strategies[strategy_id as string];
      if (!strategy) {
        return res.status(404).json({
          error: "Strategy not found",
          details: `Strategy with ID '${strategy_id}' does not exist`
        });
      }
      
      // Type-safe asset prices
      const assetPrices: Record<string, number> = {
        BTC: 67200,
        ETH: 3350,
        SOL: 169.5,
        DOGE: 0.14,
        SHIB: 0.000025,
        PEPE: 0.0000096,
        BONK: 0.00002
      };
      
      // Generate trades
      const trades = [];
      const assetCount = strategy.assets.length;
      const sizePerAsset = parseFloat(total_usd_size as string) / assetCount;
      
      for (const asset of strategy.assets) {
        const price = assetPrices[asset] || 0;
        const is_buy = strategy.direction === 'long';
        const size_asset = (sizePerAsset * strategy.leverage / price).toFixed(8);
        const estimated_nominal_usd = sizePerAsset * strategy.leverage;
        
        trades.push({
          asset,
          is_buy,
          size_asset,
          leverage: strategy.leverage,
          estimated_nominal_usd
        });
      }
      
      return res.json({
        strategy,
        trades,
        total_nominal_usd: parseFloat(total_usd_size as string) * strategy.leverage,
        timestamp: Date.now()
      });
    }
    
    // If not using mock data, forward to real API
    // This part is handled separately
  });

  // Setup WebSocket server for real-time updates
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Client connections
  const clients = new Map();
  
  // Handle WebSocket connections
  wss.on('connection', (ws, req) => {
    const clientId = req.headers['sec-websocket-key'] || Date.now().toString();
    clients.set(clientId, ws);
    
    console.log(`WebSocket client connected: ${clientId}`);
    
    // Send welcome message
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to RebelSwap WebSocket server',
        timestamp: Date.now()
      }));
    }
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`Received message from client ${clientId}:`, data);
        
        // Handle message types
        if (data.type === 'subscribe' && data.channel) {
          // Store subscription info with the client
          const client = clients.get(clientId);
          if (client) {
            client.subscriptions = client.subscriptions || [];
            if (!client.subscriptions.includes(data.channel)) {
              client.subscriptions.push(data.channel);
            }
            
            // Confirm subscription
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'subscribed',
                channel: data.channel,
                timestamp: Date.now()
              }));
            }
          }
        }
      } catch (err) {
        console.error(`Error processing message from client ${clientId}:`, err);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });
  });
  
  // Broadcast market updates to subscribed clients
  // This would be called by an external market data source in a real implementation
  const broadcastMarketUpdates = () => {
    // Sample market data (in production, this would come from the Hyperliquid API)
    const marketData = {
      BTC: { price: 67200 + (Math.random() * 200 - 100), change24h: 1.2 },
      ETH: { price: 3350 + (Math.random() * 20 - 10), change24h: -0.5 },
      SOL: { price: 169.5 + (Math.random() * 2 - 1), change24h: 2.3 },
      // Add other assets as needed
    };
    
    const message = JSON.stringify({
      type: 'market_update',
      data: marketData,
      timestamp: Date.now()
    });
    
    // Send to all subscribed clients
    clients.forEach((client, id) => {
      if (client.readyState === client.OPEN && 
          client.subscriptions && 
          client.subscriptions.includes('market')) {
        client.send(message);
      }
    });
  };
  
  // Start broadcasting market updates every 5 seconds
  if (USE_MOCK_DATA) {
    setInterval(broadcastMarketUpdates, 5000);
  }
  
  return httpServer;
}
