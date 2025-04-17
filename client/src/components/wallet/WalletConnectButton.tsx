import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import useWallet from '@/hooks/useWallet';
import WalletModal from './WalletModal';

const WalletConnectButton: React.FC = () => {
  const { address, isConnected, isConnecting, disconnect } = useWallet();
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (isConnected) {
      // If already connected, show a dropdown menu with options
      // For now, just disconnect
      disconnect();
    } else {
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <Button 
        onClick={handleClick}
        variant="default" 
        className="flex items-center space-x-2 bg-primary hover:bg-primary/80"
        disabled={isConnecting}
      >
        <span className="material-icons text-sm">account_balance_wallet</span>
        <span className="hidden sm:inline">
          {isConnecting 
            ? 'Connecting...' 
            : isConnected 
              ? address?.slice(0, 6) + '...' + address?.slice(-4) 
              : 'Connect Wallet'}
        </span>
        <span className="sm:hidden">
          {isConnecting 
            ? '...' 
            : isConnected 
              ? address?.slice(0, 4) + '...' 
              : 'Connect'}
        </span>
      </Button>

      <WalletModal isOpen={showModal} onClose={closeModal} />
    </>
  );
};

export default WalletConnectButton;
