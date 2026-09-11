import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";
import { cookies } from 'next/headers';
import { getLocale, getStoredLanguage, LANGUAGE_COOKIE_NAME } from '@/i18n';

export const metadata: Metadata = {
  title: "Bharat Shram Setu | Enterprise Portal",
  description: "Connecting India's workforce to opportunity, identity and growth.",
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
    <html lang={initialLocale.code} dir={initialLocale.dir} className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[var(--color-bss-bg)] text-[var(--color-bss-text-primary)]">
        <ClientProviders initialLanguage={initialLanguage}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
