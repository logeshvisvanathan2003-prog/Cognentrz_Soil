import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/hooks/useThemeProvider';
import { LanguageProvider } from '@/hooks/useLanguage';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'Cognentrz — Soil Intelligence Platform',
  description: 'AI-powered soil health monitoring using satellite imagery and machine learning',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0f0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Runs before paint to avoid flash of wrong theme.
const themeInitScript = `
  try {
    var t = localStorage.getItem('cognentrz-theme');
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="leaf-pattern">
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <div className="bg-orb bg-orb-1" />
              <div className="bg-orb bg-orb-2" />
              <div className="bg-orb bg-orb-3" />
              <div className="relative z-10">
                {children}
              </div>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
