import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";
import { cookies } from 'next/headers';
import { getLocale, getStoredLanguage, LANGUAGE_COOKIE_NAME } from '@/i18n';
import { ACCESSIBILITY_BOOTSTRAP } from '@/lib/accessibility';

export const metadata: Metadata = {
  title: "Bharat Shram Setu | Enterprise Portal",
  description: "Connecting India's workforce to opportunity, identity and growth.",
  // The app has its own language switcher; browser auto-translate rewrites the
  // DOM and breaks controlled form controls (e.g. <select>), so disable it.
  other: { google: "notranslate" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#073B67",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLanguage = getStoredLanguage(cookieStore.get(LANGUAGE_COOKIE_NAME)?.value);
  const initialLocale = getLocale(initialLanguage);

  return (
    <html lang={initialLocale.code} dir={initialLocale.dir} translate="no" className="h-full antialiased" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[var(--color-bss-bg)] text-[var(--color-bss-text-primary)]">
        <Script id="bss-accessibility-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: ACCESSIBILITY_BOOTSTRAP }} />
        <ClientProviders initialLanguage={initialLanguage}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
