"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Upload, FileText, X, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { uploadCSV } from "@/lib/api"
import type { UploadResponse } from "@/lib/api"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [results, setResults] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile)
      setError(null)
    } else {
      setError("Please upload a CSV file")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90))
    }, 300)

    try {
      const response = await uploadCSV(file)
      clearInterval(progressInterval)
      setUploadProgress(100)
      setResults(response)
      setUploading(false)
    } catch (err: any) {
      clearInterval(progressInterval)
      setError(err.message || "Upload failed. Please check your file format.")
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setResults(null)
    setUploadProgress(0)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Header */}
      <header className="bg-card/40 backdrop-blur-xl border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-7 h-7" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Upload Network Data</h1>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Data Ingestion Engine</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-destructive/10 border border-destructive/50 rounded-2xl flex items-start gap-4"
          >
            <AlertCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-black uppercase tracking-widest text-xs text-destructive mb-1">Upload Error</div>
              <div className="text-sm text-destructive/80 font-mono">{error}</div>
            </div>
            <button onClick={() => setError(null)} className="ml-auto p-2 hover:bg-destructive/20 rounded-xl transition-colors">
              <X className="w-5 h-5 text-destructive" />
            </button>
          </motion.div>
        )}

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-12 shadow-2xl"
        >
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-white/10 rounded-2xl p-20 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="file-input" />
              <label htmlFor="file-input" className="cursor-pointer">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20"
                >
                  <Upload className="w-12 h-12 text-white" />
                </motion.div>
                <h3 className="text-2xl font-black mb-2 tracking-tight">Drop CSV file here</h3>
                <p className="text-muted-foreground font-mono text-sm mb-4">or click to browse local storage</p>
                <p className="text-[10px] text-primary/60 font-mono uppercase tracking-[0.2em]">
                  Supports CICIDS2017 format (78 network features)
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-8">
              {/* File Info Card */}
              <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-2xl p-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="text-xl font-black font-mono tracking-tight text-white">{file.name}</div>
                    <div className="text-sm text-muted-foreground font-mono uppercase tracking-widest mt-1">{(file.size / 1024).toFixed(2)} KB</div>
                  </div>
                </div>
                <button onClick={resetUpload} className="p-3 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="px-2">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono uppercase tracking-[0.3em] text-primary animate-pulse">Analyzing network flows...</span>
                    <span className="text-lg font-black font-mono text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="h-3 bg-black/60 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary shadow-[0_0_15px_#22d3ee]"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              {!uploading && !results && (
                <motion.button
                  onClick={handleAnalyze}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all"
                >
                  Initiate Threat Scan
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* Results Section */}
        {results && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center gap-4 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <div className="font-black uppercase tracking-widest text-xs text-emerald-500">Heuristic Analysis Complete</div>
            </div>

            {/* Summary Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
                <div className="text-5xl font-black mb-3 text-white tracking-tighter">{results.total_flows_processed}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Total Flows Processed</div>
              </div>
              <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
                <div className="text-5xl font-black mb-3 text-destructive tracking-tighter">
                  {results.predictions.filter((p) => p.prediction !== "Benign").length}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Anomalies Detected</div>
              </div>
              <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
                <div className="text-5xl font-black mb-3 text-emerald-500 tracking-tighter">
                  {results.predictions.filter((p) => p.prediction === "Benign").length}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Benign Traffic verified</div>
              </div>
            </div>

            {/* Predictions Table */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight">Detection Results (Sample_20)</h3>
                <Link href="/dashboard/alerts" className="text-xs font-mono text-primary uppercase tracking-widest hover:underline">
                  Full Alert Console →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black/40 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                      <th className="py-5 px-8">Flow ID</th>
                      <th className="py-5 px-8">Classification</th>
                      <th className="py-5 px-8">Confidence</th>
                      <th className="py-5 px-8 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.predictions.slice(0, 20).map((pred, index) => (
                      <motion.tr
                        key={pred.alert_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/3 transition-colors"
                      >
                        <td className="py-5 px-8 font-mono text-sm text-primary font-bold">#{pred.alert_id}</td>
                        <td className="py-5 px-8">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${pred.prediction === "Benign"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                              }`}
                          >
                            {pred.prediction}
                          </span>
                        </td>
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden max-w-20">
                              <div
                                className={`h-full ${pred.confidence > 0.9 ? "bg-primary" : "bg-chart-4"}`}
                                style={{ width: `${pred.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold font-mono">{(pred.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <Link href={`/dashboard/alerts/${pred.alert_id}`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors">
                            Inspect
                          </Link>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={resetUpload}
              className="w-full py-4 border border-white/10 hover:bg-white/5 rounded-2xl font-mono text-xs uppercase tracking-[0.3em] transition-all"
            >
              Clear Buffer & Re-upload
            </button>
          </motion.div>
        )}
      </main>
    </div>
  )
}