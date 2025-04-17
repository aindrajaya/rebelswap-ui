import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";

// API endpoints for backend services
const BACKEND_API_URL = "http://localhost:5000"; // Backend API URL (Python Flask service)

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

  const httpServer = createServer(app);
  return httpServer;
}
