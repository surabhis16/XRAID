"use client"

import { motion } from "framer-motion"
import { Shield, LogIn } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"

export function LandingHeader() {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">XRAID</h1>
            <p className="text-xs text-muted-foreground">Trust Through Transparency</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-semibold">
              <LogIn className="w-4 h-4" />
              Login
            </button>
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
