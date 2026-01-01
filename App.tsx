
import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HistorySidebar } from './components/HistorySidebar';
import { AnalysisView } from './components/AnalysisView';
import { StatsDashboard } from './components/StatsDashboard';
import { StrategyCoach } from './components/StrategyCoach';
import { LandingPage } from './components/LandingPage';
import { Auth } from './components/Auth';
import { HandReplayer } from './components/HandReplayer';
import { Pricing } from './components/Pricing';
import { Profile } from './components/Profile';
import { ChannelsView } from './components/ChannelsView'; 
import { ToolsView } from './components/ToolsView'; 
import { SpotTrainer } from './components/SpotTrainer';
import { ToastContainer } from './components/Toast';
import { getHands, deleteHand as deleteHandService, updateHand as updateHandService, saveUser, getUser, removeUser, clearDatabase } from './services/storage';
import { HandHistory, ViewMode, User, PokerContextType, QueueItem, ChannelVideo, Toast } from './types';
import { LayoutDashboard, Search, BrainCircuit, LogOut, User as UserIcon, Menu, PlayCircle, CreditCard, Settings, ChevronLeft, Tv, Eye, Sparkles, X, FlaskConical, Target } from 'lucide-react';
import { DEFAULT_RANGES } from './services/pokerLogic';

// 1. Create Context
const PokerContext = createContext<PokerContextType | null>(null);

// 2. Custom Hook for consumption
export const usePoker = () => {
  const context = useContext(PokerContext);
  if (!context) throw new Error("usePoker must be used within a PokerProvider");
  return context;
};

// 3. Main App Shell
const AppContent: React.FC = () => {
  const { user, setUser, selectedHand, setSelectedHand, viewMode, setViewMode, analyzeSpot } = usePoker();
  const [showLogin, setShowLogin] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Auto-open coach when analysis is requested
  useEffect(() => {
    const handleAnalyzeSpot = () => {
        if (!rightSidebarOpen) setRightSidebarOpen(true);
    };
    window.addEventListener('analyze-spot', handleAnalyzeSpot);
    return () => window.removeEventListener('analyze-spot', handleAnalyzeSpot);
  }, [rightSidebarOpen]);

  // Handle Strategy View Logic (it opens the sidebar)
  useEffect(() => {
    if (viewMode === 'strategy') {
        if (!rightSidebarOpen) setRightSidebarOpen(true);
    }
  }, [viewMode, rightSidebarOpen]);

  // Determine scaling style
  const appStyle = user?.settings ? {
      transform: `scale(${user.settings.appScale})`,
      transformOrigin: 'top center',
      height: `${100 / user.settings.appScale}vh`,
      width: `${100 / user.settings.appScale}vw`
  } : {};

  // UI Density Class
  const densityClass = user?.settings?.uiDensity === 'compact' ? 'space-y-1 p-2 text-xs' 
                     : user?.settings?.uiDensity === 'spacious' ? 'space-y-8 p-8' 
                     : ''; // Normal uses default classes in components

  if (!user) {
    return (
      <>
        <LandingPage onLogin={() => setShowLogin(true)} />
        {showLogin && (
          <Auth 
            onSuccess={(u) => { setUser(u); setShowLogin(false); }} 
            onCancel={() => setShowLogin(false)} 
          />
        )}
      </>
    );
  }

  // Hand Review View (Replayer + Raw)
  const renderReviewView = () => {
    if (!selectedHand) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-6 p-10 h-full animate-fade-in bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background">
            <div className="relative group cursor-pointer transition-transform hover:scale-110 duration-500" onClick={() => setLeftSidebarOpen(true)}>
                <div className="absolute inset-0 bg-poker-gold/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="relative p-8 rounded-full bg-zinc-900 border border-zinc-800 shadow-2xl group-hover:border-poker-gold/30 transition-colors">
                    <PlayCircle className="w-16 h-16 text-zinc-600 group-hover:text-poker-gold transition-colors" />
                </div>
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">Ready to Review</h3>
                <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">Select a hand from the history sidebar to start the immersive replayer.</p>
            </div>
        </div>
      );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background animate-fade-in scroll-smooth h-full">
            <div className="max-w-[1600px] mx-auto space-y-6 h-full flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between shrink-0 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                     <div className="flex items-center gap-4">
                         <div className="p-2 bg-poker-gold/10 rounded-lg">
                            <PlayCircle className="w-5 h-5 text-poker-gold" />
                         </div>
                         <div>
                             <h2 className="text-sm font-bold text-white tracking-wide">Hand Review</h2>
                             <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                                <span>{selectedHand.hero} vs Villain</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                <span>{selectedHand.stakes}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                <span className="text-poker-emerald">{selectedHand.potSize} Pot</span>
                             </div>
                         </div>
                     </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-poker-green/10 text-poker-green rounded-full text-[10px] font-bold border border-poker-green/20 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <Eye className="w-3 h-3" /> Vision Verified
                        </div>
                        <button 
                            onClick={() => setSelectedHand(null)}
                            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col xl:flex-row gap-6 h-full pb-10 min-h-0">
                    <div className="flex-1 min-h-[500px] xl:h-auto bg-black rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/5 relative">
                         <HandReplayer hand={selectedHand} onAnalyzeSpot={analyzeSpot} />
                    </div>

                    <div className="w-full xl:w-96 bg-surface rounded-3xl border border-border overflow-hidden shrink-0 flex flex-col shadow-xl">
                         <div className="px-5 py-4 border-b border-border bg-zinc-900/80 backdrop-blur flex justify-between items-center">
                             <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-poker-gold"></span> Raw History
                             </h3>
                             <button 
                                onClick={() => navigator.clipboard.writeText(selectedHand.rawText)}
                                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700 font-medium"
                             >
                                Copy Text
                             </button>
                         </div>
                         <div className="flex-1 overflow-auto bg-[#0c0c0c] relative group">
                             <pre className="p-5 text-[10px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap selection:bg-poker-gold selection:text-black">
                                 {selectedHand.rawText}
                             </pre>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
        case 'review': return renderReviewView();
        case 'tracker': return <StatsDashboard />;
        case 'tools': return <ToolsView />;
        case 'trainer': return <SpotTrainer />;
        case 'strategy': return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-zinc-500 animate-fade-in">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-6 animate-pulse-slow">
                    <BrainCircuit className="w-12 h-12 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Strategy Center Active</h2>
                <p className="max-w-md text-center text-sm leading-relaxed">
                    The Coach is ready in the sidebar. Select a hand to analyze, or ask general strategy questions directly in the chat panel on the right.
                </p>
                <button 
                    onClick={() => setRightSidebarOpen(true)}
                    className="mt-8 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-900/30"
                >
                    Open Chat Panel
                </button>
            </div>
        ); 
        case 'channels': return <ChannelsView />;
        case 'pricing': return <Pricing />;
        case 'profile': return <Profile />;
        case 'analyze': default: return <AnalysisView />;
    }
  };

  return (
    <div style={appStyle} className="flex h-screen bg-background text-zinc-100 overflow-hidden font-sans selection:bg-poker-gold/30 selection:text-white transition-transform duration-300">
      
      {/* Left Sidebar (History) */}
      <div className={`${leftSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'} transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] border-r border-border bg-surface flex flex-col shrink-0 relative z-30 shadow-2xl`}>
         <HistorySidebar />
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative z-0">
        
        {/* Navbar */}
        <header className="h-16 px-4 md:px-6 border-b border-border/50 glass flex items-center justify-between shrink-0 sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                    className={`p-2 rounded-xl transition-all duration-200 border border-transparent ${!leftSidebarOpen ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                    title="Toggle History"
                >
                    <Menu className="w-5 h-5" />
                </button>
                
                <div className="h-8 w-px bg-zinc-800/50 mx-2"></div>

                <nav className="flex items-center bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                    {[
                        { id: 'analyze', icon: Search, label: 'Vision' },
                        { id: 'review', icon: PlayCircle, label: 'Replayer' },
                        { id: 'channels', icon: Tv, label: 'Channels' },
                        { id: 'tracker', icon: LayoutDashboard, label: 'Tracker' },
                        { id: 'trainer', icon: Target, label: 'Trainer' }, // Added Trainer
                        { id: 'tools', icon: FlaskConical, label: 'Lab' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => { 
                              setViewMode(item.id as ViewMode); 
                            }}
                            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 group overflow-hidden ${
                                viewMode === item.id 
                                ? 'text-black bg-white shadow-lg shadow-white/10 scale-105' 
                                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                            }`}
                        >
                            <item.icon className={`w-3.5 h-3.5 transition-colors ${viewMode === item.id ? 'text-black' : 'group-hover:text-zinc-200'}`} />
                            <span className="hidden lg:block">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Mobile Toggle for Right Sidebar */}
                <button 
                    onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                    className={`p-2 rounded-xl transition-all duration-200 md:hidden ${rightSidebarOpen ? 'text-poker-gold bg-zinc-800 shadow-md' : 'text-zinc-400 hover:text-white'}`}
                >
                    <BrainCircuit className="w-5 h-5" />
                </button>

                {user.subscription === 'free' && (
                    <button 
                        onClick={() => { setViewMode('pricing'); }}
                        className="hidden md:flex text-xs font-bold bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 text-white px-3 py-1.5 rounded-full hover:border-poker-gold/50 hover:shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-all items-center gap-2 group"
                    >
                        <Sparkles className="w-3 h-3 text-poker-gold group-hover:animate-pulse" /> Upgrade Plan
                    </button>
                )}

                <div className="h-6 w-px bg-zinc-800 hidden md:block"></div>

                <div className="flex items-center gap-3 cursor-pointer group p-1 pr-3 rounded-xl hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-800" onClick={() => { setViewMode('profile'); }}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-600 flex items-center justify-center shadow-lg group-hover:border-poker-gold/50 transition-all">
                        <UserIcon className="w-4 h-4 text-zinc-300 group-hover:text-white" />
                    </div>
                    <div className="text-left hidden md:block">
                        <div className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">{user.name}</div>
                        <div className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{user.subscription}</div>
                    </div>
                </div>
            </div>
        </header>

        {/* View Content */}
        <main className={`flex-1 overflow-hidden relative flex flex-col ${densityClass}`}>
            {renderContent()}
        </main>
      </div>

      {/* Right Sidebar (Global Coach) */}
      <div className={`${rightSidebarOpen ? 'w-96 translate-x-0' : 'w-0 translate-x-full opacity-0 overflow-hidden'} transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] border-l border-border bg-surface flex flex-col shrink-0 relative z-30 shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
          {rightSidebarOpen && (
              <div className="absolute top-4 -left-3 z-50">
                 <button 
                    onClick={() => setRightSidebarOpen(false)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-400 p-1.5 rounded-full shadow-lg hover:text-white hover:bg-zinc-800 transition-all hover:scale-110 active:scale-95"
                 >
                     <ChevronLeft className="w-3 h-3" />
                 </button>
              </div>
          )}
          <StrategyCoach />
      </div>

      {/* Toggle Open Button for Right Sidebar when closed */}
      {!rightSidebarOpen && (
          <div className="absolute top-20 right-0 z-40">
              <button 
                  onClick={() => setRightSidebarOpen(true)}
                  className="bg-zinc-900/90 backdrop-blur-md border-l border-t border-b border-zinc-700 text-poker-gold p-3 rounded-l-xl shadow-lg hover:pl-4 transition-all group"
                  title="Open Strategy Coach"
              >
                  <BrainCircuit className="w-5 h-5 group-hover:animate-pulse" />
              </button>
          </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(getUser());
  const [hands, setHands] = useState<HandHistory[]>([]);
  const [selectedHand, setSelectedHand] = useState<HandHistory | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('analyze');
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [labContext, setLabContext] = useState<any>({});

  useEffect(() => {
    setHands(getHands());
  }, []);

  useEffect(() => {
    if (user) saveUser(user);
    else removeUser();
  }, [user]);

  const loadHands = () => setHands(getHands());

  const addHand = (hand: HandHistory) => {
    setHands(prev => [hand, ...prev]);
  };

  const updateHand = (id: string, updates: Partial<HandHistory>) => {
    updateHandService(id, updates);
    setHands(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    if (selectedHand?.id === id) {
        setSelectedHand(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteHand = (id: string) => {
    deleteHandService(id);
    setHands(prev => prev.filter(h => h.id !== id));
    if (selectedHand?.id === id) setSelectedHand(null);
  };

  const launchAnalysis = (url: string) => {
    setActiveVideoUrl(url);
    setViewMode('analyze');
  };

  const analyzeSpot = (context: string) => {
    window.dispatchEvent(new CustomEvent('analyze-spot', { detail: context }));
  };

  const addToQueue = (video: ChannelVideo) => {
      const newItem: QueueItem = {
          id: video.id,
          videoUrl: video.url,
          title: video.title,
          thumbnail: video.thumbnail,
          status: 'pending',
          addedAt: Date.now()
      };
      
      setQueue(prev => {
          if (prev.some(i => i.id === newItem.id)) return prev;
          return [...prev, newItem];
      });

      // Simulate processing
      setTimeout(() => {
          setQueue(prev => prev.map(i => i.id === newItem.id ? { ...i, status: 'processing' } : i));
          setIsQueueProcessing(true);
          
          setTimeout(() => {
            setQueue(prev => prev.map(i => i.id === newItem.id ? { ...i, status: 'completed' } : i));
            setIsQueueProcessing(false);
            addToast({ title: "Analysis Complete", description: "Video processed.", type: 'success' });
          }, 3000);
      }, 1000);
  };

  const removeFromQueue = (id: string) => {
      setQueue(prev => prev.filter(i => i.id !== id));
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearAllData = () => {
      clearDatabase();
      setHands([]);
      setSelectedHand(null);
      addToast({ title: "Data Cleared", type: 'info' });
  };

  return (
    <PokerContext.Provider value={{
      user, setUser,
      hands, loadHands, addHand, updateHand, deleteHand,
      selectedHand, setSelectedHand,
      viewMode, setViewMode,
      activeVideoUrl, launchAnalysis, analyzeSpot,
      queue, addToQueue, removeFromQueue, isQueueProcessing,
      addToast,
      clearAllData,
      labContext, setLabContext
    }}>
      <AppContent />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </PokerContext.Provider>
  );
};

export default App;
