'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { arbitrumSepolia, arbitrum, base, mainnet } from 'viem/chains';

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
        defaultChain: arbitrumSepolia,
        supportedChains: [arbitrumSepolia, arbitrum, base, mainnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
