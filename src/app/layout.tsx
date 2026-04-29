import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: '동네 맛집 탐방',
  description: '동네 맛집을 지도와 추천으로 빠르게 찾는 모바일 탐색 앱',
  applicationName: '동네 맛집 탐방',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: '동네 맛집 탐방',
    statusBarStyle: 'default'
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: '/icons/app-icon.svg',
    apple: '/icons/app-icon.svg'
  }
};

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
