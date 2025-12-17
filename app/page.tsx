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

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground">
      <LandingHeader />

      {/* Hero Section */}
      <motion.section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
        style={{ opacity }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary/30 rounded-full"
              animate={{
                x: [
                  Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
                  Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
                ],
                y: [
                  Math.random() * (typeof window !== "undefined" ? window.innerHeight : 1000),
                  Math.random() * (typeof window !== "undefined" ? window.innerHeight : 1000),
                ],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          ))}
        </div>

        <motion.div style={{ y }} className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-4 text-primary">XRAID</h1>
            <p className="text-xl md:text-2xl text-secondary font-semibold tracking-wide">Trust Through Transparency</p>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold mb-6 text-balance"
          >
            Stop Trusting <span className="text-accent">Black-Box Security</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance"
          >
            See exactly why every threat was flagged - powered by explainable AI
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mb-12"
          >
            <Counter value={99.54} suffix="%" label="Detection Accuracy" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/dashboard">
              <button className="group px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:scale-105 transition-transform duration-200 glow-hover flex items-center gap-2">
                View Live Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="px-8 py-4 glass rounded-lg font-semibold text-lg hover:scale-105 transition-transform duration-200">
              See How It Works
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center p-2"
          >
            <div className="w-1 h-2 bg-muted-foreground rounded-full" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features Grid */}
      <section className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16"
          >
            Why Choose XRAID?
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain className="w-12 h-12" />}
              title="Adaptive Ensemble"
              description="Random Forest + Isolation Forest + Autoencoder fusion with confidence scoring for unparalleled accuracy"
              delay={0}
            />
            <FeatureCard
              icon={<Lightbulb className="w-12 h-12" />}
              title="SHAP Explanations"
              description="See top 5 features driving each detection with clear, actionable insights"
              delay={0.1}
            />
            <FeatureCard
              icon={<Zap className="w-12 h-12" />}
              title="Real-Time Detection"
              description="Instant predictions on network flows with sub-100ms response times"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-card">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16"
          >
            How It Works
          </motion.h2>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-primary -translate-y-1/2" />

            <TimelineStep icon={<Database />} title="Upload" description="Submit network flow data" step={1} />
            <TimelineStep icon={<Target />} title="Detect" description="AI models analyze patterns" step={2} />
            <TimelineStep icon={<Lightbulb />} title="Explain" description="SHAP reveals why" step={3} />
            <TimelineStep icon={<Shield />} title="Act" description="Make informed decisions" step={4} />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <StatCard value={3} label="AI Models" sublabel="RF, IF, AE" />
            <StatCard value={5} label="Attack Types" sublabel="DoS, DDoS, PortScan, Botnet" />
            <StatCard value={78} label="Features" sublabel="Analyzed per flow" />
            <StatCard value={100} label="Average ms" sublabel="Detection time" suffix="<" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p className="text-sm">© 2025 XRAID. Built for security analysts who demand transparency.</p>
        </div>
      </footer>
    </div>
  )
}

function Counter({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(current)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  return (
    <div className="inline-block">
      <div className="text-6xl md:text-7xl font-bold text-primary">
        {count.toFixed(2)}
        {suffix}
      </div>
      <div className="text-lg text-muted-foreground mt-2">{label}</div>
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
      whileHover={{ scale: 1.05, y: -5 }}
      className="glass rounded-xl p-8 hover:glow transition-all duration-300 cursor-pointer scan-line"
    >
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  )
}

function TimelineStep({ icon, title, description, step }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: step * 0.1 }}
      className="relative z-10 text-center"
    >
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center glow">
        <div className="text-white">{icon}</div>
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
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
      const steps = 60
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onViewportEnter={handleInView}
      className="glass rounded-xl p-8 text-center hover:glow-hover transition-all duration-300"
    >
      <div className="text-5xl font-bold text-primary mb-2">
        {suffix}
        {count}
      </div>
      <div className="text-xl font-semibold mb-1">{label}</div>
      <div className="text-sm text-muted-foreground">{sublabel}</div>
    </motion.div>
  )
}
