"use client"

import { motion } from "framer-motion"
import { AlertCircle, Eye, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getAlerts, type Alert } from "@/lib/api"

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadAlerts()
    }, [])

    const loadAlerts = async () => {
        try {
            setLoading(true)
            const data = await getAlerts(50)
            setAlerts(data)
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            {/* Header */}
            <header className="bg-card/40 backdrop-blur-xl border-b border-border/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="w-7 h-7" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Alert Management</h1>
                            <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Live Threat Monitoring</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">
                {error && (
                    <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-2xl flex items-center justify-between">
                        <div className="text-destructive font-bold text-lg tracking-tight uppercase">Sync Error: {error}</div>
                        <button onClick={loadAlerts} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm uppercase tracking-widest transition-all">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Accessing Forensic Logs...</div>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="text-center py-32 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                        <h3 className="text-xl font-bold tracking-tight mb-1 uppercase">Perimeter Secure</h3>
                        <p className="text-sm text-muted-foreground font-mono">Zero threat signatures identified in current buffer.</p>
                    </div>
                ) : (
                    <div className="dashboard-card bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10 bg-black/20">
                                        <th className="text-left py-4 px-6 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Alert ID</th>
                                        <th className="text-left py-4 px-6 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Timestamp</th>
                                        <th className="text-left py-4 px-6 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Classification</th>
                                        <th className="text-left py-4 px-6 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Confidence</th>
                                        <th className="text-left py-4 px-6 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Status</th>
                                        <th className="text-right py-4 px-6 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.map((alert, index) => (
                                        <motion.tr
                                            key={alert.alert_id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            className="border-b border-white/5 hover:bg-primary/5 transition-colors group"
                                        >
                                            <td className="py-4 px-6 font-mono text-sm text-primary font-bold">#{alert.alert_id}</td>
                                            <td className="py-4 px-6 text-sm font-medium text-slate-300">
                                                <div className="text-xs text-slate-400 font-mono">{new Date(alert.timestamp).toLocaleDateString()}</div>
                                                <div className="font-bold tracking-tight">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span
                                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${alert.attack_type === "Benign"
                                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        : "bg-destructive/10 text-destructive border-destructive/20"
                                                        }`}
                                                >
                                                    {alert.attack_type}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden max-w-25">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${alert.confidence > 0.9 ? "bg-primary shadow-[0_0_10px_#22d3ee]" : "bg-amber-500"}`}
                                                            style={{ width: `${alert.confidence * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold font-mono">{(alert.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-[10px] px-2 py-1 rounded bg-black/40 border border-white/5 text-slate-400 font-mono uppercase tracking-widest">
                                                    {alert.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <Link
                                                    href={`/dashboard/alerts/${alert.alert_id}`}
                                                    className="p-2 border border-white/10 rounded-xl group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-xl inline-block"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Link>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}