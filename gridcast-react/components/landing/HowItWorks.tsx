'use client';

import { motion } from 'framer-motion';
import { useScrollTrigger } from '@/lib/animations';

export function HowItWorks() {
  const { ref, isInView } = useScrollTrigger();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const steps = [
    { num: '1', name: 'Ingest', desc: 'Real-time datastream' },
    { num: '2', name: 'Clean', desc: 'Normalize & validate' },
    { num: '3', name: 'Feature', desc: 'Extract signals' },
    { num: '4', name: 'Model', desc: 'XGBoost & LSTM' },
    { num: '5', name: 'Predict', desc: '24h-72h horizon' },
    { num: '6', name: 'Deploy', desc: 'Real-time API' },
  ];

  return (
    <section
      ref={ref}
      className="py-28 px-12 bg-white"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-20"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-medium uppercase tracking-[0.2em] text-[#0F9E90] mb-4"
          >
            Our Approach
          </motion.p>

          <motion.h2
            variants={itemVariants}
            className="text-4xl lg:text-5xl font-black font-redhat mb-6 leading-tight tracking-tight"
          >
            How GridCast Works
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-[#64748b] max-w-2xl mx-auto"
          >
            A complete ML pipeline optimized for energy forecasting
          </motion.p>
        </motion.div>

        {/* Pipeline Steps */}
        <motion.div
          className="relative"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Connecting line */}
          <div className="absolute top-14 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#0F9E90] to-transparent"></div>

          <div className="grid grid-cols-6 gap-2 relative z-10">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="flex flex-col items-center text-center"
              >
                {/* Circle with number */}
                <div className="w-14 h-14 rounded-full border-2 border-[#0F9E90] flex items-center justify-center font-bold text-[#0F9E90] bg-white mb-4 relative z-10">
                  {step.num}
                </div>

                {/* Step info */}
                <h3 className="font-bold font-redhat text-sm mb-1">{step.name}</h3>
                <p className="text-xs text-[#94a3b8]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          className="mt-20 grid grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {[
            {
              title: 'Automated',
              desc: 'End-to-end ML pipeline requires minimal manual intervention',
            },
            {
              title: 'Scalable',
              desc: 'Handles multi-region grid data at production scale',
            },
            {
              title: 'Interpretable',
              desc: 'Model outputs with explainable insights for operators',
            },
          ].map((benefit, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="p-6 bg-gradient-to-br from-[#f0f4fb] to-white border border-[#e2e8f0] rounded-lg hover:border-[#0F9E90] transition-colors"
            >
              <h4 className="font-bold text-[#003d99] mb-2">{benefit.title}</h4>
              <p className="text-sm text-[#64748b]">{benefit.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
