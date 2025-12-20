"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Home,
  AlertCircle,
  BarChart3,
  Upload,
  Settings,
  X,
  Shield,
  Activity,
  Eye,
  Search,
  Brain,
  TreePine,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { DashboardHeader } from "@/components/dashboard-header"

// Mock data
const attackDistribution = [
  { name: "DoS", value: 35, color: "#10B981" },
  { name: "DDoS", value: 28, color: "#06B6D4" },
  { name: "PortScan", value: 22, color: "#22D3EE" },
  { name: "Botnet", value: 15, color: "#FBBF24" },
]

const recentAlerts = [
  { id: 1, time: "2 min ago", type: "DDoS", confidence: 96, status: "critical" },
  { id: 2, time: "5 min ago", type: "PortScan", confidence: 87, status: "warning" },
  { id: 3, time: "8 min ago", type: "DoS", confidence: 94, status: "critical" },
  { id: 4, time: "12 min ago", type: "Botnet", confidence: 78, status: "warning" },
  { id: 5, time: "15 min ago", type: "Brute Force", confidence: 92, status: "critical" },
]

const activityFeed = [
  { time: "14:32:45", prediction: "DDoS Detected", confidence: 96 },
  { time: "14:31:12", prediction: "Normal Traffic", confidence: 99 },
  { time: "14:29:58", prediction: "PortScan Detected", confidence: 87 },
  { time: "14:28:33", prediction: "Normal Traffic", confidence: 98 },
  { time: "14:27:19", prediction: "DoS Detected", confidence: 94 },
]

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 transition-colors duration-500">
      <style jsx global>{`
        .modal-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .modal-scroll::-webkit-scrollbar-track {
          background: rgba(var(--muted-rgb, 148, 163, 184), 0.05);
          border-radius: 5px;
        }
        .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 5px;
        }
      `}</style>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-64 relative z-10">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-6 space-y-6 max-w-400 mx-auto">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={<AlertCircle className="w-6 h-6" />} label="Total Alerts Today" value="247" trend={12} trendUp={true} />
            <StatCard icon={<Shield className="w-6 h-6" />} label="Detection Accuracy" value="99.54%" progress={99.54} />
            <StatCard icon={<Activity className="w-6 h-6" />} label="Critical Threats" value="8" pulse={true} />
            <StatCard icon={<BarChart3 className="w-6 h-6" />} label="System Status" value="Operational" status="success" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Attack Distribution Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 scan-line shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6 tracking-tight">Attack Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={attackDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {attackDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "black", border: "1px solid #334155", borderRadius: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {attackDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/5">
                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-bold ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Alerts Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6 tracking-tight">Recent Alerts</h3>
              <div className="space-y-4">
                {recentAlerts.map((alert, index) => (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm tracking-tight uppercase">{alert.type}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{alert.time}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${alert.confidence > 90 ? "bg-primary" : "bg-chart-4"}`} style={{ width: `${alert.confidence}%` }} />
                        </div>
                        <span className="text-xs font-bold font-mono text-primary">{alert.confidence}%</span>
                      </div>
                    </div>
                    <div className="p-2 border border-white/10 rounded-lg group-hover:text-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Activity Feed Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#050505]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-slate-100"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 tracking-tight">
              Real-time Analysis Feed
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
              {activityFeed.map((item, index) => (
                <div key={index} className="flex items-center gap-6 p-3 bg-black/20 border border-white/5 rounded-lg text-sm hover:bg-black/40 transition-colors">
                  <span className="text-muted-foreground font-mono text-xs w-20">[{item.time}]</span>
                  <span className="flex-1 font-medium">{item.prediction}</span>
                  <span className={`font-bold font-mono ${item.confidence > 90 ? "text-primary" : "text-chart-4"}`}>
                    CONF_{item.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>

      <AlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </div>
  )
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navItems = [
    { icon: <Home className="w-5 h-5" />, label: "Dashboard", href: "/dashboard", active: true },
    { icon: <AlertCircle className="w-5 h-5" />, label: "Alerts", href: "/dashboard/alerts" },
    { icon: <BarChart3 className="w-5 h-5" />, label: "Analytics", href: "/dashboard/analytics" },
    { icon: <Upload className="w-5 h-5" />, label: "Upload", href: "/upload" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", href: "/dashboard/settings" },
  ]

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-background dark:bg-black border-r border-border z-50 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 shadow-2xl`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-3xl font-black tracking-tighter">XRAID</h1>
              <p className="text-[10px] font-mono uppercase tracking-widest text-primary mt-1">Trust Through Transparency</p>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 text-muted-foreground"><X className="w-5 h-5" /></button>
          </div>
          <nav className="space-y-2 flex-1">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${item.active ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary/10 hover:text-foreground"}`}>
                {item.icon} <span className="text-sm tracking-tight">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}

function StatCard({ icon, label, value, trend, trendUp, progress, pulse, status }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-primary/40 transition-all duration-500 shadow-xl group"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-300">{icon}</div>
        {trend && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trendUp ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500"}`}>
            {trend}%
          </div>
        )}
      </div>
      <div className="text-4xl font-black tracking-tighter mb-2 flex items-center gap-3">
        {value} {pulse && <span className="relative flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-75"></span><span className="relative rounded-full h-3 w-3 bg-red-500"></span></span>}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
    </motion.div>
  )
}

function AlertModal({ alert, onClose }: { alert: any; onClose: () => void }) {
  if (!alert) return null

  const shapFeatures = [
    { name: "Packet Rate", value: 85, impact: "high" },
    { name: "Flow Duration", value: 72, impact: "high" },
    { name: "Bytes/Packet", value: 58, impact: "medium" },
    { name: "Port Variety", value: 45, impact: "medium" },
    { name: "Protocol Mix", value: 32, impact: "low" },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-8 max-w-4xl w-full my-8 shadow-2xl modal-scroll text-slate-100"
          style={{
            maxHeight: 'calc(100vh - 4rem)',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-white">{alert.type} Attack Detected</h2>
              <p className="text-slate-400 font-mono">{alert.time}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold mb-6">
            {alert.confidence}% Confidence
          </div>

          {/* Network Flow Info */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-black/40 border border-white/5 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1 font-semibold">Source IP</div>
              <div className="font-mono font-bold text-lg text-white">{`192.168.1.${Math.floor(Math.random() * 255)}`}</div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1 font-semibold">Destination IP</div>
              <div className="font-mono font-bold text-lg text-white">{`10.0.0.${Math.floor(Math.random() * 255)}`}</div>
            </div>
          </div>

          {/* Individual Model Predictions */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-white">Model Predictions</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-black/40 border border-white/5 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <div className="mb-2 grid place-items-center">
                  <TreePine className="h-6 w-6 text-primary" />
                </div>
                <div className="font-bold mb-1 text-sm text-slate-300">Random Forest</div>
                <div className="text-2xl font-bold text-primary">{alert.confidence - 2}%</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <div className="mb-2 grid place-items-center">
                  <Search className="h-6 w-6 text-chart-4" />
                </div>
                <div className="font-bold mb-1 text-sm text-slate-300">Isolation Forest</div>
                <div className="text-2xl font-bold text-chart-4">{alert.confidence + 1}%</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <div className="mb-2 grid place-items-center">
                  <Brain className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div className="font-bold mb-1 text-sm text-slate-300">Autoencoder</div>
                <div className="text-2xl font-bold text-white">{alert.confidence}%</div>
              </div>
            </div>
          </div>

          {/* SHAP Explanation */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-white">SHAP Feature Importance</h3>
            <div className="space-y-3">
              {shapFeatures.map((feature, index) => (
                <motion.div
                  key={`${feature.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-300">{feature.name}</span>
                    <span className="text-sm font-bold font-mono text-primary">{feature.value}</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${feature.value}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full ${feature.impact === "high"
                        ? "bg-destructive"
                        : feature.impact === "medium"
                          ? "bg-chart-4"
                          : "bg-secondary-foreground"
                        }`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Analysis Summary Section */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
            <h4 className="font-bold mb-2 text-primary flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Analysis Summary
            </h4>
            <p className="leading-relaxed text-sm text-slate-300 font-medium">
              This network flow was flagged as a <strong className="text-white">{alert.type}</strong> attack due to an unusually high packet
              rate (15,000 pkt/s) combined with short flow duration and irregular byte distribution patterns typically
              associated with automated flood attacks.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
            <button className="px-6 py-3 bg-destructive hover:opacity-90 text-destructive-foreground rounded-lg font-bold transition-opacity text-sm">
              Mark as False Positive
            </button>
            <button className="px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-lg font-bold transition-opacity text-sm">
              Investigate
            </button>
            <button className="px-6 py-3 border border-white/10 hover:bg-white/5 text-white rounded-lg font-bold transition-all ml-auto text-sm">
              Mark Resolved
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
