'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const handleFormSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Demo: Accept any email with format user@domain.com and password >= 6 chars
      if (data.email && data.password) {
        // In Phase 9, this will call NextAuth signIn function
        console.log('Login attempt:', data);
        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="w-full max-w-md"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8 text-center">
        <h1 className="text-3xl font-black font-redhat text-[#003d99] mb-2">
          Welcome back
        </h1>
        <p className="text-[#64748b]">Sign in to your GridCast account</p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Error message */}
        {error && (
          <motion.div
            variants={itemVariants}
            className="p-4 bg-[#ff1744]/10 border border-[#ff1744] rounded-lg"
          >
            <p className="text-sm text-[#ff1744] font-medium">{error}</p>
          </motion.div>
        )}

        {/* Email Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-semibold text-[#003d99] mb-2">
            Email Address
          </label>
          <input
            type="email"
            placeholder="you@company.com"
            className={`w-full px-4 py-3 rounded-lg border-2 transition-all focus:outline-none ${
              errors.email
                ? 'border-[#ff1744] bg-[#ff1744]/5'
                : 'border-[#e2e8f0] hover:border-[#0F9E90] focus:border-[#0F9E90]'
            }`}
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-[#ff1744] font-medium">
              {errors.email.message}
            </p>
          )}
        </motion.div>

        {/* Password Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-semibold text-[#003d99] mb-2">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className={`w-full px-4 py-3 rounded-lg border-2 transition-all focus:outline-none font-dmmono ${
              errors.password
                ? 'border-[#ff1744] bg-[#ff1744]/5'
                : 'border-[#e2e8f0] hover:border-[#0F9E90] focus:border-[#0F9E90]'
            }`}
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-[#ff1744] font-medium">
              {errors.password.message}
            </p>
          )}
        </motion.div>

        {/* Remember Me & Forgot Password */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between pt-2"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('rememberMe')}
              disabled={isLoading}
              className="w-4 h-4 rounded border-2 border-[#e2e8f0] cursor-pointer accent-[#0F9E90]"
            />
            <span className="text-sm text-[#64748b] font-medium">Remember me</span>
          </label>
          <a href="#" className="text-sm text-[#0F9E90] hover:text-[#0C7F74] font-semibold">
            Forgot password?
          </a>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          variants={itemVariants}
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-[#0F9E90] to-[#00e676] hover:from-[#0C7F74] hover:to-[#00c059] text-white font-bold rounded-lg transition-all transform hover:translate-y-[-2px] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </motion.button>
      </form>

      {/* Divider */}
      <motion.div variants={itemVariants} className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#e2e8f0]"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white text-[#94a3b8]">Or continue with</span>
        </div>
      </motion.div>

      {/* OAuth Buttons */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="py-3 border-2 border-[#e2e8f0] hover:border-[#0F9E90] rounded-lg text-[#003d99] font-semibold text-sm transition-all hover:bg-[#f8faff]"
          disabled={isLoading}
        >
          <span className="flex items-center justify-center gap-2">
            <span>🔵</span> Google
          </span>
        </button>

        <button
          type="button"
          className="py-3 border-2 border-[#e2e8f0] hover:border-[#0F9E90] rounded-lg text-[#003d99] font-semibold text-sm transition-all hover:bg-[#f8faff]"
          disabled={isLoading}
        >
          <span className="flex items-center justify-center gap-2">
            <span>📱</span> Microsoft
          </span>
        </button>
      </motion.div>

      {/* Sign Up Link */}
      <motion.p variants={itemVariants} className="mt-8 text-center text-sm text-[#64748b]">
        Don&apos;t have an account?{' '}
        <a href="#" className="text-[#0F9E90] hover:text-[#0C7F74] font-semibold">
          Sign up
        </a>
      </motion.p>

      {/* Demo Credentials */}
      <motion.div
        variants={itemVariants}
        className="mt-8 p-4 bg-[#f8faff] border border-[#e2e8f0] rounded-lg"
      >
        <p className="text-xs font-bold text-[#94a3b8] uppercase mb-2">Demo Credentials</p>
        <div className="space-y-1 text-xs text-[#64748b] font-dmmono">
          <p>📧 demo@gridcast.com</p>
          <p>🔑 Password123</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
