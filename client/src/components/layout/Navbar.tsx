import React from 'react';
import { Link } from 'wouter';
import WalletConnectButton from '../wallet/WalletConnectButton';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-neutral-800 py-4 px-6 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/">
            <a className="text-2xl font-bold text-white">
              Rebel<span className="text-primary">Swap</span>
            </a>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Network indicator */}
          <div className="hidden md:flex items-center px-3 py-2 bg-background/90 rounded-lg border border-neutral-800">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            <span className="text-sm font-medium">Hyperliquid Testnet</span>
          </div>
          
          {/* Wallet connect button */}
          <WalletConnectButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
