
import React from 'react';
import { Play, TrendingUp, Shield, Cpu, ChevronRight, BarChart3, Video } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export const LandingPage: React.FC<Props> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-poker-gold to-yellow-600 rounded flex items-center justify-center font-bold text-black">
              L
            </div>
            <span className="font-bold text-xl tracking-tight">Live Poker Pro</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Features</button>
            <button className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Pricing</button>
            <button 
              onClick={onLogin}
              className="px-5 py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all text-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-poker-green/20 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-700 text-poker-gold text-xs font-mono mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-poker-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-poker-gold"></span>
            </span>
            v2.0 Now Available with Gemini 3 Pro
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Dominate the Felt with <br/>
            <span className="text-white">AI-Powered Intelligence</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one suite for live poker players. Convert YouTube streams to hand histories, analyze player stats, and get real-time GTO coaching.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onLogin}
              className="px-8 py-4 bg-gradient-to-r from-poker-gold to-yellow-500 text-black font-bold rounded-lg hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.5)] transition-all flex items-center gap-2"
            >
              Start Free Trial <ChevronRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-gray-900 border border-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all flex items-center gap-2">
              <Play className="w-4 h-4 fill-current" /> Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-black/50 border-y border-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-poker-gold/30 transition-colors group">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Video to Hand History</h3>
              <p className="text-gray-400 leading-relaxed">
                Paste any Hustler Casino Live URL. Our AI vision engine extracts stacks, cards, and actions instantly.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-poker-gold/30 transition-colors group">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">CRM & HUD Stats</h3>
              <p className="text-gray-400 leading-relaxed">
                Track VPIP, PFR, and Aggression factors. Tag players as Fish, Whales, or Pros automatically.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-poker-gold/30 transition-colors group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Strategy Coach</h3>
              <p className="text-gray-400 leading-relaxed">
                Ask specific strategy questions. Our Gemini-powered engine analyzes line checks and GTO deviations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-900 text-center text-gray-500 text-sm">
        <p>&copy; 2024 Live Poker Pro. All rights reserved.</p>
      </footer>
    </div>
  );
};
