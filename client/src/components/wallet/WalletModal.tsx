import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useWallet, { WalletType } from '@/hooks/useWallet';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletOption {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
}

const walletOptions: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    description: 'Connect with your MetaMask wallet'
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg',
    description: 'Scan QR code with WalletConnect'
  },
  {
    id: 'rabby',
    name: 'Rabby',
    icon: 'https://static.rabby.io/rabby-logo.svg',
    description: 'Connect using Rabby wallet extension'
  }
];

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { connect, isConnecting } = useWallet();

  const handleConnect = async (walletType: WalletType) => {
    await connect(walletType);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Connect Wallet</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose a wallet to connect to RebelSwap:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {walletOptions.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              className="flex items-center w-full p-3 h-auto justify-start border-neutral-700 hover:bg-accent/10 hover:text-accent transition-colors duration-200"
              onClick={() => handleConnect(wallet.id)}
              disabled={isConnecting}
            >
              <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 mr-3" />
              <div className="flex-1 text-left">
                <div className="font-medium">{wallet.name}</div>
                <div className="text-xs text-muted-foreground">{wallet.description}</div>
              </div>
            </Button>
          ))}
        </div>
        
        <DialogFooter className="mt-4 text-xs text-center text-muted-foreground">
          By connecting your wallet, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WalletModal;
