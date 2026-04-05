'use client';

import { motion } from 'framer-motion';
import { useScrollTrigger } from '@/lib/animations';

export function DemoSection() {
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

  const kpis = [
    { label: 'Peak Load', value: '2,847 MW', icon: '📈', color: '#ffab00' },
    { label: 'MAPE', value: '2.14%', icon: '✓', color: '#00e676' },
    { label: 'Accuracy', value: '97.86%', icon: '🎯', color: '#0F9E90' },
    { label: 'Models', value: '2 Active', icon: '🤖', color: '#003d99' },
  ];

  return (
    <section
      ref={ref}
      className="py-28 px-12 bg-gradient-to-b from-[#f8faff] to-white"
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
            Live Demo
          </motion.p>

          <motion.h2
            variants={itemVariants}
            className="text-4xl lg:text-5xl font-black font-redhat mb-6 leading-tight tracking-tight"
          >
            See GridCast in Action
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-[#64748b] max-w-2xl mx-auto mb-12"
          >
            Real-time dashboard with predictive insights and interactive visualizations
          </motion.p>
        </motion.div>

        {/* Demo Container */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* KPI Cards */}
          {kpis.map((kpi, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="bg-white border border-[#e2e8f0] rounded-lg p-6 hover:border-[#0F9E90] hover:shadow-lg transition-all group"
            >
              <div className="text-3xl mb-3">{kpi.icon}</div>
              <div className="text-xs uppercase tracking-[0.06em] text-[#94a3b8] font-medium mb-2">
                {kpi.label}
              </div>
              <div
                className="text-2xl font-bold font-dmmono"
                style={{ color: kpi.color }}
              >
                {kpi.value}
              </div>
              <div className="mt-3 h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: kpi.color }}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: '88%' } : { width: 0 }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          variants={itemVariants}
          className="mt-12 relative"
        >
          <div className="bg-gradient-to-br from-[#f0f4fb] to-[#f8faff] border-2 border-[#e2e8f0] rounded-xl p-8 lg:p-12 shadow-2xl overflow-hidden">
            {/* Simulated dashboard content */}
            <div className="space-y-4">
              <div className="flex gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-[#0F9E90]"></div>
                <div className="text-sm font-bold text-[#003d99]">Forecast Dashboard</div>
              </div>

              {/* Chart placeholder */}
              <div className="h-40 bg-white border border-[#e2e8f0] rounded-lg flex items-end justify-around p-6 gap-1">
                {[
                  65, 78, 72, 85, 90, 88, 92, 95, 93, 87, 89, 91, 88, 92, 96,
                ].map((height, idx) => (
                  <motion.div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-[#0F9E90] to-[#00e676] rounded-t-lg opacity-60 hover:opacity-100 transition-opacity"
                    style={{ height: `${(height / 100) * 100}%` }}
                    initial={{ height: 0 }}
                    animate={isInView ? { height: `${(height / 100) * 100}%` } : { height: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.03 }}
                  />
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: 'MAE', value: '34.2 MW' },
                  { label: 'RMSE', value: '48.1 MW' },
                  { label: 'Horizon', value: '24-72h' },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#e2e8f0] rounded-lg p-3 text-center"
                  >
                    <div className="text-xs text-[#94a3b8] font-medium uppercase mb-1">
                      {stat.label}
                    </div>
                    <div className="text-sm font-bold text-[#003d99]">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Overlay */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg opacity-0 hover:opacity-100 transition-opacity group cursor-pointer"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                  className="inline-block"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl shadow-lg">
                    ▶
                  </div>
                </motion.div>
                <p className="text-white font-bold mt-4">Explore Dashboard</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          variants={itemVariants}
          className="text-center mt-12"
        >
          <motion.a
            href="/dashboard"
            className="inline-block px-8 py-3 bg-[#0F9E90] hover:bg-[#0C7F74] text-white font-bold rounded-lg transition-all transform hover:translate-y-[-2px] shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Forecasting Now
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
