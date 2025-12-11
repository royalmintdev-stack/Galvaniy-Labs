import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { User, Theme } from '../types';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthProps {
  onLogin: (user: User) => void;
  theme?: Theme;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, theme }) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // const [generatedOtp, setGeneratedOtp] = useState<string | null>(null); // Removed, server handles OTP

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@students.uonbi.ac.ke') && !email.includes('admin')) {
      // Relaxing restriction for demo
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      // PILOT FEATURE: Direct Login check
      if (data.user) {
        onLogin(data.user);
        return;
      }

      setStep('otp');
    } catch (err: any) {
      setError('Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await res.json();

      if (res.ok && data.user) {
        // P1 FIX: Session set by HttpOnly cookie from server.
        // We still need to notify the App component.
        onLogin(data.user);
        // Note: storageService.setSession(user) removal is next step.
      } else {
        setError(data.error || 'Invalid OTP code');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-2xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3">Hello! Comrade</h1>
          <h2 className="text-xl font-semibold text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400">Sign in to access lab resources</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="email"
                required
                placeholder="Student Email"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 ${loading ? 'bg-slate-700' : `bg-gradient-to-r ${theme?.primary}`}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Continue <ArrowRight size={18} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* ... OTP Inputs ... */}
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text"
                required
                placeholder="Enter OTP Code"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 tracking-widest text-center text-lg"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 ${loading ? 'bg-slate-700' : `bg-gradient-to-r ${theme?.primary}`}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Verify & Login'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-sm text-slate-400 hover:text-white transition-colors"
            >
              Change Email
            </button>
          </form>
        )}

        {/* Separator & Google Auth */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <a
            href="/auth/google"
            className="w-full py-3 rounded-lg font-medium bg-white text-slate-900 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </a>
        </div>
      </motion.div>
    </div >
  );
};