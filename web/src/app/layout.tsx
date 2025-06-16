import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "TALKAH - Have a Chat with AI at Any Time!",
  description: "AI-powered phone calls, emails, and conversations. Connect with AI anytime, anywhere. Experience the future of communication with TALKAH's intelligent AI assistant.",
  keywords: [
    "AI chat",
    "AI phone calls", 
    "talk to AI",
    "AI conversation",
    "AI assistant calls",
    "artificial intelligence",
    "AI communication",
    "smart phone calls",
    "AI powered emails",
    "conversational AI"
  ],
  authors: [{ name: "TALKAH" }],
  creator: "TALKAH",
  publisher: "TALKAH",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://talkah.com',
    title: 'TALKAH - Have a Chat with AI at Any Time!',
    description: 'AI-powered phone calls, emails, and conversations. Connect with AI anytime, anywhere. Experience the future of communication with TALKAH.',
    siteName: 'TALKAH',
    images: [
      {
        url: 'https://talkah.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TALKAH - AI-Powered Communication Platform',
      },
      {
        url: 'https://talkah.com/talkah_logo.png',
        width: 1024,
        height: 1024,
        alt: 'TALKAH Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TALKAH - Have a Chat with AI at Any Time!',
    description: 'AI-powered phone calls, emails, and conversations. Connect with AI anytime, anywhere.',
    creator: '@talkah',
    images: ['https://talkah.com/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '1024x1024', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  verification: {
    google: 'your-google-verification-code', // Replace with actual verification code
  },
  category: 'technology',
  classification: 'AI Communication Platform',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'theme-color': '#DC2626',
    'color-scheme': 'light',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicon links for better browser compatibility */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        
        {/* Additional SEO meta tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#DC2626" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Canonical URL - this should be dynamic per page */}
        <link rel="canonical" href="https://talkah.com" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/talkah_logo.png" as="image" type="image/png" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "TALKAH",
              "description": "AI-powered communication platform enabling phone calls, emails, and conversations with artificial intelligence",
              "url": "https://talkah.com",
              "logo": "https://talkah.com/talkah_logo.png",
              "sameAs": [
                "https://twitter.com/talkah",
                "https://linkedin.com/company/talkah"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer support",
                "email": "support@talkah.com"
              },
              "offers": {
                "@type": "Offer",
                "description": "AI-powered communication services",
                "category": "Software as a Service"
              }
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
