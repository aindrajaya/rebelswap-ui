import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-background/95 backdrop-blur-sm border-t border-neutral-800 py-4 px-6">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-3 md:mb-0">
          <span className="text-sm text-muted-foreground">© 2023 RebelSwap. All rights reserved.</span>
        </div>
        <div className="flex space-x-6">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
