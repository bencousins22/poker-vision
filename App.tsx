
import React, { useState, useEffect, createContext, useContext, useCallback, Suspense } from 'react';
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
import { SolverView } from './components/SolverView';
import { ToastContainer } from './components/Toast';
import { getHands, deleteHand as deleteHandService, updateHand as updateHandService, saveUser, getUser, removeUser, clearDatabase } from './services/storage';
import { JulesService } from './services/jules';
import { HandHistory, ViewMode, User, PokerContextType, QueueItem, ChannelVideo, Toast } from './types';
import { HandStore } from './components/HandStore';
import { LayoutDashboard, BrainCircuit, User as UserIcon, PlayCircle, CreditCard, Tv, Eye, Sparkles, X, FlaskConical, Target, AlertTriangle, RefreshCcw, PanelLeftClose, PanelLeftOpen, PanelRightClose, MessageSquare, ChevronRight, Grid3X3, Zap, Database } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// --- Error Boundary ---
interface ErrorBoundaryProps { children: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-6 text-center animate-in fade-in">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-black mb-2">System Malfunction</h2>
          <p className="text-zinc-400 mb-8 max-w-md text-sm leading-relaxed">
            The application encountered an unexpected error. This might be due to a network interruption or data corruption.
          </p>
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-8 max-w-lg w-full text-left overflow-auto max-h-48">
             <code className="text-xs font-mono text-red-400 block whitespace-pre-wrap">{this.state.error?.message}</code>
          </div>
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-bold text-sm hover:bg-zinc-200 transition-all hover:scale-105 shadow-lg">
            <RefreshCcw className="w-4 h-4" /> Reload Application
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const PokerContext = createContext<PokerContextType | null>(null);

export const usePoker = () => {
  const context = useContext(PokerContext);
  if (!context) throw new Error("usePoker must be used within a PokerProvider");
  return context;
};

// --- Main Layout Components ---

const NavItem = ({ id, icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
      active 
      ? 'bg-zinc-800 text-poker-gold shadow-[0_0_15px_-3px_rgba(0,0,0,0.3)] ring-1 ring-white/5' 
      : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
    }`}
  >
    <Icon className="w-5 h-5" />
    <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 border border-zinc-800 shadow-xl">
        {label}
    </div>
  </button>
);

const AppShell: React.FC = () => {
  const { user, setUser, selectedHand, setSelectedHand, viewMode, setViewMode, analyzeSpot } = usePoker();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Auto-open sidebars on specific actions
  useEffect(() => {
    const handleAnalyzeSpot = () => setRightOpen(true);
    window.addEventListener('analyze-spot', handleAnalyzeSpot);
    return () => window.removeEventListener('analyze-spot', handleAnalyzeSpot);
  }, []);

  if (!user) {
    return (
      <>
        <LandingPage onLogin={() => setShowAuth(true)} />
        {showAuth && <Auth onSuccess={setUser} onCancel={() => setShowAuth(false)} />}
      </>
    );
  }

  const appScale = user.settings?.appScale || 1;

  return (
    <div 
        className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden font-sans select-none"
        style={{
            transform: `scale(${appScale})`,
            transformOrigin: 'top center',
            width: `${100/appScale}vw`,
            height: `${100/appScale}vh`
        }}
    >
        {/* Navigation Rail - Auto Hiding */}
        {/* Trigger Zone */}
        <div className="fixed left-0 top-0 bottom-0 w-2 z-[60] peer hover:bg-poker-gold/50 transition-colors duration-300 cursor-pointer" />
        
        {/* Nav Bar */}
        <nav className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-6 border-r border-zinc-800/80 bg-[#050505]/95 backdrop-blur-md z-50 shrink-0 gap-6 -translate-x-full peer-hover:translate-x-0 hover:translate-x-0 transition-transform duration-300 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="w-10 h-10 bg-gradient-to-br from-poker-gold to-amber-700 rounded-xl flex items-center justify-center shadow-lg shrink-0 cursor-default">
                <span className="font-black text-black text-xs tracking-tighter">PV</span>
            </div>

            <div className="flex-1 flex flex-col gap-3 w-full px-2 overflow-y-auto no-scrollbar items-center">
                {[
                    { id: 'analyze', icon: Tv, label: 'Vision Engine' },
                    { id: 'store', icon: Database, label: 'Hand Library' },
                    { id: 'review', icon: PlayCircle, label: 'Replayer' },
                    { id: 'channels', icon: LayoutDashboard, label: 'Channels' },
                    { id: 'tracker', icon: Sparkles, label: 'Statistics' },
                    { id: 'solver', icon: Grid3X3, label: 'Pro Solver' },
                    { id: 'tools', icon: FlaskConical, label: 'GTO Lab' },
                    { id: 'trainer', icon: Target, label: 'Spot Trainer' },
                    { id: 'strategy', icon: BrainCircuit, label: 'AI Coach' },
                ].map((item) => (
                    <NavItem 
                        key={item.id} 
                        {...item} 
                        active={viewMode === item.id} 
                        onClick={() => {
                            setViewMode(item.id as ViewMode);
                            if (item.id === 'review') setLeftOpen(true);
                            if (item.id === 'strategy') setRightOpen(true);
                        }} 
                    />
                ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 w-full px-2 pt-4 border-t border-zinc-800/50 items-center">
                <NavItem id="pricing" icon={CreditCard} label="Pricing" active={viewMode === 'pricing'} onClick={() => setViewMode('pricing')} />
                <NavItem id="profile" icon={UserIcon} label="Profile" active={viewMode === 'profile'} onClick={() => setViewMode('profile')} />
            </div>
        </nav>

        {/* Left Sidebar (Hand History) */}
        <div className={`relative flex flex-col border-r border-zinc-800 bg-[#050505] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-30 ${leftOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}>
            <div className="w-80 h-full overflow-hidden">
                <HistorySidebar />
            </div>
        </div>
        
        {/* Toggle Left */}
        <button 
            onClick={() => setLeftOpen(!leftOpen)} 
            className="absolute bottom-6 left-4 z-40 p-1.5 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-500 hover:text-white hover:border-zinc-500 transition-all shadow-lg hover:scale-110"
            style={{ transform: leftOpen ? 'translateX(305px)' : 'translateX(0)' }}
        >
            {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative z-20 shadow-2xl overflow-hidden">
            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-poker-gold/30 border-t-poker-gold rounded-full animate-spin"></div>
                </div>
            }>
                {viewMode === 'review' ? (
                     <ReviewModeShell selectedHand={selectedHand} setSelectedHand={setSelectedHand} analyzeSpot={analyzeSpot} />
                ) : viewMode === 'store' ? <HandStore />
                  : viewMode === 'tracker' ? <StatsDashboard />
                  : viewMode === 'solver' ? <SolverView />
                  : viewMode === 'tools' ? <ToolsView />
                  : viewMode === 'trainer' ? <SpotTrainer />
                  : viewMode === 'channels' ? <ChannelsView />
                  : viewMode === 'pricing' ? <Pricing />
                  : viewMode === 'profile' ? <Profile />
                  : <AnalysisView />
                }
            </Suspense>
        </main>

        {/* Toggle Right */}
        <button 
            onClick={() => setRightOpen(!rightOpen)} 
            className="absolute bottom-6 right-6 z-50 p-2 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-500 hover:text-white hover:border-zinc-500 transition-all shadow-lg hover:scale-110"
            style={{ transform: rightOpen ? 'translateX(-330px)' : 'translateX(0)' }}
        >
            {rightOpen ? <PanelRightClose className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>

        {/* Right Sidebar (Coach) */}
        <div className={`relative flex flex-col border-l border-zinc-800 bg-[#050505] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-30 ${rightOpen ? 'w-[360px] translate-x-0' : 'w-0 translate-x-full opacity-0'}`}>
            <div className="w-[360px] h-full overflow-hidden">
                <StrategyCoach />
            </div>
        </div>
    </div>
  );
};

const ReviewModeShell = ({ selectedHand, setSelectedHand, analyzeSpot }: any) => {
    if (!selectedHand) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 h-full bg-gradient-to-b from-zinc-900 to-black">
                <div className="relative group cursor-default">
                    <div className="absolute inset-0 bg-poker-gold/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="relative p-8 rounded-full bg-zinc-900 border border-zinc-800 shadow-2xl mb-6">
                        <PlayCircle className="w-16 h-16 text-zinc-700 group-hover:text-poker-gold transition-colors duration-500" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Select a Hand</h3>
                <p className="text-sm text-zinc-500 max-w-xs text-center">Choose a hand from the history sidebar to enter the replayer.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden p-4 lg:p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-zinc-900/80 backdrop-blur border border-zinc-800 p-4 rounded-2xl mb-4 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-poker-gold/10 rounded-lg text-poker-gold">
                        <PlayCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Replay Session</h2>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                            <span className="text-zinc-300">{selectedHand.hero}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>{selectedHand.stakes}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-poker-emerald">{selectedHand.potSize} Pot</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedHand(null)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Replayer Area */}
            <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
                <div className="flex-1 bg-black rounded-[2rem] shadow-2xl border border-zinc-800 overflow-hidden relative">
                    <HandReplayer hand={selectedHand} onAnalyzeSpot={analyzeSpot} />
                </div>
                
                {/* Desktop Text Log */}
                <div className="hidden xl:flex w-80 bg-zinc-950 rounded-3xl border border-zinc-800 flex-col overflow-hidden shadow-xl shrink-0">
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 font-bold text-xs text-zinc-400 uppercase tracking-wider">
                        Raw History
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-[10px] text-zinc-400 leading-relaxed whitespace-pre-wrap selection:bg-poker-gold selection:text-black">
                        {selectedHand.rawText}
                    </div>
                </div>
            </div>
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

    // Persist user
    useEffect(() => { user ? saveUser(user) : removeUser(); }, [user]);

    // Load hands on mount
    useEffect(() => {
        setHands(getHands());

        // Also try to sync from Jules API if configured/available
        JulesService.getHandHistories()
            .then(apiHands => {
                if (apiHands.length > 0) {
                     setHands(prev => {
                        // Merge strategies? For now just append unique ones or replace?
                        // User requirement: "get all of the hand histories" from API.
                        // We will prepend API hands that are not in local storage.
                        const existingIds = new Set(prev.map(h => h.id));
                        const newHands = apiHands.filter(h => !existingIds.has(h.id));
                        return [...newHands, ...prev];
                     });
                }
            })
            .catch(err => console.warn("Jules API unavailable:", err));
    }, []);

    // Toast Management
    const addToast = useCallback((t: Omit<Toast, 'id'>) => {
        setToasts(prev => [...prev, { ...t, id: crypto.randomUUID() }]);
    }, []);
    const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    // Hand Management
    const loadHands = useCallback(async () => {
        const localHands = getHands();
        setHands(localHands);
        try {
            const apiHands = await JulesService.getHandHistories();
            setHands(prev => {
                const existingIds = new Set(prev.map(h => h.id));
                const newHands = apiHands.filter(h => !existingIds.has(h.id));
                return [...newHands, ...prev];
            });
        } catch (e) {
            console.error("Failed to load hands from API", e);
        }
    }, []);
    const addHand = useCallback((h: HandHistory) => setHands(p => [h, ...p]), []);
    const updateHand = useCallback((id: string, u: Partial<HandHistory>) => {
        updateHandService(id, u);
        setHands(p => p.map(h => h.id === id ? { ...h, ...u } : h));
        if (selectedHand?.id === id) setSelectedHand(p => p ? { ...p, ...u } : null);
    }, [selectedHand]);
    const deleteHand = useCallback((id: string) => {
        deleteHandService(id);
        setHands(p => p.filter(h => h.id !== id));
        if (selectedHand?.id === id) setSelectedHand(null);
        addToast({ title: 'Hand Deleted', type: 'info' });
    }, [selectedHand, addToast]);
    const clearAllData = useCallback(() => {
        clearDatabase();
        setHands([]);
        setSelectedHand(null);
        addToast({ title: 'Database Cleared', type: 'success' });
    }, [addToast]);

    // Navigation & Queue
    const launchAnalysis = useCallback((url: string) => {
        setActiveVideoUrl(url);
        setViewMode('analyze');
    }, []);
    const analyzeSpot = useCallback((ctx: string) => {
        window.dispatchEvent(new CustomEvent('analyze-spot', { detail: ctx }));
    }, []);
    const addToQueue = useCallback((v: ChannelVideo) => {
        const item: QueueItem = { id: v.id, videoUrl: v.url, title: v.title, thumbnail: v.thumbnail, status: 'pending', addedAt: Date.now() };
        setQueue(p => [...p, item]);
        addToast({ title: 'Added to Queue', description: v.title, type: 'success' });
        if (!isQueueProcessing) processQueue();
    }, [isQueueProcessing, addToast]);
    const removeFromQueue = useCallback((id: string) => setQueue(p => p.filter(i => i.id !== id)), []);
    const processQueue = async () => {
        setIsQueueProcessing(true);
        setTimeout(() => setIsQueueProcessing(false), 5000); // Sim
    };

    const ctx: PokerContextType = {
        user, setUser, hands, loadHands, addHand, updateHand, deleteHand,
        selectedHand, setSelectedHand, viewMode, setViewMode,
        activeVideoUrl, launchAnalysis, analyzeSpot,
        queue, addToQueue, removeFromQueue, isQueueProcessing,
        addToast, clearAllData, labContext, setLabContext
    };

    return (
        <ErrorBoundary>
            <PokerContext.Provider value={ctx}>
                <AppShell />
                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </PokerContext.Provider>
        </ErrorBoundary>
    );
};

export default App;
