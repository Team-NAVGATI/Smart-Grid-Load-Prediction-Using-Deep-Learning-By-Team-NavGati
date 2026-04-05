'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function LoginBackground() {
  const [lightning, setLightning] = useState<Array<{ id: number; x: number }>>([]);

  // Generate random lightning strikes
  useEffect(() => {
    const interval = setInterval(() => {
      const newLightning = {
        id: Date.now(),
        x: Math.random() * 100,
      };
      setLightning((prev) => [...prev, newLightning]);

      // Remove after animation
      setTimeout(() => {
        setLightning((prev) => prev.filter((l) => l.id !== newLightning.id));
      }, 600);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, []);

  // Grid drifting animation
  const gridVariants = {
    animate: {
      y: [0, -20, 0],
      opacity: [0.3, 0.5, 0.3],
      transition: {
        duration: 8,
        repeat: Infinity,
      },
    },
  };

  // Beacon pulse animation
  const beaconVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.8, 0.4, 0.8],
      transition: {
        duration: 3,
        repeat: Infinity,
      },
    },
  };

  // Lightning bolt animation
  const lightningVariants = {
    initial: { opacity: 0 },
    animate: { opacity: [0, 1, 0] },
    exit: { opacity: 0 },
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#002147] via-[#001a47] to-[#1a0a42]" />

      {/* Animated grid */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        variants={gridVariants}
        animate="animate"
      >
        <defs>
          <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F9E90" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#00e676" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffab00" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Vertical grid lines */}
        {[...Array(12)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 100}
            y1="0"
            x2={i * 100}
            y2="800"
            stroke="url(#gridGradient)"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}

        {/* Horizontal grid lines */}
        {[...Array(8)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 100}
            x2="1200"
            y2={i * 100}
            stroke="url(#gridGradient)"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}

        {/* Grid intersections (beacons) */}
        {[...Array(12)].map((_, i) =>
          [...Array(8)].map((_, j) => (
            <motion.circle
              key={`beacon-${i}-${j}`}
              cx={i * 100}
              cy={j * 100}
              r="3"
              fill="#00e676"
              opacity="0.6"
              variants={beaconVariants}
              animate="animate"
              transition={{ delay: (i + j) * 0.05 }}
            />
          ))
        )}

        {/* Accent nodes */}
        {[...Array(4)].map((_, i) => {
          const x = (i % 2) * 600 + 150;
          const y = Math.floor(i / 2) * 400 + 200;
          return (
            <motion.g key={`accent-${i}`}>
              <circle
                cx={x}
                cy={y}
                r="8"
                fill="#0F9E90"
                opacity="0.3"
              />
              <circle
                cx={x}
                cy={y}
                r="8"
                fill="none"
                stroke="#0F9E90"
                strokeWidth="2"
              />
              <motion.circle
                cx={x}
                cy={y}
                r="8"
                fill="none"
                stroke="#00e676"
                strokeWidth="2"
                initial={{ r: 8 }}
                animate={{ r: 20, opacity: [1, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            </motion.g>
          );
        })}
      </motion.svg>

      {/* Lightning bolts */}
      {lightning.map((bolt) => (
        <motion.div
          key={bolt.id}
          className="absolute w-0.5 bg-white pointer-events-none"
          style={{
            left: `${bolt.x}%`,
            top: '-10%',
            height: '120%',
            boxShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(0, 230, 118, 0.6)',
          }}
          variants={lightningVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Glow effects */}
      <div className="absolute top-1/4 -right-1/4 w-96 h-96 bg-gradient-to-br from-[#0F9E90]/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute -bottom-1/4 left-1/3 w-96 h-96 bg-gradient-to-tl from-[#00e676]/5 to-transparent rounded-full blur-3xl" />

      {/* Scanlines effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)',
        }}
      />
    </div>
  );
}
