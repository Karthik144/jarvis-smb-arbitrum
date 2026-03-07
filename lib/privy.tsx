'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { arbitrumSepolia, arbitrum, base, mainnet } from 'viem/chains';
import { defineChain } from 'viem';

// Robinhood Chain Testnet
const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.chain.robinhood.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Explorer',
      url: 'https://explorer.testnet.chain.robinhood.com',
    },
  },
  testnet: true,
});

export function PrivyConfig({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: robinhoodTestnet,
        supportedChains: [robinhoodTestnet, arbitrumSepolia, arbitrum, base, mainnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
