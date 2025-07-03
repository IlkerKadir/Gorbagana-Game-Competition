// frontend/src/App.tsx

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import GameInterface from './components/GameInterface';
import ErrorBoundary from './components/ErrorBoundary';
import { CONFIG } from './utils';
import './App.css';

// Import required CSS
require('@solana/wallet-adapter-react-ui/styles.css');

function App() {
  // Use Gorbagana testnet RPC (fallback to devnet for local testing)
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => {
    return CONFIG.GORBAGANA_RPC || clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [
      new BackpackWalletAdapter(),
      // Add other wallets if needed for broader compatibility
    ],
    []
  );

  return (
    <ErrorBoundary>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <div className="App">
              <header className="App-header">
                <h1>🏁 Trash to Treasure Rally</h1>
                <p>Race on the Gorbagana "trash chain" and turn garbage into gold! 🗑️➡️💰</p>
              </header>
              <main>
                <GameInterface />
              </main>
              <footer>
                <p>Built for #GorbaganaTestnet 🚀 | A multiplayer racing game showcasing instant finality and zero-MEV fairness</p>
              </footer>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  );
}

export default App;
