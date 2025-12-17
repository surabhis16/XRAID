"use client"

import { Bell, Search, Menu } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

export function DashboardHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-slate-700">
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors">
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts, IPs, threats..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button className="relative p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full pulse-green" />
          </button>
          <div className="w-10 h-10 rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 flex items-center justify-center font-bold cursor-pointer">
            SA
          </div>
        </div>
      </div>
    </header>
  )
}
