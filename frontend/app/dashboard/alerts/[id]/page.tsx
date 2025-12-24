"use client"

import { motion } from "framer-motion"
import { AlertCircle, X, Activity, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getAlertDetail, updateAlertStatus, type AlertDetail } from "@/lib/api"

export default function AlertDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [alertData, setAlertData] = useState<AlertDetail | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadDetail = async () => {
            try {
                if (!params.id) return
                const data = await getAlertDetail(Number(params.id))
                setAlertData(data)
            } catch (err: any) {
                console.error("Failed to load alert details:", err.message)
            } finally {
                setLoading(false)
            }
        }
        loadDetail()
    }, [params.id])

    const handleUpdateStatus = async (status: string) => {
        if (!alertData) return
        try {
            await updateAlertStatus(alertData.alert.alert_id, status)
            router.push('/dashboard/alerts')
        } catch (err: any) {
            console.error("Failed to update status:", err.message)
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
            Loading details...
        </div>
    )

    if (!alertData) return (
        <div className="min-h-screen bg-background flex items-center justify-center text-destructive">
            Alert not found
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="bg-card/40 backdrop-blur-xl border-b border-border/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-4">
                    <Link href="/dashboard/alerts" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-7 h-7" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Alert Details</h1>
                        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Forensic Investigation</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-8">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-3xl font-bold mb-2 text-white">
                                {alertData.alert.attack_type} {alertData.alert.prediction === "Attack" ? "Attack" : ""} Detected
                            </h2>
                            <p className="text-slate-400 font-mono">
                                {new Date(alertData.alert.timestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold mb-6">
                        {(alertData.alert.confidence * 100).toFixed(1)}% Confidence
                    </div>

                    {/* Network Flow Info */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/40 border border-white/5 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1 font-semibold">Alert ID</div>
                            <div className="font-mono font-bold text-lg text-white">#{alertData.alert.alert_id}</div>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1 font-semibold">Status</div>
                            <div className="font-mono font-bold text-lg text-white">{alertData.alert.status}</div>
                        </div>
                    </div>

                    {/* SHAP Explanation */}
                    {alertData.shap_explanation.top_features.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xl font-bold mb-4 text-white">SHAP Feature Importance</h3>
                            <div className="space-y-3">
                                {alertData.shap_explanation.top_features.map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-slate-300">{feature.feature}</span>
                                            <span className="text-sm font-bold font-mono text-primary">
                                                {feature.shap_value.toFixed(3)}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${Math.min(Math.abs(feature.shap_value) * 100, 100)}%`,
                                                }}
                                                transition={{ duration: 0.8, delay: index * 0.1 }}
                                                className={`h-full ${feature.shap_value > 0 ? "bg-destructive" : "bg-primary"}`}
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Feature value: {feature.feature_value.toFixed(2)}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Analysis Summary */}
                    {alertData.shap_explanation.summary && (
                        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
                            <h4 className="font-bold mb-2 text-primary flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Analysis Summary
                            </h4>
                            <p className="leading-relaxed text-sm text-slate-300 font-medium">
                                {alertData.shap_explanation.summary}
                            </p>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
                        <button
                            onClick={() => handleUpdateStatus("false_positive")}
                            className="px-6 py-3 bg-destructive hover:opacity-90 text-destructive-foreground rounded-lg font-bold transition-opacity text-sm"
                        >
                            Mark as False Positive
                        </button>
                        <button
                            onClick={() => handleUpdateStatus("investigating")}
                            className="px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-lg font-bold transition-opacity text-sm"
                        >
                            Investigate
                        </button>
                        <button
                            onClick={() => handleUpdateStatus("resolved")}
                            className="px-6 py-3 border border-white/10 hover:bg-white/5 text-white rounded-lg font-bold transition-all ml-auto text-sm"
                        >
                            Mark Resolved
                        </button>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}