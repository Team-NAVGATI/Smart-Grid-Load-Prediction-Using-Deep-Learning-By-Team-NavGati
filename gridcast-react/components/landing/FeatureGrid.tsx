'use client';

import { motion } from 'framer-motion';
import { useScrollTrigger } from '@/lib/animations';

export function FeatureGrid() {
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

  const nodes = [
    { id: 1, status: 'active' },
    { id: 2, status: 'active' },
    { id: 3, status: 'warn' },
    { id: 4, status: 'active' },
    { id: 5, status: 'active' },
    { id: 6, status: 'active' },
    { id: 7, status: 'crit' },
    { id: 8, status: 'active' },
    { id: 9, status: 'active' },
    { id: 10, status: 'active' },
    { id: 11, status: 'active' },
    { id: 12, status: 'warn' },
    { id: 13, status: 'active' },
    { id: 14, status: 'active' },
    { id: 15, status: 'active' },
    { id: 16, status: 'active' },
    { id: 17, status: 'active' },
    { id: 18, status: 'active' },
    { id: 19, status: 'active' },
    { id: 20, status: 'crit' },
    { id: 21, status: 'active' },
    { id: 22, status: 'active' },
    { id: 23, status: 'active' },
    { id: 24, status: 'active' },
    { id: 25, status: 'active' },
  ];

  const getNodeStyles = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-[#0F9E90] text-[#0F9E90] shadow-[0_0_8px_rgba(15,158,144,0.3)]';
      case 'warn':
        return 'border-[#ffab00] text-[#ffab00] shadow-[0_0_12px_rgba(255,171,0,0.2)]';
      case 'crit':
        return 'border-[#ff1744] text-[#ff1744] animate-pulse';
      default:
        return 'border-[#e2e8f0] text-[#94a3b8]';
    }
  };

  return (
    <section
      ref={ref}
      className="py-28 px-12 bg-gradient-to-b from-white via-[#f8faff] to-[#f4f9ff]"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="grid grid-cols-2 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Left: Text Content */}
          <motion.div variants={itemVariants}>
            <motion.p
              variants={itemVariants}
              className="text-sm font-medium uppercase tracking-[0.2em] text-[#0F9E90] mb-4"
            >
              Real-Time Intelligence
            </motion.p>

            <motion.h2
              variants={itemVariants}
              className="text-4xl lg:text-5xl font-black font-redhat mb-6 leading-tight tracking-tight"
            >
              Live Grid State Monitoring
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-lg text-[#64748b] leading-relaxed mb-6"
            >
              Monitor your entire grid infrastructure in real-time. Track operational metrics, 
              identify anomalies, and respond to critical events instantly with AI-powered insights.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="space-y-3"
            >
              {[
                'Multi-region topology mapping',
                'Real-time anomaly detection',
                'Predictive maintenance alerts',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#0F9E90] rounded-full"></div>
                  <span className="text-[#64748b]">{feature}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Grid Infographic */}
          <motion.div
            variants={itemVariants}
            className="bg-white border border-[#cfd8e3] rounded-xl p-8 shadow-lg"
          >
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#0F9E90] mb-4">
              Live Grid Status
            </div>

            <div className="grid grid-cols-5 gap-3">
              {nodes.map((node) => (
                <motion.div
                  key={node.id}
                  className={`aspect-square flex items-center justify-center border-2 rounded-lg cursor-pointer transition-all hover:scale-105 font-dmmono text-xs font-bold ${getNodeStyles(
                    node.status
                  )}`}
                  whileHover={{ scale: 1.05 }}
                  title={`Node ${node.id} - ${node.status}`}
                >
                  {node.id}
                </motion.div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#0F9E90] rounded-full"></div>
                <span className="text-[#64748b]">Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#ffab00] rounded-full"></div>
                <span className="text-[#64748b]">Caution</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#ff1744] rounded-full animate-pulse"></div>
                <span className="text-[#64748b]">Critical</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
