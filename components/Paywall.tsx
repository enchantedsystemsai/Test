import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Mic, Scan, Check, ShieldCheck } from 'lucide-react';
import { PRICING } from '../constants';

interface PaywallProps {
  onClose: () => void;
  onUpgrade: () => void;
  onShowTerms: () => void;
  onShowPrivacy: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose, onUpgrade, onShowTerms, onShowPrivacy }) => {
  const features = [
    {
      icon: <Sparkles className="w-5 h-5 text-indigo-500" />,
      title: 'Unlimited AI Summaries',
      description: 'Turn long notes into clear, actionable summaries instantly.'
    },
    {
      icon: <Mic className="w-5 h-5 text-indigo-500" />,
      title: 'Unlimited Audio Transcriptions',
      description: 'Record meetings or thoughts and get perfect text transcripts.'
    },
    {
      icon: <Scan className="w-5 h-5 text-indigo-500" />,
      title: 'Unlimited OCR Image Scans',
      description: 'Extract text from photos, documents, and whiteboards.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 sm:p-0">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[380px] aspect-[9/16] bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10"
      >
        {/* Popular Badge - High Z-Index to overlap logo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black px-6 py-1.5 rounded-b-2xl shadow-lg uppercase tracking-[0.2em] border-x border-b border-white/10">
            Popular
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-40 p-2 rounded-full bg-slate-900/40 text-slate-300 hover:bg-slate-900/60 hover:text-white transition-all hover:scale-110 active:scale-90 backdrop-blur-md border border-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero Section - Reduced pt-12 to pt-4 to move everything up */}
        <div className="relative flex-shrink-0 flex flex-col items-center px-6 pt-4 pb-2">
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/40 via-violet-500/10 to-transparent blur-[60px] animate-pulse" />
          </div>

          {/* Glowing Orb Container - Negative margin-top pulls logo under the badge */}
          <div className="relative -mt-4 z-10">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute inset-[-12px] rounded-full bg-indigo-500 blur-2xl opacity-40"
            />
            <motion.div 
              className="relative w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] border border-white/50 overflow-hidden z-10"
            >
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>

          {/* Title - mt reduced for upward shift */}
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-lg font-black text-slate-900 dark:text-white tracking-tighter text-center whitespace-nowrap flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Unlock NoteCompass AI Unlimited
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400 text-center leading-tight px-8 opacity-80"
          >
            Everything you need to capture, organise, and understand your ideas instantly.
          </motion.p>
        </div>

        {/* Features Section - pt reduced to 1 to stay high */}
        <div className="px-5 space-y-2 pt-1 pb-1">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 shadow-sm group hover:bg-white dark:hover:bg-slate-900/60 transition-all duration-300"
            >
              <div className="flex-shrink-0 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13px] font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {feature.title}
                  </h4>
                  <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                </div>
                <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5 line-clamp-2">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Section */}
        <div className="mt-auto p-5 pt-4 space-y-3 bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950 to-transparent">
          <div className="text-center">
            <p className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
              7 Days Free, then {PRICING.UNLIMITED}/mo
            </p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-0.5">
              No commitment • Cancel anytime
            </p>
          </div>

          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={onUpgrade}
            className="relative w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              START 7-DAY FREE TRIAL
            </span>
          </motion.button>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center space-y-2"
          >
            <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Secure Checkout • Encrypted</span>
            </div>
            <div className="flex justify-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-tighter pt-1 border-t border-slate-100 dark:border-white/5 mt-2">
              <button onClick={onShowTerms} className="hover:text-indigo-500 transition-colors">Terms of Service</button>
              <span className="opacity-30">•</span>
              <button onClick={onShowPrivacy} className="hover:text-indigo-500 transition-colors">Privacy Policy</button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};