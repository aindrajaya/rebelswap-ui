# app.py

import os
import time
import logging
from decimal import Decimal, ROUND_DOWN, getcontext
import pandas as pd
from flask import Flask, jsonify, request, abort
from dotenv import load_dotenv
from typing import List, Dict, Optional

from hyperliquid.info import Info
from hyperliquid.utils import constants

# Set Decimal precision (important for financial calculations)
getcontext().prec = 28 # Set precision for Decimal operations

# --- Configuration ---
load_dotenv() # Load environment variables from .env file

# NOTE: Backend *only* needs Info client, no private keys needed here.
HL_TESTNET_URL = constants.TESTNET_API_URL # Make sure this points to the correct Info API URL

# --- RebelSwap Strategy Definitions ---
REBELSWAP_STRATEGIES = {
    "MEGA": {
        "ticker": "MEGA",
        "description": "3x Long BTC, ETH, SOL (equal weight)",
        "assets": ["BTC", "ETH", "SOL"],
        "direction": "long",
        "leverage": 3,
        "weighting": "equal"
    },
    "DOWN": {
        "ticker": "DOWN",
        "description": "3x Short BTC, ETH, SOL (equal weight)",
        "assets": ["BTC", "ETH", "SOL"],
        "direction": "short",
        "leverage": 3,
        "weighting": "equal"
    },
    "Z00M": {
        "ticker": "Z00M",
        "description": "3x Long DOGE, SHIB, PEPE, BONK, WIF (equal weight)",
        # Note: Ensure these meme coins are listed and tradable on HL Testnet!
        "assets": ["DOGE", "SHIB", "PEPE", "BONK", "WIF"],
        "direction": "long",
        "leverage": 3,
        "weighting": "equal"
    },
    "DUMP": {
        "ticker": "DUMP",
        "description": "3x Short DOGE, SHIB, PEPE, BONK, WIF (equal weight)",
        "assets": ["DOGE", "SHIB", "PEPE", "BONK", "WIF"],
        "direction": "short",
        "leverage": 3,
        "weighting": "equal"
    }
}

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Initialize Hyperliquid Info Client ---
info_client: Optional[Info] = None
UNIVERSE: Dict[str, Dict] = {}

try:
    logging.info(f"Initializing Hyperliquid Info client for Testnet: {HL_TESTNET_URL}")
    # Ensure the constant points to the correct Testnet URL: e.g., https://api.hyperliquid-testnet.xyz
    info_client = Info(HL_TESTNET_URL, skip_ws=True)
    # Verify connection by fetching metadata once at startup
    logging.info("Fetching initial metadata to confirm connection...")
    all_meta = info_client.meta()
    if not all_meta or "universe" not in all_meta:
         raise ConnectionError("Failed to fetch metadata. Check API URL and connectivity.")
    # Build UNIVERSE dictionary mapping asset names to their metadata (including szDecimals)
    UNIVERSE = {item["name"]: item for item in all_meta["universe"]}
    logging.info(f"Successfully Initialized. Found {len(UNIVERSE)} assets.")

except Exception as e:
    logging.error(f"FATAL: Failed to initialize Hyperliquid Info client: {e}", exc_info=True)
    info_client = None # Ensure it's None if initialization fails
    UNIVERSE = {}

# --- Flask App ---
app = Flask(__name__)

# --- Helper Functions ---

def format_size(asset: str, size: Decimal) -> Decimal:
    """Rounds the size according to the asset's szDecimals, rounding down."""
    if not UNIVERSE:
        logging.warning(f"UNIVERSE metadata not available for formatting size of {asset}")
        # Default to a reasonable precision if metadata failed, but log it clearly.
        default_decimals = 8
        rounded_size = size.quantize(Decimal('1e-' + str(default_decimals)), rounding=ROUND_DOWN)
        logging.warning(f"Using default {default_decimals} decimals for {asset}, rounded {size} to {rounded_size}")
        return rounded_size

    if asset not in UNIVERSE:
        logging.error(f"Asset '{asset}' not found in UNIVERSE metadata for formatting size.")
        # Handle this case - maybe raise an error, or default? Raising error is safer.
        raise ValueError(f"Asset '{asset}' not found in metadata for formatting size.")

    asset_info = UNIVERSE[asset]
    sz_decimals = asset_info.get("szDecimals")

    if sz_decimals is None:
        logging.warning(f"szDecimals not found for asset '{asset}' in metadata. Defaulting to 8.")
        sz_decimals = 8 # Provide a sensible default if missing

    try:
        # Ensure sz_decimals is an integer
        sz_decimals = int(sz_decimals)
        # Use ROUND_DOWN to avoid potential margin issues from rounding up
        rounded_size = size.quantize(Decimal('1e-' + str(sz_decimals)), rounding=ROUND_DOWN)

        # Crucial check: If rounding down results in zero for a non-zero input, it's likely too small
        if rounded_size <= Decimal(0) and size > Decimal(0):
            min_order_size_str = asset_info.get("minOrderSz", "0") # Check if min size is in meta
            min_order_size = Decimal(min_order_size_str)
            logging.warning(f"Size {size} for {asset} rounded down to {rounded_size} (min: {min_order_size}). This order may be too small.")
            # Depending on requirements, you might return 0, raise error, or return the min size
            # Returning the rounded (potentially 0) value for now, frontend should validate
            # raise ValueError(f"Calculated order size {size} is too small for {asset} after rounding to {sz_decimals} decimals.")
        return rounded_size
    except (ValueError, TypeError) as e:
        logging.error(f"Error applying szDecimals ({sz_decimals}) for asset {asset}: {e}")
        raise ValueError(f"Invalid szDecimals value for {asset}")

# --- API Endpoints ---

@app.route('/status', methods=['GET'])
def get_status():
    """Simple health check endpoint."""
    if info_client and UNIVERSE:
        # Get the address the app *would* use if it had a key (for info purposes only)
        # This helps confirm which .env is loaded, but it's not used for transactions.
        hl_address_from_env = os.environ.get("HYPERLIQUID_TESTNET_ADDRESS", "Not Set")
        return jsonify({
            "status": "OK",
            "message": "Hyperliquid Info client initialized. Backend is READ-ONLY.",
            "info_client_target_url": HL_TESTNET_URL,
            "configured_monitor_address_FOR_INFO_ONLY": hl_address_from_env, # Clarify it's not for TXs
            "supported_assets_count": len(UNIVERSE),
            "available_strategies": list(REBELSWAP_STRATEGIES.keys())
        }), 200
    else:
        status_msg = []
        if not info_client: status_msg.append("Info client failed initialization.")
        if not UNIVERSE: status_msg.append("Asset metadata (UNIVERSE) fetch failed.")
        return jsonify({
            "status": "ERROR",
            "message": "Backend service is not fully operational.",
            "details": " ".join(status_msg)
        }), 503 # Service Unavailable

@app.route('/assets', methods=['GET'])
def get_assets():
    """Returns the list of assets found in Hyperliquid metadata."""
    if not info_client or not UNIVERSE:
         return jsonify({"error": "Asset list not available (client initialization failed?)"}), 503
    # Return just the names
    return jsonify(list(UNIVERSE.keys()))

# --- RebelSwap Specific Endpoints ---

@app.route('/strategies', methods=['GET'])
def get_strategies():
    """Returns the definitions of the available RebelSwap strategies."""
    if not REBELSWAP_STRATEGIES:
        return jsonify({"error": "Strategies not configured"}), 500
    # Return strategy ID mapped to its details
    return jsonify(REBELSWAP_STRATEGIES), 200

@app.route('/trades/calculate', methods=['POST'])
def calculate_trades():
    """
    Calculates the individual trade parameters needed for a RebelSwap strategy.
    The frontend will use this information to construct and sign transactions.
    ---
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              strategy_id:
                type: string
                description: The ID of the strategy (e.g., "MEGA", "DOWN").
              total_usd_size:
                type: number
                format: float
                description: The total desired USD value *before* leverage (e.g., collateral allocation).
              user_address:
                type: string
                description: (Optional) User address for logging/context. NOT used for execution.
            required:
              - strategy_id
              - total_usd_size
    responses:
      200:
        description: Calculated trade parameters.
        content:
          application/json:
            schema:
               # Add schema definition here matching the response structure
      400:
        description: Invalid request (e.g., missing fields, invalid strategy, bad size).
      404:
        description: Strategy ID not found.
      500:
        description: Internal server error (e.g., failed price fetch).
      503:
        description: Service unavailable (Hyperliquid client not ready).
    """
    if not info_client or not UNIVERSE:
        return jsonify({"error": "Service not available (Hyperliquid client initialization failed)"}), 503

    payload = request.get_json()
    if not payload:
        return jsonify({"error": "Invalid JSON payload"}), 400

    strategy_id = payload.get("strategy_id", "").upper()
    total_usd_size_str = payload.get("total_usd_size")
    user_address = payload.get("user_address", "N/A") # Optional for logging

    # --- Input Validation ---
    errors = []
    if not strategy_id or strategy_id not in REBELSWAP_STRATEGIES:
        errors.append(f"Invalid or missing 'strategy_id'. Available: {', '.join(REBELSWAP_STRATEGIES.keys())}")
    if total_usd_size_str is None:
        errors.append("Missing 'total_usd_size'")

    total_usd_size = None
    if total_usd_size_str is not None:
        try:
            total_usd_size = Decimal(str(total_usd_size_str)) # Use string conversion for Decimal accuracy
            if total_usd_size <= Decimal(0):
                errors.append("'total_usd_size' must be positive")
        except Exception:
            errors.append(f"Invalid 'total_usd_size': {total_usd_size_str}, must be a valid number.")

    if errors:
        logging.warning(f"POST /trades/calculate: Validation failed for user {user_address}: {errors}")
        return jsonify({"error": "Validation failed", "details": errors}), 400
    # --- End Validation ---

    strategy = REBELSWAP_STRATEGIES[strategy_id]
    assets = strategy["assets"]
    leverage = Decimal(str(strategy["leverage"]))
    is_buy = (strategy["direction"] == "long")
    num_assets = len(assets)

    if num_assets == 0:
         return jsonify({"error": f"Strategy '{strategy_id}' has no assets defined."}), 500

    logging.info(f"Calculating trades for Strategy: {strategy_id}, User: {user_address}, Total USD Size (Pre-Leverage): {total_usd_size:.4f}")

    try:
        # 1. Fetch Current Prices
        logging.debug(f"Fetching mid prices for assets: {assets}")
        all_mids = info_client.all_mids()
        current_prices = {}
        missing_assets = []
        for asset in assets:
            if asset in all_mids:
                current_prices[asset] = Decimal(str(all_mids[asset])) # Store as Decimal
            else:
                missing_assets.append(asset)
                logging.error(f"Could not find mid price for required asset: {asset}")

        if missing_assets:
            return jsonify({"error": "Failed to get current prices for all strategy assets", "missing_assets": missing_assets}), 500

        # 2. Calculate Allocations and Sizes
        usd_allocation_per_asset = total_usd_size / Decimal(num_assets)
        nominal_usd_per_asset = usd_allocation_per_asset * leverage
        calculated_trades = []

        for asset in assets:
            price = current_prices[asset]
            if price <= Decimal(0):
                 logging.error(f"Asset {asset} has invalid price {price}. Cannot calculate size.")
                 return jsonify({"error": f"Invalid price ({price}) received for asset {asset}"}), 500

            # Calculate size in asset terms
            size_asset_raw = nominal_usd_per_asset / price

            # Format size according to asset rules (round down)
            formatted_size_asset = format_size(asset, size_asset_raw)

            trade_param = {
                "asset": asset,
                "is_buy": is_buy,
                 # Return size as string for frontend to handle potentially large/small numbers
                "size_asset": str(formatted_size_asset),
                "leverage": strategy["leverage"], # Return the intended leverage
                "estimated_nominal_usd": float(nominal_usd_per_asset), # For info
                "estimated_asset_price": float(price) # For info
            }
            calculated_trades.append(trade_param)
            logging.debug(f"  - Calculated for {asset}: Size={formatted_size_asset} (Raw: {size_asset_raw}), NomUSD={nominal_usd_per_asset:.2f}, Price={price:.4f}")


        response = {
            "strategy_id": strategy_id,
            "user_address_context": user_address,
            "calculation_timestamp_utc": pd.Timestamp.utcnow().isoformat(),
            "trade_parameters": calculated_trades,
             "message": "Parameters calculated. Frontend must execute these trades via user's wallet."
        }
        logging.info(f"Successfully calculated trade parameters for {strategy_id}.")
        return jsonify(response), 200

    except ValueError as ve: # Catch specific errors like format_size issues
        logging.error(f"POST /trades/calculate: Value error during calculation for {strategy_id}: {ve}", exc_info=True)
        return jsonify({"error": "Calculation error", "details": str(ve)}), 400
    except KeyError as ke:
         logging.error(f"POST /trades/calculate: Missing key during calculation (likely price fetch issue): {ke}", exc_info=True)
         return jsonify({"error": "Failed to retrieve necessary data", "details": f"Missing data for: {ke}"}), 500
    except Exception as e:
        logging.error(f"POST /trades/calculate: Unexpected error calculating trades for {strategy_id}: {e}", exc_info=True)
        return jsonify({"error": "Internal server error during trade calculation", "details": str(e)}), 500


@app.route('/pnl/<string:user_address>', methods=['GET'])
def get_strategy_pnl(user_address: str):
    """
    Calculates the aggregated P/L for a user based on open positions
    matching the assets defined in RebelSwap strategies.
    """
    if not info_client or not UNIVERSE:
        return jsonify({"error": "Service not available (Hyperliquid client initialization failed)"}), 503

    # Basic address format check (optional but good)
    if not user_address.startswith("0x") or len(user_address) != 42:
        logging.warning(f"GET /pnl: Received potentially invalid address format: {user_address}")
        # Allow it for now, HL API might handle it, but log clearly.
        # return jsonify({"error": "Invalid Ethereum address format"}), 400

    logging.info(f"GET /pnl: Fetching P/L for user address: {user_address}")

    try:
        # 1. Fetch User State
        user_state = info_client.user_state(user_address)
        if not user_state:
            logging.warning(f"GET /pnl: No user state data found for address {user_address}. Returning zero P/L.")
            # Return empty/zero P/L if user has no state on Hyperliquid
            empty_pnl = {
                "user_address": user_address,
                "strategy_pnl": {strat_id: {"current_pnl_usd": 0.0, "positions": []} for strat_id in REBELSWAP_STRATEGIES},
                "total_pnl_usd": 0.0,
                 "calculation_timestamp_utc": pd.Timestamp.utcnow().isoformat(),
                 "message": "No PnL data found (address might have no positions or history)."
            }
            return jsonify(empty_pnl), 200 # 200 OK, just no data found

        open_positions = user_state.get("assetPositions", [])
        if not open_positions:
              logging.info(f"GET /pnl: Address {user_address} has no open positions.")
              # Similar empty response as above
              empty_pnl = {
                "user_address": user_address,
                "strategy_pnl": {strat_id: {"current_pnl_usd": 0.0, "positions": []} for strat_id in REBELSWAP_STRATEGIES},
                "total_pnl_usd": 0.0,
                 "calculation_timestamp_utc": pd.Timestamp.utcnow().isoformat(),
                 "message": "No PnL data found (no open positions)."
             }
              return jsonify(empty_pnl), 200

        # 2. Map Assets to Strategies
        asset_to_strategy_map: Dict[str, List[str]] = {}
        for strat_id, strat_details in REBELSWAP_STRATEGIES.items():
            for asset in strat_details["assets"]:
                if asset not in asset_to_strategy_map:
                    asset_to_strategy_map[asset] = []
                asset_to_strategy_map[asset].append(strat_id)

        # 3. Aggregate P/L
        strategy_pnl_details: Dict[str, Dict] = {
            strat_id: {"current_pnl_usd": Decimal(0), "positions": []}
            for strat_id in REBELSWAP_STRATEGIES
        }
        total_pnl = Decimal(0)

        for pos_data in open_positions:
            pos = pos_data.get("position", {})
            asset = pos.get("coin")
            unrealized_pnl_str = pos.get("unrealizedPnl", "0") # Provided directly by API

            if not asset or asset not in asset_to_strategy_map:
                continue # Skip positions not part of any RebelSwap strategy

            try:
                unrealized_pnl = Decimal(unrealized_pnl_str)
            except Exception:
                logging.warning(f"Could not parse unrealizedPnl ('{unrealized_pnl_str}') for {asset} position of {user_address}. Skipping.")
                continue

            # Add PnL to all strategies this asset belongs to
            relevant_strategies = asset_to_strategy_map[asset]
            for strat_id in relevant_strategies:
                strategy_pnl_details[strat_id]["current_pnl_usd"] += unrealized_pnl
                pos_summary = {
                    "asset": asset,
                    "size": pos.get("szi", "0"), # Size as string
                    "entry_price": pos.get("entryPx"), # Can be None
                    "unrealized_pnl": float(unrealized_pnl), # Store as float for JSON
                    # Add more fields if frontend needs them (margin, leverage...)
                    "leverage_value": pos.get("leverage", {}).get("value"),
                    "liquidation_price": pos.get("liquidationPx") # Can be None
                }
                strategy_pnl_details[strat_id]["positions"].append(pos_summary)

            # Add to overall total PNL *once* per position, even if in multiple strategies
            # (This assumes we want the simple sum of all positions involved in *any* strategy)
            # Revisit this logic if double-counting is an issue for the total.
            # If strategies are mutually exclusive in assets, this sum is fine.
            # If assets overlap (e.g., BTC in MEGA and another strategy), this total will sum it once.
            total_pnl += unrealized_pnl

        # Convert Decimal PNLs to float for JSON response
        for strat_id in strategy_pnl_details:
            strategy_pnl_details[strat_id]["current_pnl_usd"] = float(strategy_pnl_details[strat_id]["current_pnl_usd"])


        response = {
            "user_address": user_address,
            "strategy_pnl": strategy_pnl_details,
            "total_pnl_usd": float(total_pnl),
            "calculation_timestamp_utc": pd.Timestamp.utcnow().isoformat()
        }

        logging.info(f"GET /pnl: Successfully calculated P/L for {user_address}. Total: {total_pnl:.4f}")
        return jsonify(response), 200

    except Exception as e:
        logging.error(f"GET /pnl: Unexpected error fetching P/L for {user_address}: {e}", exc_info=True)
        return jsonify({"error": f"Internal server error fetching P/L for {user_address}", "details": str(e)}), 500


# --- Adapted Read-Only Endpoints (Now require user_address) ---

@app.route('/balance/<string:user_address>', methods=['GET'])
def get_user_balance(user_address: str):
    """ Fetches the account balance summary for the specified user address."""
    if not info_client: return jsonify({"error": "Hyperliquid client not initialized"}), 503

    logging.info(f"GET /balance: Fetching balance for address: {user_address}")
    if not user_address.startswith("0x") or len(user_address) != 42: # Basic check
         logging.warning(f"GET /balance: Potentially invalid address format: {user_address}")
        # Allow it, but maybe return 400 Bad Request?
        # return jsonify({"error": "Invalid Ethereum address format"}), 400

    try:
        user_state = info_client.user_state(user_address)
        if not user_state:
            logging.warning(f"GET /balance: No user state data returned for address {user_address}.")
            return jsonify({"error": f"No user state data found for address {user_address}."}), 404

        margin_summary = user_state.get("marginSummary", {})
        # Extract and format relevant fields safely
        balance_data = {
            "address": user_address,
            "account_value_usd": float(margin_summary["accountValue"]) if margin_summary.get("accountValue") is not None else None,
            "total_raw_usd": float(margin_summary["totalRawUsd"]) if margin_summary.get("totalRawUsd") is not None else None,
            "total_notional_position_usd": float(margin_summary["totalNtlPos"]) if margin_summary.get("totalNtlPos") is not None else None,
            "total_margin_used_usd": float(margin_summary["totalMarginUsed"]) if margin_summary.get("totalMarginUsed") is not None else None,
        }
        logging.info(f"GET /balance: Successfully fetched balance for {user_address}.")
        return jsonify(balance_data), 200

    except Exception as e:
        logging.error(f"GET /balance: Error fetching user state for {user_address}: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch user balance", "details": str(e)}), 500


@app.route('/positions/<string:user_address>', methods=['GET'])
@app.route('/positions/<string:user_address>/<string:asset_symbol>', methods=['GET'])
def get_positions(user_address: str, asset_symbol: str = None):
    """
    Fetches detailed open position info for the specified address.
    Optionally filters by a specific asset symbol.
    """
    if not info_client: return jsonify({"error": "Hyperliquid client not initialized"}), 503
    logging.info(f"GET /positions: Fetching positions for address: {user_address}, Filter: {asset_symbol}")

    try:
        user_state = info_client.user_state(user_address)
        if not user_state: return jsonify({"error": f"No user state data found for address {user_address}."}), 404

        all_positions_raw = user_state.get("assetPositions", [])
        if not all_positions_raw: return jsonify([]), 200 # Empty list if no positions

        formatted_positions = []
        for pos_data in all_positions_raw:
            pos = pos_data.get("position", {})
            asset = pos.get("coin")
            if not asset: continue

            if asset_symbol and asset.upper() != asset_symbol.upper(): continue

            try:
                # Convert numeric fields carefully, handle None or missing values
                entry_px = pos.get("entryPx")
                liq_px = pos.get("liquidationPx")
                roe = pos.get("returnOnEquity")

                formatted_pos = {
                    "asset": asset,
                    "size": pos.get("szi", "0"), # Keep size as string from API
                    "entry_price": float(entry_px) if entry_px is not None else None,
                    "unrealized_pnl": float(pos.get("unrealizedPnl", "0")),
                    "margin_used": float(pos.get("marginUsed", "0")),
                    "leverage_type": pos.get("leverage", {}).get("type"),
                    "leverage_value": int(pos.get("leverage", {}).get("value", 0)),
                    "liquidation_price": float(liq_px) if liq_px is not None else None,
                    "return_on_equity": float(roe) if roe is not None else None,
                }
                formatted_positions.append(formatted_pos)
            except Exception as fmt_e:
                 logging.warning(f"Could not format position data for {asset} ({user_address}): {fmt_e}. Raw: {pos}")
                 continue

        logging.info(f"GET /positions: Found {len(formatted_positions)} positions for {user_address} (Filter: '{asset_symbol}').")
        return jsonify(formatted_positions), 200

    except Exception as e:
        logging.error(f"GET /positions: Error fetching positions for {user_address}: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch positions", "details": str(e)}), 500


@app.route('/orders/open/<string:user_address>', methods=['GET'])
def get_open_orders(user_address: str):
    """Fetches all open (resting) orders for the specified address."""
    if not info_client: return jsonify({"error": "Hyperliquid client not initialized"}), 503
    logging.info(f"GET /orders/open: Fetching open orders for {user_address}")

    try:
        open_orders = info_client.open_orders(user_address)
        logging.info(f"GET /orders/open: Found {len(open_orders)} open orders for {user_address}.")
        return jsonify(open_orders), 200 # SDK usually returns JSON-serializable list/dict
    except Exception as e:
        logging.error(f"GET /orders/open: Error fetching open orders for {user_address}: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch open orders", "details": str(e)}), 500


# --- Run the App ---
if __name__ == '__main__':
    # Use host='0.0.0.0' to make it accessible on your network if needed
    # Set debug=False for production (reloads on code change, shows detailed errors)
    # Consider using a production-ready WSGI server like Gunicorn or Waitress instead of Flask's dev server
    app.run(debug=True, host='0.0.0.0', port=5000)
