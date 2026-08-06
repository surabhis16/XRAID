"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, Brain, Lightbulb, Zap, Shield, Database, Target } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { LandingHeader } from "@/components/landing-header"

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.98])

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <LandingHeader />

      {/* Hero Section */}
      <motion.section
        className="relative min-h-[95vh] flex flex-col items-center justify-center overflow-hidden pt-32 pb-20 px-4"
        style={{ opacity }}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.12),transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.1]"
            style={{
              backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
            }}
          />
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/40 rounded-full"
              animate={{ y: [0, -120, 0], opacity: [0, 0.8, 0] }}
              transition={{ duration: Math.random() * 6 + 4, repeat: Infinity, delay: Math.random() * 5 }}
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            />
          ))}
        </div>

        <motion.div style={{ y, scale }} className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Next-Gen AI Security
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter leading-none mb-2 bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/40">
              XRAID
            </h1>
            <p className="text-primary font-mono text-sm md:text-base tracking-[0.4em] uppercase mb-12">
              Trust Through Transparency
            </p>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-4xl md:text-6xl font-bold mb-8 tracking-tight text-balance leading-tight"
          >
            Stop Trusting <span className="text-primary italic">Black-Box</span> Security
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            See exactly why every threat was flagged. Powered by explainable AI to give you clear evidence in sub-100ms.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-5 justify-center items-center"
          >
            <Link href="/dashboard">
              <button className="px-10 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all flex items-center gap-2 group">
                View Live Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="px-10 py-4 bg-secondary/10 border border-white/10 backdrop-blur-md rounded-full font-bold text-lg hover:bg-secondary/20 transition-all">
              Documentation
            </button>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features Grid */}
      <section className="py-32 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-center mb-20 tracking-tight"
          >
            Why Choose our Platform?
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain />}
              title="Adaptive Ensemble"
              description="Random Forest + Isolation Forest + Autoencoder fusion with confidence scoring for unparalleled accuracy."
              delay={0}
            />
            <FeatureCard
              icon={<Lightbulb />}
              title="SHAP Explanations"
              description="See the top 5 features driving each detection with clear, actionable insights for every alert."
              delay={0.1}
            />
            <FeatureCard
              icon={<Zap />}
              title="Real-Time Detection"
              description="Instant predictions on high-velocity network flows with sub-100ms response times at scale."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 px-4 bg-secondary/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-center mb-24 tracking-tight"
          >
            How It Works
          </motion.h2>

          <div className="grid md:grid-cols-4 gap-12 relative">
            <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-linear-to-r from-transparent via-primary/30 to-transparent" />
            <TimelineStep
              icon={<Database className="w-8 h-8" />}
              title="Upload"
              description="Submit network flow data"
              step={1}
            />

            <TimelineStep
              icon={<Target className="w-8 h-8" />}
              title="Detect"
              description="AI models analyze patterns"
              step={2}
            />

            <TimelineStep
              icon={<Lightbulb className="w-8 h-8" />}
              title="Explain"
              description="SHAP reveals the 'Why'"
              step={3}
            />

            <TimelineStep
              icon={<Shield className="w-8 h-8" />}
              title="Act"
              description="Make informed decisions"
              step={4}
            />

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard value={3} label="AI Models" sublabel="RF, IF, AE" />
            <StatCard value={5} label="Attack Types" sublabel="DDoS to PortScan" />
            <StatCard value={78} label="Features" sublabel="Analyzed per flow" />
            <StatCard value={100} label="Latency" sublabel="Average ms" suffix="<" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-white/5 bg-background">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6 text-center">
          <div className="text-2xl font-black tracking-tighter">XRAID</div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Built for security analysts who demand transparency in AI.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -8 }}
      className="p-8 rounded-3xl bg-secondary/5 border border-white/10 hover:border-primary/50 hover:bg-primary/2 transition-all duration-500 group"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{description}</p>
    </motion.div>
  )
}

function TimelineStep({ icon, title, description, step }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: step * 0.1 }}
      className="relative z-10 flex flex-col items-center text-center"
    >
      <div className="w-20 h-20 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.1)] group hover:border-primary transition-colors">
        <div className="text-primary w-8 h-8 group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <div className="text-xs font-bold text-primary mb-2 uppercase tracking-widest">Step 0{step}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed max-w-37.5">{description}</p>
    </motion.div>
  )
}

function StatCard({ value, label, sublabel, suffix = "" }: any) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)

  const handleInView = () => {
    if (!hasAnimated) {
      setHasAnimated(true)
      const duration = 2000
      const steps = 40
      const increment = value / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setCount(value)
          clearInterval(timer)
        } else {
          setCount(Math.floor(current))
        }
      }, duration / steps)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      onViewportEnter={handleInView}
      className="
        p-14
        min-h-60
        rounded-[2.25rem]
        bg-secondary/5
        border border-white/10
        text-center
        hover:bg-secondary/10
        transition-all
        duration-300
      "
    >
      <div className="text-6xl md:text-6xl font-black text-primary mb-4 tabular-nums">
        {suffix}{count}
      </div>

      <div className="text-base md:text-lg font-extrabold mb-2 uppercase tracking-wide">
        {label}
      </div>

      <div className="text-sm md:text-base text-muted-foreground font-medium">
        {sublabel}
      </div>
    </motion.div>
  )
}
