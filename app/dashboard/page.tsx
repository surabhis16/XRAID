"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Home,
  AlertCircle,
  BarChart3,
  Upload,
  Settings,
  X,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Eye,
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
  { id: 5, time: "15 min ago", type: "DDoS", confidence: 92, status: "critical" },
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
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-64">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Main Content */}
        <main className="p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<AlertCircle className="w-6 h-6" />}
              label="Total Alerts Today"
              value="247"
              trend={12}
              trendUp={true}
            />
            <StatCard
              icon={<Shield className="w-6 h-6" />}
              label="Detection Accuracy"
              value="99.54%"
              progress={99.54}
            />
            <StatCard icon={<Activity className="w-6 h-6" />} label="Critical Threats" value="8" pulse={true} />
            <StatCard
              icon={<BarChart3 className="w-6 h-6" />}
              label="System Status"
              value="Operational"
              status="success"
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Attack Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6 scan-line"
            >
              <h3 className="text-xl font-bold mb-4">Attack Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attackDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {attackDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#F1F5F9",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {attackDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-400">{item.name}</span>
                    <span className="text-sm font-bold ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Alerts Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-6 scan-line"
            >
              <h3 className="text-xl font-bold mb-4">Recent Alerts</h3>
              <div className="space-y-3">
                {recentAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-3 bg-card rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold font-mono">{alert.type}</span>
                        <span className="text-xs text-muted-foreground font-mono">{alert.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              alert.confidence > 90
                                ? "bg-primary"
                                : alert.confidence > 70
                                  ? "bg-chart-4"
                                  : "bg-destructive"
                            }`}
                            style={{ width: `${alert.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold font-mono">{alert.confidence}%</span>
                      </div>
                    </div>
                    <button className="px-3 py-1 text-xs bg-primary hover:bg-primary/80 text-white rounded transition-opacity">
                      <Eye className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-6 scan-line"
          >
            <h3 className="text-xl font-bold mb-4">
              Real-time Activity Feed <span className="inline-block w-2 h-2 bg-accent rounded-full pulse-green ml-2" />
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activityFeed.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-3 bg-card rounded-lg text-sm"
                >
                  <span className="text-muted-foreground font-mono text-xs">{item.time}</span>
                  <span className="flex-1">{item.prediction}</span>
                  <span className={`font-bold font-mono ${item.confidence > 90 ? "text-primary" : "text-chart-4"}`}>
                    {item.confidence}%
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>

      {/* Alert Details Modal */}
      <AlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </div>
  )
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navItems = [
    { icon: <Home />, label: "Dashboard", href: "/dashboard", active: true },
    { icon: <AlertCircle />, label: "Alerts", href: "/dashboard/alerts" },
    { icon: <BarChart3 />, label: "Analytics", href: "/dashboard/analytics" },
    { icon: <Upload />, label: "Upload", href: "/upload" },
    { icon: <Settings />, label: "Settings", href: "/dashboard/settings" },
  ]

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed top-0 left-0 h-full w-64 glass border-r border-border z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-primary">XRAID</h1>
              <p className="text-xs text-muted-foreground">Trust Through Transparency</p>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-muted rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
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
      className="glass rounded-xl p-6 hover:glow-hover transition-all duration-300 scan-line"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-primary rounded-lg text-white">{icon}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trendUp ? "text-primary" : "text-destructive"}`}>
            {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold mb-1 flex items-center gap-2">
        {value}
        {pulse && <div className="w-2 h-2 bg-destructive rounded-full pulse-green" />}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {progress && (
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-primary"
          />
        </div>
      )}
      {status === "success" && (
        <div className="mt-2 text-xs text-primary flex items-center gap-1">
          <div className="w-2 h-2 bg-primary rounded-full pulse-green" />
          All systems normal
        </div>
      )}
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
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{alert.type} Attack Detected</h2>
              <p className="text-muted-foreground font-mono">{alert.time}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="inline-block px-4 py-2 bg-primary rounded-lg font-bold mb-6 text-white">
            {alert.confidence}% Confidence
          </div>

          {/* Network Flow Info */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Source IP</div>
              <div className="font-mono font-bold">{`192.168.1.${Math.floor(Math.random() * 255)}`}</div>
            </div>
            <div className="bg-card rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Destination IP</div>
              <div className="font-mono font-bold">{`10.0.0.${Math.floor(Math.random() * 255)}`}</div>
            </div>
          </div>

          {/* SHAP Explanation */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4">SHAP Feature Importance</h3>
            <div className="space-y-3">
              {shapFeatures.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{feature.name}</span>
                    <span className="text-sm font-bold font-mono">{feature.value}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        feature.impact === "high"
                          ? "bg-destructive"
                          : feature.impact === "medium"
                            ? "bg-chart-4"
                            : "bg-secondary"
                      }`}
                      style={{ width: `${feature.value}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-primary/10 rounded-lg p-4 mb-6 border-2 border-primary">
            <h4 className="font-bold mb-2 text-primary">Plain English Explanation</h4>
            <p className="leading-relaxed">
              This network flow was flagged as a <strong>{alert.type}</strong> attack due to an unusually high packet
              rate (15,000 pkt/s) combined with short flow duration and irregular byte distribution patterns typically
              associated with flood attacks.
            </p>
          </div>

          {/* Individual Model Predictions */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4">Model Predictions</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🌲</div>
                <div className="font-bold mb-1">Random Forest</div>
                <div className="text-2xl font-bold text-primary">{alert.confidence - 2}%</div>
              </div>
              <div className="bg-card rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-bold mb-1">Isolation Forest</div>
                <div className="text-2xl font-bold text-chart-4">{alert.confidence + 1}%</div>
              </div>
              <div className="bg-card rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🧠</div>
                <div className="font-bold mb-1">Autoencoder</div>
                <div className="text-2xl font-bold text-secondary">{alert.confidence}%</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-3 bg-destructive hover:opacity-90 text-white rounded-lg font-semibold transition-opacity">
              Mark as False Positive
            </button>
            <button className="px-6 py-3 bg-primary hover:opacity-90 text-white rounded-lg font-semibold transition-opacity">
              Investigate
            </button>
            <button className="px-6 py-3 glass hover:glow-hover rounded-lg font-semibold transition-all">
              Mark Resolved
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
