"use client"

import { motion } from "framer-motion"

const pots = [
  { name: "NVIDIA Pot", badge: "Trending", progress: 87, accent: "text-robinhood border-robinhood/30" },
  { name: "Bitcoin Pot", badge: "Almost Full", progress: 96, accent: "text-amber-300 border-amber-500/30" },
  { name: "AI Basket", badge: "Community", progress: 34, accent: "text-sky-300 border-sky-500/30" },
  { name: "S&P 500 Pot", badge: "Platform", progress: 55, accent: "text-emerald-300 border-emerald-500/30" },
]

export function TiersSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-16 text-center"
      >
        <h2 className="text-4xl font-black tracking-tight text-zinc-100 sm:text-5xl">
          Concurrent Pots
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-500">
          Platform, community, and seasonal pots run side by side. Join as many as you want.
        </p>
      </motion.div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {pots.map((pot, i) => (
          <motion.div
            key={pot.name}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -6 }}
            className={`group relative overflow-hidden rounded-2xl border ${pot.accent.split(" ")[1]} bg-zinc-900/40 p-8 backdrop-blur-sm`}
          >
            <div
              className={`mb-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${pot.accent}`}
            >
              {pot.badge}
            </div>
            <h3 className="text-2xl font-bold text-zinc-100">{pot.name}</h3>
            <p className={`mt-2 text-lg font-semibold ${pot.accent.split(" ")[0]}`}>
              {pot.progress}% funded
            </p>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-robinhood"
                style={{ width: `${pot.progress}%` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
