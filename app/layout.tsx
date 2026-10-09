import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import './globals.css';

export const metadata = {
  title: {
    default: 'JetPesa | Fly High & Cash Out Instantly',
    template: '%s | JetPesa',
  },
  description:
    'Real-time multiplier gaming with transparent rounds and secure wallet controls.',
  icons: {
    icon: '/branding/jetpesa-icon.png',
    shortcut: '/branding/jetpesa-icon.png',
    apple: '/branding/jetpesa-icon.png',
  },
  openGraph: {
    title: 'JetPesa | Fly High & Cash Out Instantly',
    description: 'Real-time multiplier gaming with transparent rounds and secure wallet controls.',
    images: ['/branding/jetpesa-icon.png'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('jetpesa-theme')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.dataset.theme=d;document.documentElement.style.colorScheme=d}catch(e){}})()` }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
