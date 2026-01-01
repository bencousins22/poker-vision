
import React from 'react';
import { Play, ChevronRight, BarChart3, Video, Cpu, Sparkles, CheckCircle2, Globe2, ShieldCheck, Zap, Activity } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export const LandingPage: React.FC<Props> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-poker-gold/30 selection:text-white overflow-x-hidden font-sans">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
                <div className="absolute inset-0 bg-poker-gold blur rounded-lg opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-xl flex items-center justify-center font-black text-black text-xl shadow-xl">
                <Activity className="w-6 h-6" />
                </div>
            </div>
            <span className="font-bold text-lg tracking-tight text-white/90">PokerVision <span className="text-poker-gold">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Vision Engine</button>
            <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Features</button>
            <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="text-sm font-bold text-white hover:text-poker-gold transition-colors hidden sm:block"
            >
              Sign In
            </button>
            <button 
              onClick={onLogin}
              className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-full transition-all text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              Get Started <ChevronRight className="w-3 h-3 stroke-[3px]" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-poker-gold/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-poker-emerald/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        
        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          
          {/* Powered By Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-poker-gold/20 text-poker-gold text-xs font-bold uppercase tracking-widest mb-10 shadow-[0_0_25px_-5px_rgba(251,191,36,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-1000 backdrop-blur-md hover:border-poker-gold/40 transition-colors cursor-default select-none">
            <Sparkles className="w-3 h-3 animate-pulse" /> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-poker-gold via-yellow-200 to-poker-gold">
                Powered by Aussie Agents
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 text-white leading-[0.9]">
            See The Game <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-poker-gold to-yellow-700">
              Clearly.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            The world's first <span className="text-white">Video-to-Database</span> engine. 
            Instantly convert YouTube poker streams into 
            <span className="text-poker-gold"> searchable stats</span> and 
            <span className="text-poker-emerald"> GTO insights</span>.
          </p>
          
          {/* CTA Section */}
          <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row w-full gap-4">
                <button 
                  onClick={onLogin}
                  className="flex-1 group relative px-8 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 text-black font-black text-base rounded-xl shadow-[0_0_40px_-10px_rgba(251,191,36,0.3)] hover:shadow-[0_0_60px_-10px_rgba(251,191,36,0.5)] transition-all hover:-translate-y-1 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full duration-500 transition-transform skew-x-12 -ml-4"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    Launch App <ChevronRight className="w-5 h-5 stroke-[3px]" />
                  </div>
                </button>
                
                <button 
                  onClick={onLogin}
                  className="flex-1 px-8 py-4 bg-zinc-900/50 hover:bg-zinc-800 border border-white/10 text-white font-bold text-base rounded-xl backdrop-blur-md transition-all flex items-center justify-center gap-2 group hover:border-white/20"
                >
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" /> Watch Demo
                </button>
            </div>
            
            <div className="flex items-center gap-6 text-[10px] sm:text-xs font-medium text-zinc-500 uppercase tracking-wide">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-poker-emerald" /> Vision API</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-poker-emerald" /> Cloud Sync</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-poker-emerald" /> Real-time GTO</span>
            </div>
          </div>

        </div>
      </section>

      {/* Trust Strip */}
      <div className="w-full border-y border-white/5 bg-black/40 backdrop-blur-sm py-10 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest hidden md:block">Compatible With</span>
              <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
                  <div className="text-xl font-black italic tracking-tighter text-white">POKERGO</div>
                  <div className="text-xl font-black tracking-tight text-white flex items-center gap-1"><span className="text-red-600">HUSTLER</span> LIVE</div>
                  <div className="text-xl font-bold tracking-tight text-white">PokerStars</div>
                  <div className="text-xl font-black tracking-tight text-white">TRITON</div>
                  <div className="text-xl font-black tracking-tight text-white flex items-center gap-1"><span className="text-blue-500">The</span> Lodge</div>
              </div>
          </div>
      </div>

      {/* Feature Grid */}
      <section className="py-32 relative bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="group relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 hover:from-poker-gold/50 hover:to-poker-gold/10 transition-all duration-500">
                <div className="absolute inset-0 bg-poker-gold/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative h-full bg-[#0c0c0c] rounded-[22px] p-8 flex flex-col border border-white/5">
                    <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-blue-500/20">
                        <Video className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">Stream Scanner</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                        Paste a YouTube URL and let our AI reconstruct the hand history using OCR and spatial tracking. No manual entry required.
                    </p>
                </div>
            </div>
            
            {/* Feature 2 */}
            <div className="group relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 hover:from-poker-emerald/50 hover:to-poker-emerald/10 transition-all duration-500">
                <div className="absolute inset-0 bg-poker-emerald/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative h-full bg-[#0c0c0c] rounded-[22px] p-8 flex flex-col border border-white/5">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-emerald-500/20">
                        <BarChart3 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">Live HUD Stats</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                        Track VPIP, PFR, and Aggression metrics for every player on stream. Identify the fish and the sharks instantly.
                    </p>
                </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 hover:from-purple-500/50 hover:to-purple-500/10 transition-all duration-500">
                <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative h-full bg-[#0c0c0c] rounded-[22px] p-8 flex flex-col border border-white/5">
                    <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-purple-500/20">
                        <Cpu className="w-7 h-7 text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">Coach Gemini</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                        Chat with our AI coach about any hand. "Was this fold GTO?" "How do I exploit this player?" Get answers in seconds.
                    </p>
                </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-zinc-500 text-xs">
                &copy; {new Date().getFullYear()} PokerVision AI. Powered by Aussie Agents.
            </div>
            <div className="flex gap-6">
                <Globe2 className="w-4 h-4 text-zinc-600 hover:text-white cursor-pointer transition-colors" />
                <ShieldCheck className="w-4 h-4 text-zinc-600 hover:text-white cursor-pointer transition-colors" />
            </div>
        </div>
      </footer>
    </div>
  );
};
