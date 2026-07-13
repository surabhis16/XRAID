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
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-500"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter leading-none">
              Cryptographic Network Defense
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                SEC_INTEL
              </p>
            </div>
          </div>
        </Link>

        {/* Action Section */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 mr-4">
            {["Technology", "Evidence", "Docs"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 pl-6 border-l border-border">
            <ThemeToggle />

            <Link href="/login">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all font-black text-xs uppercase tracking-widest group">
                <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  )
}