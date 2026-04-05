'use client';

import { motion } from 'framer-motion';
import { useScrollTrigger } from '@/lib/animations';

export function ProblemsGrid() {
  const { ref, isInView } = useScrollTrigger();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const problems = [
    {
      num: '01',
      icon: '⚡',
      title: 'Unpredictable Peak Loads',
      desc: 'Without accurate forecasting, grid operators struggle to anticipate demand spikes, leading to potential blackouts and operational inefficiencies.',
      stat: '34% reduction in unplanned outages',
    },
    {
      num: '02',
      icon: '📊',
      title: 'suboptimal Resource Allocation',
      desc: 'Manual load balancing wastes renewable energy and requires expensive backup generation, increasing operational costs.',
      stat: '28% lower operational costs',
    },
    {
      num: '03',
      icon: '🔴',
      title: 'Delayed Anomaly Detection',
      desc: 'Late detection of grid anomalies means costly equipment damage and extended service interruptions for grid consumers.',
      stat: '45% faster incident response',
    },
  ];

  return (
    <section
      ref={ref}
      className="py-28 px-12 bg-[#f8faff]"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-medium uppercase tracking-[0.2em] text-[#0F9E90] mb-4"
          >
            Grid Challenges
          </motion.p>

          <motion.h2
            variants={itemVariants}
            className="text-4xl lg:text-5xl font-black font-redhat mb-6 leading-tight tracking-tight mx-auto max-w-2xl"
          >
            Why Accurate Forecasting Matters
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-[#64748b] max-w-2xl mx-auto"
          >
            Grid operators face critical challenges that demand intelligent solutions
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {problems.map((problem, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="relative bg-white border border-[#cfd8e3] rounded-xl p-8 hover:border-[rgba(15,158,144,0.35)] hover:shadow-lg hover:translate-y-[-8px] transition-all group overflow-hidden"
            >
              {/* Top border gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ffab00] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

              {/* Problem number */}
              <div className="absolute top-4 right-4 text-7xl font-black text-[#ffab00] opacity-10">
                {problem.num}
              </div>

              {/* Icon */}
              <div className="w-12 h-12 border-2 border-[#ffab00] rounded-lg flex items-center justify-center text-2xl mb-4 bg-[rgba(255,171,0,0.06)] group-hover:border-[#0F9E90] group-hover:bg-[rgba(15,158,144,0.08)] transition-all">
                {problem.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold font-redhat mb-3">{problem.title}</h3>

              {/* Description */}
              <p className="text-[#64748b] text-sm leading-relaxed mb-4">{problem.desc}</p>

              {/* Stat badge */}
              <div className="pt-4 border-t border-[#e2e8f0] text-xs font-dmmono font-bold text-[#ffab00]">
                {problem.stat}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
