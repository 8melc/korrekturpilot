import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { RootProvider } from "./providers";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import CookieBanner from "@/components/CookieBanner";

const geistSans = localFont({
  src: [
    {
      path: "../public/fonts/GeistVF.woff2",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

const geistMono = localFont({
  src: [
    {
      path: "../public/fonts/GeistMonoVF.woff2",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "SF Mono",
    "Menlo",
    "Consolas",
    "Liberation Mono",
    "monospace",
  ],
});

export const metadata: Metadata = {
  title: "KorrekturPilot – Klausurkorrektur automatisiert | Kostenlos testen",
  description:
    "KorrekturPilot spart Lehrkräften bis zu 8 Stunden bei der Klausurkorrektur. Automatische Handschriftenerkennung, fairer Abgleich mit Erwartungshorizont, Word-Export. Jetzt kostenlos testen.",
  keywords: [
    "Klausurkorrektur",
    "KI Korrektur Lehrer",
    "automatische Bewertung Klassenarbeiten",
    "Erwartungshorizont",
    "DOCX Feedback",
    "Handschriftenerkennung",
    "Klassenarbeit korrigieren",
  ],
  openGraph: {
    title: "KorrekturPilot – Automatisierte Klausurkorrektur für Lehrkräfte",
    description:
      "Spare bis zu 8 Stunden pro Klassensatz. Kostenlos testen.",
    url: "https://www.korrekturpilot.de",
    siteName: "KorrekturPilot",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/og-korrekturpilot.svg",
        width: 1200,
        height: 630,
        alt: "KorrekturPilot – Automatisierte Klausurkorrektur für Lehrkräfte",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KorrekturPilot | Automatisierte Klausurkorrektur",
    description:
      "Spare bis zu 8 Stunden pro Klassensatz. Kostenlos testen.",
    images: [
      {
        url: "/og-korrekturpilot.svg",
        alt: "KorrekturPilot – Automatisierte Klausurkorrektur",
      },
    ],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/favicon-192x192.png" />
        <link rel="preload" href="/og-korrekturpilot.svg" as="image" />
        {/* TODO: Implement Analytics (TASK 75)
            Recommended: Plausible Analytics (Privacy-First, ~9€/month)
            Setup: Add tracking script to <head> after beta phase
            See project documentation for full implementation guide */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.korrekturpilot.de/#organization",
                  "name": "KorrekturPilot",
                  "url": "https://www.korrekturpilot.de",
                  "logo": "https://www.korrekturpilot.de/og-korrekturpilot.svg",
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "kontakt@korrekturpilot.de",
                    "contactType": "customer service"
                  }
                },
                {
                  "@type": "Product",
                  "@id": "https://www.korrekturpilot.de/#product",
                  "name": "KorrekturPilot",
                  "description": "Automatisierte Klausurkorrektur für Lehrkräfte mit Handschriftenerkennung und Word-Export",
                  "brand": {
                    "@type": "Brand",
                    "name": "KorrekturPilot"
                  },
                  "offers": {
                    "@type": "Offer",
                    "price": "7.90",
                    "priceCurrency": "EUR",
                    "availability": "https://schema.org/InStock",
                    "url": "https://www.korrekturpilot.de/#pricing"
                  }
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.korrekturpilot.de/#website",
                  "url": "https://www.korrekturpilot.de",
                  "name": "KorrekturPilot",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://www.korrekturpilot.de/?s={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RootProvider>
          <AppHeader />
          <main className="main-content">{children}</main>
          <AppFooter />
          <CookieBanner />
        </RootProvider>
      </body>
    </html>
  );
}
