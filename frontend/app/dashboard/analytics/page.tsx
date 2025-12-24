"use client"

import { motion } from "framer-motion"
import {
    Activity,
    Shield,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    BarChart3,
    ArrowLeft,
    Printer,
    FileText
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts"
import { DashboardHeader } from "@/components/dashboard-header"

interface AttackBreakdown {
    attack_type: string
    count: number
    avg_confidence: number
    max_confidence: number
    min_confidence: number
}

interface ConfidenceDistribution {
    bins: string[]
    counts: number[]
    total: number
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<any>(null)
    const [attackBreakdown, setAttackBreakdown] = useState<AttackBreakdown[]>([])
    const [confidenceDistribution, setConfidenceDistribution] = useState<ConfidenceDistribution | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadAnalytics()
    }, [])

    const loadAnalytics = async () => {
        try {
            setLoading(true)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

            const [statsData, breakdownData, confidenceData] = await Promise.all([
                fetch(`${apiUrl}/api/stats`).then(r => r.json()),
                fetch(`${apiUrl}/api/stats/attack-breakdown`).then(r => r.json()),
                fetch(`${apiUrl}/api/stats/confidence-distribution`).then(r => r.json()),
            ])

            setStats(statsData)
            setAttackBreakdown(breakdownData.breakdown)
            setConfidenceDistribution(confidenceData)
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const AnalyticsHeader = () => (
        <header className="bg-card/40 backdrop-blur-xl border-b border-border/50 sticky top-0 z-10 print:hidden">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-7 h-7" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1> {/* Increased from text-2xl */}
                        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Intelligence & Forensics</p> {/* Matched alert tracking */}
                    </div>
                </div>

                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-primary/20"
                >
                    <Printer className="w-4 h-4" />
                    Print Report
                </button>
            </div>
        </header>
    )

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AnalyticsHeader />
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <div className="text-center">
                        <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Synchronizing Analytics...</div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AnalyticsHeader />
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-2xl">
                        <div className="font-bold text-destructive mb-2">Error loading analytics</div>
                        <div className="text-sm text-destructive/80 mb-4">{error}</div>
                        <button onClick={loadAnalytics} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">
                            Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const attackDistributionData = Object.entries(stats.attack_distribution).map(([name, value]) => ({
        name,
        value: value as number,
        color: name === "Benign" ? "#10B981" : name === "DDoS" ? "#06B6D4" : "#EF4444"
    }))

    const confidenceChartData = confidenceDistribution?.bins.map((bin, index) => ({
        range: bin,
        count: confidenceDistribution.counts[index]
    })) || []

    const detectionRate = stats.total_alerts > 0 ? (stats.total_attacks / stats.total_alerts) * 100 : 0

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            <style jsx global>{`
                @media print {
                    .print\:hidden { display: none !important; }
                    body { background: white !important; color: black !important; }
                    .dashboard-card { 
                        border: 1px solid #e2e8f0 !important; 
                        background: white !important; 
                        box-shadow: none !important;
                        break-inside: avoid;
                    }
                    main { padding: 0 !important; }
                }
            `}</style>

            <AnalyticsHeader />

            <main className="max-w-7xl mx-auto p-6 space-y-6">

                {/* PDF Report Header */}
                <div className="hidden print:block mb-10 border-b border-slate-200 pb-8">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">XRAID SECURITY REPORT</h1>
                    <p className="text-slate-500 font-mono mt-2">GENERATED: {new Date().toLocaleString()}</p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        icon={<AlertCircle className="w-6 h-6" />}
                        label="Total Alerts"
                        value={stats.total_alerts.toLocaleString()}
                        color="blue"
                    />
                    <MetricCard
                        icon={<Shield className="w-6 h-6" />}
                        label="Detection Accuracy"
                        value={`${(stats.avg_confidence * 100).toFixed(1)}%`}
                        color="green"
                    />
                    <MetricCard
                        icon={<Activity className="w-6 h-6" />}
                        label="Threat Velocity"
                        value={`${detectionRate.toFixed(1)}%`}
                        trend={detectionRate > 20 ? "up" : "down"}
                        color="purple"
                    />
                    <MetricCard
                        icon={<BarChart3 className="w-6 h-6" />}
                        label="Attack Vectors"
                        value={Object.keys(stats.attack_distribution).filter(k => k !== "Benign").length}
                        color="orange"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid lg:grid-cols-2 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="dashboard-card bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
                    >
                        <h3 className="text-xl font-bold mb-6 tracking-tight">Attack Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={attackDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {attackDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(0, 0, 0, 0.95)",
                                        border: "1px solid rgba(255, 255, 255, 0.2)",
                                        borderRadius: "12px",
                                        color: "#fff"
                                    }}
                                    itemStyle={{
                                        color: "#fff",
                                        fontWeight: "bold",
                                        fontSize: "12px",
                                        textTransform: "uppercase"
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-3 mt-6">
                            {attackDistributionData.map((item) => (
                                <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/5">
                                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                                    <span className="text-sm font-bold">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="dashboard-card bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
                    >
                        <h3 className="text-xl font-bold mb-6 tracking-tight">Confidence Analysis</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={confidenceChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="range" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: "black", border: "1px solid #334155", borderRadius: "12px" }} />
                                <Bar dataKey="count" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>
                </div>

                {/* Detailed Breakdown Table */}
                {attackBreakdown.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="dashboard-card bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
                    >
                        <h3 className="text-xl font-bold mb-6 tracking-tight">Vulnerability Breakdown</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-4 px-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Classification</th>
                                        <th className="text-left py-4 px-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Instances</th>
                                        <th className="text-left py-4 px-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Avg Confidence</th>
                                        <th className="text-left py-4 px-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Range (Min/Max)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attackBreakdown.map((attack) => (
                                        <tr key={attack.attack_type} className="border-b border-white/5 hover:bg-primary/5 transition-colors group">
                                            <td className="py-4 px-4 font-bold text-sm tracking-tight">{attack.attack_type}</td>
                                            <td className="py-4 px-4 font-mono font-bold text-primary">{attack.count}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden max-w-30">
                                                        <div className="h-full bg-primary" style={{ width: `${attack.avg_confidence * 100}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold font-mono">{(attack.avg_confidence * 100).toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-xs font-mono text-muted-foreground">
                                                {(attack.min_confidence * 100).toFixed(1)}% — {(attack.max_confidence * 100).toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    )
}

function MetricCard({ icon, label, value, trend, color = "blue" }: any) {
    const colorClasses = {
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        green: "bg-green-500/10 text-green-500 border-green-500/20",
        purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="dashboard-card bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-primary/40 transition-all duration-500 shadow-xl group"
        >
            <div className="flex items-start justify-between mb-6">
                <div className={`p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-300`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trend === "up" ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
                        {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                )}
            </div>
            <div className="text-4xl font-black tracking-tighter mb-2">{value}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
        </motion.div>
    )
}