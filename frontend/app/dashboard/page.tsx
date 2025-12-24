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
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { DashboardHeader } from "@/components/dashboard-header"
import { getStats, getAlerts, getAlertDetail, updateAlertStatus } from "@/lib/api"
import type { Stats, Alert, AlertDetail } from "@/lib/api"

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [activityAlerts, setActivityAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, recentData, activityData] = await Promise.all([
        getStats(),
        getAlerts(5),  // Get 5 most recent alerts for the card
        getAlerts(10), // Get 10 alerts for the activity feed
      ])
      setStats(statsData)
      setRecentAlerts(recentData)
      setActivityAlerts(activityData)
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (alertId: number) => {
    try {
      const detail = await getAlertDetail(alertId)
      setSelectedAlert(detail)
    } catch (error) {
      console.error("Error loading alert details:", error)
    }
  }

  // handles status updates from the modal and refreshes the page
  const handleUpdateStatus = async (alertId: number, status: string) => {
    try {
      await updateAlertStatus(alertId, status)
      // Refresh the data to show the new status in the dashboard
      await loadDashboardData()
      // Close the modal
      setSelectedAlert(null)
    } catch (err: any) {
      alert("Failed to update status: " + err.message)
    }
  }

  const attackDistribution = stats ? Object.entries(stats.attack_distribution)
    .filter(([name]) => name !== "Benign")
    .map(([name, value]) => ({
      name,
      value,
      color: name === "DDoS" ? "#10B981" : name === "DoS" ? "#06B6D4" : name === "PortScan" ? "#22D3EE" : name === "Botnet" ? "#FBBF24" : "#EF4444"
    })) : []

  const totalAttacks = attackDistribution.reduce((sum, item) => sum + item.value, 0)
  const attackDistributionWithPercent = attackDistribution.map(item => ({
    ...item,
    value: totalAttacks > 0 ? Math.round((item.value / totalAttacks) * 100) : 0
  }))

  const activityFeed = activityAlerts.map(alert => ({
    time: new Date(alert.timestamp).toLocaleTimeString(),
    prediction: alert.attack_type !== "Benign" ? `${alert.attack_type} Detected` : "Normal Traffic",
    confidence: Math.round(alert.confidence * 100)
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-64 relative z-10">
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex items-center justify-center h-[calc(100vh-80px)]">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-muted-foreground">Loading dashboard...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 transition-colors duration-500">
      <style jsx global>{`
        .modal-scroll::-webkit-scrollbar { width: 10px; }
        .modal-scroll::-webkit-scrollbar-track { background: rgba(var(--muted-rgb, 148, 163, 184), 0.05); border-radius: 5px; }
        .modal-scroll::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 5px; }
      `}</style>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-64 relative z-10">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-6 space-y-6 max-w-400 mx-auto">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={<AlertCircle className="w-6 h-6" />} label="Total Alerts Today" value={stats?.total_alerts || 0} trend={stats?.recent_alerts_count || 0} trendUp={true} />
            <StatCard icon={<Shield className="w-6 h-6" />} label="Detection Accuracy" value={stats ? `${(stats.avg_confidence * 100).toFixed(2)}%` : "0%"} progress={stats ? stats.avg_confidence * 100 : 0} />
            <StatCard icon={<Activity className="w-6 h-6" />} label="Critical Threats" value={stats?.total_attacks || 0} pulse={true} />
            <StatCard icon={<BarChart3 className="w-6 h-6" />} label="System Status" value="Operational" status="success" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Attack Distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 tracking-tight">Attack Distribution</h3>
              {attackDistributionWithPercent.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={attackDistributionWithPercent}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {attackDistributionWithPercent.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#000",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#fff"
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {attackDistributionWithPercent.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/5">
                        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <span className="text-sm font-bold ml-auto">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No attack data yet</p>
                </div>
              )}
            </motion.div>

            {/* Recent Alerts */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 tracking-tight">Recent Alerts</h3>
              {recentAlerts.length > 0 ? (
                <div className="space-y-4">
                  {recentAlerts.map((alert) => (
                    <div key={alert.alert_id} onClick={() => handleViewDetails(alert.alert_id)} className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-bold text-sm tracking-tight uppercase ${alert.attack_type !== "Benign" ? "text-red-500" : ""}`}>
                            {alert.attack_type}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${alert.confidence > 0.9 ? "bg-primary" : "bg-chart-4"}`} style={{ width: `${alert.confidence * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold font-mono text-primary">{(alert.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="p-2 border border-white/10 rounded-lg group-hover:text-primary transition-colors">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No recent alerts</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Activity Feed */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#050505]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-slate-100">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 tracking-tight">
              Real-time Analysis Feed
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
            </h3>
            {activityFeed.length > 0 ? (
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
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No activity yet</p>
              </div>
            )}
          </motion.div>
        </main>
      </div>

      <AlertModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  )
}

// Sub-components: Sidebar and StatCard
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

function StatCard({ icon, label, value, trend, trendUp, pulse }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-primary/40 transition-all duration-500 shadow-xl group">
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-300">{icon}</div>
        {trend && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trendUp ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500"}`}>
            {trend}
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

function AlertModal({
  alert,
  onClose,
  onUpdateStatus
}: {
  alert: AlertDetail | null;
  onClose: () => void;
  onUpdateStatus: (alertId: number, status: string) => void;
}) {
  if (!alert) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-8 max-w-4xl w-full my-8 shadow-2xl modal-scroll text-slate-100" style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-white">{alert.alert.attack_type} Attack Detected</h2>
              <p className="text-slate-400 font-mono">{new Date(alert.alert.timestamp).toLocaleString()}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold mb-6">
            {(alert.alert.confidence * 100).toFixed(1)}% Confidence
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-black/40 border border-white/5 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1 font-semibold">Alert ID</div>
              <div className="font-mono font-bold text-lg text-white">#{alert.alert.alert_id}</div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1 font-semibold">Status</div>
              <div className="font-mono font-bold text-lg text-white uppercase">{alert.alert.status}</div>
            </div>
          </div>

          {alert.shap_explanation.top_features.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4 text-white">SHAP Feature Importance</h3>
              <div className="space-y-3">
                {alert.shap_explanation.top_features.map((feature, index) => (
                  <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-300">{feature.feature}</span>
                      <span className="text-sm font-bold font-mono text-primary">{feature.shap_value.toFixed(3)}</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(Math.abs(feature.shap_value) * 100, 100)}%` }} transition={{ duration: 0.8 }} className={`h-full ${feature.shap_value > 0 ? "bg-destructive" : "bg-primary"}`} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {alert.shap_explanation.summary && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
              <h4 className="font-bold mb-2 text-primary flex items-center gap-2">
                <Activity className="w-4 h-4" /> Analysis Summary
              </h4>
              <p className="leading-relaxed text-sm text-slate-300 font-medium">{alert.shap_explanation.summary}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
            <button
              onClick={() => onUpdateStatus(alert.alert.alert_id, "false_positive")}
              className="px-6 py-3 bg-destructive hover:opacity-90 text-destructive-foreground rounded-lg font-bold transition-opacity text-sm"
            >
              Mark as False Positive
            </button>
            <button
              onClick={() => onUpdateStatus(alert.alert.alert_id, "investigating")}
              className="px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-lg font-bold transition-opacity text-sm"
            >
              Investigate
            </button>
            <button
              onClick={() => onUpdateStatus(alert.alert.alert_id, "resolved")}
              className="px-6 py-3 border border-white/10 hover:bg-white/5 text-white rounded-lg font-bold transition-all ml-auto text-sm"
            >
              Mark Resolved
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}