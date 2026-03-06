'use client';

import { PrivyConfig } from '@/lib/privy';

export function Providers({ children }: { children: React.ReactNode }) {
  return <PrivyConfig>{children}</PrivyConfig>;
}
