import type React from "react"
import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import HydrationGate from "@/components/ui/hydration-gate"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Cryptographically Secured Network Threat Detection",
  description: "eXplainable Robust Adaptive Intrusion Detection - See exactly why every threat was flagged"
}

export const viewport: Viewport = {
  themeColor: "#10b981",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${jetBrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <HydrationGate>
            {children}
          </HydrationGate>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
