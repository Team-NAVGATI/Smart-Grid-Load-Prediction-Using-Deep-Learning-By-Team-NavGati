'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const underlineVariants = {
    hidden: { scaleX: 0 },
    visible: { scaleX: 1, transition: { duration: 0.8, delay: 0.8 } },
  };

  return (
    <section className="relative min-h-[130vh] flex items-center px-12 overflow-hidden pt-20">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-[10%] w-[900px] h-[500px] rounded-full bg-gradient-to-br from-[rgba(0,61,153,0.09)] to-transparent blur-3xl"></div>
        <div className="absolute top-8 right-[8%] w-[760px] h-[420px] rounded-full bg-gradient-to-br from-[rgba(15,158,144,0.10)] to-transparent blur-3xl"></div>
      </div>

      <motion.div
        className="max-w-2xl lg:max-w-4xl relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Eyebrow */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-3 border border-[#cfd8e3] rounded-lg px-4 py-2 mb-8"
        >
          <span className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-pulse"></span>
          <span className="text-[12px] font-medium uppercase text-[#0F9E90] tracking-[0.15em]">
            Smart Grid Innovation
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl lg:text-7xl font-black font-redhat leading-tight tracking-tight mb-6"
        >
          Energy Load{' '}
          <span className="relative inline-block text-[#0F9E90]">
            Forecasting
            <motion.div
              variants={underlineVariants}
              className="absolute -bottom-3 left-0 right-0 h-1 bg-[#0F9E90] origin-left"
            />
          </span>
          <br />
          Reimagined
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={itemVariants}
          className="text-lg lg:text-xl text-[#64748b] leading-relaxed max-w-lg mb-8"
        >
          AI-powered grid load predictions with 72-hour accuracy. Optimize energy distribution, 
          reduce costs, and ensure grid stability with industry-leading ML models.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap gap-4 mb-10"
        >
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-[#0F9E90] hover:bg-[#0C7F74] text-white font-bold rounded-lg transition-all transform hover:translate-y-[-2px] shadow-lg hover:shadow-xl"
          >
            Launch Dashboard
          </Link>
          <button className="px-8 py-3 border-2 border-[#0F9E90] text-[#0F9E90] font-bold rounded-lg hover:bg-[#f0f4fb] transition-colors">
            Learn More
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap gap-12 pt-10 border-t border-[#cfd8e3]"
        >
          <div>
            <div className="font-dmmono text-3xl font-bold text-[#0F9E90] mb-1">2.1%</div>
            <div className="text-sm text-[#94a3b8]">Avg. Prediction Error</div>
          </div>
          <div>
            <div className="font-dmmono text-3xl font-bold text-[#0F9E90] mb-1">500+</div>
            <div className="text-sm text-[#94a3b8]">Grid Substations</div>
          </div>
          <div>
            <div className="font-dmmono text-3xl font-bold text-[#0F9E90] mb-1">72h</div>
            <div className="text-sm text-[#94a3b8]">Max Horizon</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
