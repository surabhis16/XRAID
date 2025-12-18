"use client"

import { Bell, Search, Menu, User } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

export function DashboardHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-500">
      <div className="flex items-center justify-between px-6 py-3">

        {/* Mobile Menu Trigger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-secondary rounded-xl transition-colors text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-4 lg:mx-0">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search network logs, IPs, or threat IDs..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 dark:bg-white/5 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono text-xs md:text-sm placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />

          <button className="relative p-2.5 rounded-2xl transition-all text-muted-foreground hover:text-primary group">
            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background animate-pulse" />
          </button>

          <div className="h-8 w-px bg-border mx-1 hidden md:block" />

          {/* Profile Section */}
          <div className="flex items-center gap-3 pl-2">
            <div className="hidden md:block text-right">
              <p className="text-xs font-black tracking-tight uppercase">S. Analyst</p>
              <p className="text-[9px] font-mono text-primary leading-none uppercase tracking-tighter">Lvl 4 Access</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary hover:bg-primary hover:text-white transition-all cursor-pointer shadow-sm">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}