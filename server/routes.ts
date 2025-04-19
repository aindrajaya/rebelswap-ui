import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";

// API endpoints for backend services
// const BACKEND_API_URL = "https://hyperliquid-api.replit.app"; // Flask backend URL
const BACKEND_API_URL = "http://localhost:5000"; // Flask backend URL
const USE_MOCK_DATA = false; // Use mock data instead of real data from Flask backend
console.log("Using backend API URL:", BACKEND_API_URL);

// For debugging
const DEBUG_LOG_REQUESTS = true; // Set to true to log request/response data for debugging

export async function registerRoutes(app: Express): Promise<Server> {
  // Add API prefix to all backend routes
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // Service status endpoint
  apiRouter.get("/status", async (req, res) => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/status`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch backend status:", error);
      res.status(503).json({
        status: "ERROR",
        message: "Backend service is not available.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get all available assets
  apiRouter.get("/assets", async (req, res) => {
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
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get market data
  apiRouter.get("/market-data", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock market data
      return res.json({
        BTC: { price: 67200, change24h: 1.2 },
        ETH: { price: 3350, change24h: -0.5 },
        SOL: { price: 169.5, change24h: 2.3 },
        DOGE: { price: 0.14, change24h: -1.8 },
        SHIB: { price: 0.000025, change24h: 4.2 },
        PEPE: { price: 0.0000096, change24h: 7.5 },
        BONK: { price: 0.00002, change24h: -3.1 },
      });
    }

    try {
      // Get the market data from the backend
      const response = await axios.get(`${BACKEND_API_URL}/market-data`);
      console.log("Raw market data response:", response.data);

      // Simply pass through the data exactly as received for debugging
      // This way we can see the exact format the client is receiving
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch market data:", error);

      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }

      res.status(500).json({
        error: "Failed to fetch market data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get all strategies
  apiRouter.get("/strategies", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock strategy data
      return res.json({
        MEGA: {
          ticker: "MEGA",
          description: "Major crypto assets basket",
          assets: ["BTC", "ETH", "SOL"],
          direction: "long",
          leverage: 3,
          weighting: "equal",
        },
        DOWN: {
          ticker: "DOWN",
          description: "Short market downturns",
          assets: ["BTC", "ETH", "DOGE"],
          direction: "short",
          leverage: 2,
          weighting: "market_cap",
        },
        Z00M: {
          ticker: "Z00M",
          description: "Meme coins growth strategy",
          assets: ["DOGE", "SHIB", "PEPE"],
          direction: "long",
          leverage: 3,
          weighting: "equal",
        },
        DUMP: {
          ticker: "DUMP",
          description: "Inverse meme coins",
          assets: ["DOGE", "SHIB", "BONK"],
          direction: "short",
          leverage: 2,
          weighting: "volatility",
        },
      });
    }

    try {
      const response = await axios.get(`${BACKEND_API_URL}/strategies`);
      console.log("Fetched strategies:", response.data);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch strategies:", error);
      res.status(500).json({
        error: "Failed to fetch strategies",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Calculate trades for a strategy
  apiRouter.post("/trades/calculate", async (req, res) => {
    console.log("Trade calculation request received:", req.body);

    if (USE_MOCK_DATA) {
      // Extract request params
      const { strategy_id, total_usd_size, user_address } = req.body as {
        strategy_id: keyof typeof strategies;
        total_usd_size: number;
        user_address?: string;
      };

      if (!strategy_id || total_usd_size === undefined) {
        return res.status(400).json({
          error: "Missing required parameters",
          details: "strategy_id and total_usd_size are required",
        });
      }

      // Get the strategy from our mock data
      const strategies = {
        MEGA: {
          ticker: "MEGA",
          description: "Major crypto assets basket",
          assets: ["BTC", "ETH", "SOL"],
          direction: "long",
          leverage: 3,
          weighting: "equal",
        },
        DOWN: {
          ticker: "DOWN",
          description: "Short market downturns",
          assets: ["BTC", "ETH", "DOGE"],
          direction: "short",
          leverage: 2,
          weighting: "market_cap",
        },
        Z00M: {
          ticker: "Z00M",
          description: "Meme coins growth strategy",
          assets: ["DOGE", "SHIB", "PEPE"],
          direction: "long",
          leverage: 3,
          weighting: "equal",
        },
        DUMP: {
          ticker: "DUMP",
          description: "Inverse meme coins",
          assets: ["DOGE", "SHIB", "BONK", "PEPE", "WIF"],
          direction: "short",
          leverage: 3,
          weighting: "volatility",
        },
      };

      console.log("Strategy ID received:", strategy_id);

      const strategy = strategies[strategy_id];
      if (!strategy) {
        return res.status(404).json({
          error: "Strategy not found",
          details: `Strategy with ID '${strategy_id}' does not exist`,
        });
      }

      console.log("Selected strategy:", strategy);

      // Asset prices for calculation (mock)
      const assetPrices = {
        BTC: 67200,
        ETH: 3350,
        SOL: 169.5,
        DOGE: 0.10529,
        SHIB: 0.011934,
        PEPE: 0.007388,
        BONK: 0.011979,
        WIF: 0.39694,
      };

      // Generate trades
      const trade_parameters = [];
      const assetCount = strategy.assets.length;
      const sizePerAsset = total_usd_size / assetCount;

      console.log(
        `Calculating for ${assetCount} assets with ${sizePerAsset} USD per asset`,
      );

      for (const asset of strategy.assets) {
        console.log(`Processing asset: ${asset} for strategy: ${strategy_id}`);

        const price = assetPrices[asset as keyof typeof assetPrices] || 0;
        const is_buy = strategy.direction === "long";
        const nominal_per_asset = sizePerAsset * strategy.leverage;

        // Fixed: Only add 'k' prefix if the asset belongs to a strategy requiring it
        // Previous buggy code: const formattedAsset = strategy_id === 'DUMP' ? `k${asset}` : asset;
        const formattedAsset = asset; // No need for 'k' prefix in mock data

        // Calculate size based on price
        const size_asset = Math.floor(nominal_per_asset / price);

        const tradeParam = {
          asset: formattedAsset,
          estimated_asset_price: price,
          estimated_nominal_usd: nominal_per_asset,
          is_buy,
          leverage: strategy.leverage,
          size_asset,
        };

        console.log(`Adding trade parameter:`, tradeParam);

        trade_parameters.push(tradeParam);
      }

      const response = {
        calculation_timestamp_utc: new Date().toISOString(),
        message:
          "Parameters calculated. Frontend must execute these trades via user's wallet.",
        strategy_id,
        trade_parameters,
        user_address_context:
          user_address || "0xe45ee40d56ec816290886e8c91378c50e8f16ec9",
      };

      console.log("Sending trade calculation response:", response);

      return res.json(response);
    }

    try {
      const { strategy_id, total_usd_size, user_address } = req.body;

      if (!strategy_id || total_usd_size === undefined) {
        return res.status(400).json({
          error: "Missing required parameters",
          details: "strategy_id and total_usd_size are required",
        });
      }

      const response = await axios.post(`${BACKEND_API_URL}/trades/calculate`, {
        strategy_id,
        total_usd_size,
        user_address,
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
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Execute trades with wallet signer
  apiRouter.post("/trades/execute", async (req, res) => {
    try {
      console.log("Trade execution request received:", req.body);
      const { strategy_id, trade_parameters, signature, user_address } =
        req.body;

      if (!strategy_id || !trade_parameters || !signature || !user_address) {
        return res.status(400).json({
          error: "Missing required parameters",
          details:
            "strategy_id, trade_parameters, signature, and user_address are required",
        });
      }

      if (USE_MOCK_DATA) {
        // Simulate execution with mock data
        // Wait to simulate network request
        await new Promise((resolve) => setTimeout(resolve, 1500));

        return res.json({
          success: true,
          execution_timestamp_utc: new Date().toISOString(),
          message: "Trades executed successfully",
          strategy_id,
          tx_hash: `0x${Math.random().toString(16).slice(2, 50)}`,
          user_address,
        });
      }

      // Forward the request to the backend with the signature
      const response = await axios.post(`${BACKEND_API_URL}/execute-order`, {
        strategy_id,
        trade_parameters,
        signature,
        user_address,
      });
      console.log("Trade execution response:", response.data);

      res.json(response.data);
    } catch (error) {
      console.error("Failed to execute trades:", error);

      // Handle API-specific error responses
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }

      res.status(500).json({
        error: "Failed to execute trades",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get user positions
  apiRouter.get("/positions/:address", async (req, res) => {
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
          strategy: "MEGA",
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
          strategy: "MEGA",
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
          strategy: "DOWN",
        },
      ]);
    }

    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({
          error: "Missing user address",
          details: "A valid wallet address is required",
        });
      }

      const response = await axios.get(
        `${BACKEND_API_URL}/positions/${address}`,
      );
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch positions:", error);

      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }

      res.status(500).json({
        error: "Failed to fetch positions",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get user strategy P&L
  apiRouter.get("/pnl/:address", async (req, res) => {
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
              strategy: "MEGA",
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
              strategy: "MEGA",
            },
          ],
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
              strategy: "DOWN",
            },
          ],
        },
      ]);
    }

    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({
          error: "Missing user address",
          details: "A valid wallet address is required",
        });
      }

      const response = await axios.get(`${BACKEND_API_URL}/pnl/${address}`);
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch strategy P&L:", error);

      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }

      res.status(500).json({
        error: "Failed to fetch strategy P&L",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get user balance
  apiRouter.get("/balance/:address", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock balance data
      return res.json({
        total: 5000.0,
        available: 2163.34,
        inPositions: 2836.66,
      });
    }

    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({
          error: "Missing user address",
          details: "A valid wallet address is required",
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
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get open orders
  apiRouter.get("/orders/:address", async (req, res) => {
    if (USE_MOCK_DATA) {
      // Provide mock orders data
      return res.json([
        {
          id: "ord-1234567",
          asset: "SOL",
          side: "buy",
          size: 10,
          price: 168.5,
          type: "limit",
          status: "open",
          timestamp: Date.now() - 3600000, // 1 hour ago
        },
        {
          id: "ord-7654321",
          asset: "SHIB",
          side: "sell",
          size: 100000,
          price: 0.000027,
          type: "limit",
          status: "open",
          timestamp: Date.now() - 1800000, // 30 minutes ago
        },
      ]);
    }

    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({
          error: "Missing user address",
          details: "A valid wallet address is required",
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
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
