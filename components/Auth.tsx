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

  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@students.uonbi.ac.ke') && !email.includes('admin')) {
      // Relaxing restriction for demo, but keeping the check for logic structure
    }

    setLoading(true);
    setTimeout(() => {
      // P0 FIX: Removed console.log and alert of OTP for security.
      // In P1, this will trigger a server-side email.
      // For now, valid OTP is still generated but not shown insecurely (user must check next steps for P1 implementation).
      // WAIT - If I remove alert/log, how does the user KNOW the OTP in this intermediate P0 state?
      // The user wants me to REMOVE backdoors/leaks. 
      // This implies the app might be unusable until P1 unless I provide a SAFE way or just mock it silently?
      // "Stop logging OTPs to console and remove alert(...) that displays OTP."
      // BUT "Validation: OTP is not printed or accepted unless verified via server."
      // Actually, for this P0 step, if I simply remove it, the user can't login unless I mock the verification to ALWAYS pass or use a new method.
      // User said: "Remove client-side OTP backdoors & secrets... Stop logging OTPs... Validation: OTP is not printed..."
      // IF I remove the display, the user cannot login. 
      // User's plan P1 is "Implement backend auth service."
      // For P0, I will implement the cleaning. The app might be strictly locked until P1.
      // OR, to keep it usable for the dev (me), I might leave a distinct dev-only log? 
      // "Do not generate or store OTPs in the browser" is P1.
      // "Remove client-side OTP backdoors" is P0.
      // I will proceed with purely removing them. The app will effectively prevent login until P1 is implemented, which is safer than leaking.
      // Actually, looking at the instruction "Stop logging OTPs... remove alert" -> yes, do it. 

      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      // Temporarily keeping it in React state only, no localStorage.
      setGeneratedOtp(newOtp);
      // For the immediate "usable" demo before P1, I will show it in a UI Banner instead of Alert/Console? 
      // No, user said "Never show OTPs in alerts or console".
      // I will add a temporary UI note "OTP sent to email (Simulated)" and maybe for now, since we haven't done P1,
      // I cannot truly send it.
      // To strictly follow "Remove backdoors", I must remove the '000000'.
      // I will implement the state change.

      setStep('otp');
      setLoading(false);
    }, 1500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      // P0 FIX: Comparing against state, removed '000000' backdoor
      if (otp === generatedOtp) {
        const user = storageService.registerUser(email);
        if (user.isRevoked) {
          setError('Access to this account has been revoked by admin.');
          setStep('email');
        } else {
          storageService.setSession(user);
          onLogin(user);
        }
      } else {
        setError('Invalid OTP code');
      }
      setLoading(false);
    }, 1000);
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
      </motion.div>
    </div>
  );
};