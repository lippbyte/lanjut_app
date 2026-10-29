import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// `retry: 1` (bukan default 3) supaya galat backend (mis. server/ belum
// jalan) cepat kelihatan di console log, bukan tertunda beberapa kali retry.
// `refetchOnWindowFocus: false` supaya log verifikasi tidak berulang tiap
// kali tab/app kembali fokus — kerangka ini murni untuk dicek sekali jalan.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
