"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Upload, FileText, X, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [results, setResults] = useState<any>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleAnalyze = () => {
    setUploading(true)
    setUploadProgress(0)

    // Simulate upload and analysis
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)
          // Mock results
          setResults({
            total: 100,
            malicious: 23,
            benign: 77,
            predictions: [
              { id: 1, srcIp: "192.168.1.45", dstIp: "10.0.0.12", prediction: "DDoS", confidence: 96 },
              { id: 2, srcIp: "192.168.1.72", dstIp: "10.0.0.8", prediction: "Normal", confidence: 99 },
              { id: 3, srcIp: "192.168.1.103", dstIp: "10.0.0.45", prediction: "PortScan", confidence: 87 },
              { id: 4, srcIp: "192.168.1.89", dstIp: "10.0.0.23", prediction: "DoS", confidence: 94 },
              { id: 5, srcIp: "192.168.1.156", dstIp: "10.0.0.67", prediction: "Normal", confidence: 98 },
            ],
          })
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Upload Network Data</h1>
            <p className="text-sm text-muted-foreground">Analyze network flows for threats</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-12 mb-8"
        >
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-xl p-16 text-center hover:border-primary transition-colors cursor-pointer"
            >
              <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="file-input" />
              <label htmlFor="file-input" className="cursor-pointer">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Upload className="w-12 h-12 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-2">Drop CSV file here</h3>
                <p className="text-muted-foreground mb-4">or click to browse</p>
                <p className="text-sm text-muted-foreground font-mono">Supports .csv files with network flow data</p>
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Info */}
              <div className="flex items-center justify-between bg-card rounded-lg p-6">
                <div className="flex items-center gap-4">
                  {/* File Icon */}
                  <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold font-mono">{file.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">{(file.size / 1024).toFixed(2)} KB</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null)
                    setResults(null)
                    setUploadProgress(0)
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground font-mono">Analyzing...</span>
                    <span className="text-sm font-bold font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    {/* Progress Bar */}
                    <motion.div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              {!uploading && !results && (
                <motion.button
                  onClick={handleAnalyze}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-primary text-white rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-primary/50 transition-all"
                >
                  Analyze Network Flow
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* Results */}
        {results && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="glass rounded-xl p-6">
                <div className="text-4xl font-bold mb-2">{results.total}</div>
                <div className="text-muted-foreground">Total Flows Analyzed</div>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-4xl font-bold mb-2 text-destructive">{results.malicious}</div>
                <div className="text-muted-foreground">Malicious Detected</div>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-4xl font-bold mb-2 text-primary">{results.benign}</div>
                <div className="text-muted-foreground">Benign Traffic</div>
              </div>
            </div>

            {/* Predictions Table */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Detection Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Source IP</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Destination IP
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Prediction</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.predictions.map((pred: any, index: number) => (
                      <motion.tr
                        key={pred.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border-b border-border hover:bg-card transition-colors"
                      >
                        <td className="py-4 px-4 font-mono text-sm">{pred.srcIp}</td>
                        <td className="py-4 px-4 font-mono text-sm">{pred.dstIp}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                              pred.prediction === "Normal"
                                ? "bg-primary/20 text-primary"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {pred.prediction !== "Normal" && <AlertCircle className="w-4 h-4" />}
                            {pred.prediction}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className={`h-full ${pred.confidence > 90 ? "bg-primary" : "bg-chart-4"}`}
                                style={{ width: `${pred.confidence}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold font-mono">{pred.confidence}%</span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
