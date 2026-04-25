import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'omo-toy-project',
  description: '동네 가성비 맛집을 지도와 랭킹으로 보는 개인용 MVP'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
