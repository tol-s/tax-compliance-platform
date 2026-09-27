import type { Metadata } from "next"
import { IBM_Plex_Mono, Inter } from "next/font/google"

import { Providers } from "@/components/app/providers"

import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" })
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "Tax Compliance Platform", template: "%s · Tax Compliance Platform" },
  description: "Multi-tenant tax compliance: accounting ingestion, tax calculation, working papers and forms.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={`${inter.variable} ${plexMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
