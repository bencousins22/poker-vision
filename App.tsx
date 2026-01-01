import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
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
import { LayoutDashboard, Search, BrainCircuit, LogOut, User as UserIcon, Menu, PlayCircle, CreditCard, Settings, ChevronLeft, Tv, Eye, Sparkles, X, FlaskConical, Target, AlertTriangle, RefreshCcw, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, MessageSquare } from 'lucide-react';

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-6 max-w-md text-sm">{this.state.error?.message || "An unexpected error occurred."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-zinc-200 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" /> Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 1. Create Context
const PokerContext = createContext<PokerContextType | null>(null);

// 2. Custom Hook
export const usePoker = () => {
  const context = useContext(PokerContext);
  if (!context) throw new Error("usePoker must be used within a PokerProvider");
  return context;
};

// 3. Main App Shell (Consumer)
const AppContent: React.FC = () => {
  const { user, setUser, selectedHand, setSelectedHand, viewMode, setViewMode, analyzeSpot } = usePoker();
  const [showLogin, setShowLogin] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  useEffect(() => {
    const handleAnalyzeSpot = () => {
        if (!rightSidebarOpen) setRightSidebarOpen(true);
    };
    window.addEventListener('analyze-spot', handleAnalyzeSpot);
    return () => window.removeEventListener('analyze-spot', handleAnalyzeSpot);
  }, [rightSidebarOpen]);

  useEffect(() => {
    if (viewMode === 'strategy') {
        if (!rightSidebarOpen) setRightSidebarOpen(true);
    }
  }, [viewMode, rightSidebarOpen]);

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

  // App container style based on settings
  const appStyle: React.CSSProperties = user.settings?.appScale ? {
      transform: `scale(${user.settings.appScale})`,
      transformOrigin: 'top center',
      height: `${100 / user.settings.appScale}vh`,
      width: `${100 / user.settings.appScale}vw`
  } : {};

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
        <div className="flex-1 p-4 lg:p-6 overflow-hidden bg-background animate-fade-in h-full flex flex-col">
            <div className="max-w-[1920px] mx-auto w-full h-full flex flex-col gap-4">
                <div className="flex items-center justify-between shrink-0 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
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

                <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">
                    <div className="flex-1 bg-black rounded-[2rem] shadow-2xl overflow-hidden ring-1 ring-white/5 relative">
                         <HandReplayer hand={selectedHand} onAnalyzeSpot={analyzeSpot} />
                    </div>
                    <div className="w-full xl:w-80 bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shrink-0 flex flex-col shadow-xl h-48 xl:h-auto">
                         <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur flex justify-between items-center shrink-0">
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
                             <pre className="p-4 text-[10px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap selection:bg-poker-gold selection:text-black">
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
      <div className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden font-sans" style={appStyle}>
        
        {/* Nav Rail */}
        <div className="w-16 flex flex-col items-center py-6 border-r border-zinc-800 bg-[#050505] z-30 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-xl flex items-center justify-center mb-8 shadow-lg shrink-0">
             <span className="font-black text-black text-xs">PV</span>
          </div>

          <nav className="flex-1 flex flex-col gap-4 w-full px-2 overflow-y-auto no-scrollbar">
             {[
               { id: 'analyze', icon: Tv, label: 'Vision' },
               { id: 'review', icon: PlayCircle, label: 'Review' },
               { id: 'channels', icon: LayoutDashboard, label: 'Channels' },
               { id: 'tracker', icon: Sparkles, label: 'Stats' },
               { id: 'tools', icon: FlaskConical, label: 'Lab' },
               { id: 'trainer', icon: Target, label: 'Train' },
               { id: 'strategy', icon: BrainCircuit, label: 'Coach' },
             ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setViewMode(item.id as ViewMode); if(item.id === 'review' || item.id === 'tracker') setLeftSidebarOpen(true); }}
                  className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    viewMode === item.id 
                    ? 'bg-zinc-800 text-white shadow-md' 
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                  }`}
                  title={item.label}
                >
                  <item.icon className={`w-5 h-5 ${viewMode === item.id ? 'text-poker-gold' : ''}`} />
                  <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-zinc-700">
                      {item.label}
                  </div>
                </button>
             ))}
          </nav>

          <div className="mt-auto flex flex-col gap-4 w-full px-2 pt-4 border-t border-zinc-800">
             <button onClick={() => setViewMode('pricing')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'pricing' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900'}`}>
                <CreditCard className="w-5 h-5" />
             </button>
             <button onClick={() => setViewMode('profile')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'profile' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900'}`}>
                {user.subscription === 'elite' ? <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/50 flex items-center justify-center text-[10px] font-bold">{user.name.charAt(0)}</div> : <UserIcon className="w-5 h-5" />}
             </button>
          </div>
        </div>

        {/* Left Sidebar (History) */}
        <div className={`border-r border-zinc-800 bg-[#050505] transition-all duration-300 ease-in-out flex flex-col z-20 ${leftSidebarOpen ? 'w-80' : 'w-0 opacity-0'} overflow-hidden`}>
             <div className="h-full w-80">
                <HistorySidebar />
             </div>
        </div>
        
        {/* Toggle Left */}
        <button 
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} 
            className="absolute bottom-6 left-[70px] z-40 p-1.5 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-500 hover:text-white transition-colors shadow-lg"
            style={{ transform: leftSidebarOpen ? 'translateX(305px)' : 'translateX(0)' }}
        >
            {leftSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative z-10">
           {renderContent()}
        </main>

        {/* Toggle Right */}
        <button 
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)} 
            className="absolute bottom-6 right-6 z-40 p-2 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-500 hover:text-white transition-colors shadow-lg"
            style={{ transform: rightSidebarOpen ? 'translateX(-330px)' : 'translateX(0)' }}
        >
           {rightSidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>

        {/* Right Sidebar (Strategy Coach) */}
        <div className={`border-l border-zinc-800 bg-[#050505] transition-all duration-300 ease-in-out flex flex-col z-20 ${rightSidebarOpen ? 'w-[360px]' : 'w-0 opacity-0'} overflow-hidden`}>
             <div className="h-full w-[360px]">
                <StrategyCoach />
             </div>
        </div>

      </div>
  );
};

// 4. App Provider
const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(() => getUser());
    const [hands, setHands] = useState<HandHistory[]>([]);
    const [selectedHand, setSelectedHand] = useState<HandHistory | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('analyze');
    const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isQueueProcessing, setIsQueueProcessing] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [labContext, setLabContext] = useState<any>({});

    useEffect(() => {
        if (user) {
            saveUser(user);
        } else {
            removeUser();
        }
    }, [user]);

    useEffect(() => {
        setHands(getHands());
    }, []);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { ...toast, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const loadHands = useCallback(() => {
        setHands(getHands());
    }, []);

    const addHand = useCallback((hand: HandHistory) => {
        setHands(prev => [hand, ...prev]);
    }, []);

    const updateHand = useCallback((id: string, updates: Partial<HandHistory>) => {
        updateHandService(id, updates);
        setHands(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
        if (selectedHand?.id === id) {
            setSelectedHand(prev => prev ? { ...prev, ...updates } : null);
        }
    }, [selectedHand]);

    const deleteHand = useCallback((id: string) => {
        deleteHandService(id);
        setHands(prev => prev.filter(h => h.id !== id));
        if (selectedHand?.id === id) setSelectedHand(null);
        addToast({ title: 'Hand Deleted', type: 'info' });
    }, [selectedHand, addToast]);

    const clearAllData = useCallback(() => {
        clearDatabase();
        setHands([]);
        setSelectedHand(null);
        addToast({ title: 'Database Cleared', type: 'success' });
    }, [addToast]);

    const launchAnalysis = useCallback((url: string) => {
        setActiveVideoUrl(url);
        setViewMode('analyze');
    }, []);

    const analyzeSpot = useCallback((context: string) => {
        // Dispatch event for StrategyCoach to pick up
        const event = new CustomEvent('analyze-spot', { detail: context });
        window.dispatchEvent(event);
    }, []);

    // Queue Logic (Simplified)
    const addToQueue = useCallback((video: ChannelVideo) => {
        const newItem: QueueItem = {
            id: video.id,
            videoUrl: video.url,
            title: video.title,
            thumbnail: video.thumbnail,
            status: 'pending',
            addedAt: Date.now()
        };
        setQueue(prev => [...prev, newItem]);
        addToast({ title: 'Added to Queue', description: video.title, type: 'success' });
        
        // Simulate processing start if not active
        if (!isQueueProcessing) {
            processQueue();
        }
    }, [isQueueProcessing, addToast]);

    const removeFromQueue = useCallback((id: string) => {
        setQueue(prev => prev.filter(i => i.id !== id));
    }, []);

    const processQueue = async () => {
        setIsQueueProcessing(true);
        // This is a simulation since we can't process background in this demo easily without backend
        // In a real app, this would trigger a worker
        setTimeout(() => setIsQueueProcessing(false), 5000); 
    };

    const contextValue: PokerContextType = {
        user, setUser,
        hands, loadHands, addHand, updateHand, deleteHand,
        selectedHand, setSelectedHand,
        viewMode, setViewMode,
        activeVideoUrl, launchAnalysis, analyzeSpot,
        queue, addToQueue, removeFromQueue, isQueueProcessing,
        addToast, clearAllData,
        labContext, setLabContext
    };

    return (
        <ErrorBoundary>
            <PokerContext.Provider value={contextValue}>
                <AppContent />
                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </PokerContext.Provider>
        </ErrorBoundary>
    );
};

export default App;