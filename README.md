# RebelSwap UI

## Overview

RebelSwap is a modern, user-friendly trading interface for the Hyperliquid platform. This front-end application provides an intuitive way to execute trades, manage positions, and view market data through various trading strategies.

## Features

- **Strategy-based Trading**: Select from predefined trading strategies with different asset allocations and risk profiles
- **Real-time Market Data**: View up-to-date market information for various crypto assets
- **Position Management**: Track and manage your open positions
- **Wallet Integration**: Connect using MetaMask and other Web3 wallets
- **Trade Execution**: Calculate and execute trades with signature verification
- **Responsive Design**: Access the platform from desktop or mobile devices

## Tech Stack

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **UI Components**: Shadcn UI
- **Backend Integration**: REST API

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- An Ethereum wallet (e.g., MetaMask) for trading

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/rebelswap-ui.git
   cd rebelswap-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Deployment

### Deploy to Vercel

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to your Vercel account:
   ```bash
   vercel login
   ```

3. Deploy the project:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

## Project Structure

- `client/src/`: Main application code
  - `components/`: React components organized by category
  - `hooks/`: Custom React hooks
  - `lib/`: Utility functions and API clients
  - `pages/`: Application pages/routes

## Backend Integration

The UI connects to a backend service that interacts with the Hyperliquid platform. The backend handles:

- Fetching market data
- Calculating trade parameters
- Executing trades
- Managing user balances and positions

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Hyperliquid](https://hyperliquid.xyz) - The underlying trading platform
- [Shadcn UI](https://ui.shadcn.com/) - UI component library
- [React Query](https://tanstack.com/query) - Data fetching and state management
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework