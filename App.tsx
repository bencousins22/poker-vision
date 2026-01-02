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
import { LayoutDashboard, BrainCircuit, User as UserIcon, PlayCircle, CreditCard, Tv, Eye, Sparkles, X, FlaskConical, Target, AlertTriangle, RefreshCcw, PanelLeftClose, PanelLeftOpen, PanelRightClose, MessageSquare, ChevronRight, Grid3X3, Zap, Settings, LogOut } from 'lucide-react';
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white p-6 text-center animate-fade-in">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-black mb-2">System Malfunction</h2>
          <p className="text-zinc-400 mb-8 max-w-md text-sm leading-relaxed">The application encountered an unexpected error.</p>
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-bold text-sm hover:bg-zinc-200 transition-all">
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

const NavItem = ({ id, icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
      active 
      ? 'bg-zinc-800 text-poker-gold shadow-lg ring-1 ring-white/5'
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

  return (
    <div className="flex h-screen w-screen bg-background text-white overflow-hidden font-sans select-none">
        {/* Navigation Rail */}
        <nav className="w-16 flex flex-col items-center py-6 border-r border-border bg-surface/50 backdrop-blur-md z-50 shrink-0 gap-6">
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
            <div className="mt-auto flex flex-col gap-3 w-full px-2 pt-4 border-t border-border items-center">
                <NavItem id="pricing" icon={CreditCard} label="Pricing" active={viewMode === 'pricing'} onClick={() => setViewMode('pricing')} />
                <NavItem id="profile" icon={UserIcon} label="Profile" active={viewMode === 'profile'} onClick={() => setViewMode('profile')} />
            </div>
        </nav>

        {/* Left Sidebar (Hand History) - Collapsible */}
        <div className={`relative flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out overflow-hidden ${leftOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
            <div className="w-80 h-full flex flex-col">
                 <HistorySidebar />
            </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#050505] relative z-20 shadow-2xl overflow-hidden">
             {/* View Toggles for Sidebars (Floating) */}
            <div className="absolute bottom-6 left-6 z-50 flex gap-2">
                 {!leftOpen && (
                    <button onClick={() => setLeftOpen(true)} className="p-2 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-500 hover:text-white transition-all shadow-lg hover:scale-110">
                        <PanelLeftOpen className="w-4 h-4" />
                    </button>
                 )}
                 {leftOpen && (
                    <button onClick={() => setLeftOpen(false)} className="p-2 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-500 hover:text-white transition-all shadow-lg hover:scale-110">
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                 )}
            </div>

            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-poker-gold/30 border-t-poker-gold rounded-full animate-spin"></div></div>}>
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

            <div className="absolute bottom-6 right-6 z-50 flex gap-2">
                 {!rightOpen && (
                    <button onClick={() => setRightOpen(true)} className="p-2 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-500 hover:text-white transition-all shadow-lg hover:scale-110">
                        <MessageSquare className="w-4 h-4" />
                    </button>
                 )}
                 {rightOpen && (
                    <button onClick={() => setRightOpen(false)} className="p-2 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-500 hover:text-white transition-all shadow-lg hover:scale-110">
                        <PanelRightClose className="w-4 h-4" />
                    </button>
                 )}
            </div>
        </main>

        {/* Right Sidebar (Coach/Analysis) - Collapsible */}
        <div className={`relative flex flex-col border-l border-border bg-surface transition-all duration-300 ease-in-out overflow-hidden ${rightOpen ? 'w-[400px] opacity-100' : 'w-0 opacity-0'}`}>
            <div className="w-[400px] h-full flex flex-col">
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
        <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden p-4 lg:p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between bg-surface/50 backdrop-blur border border-border p-4 rounded-2xl mb-4 shadow-sm shrink-0">
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
            <div className="flex-1 bg-black rounded-[2rem] shadow-2xl border border-border overflow-hidden relative">
                <HandReplayer hand={selectedHand} onAnalyzeSpot={analyzeSpot} />
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

    useEffect(() => { user ? saveUser(user) : removeUser(); }, [user]);
    useEffect(() => { setHands(getHands()); }, []);

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

    const addToast = useCallback((t: Omit<Toast, 'id'>) => {
        setToasts(prev => [...prev, { ...t, id: crypto.randomUUID() }]);
    }, []);
    const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    const loadHands = useCallback(() => setHands(getHands()), []);
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
        setTimeout(() => setIsQueueProcessing(false), 5000);
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
