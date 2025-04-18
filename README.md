# Hyperliquid API - README

## Overview
This API provides a set of endpoints to interact with the Hyperliquid platform. It includes functionalities for fetching market data, managing user balances, executing trades, and more. The API is built using Flask and integrates with the Hyperliquid Info and Exchange clients.

## Prerequisites
- Python 3.10 or higher
- Install dependencies using `pip install -r requirements.txt`
- Set up a `.env` file with the following variables:
  - `HYPERLIQUID_PRIVATE_KEY`: Your private key for the Hyperliquid platform.
  - `HYPERLIQUID_TESTNET_ADDRESS`: Your testnet address for Hyperliquid.

## Running the API
To start the API server, run the following command:
```bash
python go.py
```
The server will run on `http://0.0.0.0:5000` by default.

## Endpoints

### 1. `/status` (GET)
**Description:** Health check endpoint to verify the API status.
- **Response:**
  - `status`: OK or ERROR
  - `message`: Status message
  - `info_client_target_url`: Target URL for the Hyperliquid Info client
  - `supported_assets_count`: Number of supported assets
  - `available_strategies`: List of available strategies

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/status
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/status')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 2. `/assets` (GET)
**Description:** Returns the list of assets available in Hyperliquid metadata.
- **Response:** List of asset names.

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/assets
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/assets')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 3. `/strategies` (GET)
**Description:** Returns the definitions of available RebelSwap strategies.
- **Response:** Dictionary of strategy IDs mapped to their details.

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/strategies
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/strategies')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 4. `/trades/calculate` (POST)
**Description:** Calculates trade parameters for a given RebelSwap strategy.
- **Request Body:**
  ```json
  {
    "strategy_id": "MEGA",
    "total_usd_size": 1000,
    "user_address": "0xYourAddress"
  }
  ```
- **Response:**
  - `strategy_id`: Strategy ID
  - `trade_parameters`: List of calculated trade parameters

**cURL Example:**
```bash
curl -X POST http://0.0.0.0:5000/trades/calculate \
  -H "Content-Type: application/json" \
  -d '{"strategy_id": "MEGA", "total_usd_size": 1000, "user_address": "0xYourAddress"}'
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/trades/calculate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    strategy_id: 'MEGA',
    total_usd_size: 1000,
    user_address: '0xYourAddress'
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 5. `/pnl/<string:user_address>` (GET)
**Description:** Calculates the aggregated P/L for a user based on open positions.
- **Path Parameter:**
  - `user_address`: Ethereum address of the user
- **Response:**
  - `strategy_pnl`: P/L details for each strategy
  - `total_pnl_usd`: Total P/L in USD

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/pnl/0xYourAddress
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/pnl/0xYourAddress')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 6. `/balance/<string:user_address>` (GET)
**Description:** Fetches the account balance summary for a user.
- **Path Parameter:**
  - `user_address`: Ethereum address of the user
- **Response:**
  - `account_value_usd`: Total account value in USD
  - `total_raw_usd`: Total raw USD balance

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/balance/0xYourAddress
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/balance/0xYourAddress')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 7. `/positions/<string:user_address>` (GET)
**Description:** Fetches detailed open position info for a user.
- **Path Parameter:**
  - `user_address`: Ethereum address of the user
- **Response:** List of open positions.

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/positions/0xYourAddress
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/positions/0xYourAddress')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 8. `/positions/<string:user_address>/<string:asset_symbol>` (GET)
**Description:** Fetches open position info for a specific asset.
- **Path Parameters:**
  - `user_address`: Ethereum address of the user
  - `asset_symbol`: Symbol of the asset
- **Response:** List of positions for the specified asset.

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/positions/0xYourAddress/BTC
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/positions/0xYourAddress/BTC')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 9. `/orders/open/<string:user_address>` (GET)
**Description:** Fetches all open orders for a user.
- **Path Parameter:**
  - `user_address`: Ethereum address of the user
- **Response:** List of open orders.

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/orders/open/0xYourAddress
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/orders/open/0xYourAddress')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 10. `/market-data` (GET)
**Description:** Fetches real-time market data for specified assets.
- **Response:**
  - `asset`: Asset name
  - `mid_price`: Mid price of the asset

**cURL Example:**
```bash
curl -X GET http://0.0.0.0:5000/market-data
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/market-data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 11. `/execute-order` (POST)
**Description:** Executes and monitors an order with retries.
- **Request Body:**
  ```json
  {
    "asset": "BTC",
    "size": 0.1,
    "is_buy": true,
    "price": 30000,
    "user_address": "0xYourAddress"
  }
  ```
- **Response:**
  - `order_id`: ID of the executed order
  - `result`: Order execution result

**cURL Example:**
```bash
curl -X POST http://0.0.0.0:5000/execute-order \
  -H "Content-Type: application/json" \
  -d '{"asset": "BTC", "size": 0.1, "is_buy": true, "price": 30000, "user_address": "0xYourAddress"}'
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/execute-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    asset: 'BTC',
    size: 0.1,
    is_buy: true,
    price: 30000,
    user_address: '0xYourAddress'
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 12. `/api/store-keys` (POST)
**Description:** Stores Hyperliquid keys securely.
- **Request Body:**
  ```json
  {
    "address": "0xYourAddress",
    "privateKey": "YourPrivateKey"
  }
  ```
- **Response:**
  - `message`: Confirmation message

**cURL Example:**
```bash
curl -X POST http://0.0.0.0:5000/api/store-keys \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYourAddress", "privateKey": "YourPrivateKey"}'
```

**JavaScript Example:**
```javascript
fetch('http://0.0.0.0:5000/api/store-keys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address: '0xYourAddress',
    privateKey: 'YourPrivateKey'
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

## Notes
- Ensure the `.env` file is properly configured before running the API.
- Use secure storage for private keys in production environments.
- For detailed logs, check the console output while the server is running.