import React, { useState, useMemo, useEffect } from 'react';
import { usePoker } from '../App';
import { RANKS, getMatrixCell, calculateApproxEquity, DEFAULT_RANGES } from '../services/pokerLogic';
import { PokerRange } from '../types';
import { 
    Calculator, Grid3X3, Save, Plus, Trash2, RotateCcw, 
    Play, Percent, Shuffle, ArrowRightLeft, MousePointerClick, 
    Copy, BookOpen, AlertCircle, CheckCircle, X, Users,
    FlaskConical, Swords, ChevronRight, Eraser, Microscope, Layout
} from 'lucide-react';

// --- Reusable Components ---

const Card = ({ card, size = 'md' }: { card: string, size?: 'sm' | 'md' | 'lg' }) => {
    if (!card) return null;
    const rank = card.slice(0, -1);
    const suit = card.slice(-1).toLowerCase();
    const color = ['h', 'd'].includes(suit) ? 'text-red-500' : 
                  ['c'].includes(suit) ? 'text-emerald-500' : 'text-zinc-400';
    const suitChar = { s: '♠', h: '♥', d: '♦', c: '♣' }[suit] || suit;

    const sizeClasses = {
        sm: 'w-8 h-11 text-xs',
        md: 'w-12 h-16 text-base',
        lg: 'w-16 h-24 text-xl'
    };

    return (
        <div className={`${sizeClasses[size]} bg-white rounded-md shadow-md border border-zinc-200 flex flex-col items-center justify-center font-bold select-none relative animate-in zoom-in-50 duration-300`}>
            <span className={`absolute top-0.5 left-1 leading-none ${color}`}>{rank}</span>
            <span className={`text-xl ${color}`}>{suitChar}</span>
        </div>
    );
};

const CardPicker: React.FC<{ 
    selectedCards: string[], 
    onSelect: (card: string) => void,
    limit?: number 
}> = ({ selectedCards, onSelect, limit = 2 }) => {
    const suits = [
        { key: 's', label: '♠', color: 'text-zinc-400', bg: 'hover:bg-zinc-800' },
        { key: 'h', label: '♥', color: 'text-red-500', bg: 'hover:bg-red-950/30' },
        { key: 'c', label: '♣', color: 'text-emerald-500', bg: 'hover:bg-emerald-950/30' },
        { key: 'd', label: '♦', color: 'text-blue-500', bg: 'hover:bg-blue-950/30' },
    ];

    return (
        <div className="bg-[#18181b] p-3 rounded-xl border border-zinc-800 shadow-2xl">
            <div className="grid grid-cols-13 gap-1">
                {RANKS.split('').map(rank => (
                    <div key={rank} className="flex flex-col gap-1">
                        {suits.map(suit => {
                            const card = `${rank}${suit.key}`;
                            const isSelected = selectedCards.includes(card);
                            const isDisabled = !isSelected && selectedCards.length >= limit;
                            
                            return (
                                <button
                                    key={card}
                                    onClick={() => onSelect(card)}
                                    disabled={isDisabled}
                                    className={`
                                        w-8 h-10 rounded flex flex-col items-center justify-center border transition-all relative
                                        ${isSelected 
                                            ? 'bg-white text-black border-white scale-110 z-10 shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                                            : isDisabled 
                                                ? 'bg-zinc-900/30 text-zinc-800 border-transparent opacity-50 cursor-not-allowed'
                                                : `bg-zinc-900/80 ${suit.color} border-zinc-800 ${suit.bg}`
                                        }
                                    `}
                                >
                                    <span className="text-[10px] font-bold leading-none">{rank}</span>
                                    <span className="text-[10px] leading-none">{suit.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

const RangeGrid: React.FC<{ 
    selectedHands: string[], 
    onToggle: (hand: string) => void,
    color?: string
}> = React.memo(({ selectedHands, onToggle, color = '#10b981' }) => {
    return (
        <div className="grid grid-cols-13 gap-px bg-zinc-800 border border-zinc-800 shadow-xl rounded-lg overflow-hidden w-full aspect-square max-w-[600px] mx-auto select-none">
            {Array.from({ length: 13 }).map((_, r) => (
                Array.from({ length: 13 }).map((_, c) => {
                    const hand = getMatrixCell(r, c);
                    const active = selectedHands.includes(hand);
                    const isPair = r === c;
                    
                    return (
                        <div 
                            key={hand}
                            onMouseDown={() => onToggle(hand)}
                            onMouseEnter={(e) => { if(e.buttons === 1) onToggle(hand); }}
                            className={`
                                flex items-center justify-center text-[10px] sm:text-xs font-bold cursor-pointer transition-all duration-75 relative
                                ${active ? 'text-black z-10 scale-[1.02]' : 'bg-[#09090b] text-zinc-600 hover:bg-zinc-800'}
                            `}
                            style={{ 
                                backgroundColor: active ? color : undefined,
                                boxShadow: active ? `inset 0 0 10px rgba(0,0,0,0.2)` : 'none'
                            }}
                        >
                            <span className={active ? 'opacity-100' : 'opacity-50'}>{hand}</span>
                            {isPair && !active && <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>}
                        </div>
                    );
                })
            ))}
        </div>
    );
});

// --- Main Tools View ---

export const ToolsView: React.FC = () => {
    const { user, setUser, labContext, setLabContext } = usePoker();
    const [activeTab, setActiveTab] = useState<'equity' | 'ranges'>('equity');
    
    // --- Shared State ---
    const [ranges, setRanges] = useState<PokerRange[]>(user?.settings?.savedRanges?.length ? user.settings.savedRanges : DEFAULT_RANGES);
    const [activeRangeId, setActiveRangeId] = useState<string>(ranges[0]?.id || '');
    const [currentRange, setCurrentRange] = useState<PokerRange | null>(ranges[0] || null);
    
    // --- Equity State ---
    const [heroHand, setHeroHand] = useState<string[]>(labContext?.heroHand || []);
    const [villainMode, setVillainMode] = useState<'hand' | 'range'>('hand');
    const [villainHand, setVillainHand] = useState<string[]>(labContext?.villainHand || []);
    const [villainRange, setVillainRange] = useState<string[]>([]);
    const [board, setBoard] = useState<string[]>(labContext?.board || []);
    const [results, setResults] = useState<{hero: number, villain: number, split: number} | null>(null);
    
    // Picker Modal State
    const [pickerState, setPickerState] = useState<{
        isOpen: boolean;
        target: 'hero' | 'villain' | 'board' | null;
    }>({ isOpen: false, target: null });

    // Sync Ranges
    useEffect(() => {
        if (user && JSON.stringify(ranges) !== JSON.stringify(user.settings.savedRanges)) {
            setUser({ ...user, settings: { ...user.settings, savedRanges: ranges } });
        }
    }, [ranges]);

    // Sync Lab Context
    useEffect(() => {
        if (labContext) {
            if (labContext.heroHand) setHeroHand(labContext.heroHand);
            if (labContext.villainHand) setVillainHand(labContext.villainHand);
            if (labContext.board) setBoard(labContext.board);
            setResults(null);
        }
    }, [labContext]);

    // Range Logic
    const handleRangeToggle = (hand: string, isEquityContext: boolean = false) => {
        if (isEquityContext) {
            const exists = villainRange.includes(hand);
            setVillainRange(exists ? villainRange.filter(h => h !== hand) : [...villainRange, hand]);
            setResults(null);
            return;
        }
        if (!currentRange) return;
        const exists = currentRange.hands.includes(hand);
        const newHands = exists ? currentRange.hands.filter(h => h !== hand) : [...currentRange.hands, hand];
        const updated = { ...currentRange, hands: newHands };
        setCurrentRange(updated);
        setRanges(prev => prev.map(r => r.id === updated.id ? updated : r));
    };

    const handleCreateRange = () => {
        const newRange: PokerRange = { id: crypto.randomUUID(), name: 'New Range', description: '', color: '#fbbf24', hands: [] };
        setRanges(prev => [...prev, newRange]);
        setCurrentRange(newRange);
        setActiveRangeId(newRange.id);
    };

    const handleDeleteRange = (id: string) => {
        if (ranges.length <= 1) return;
        const remaining = ranges.filter(r => r.id !== id);
        setRanges(remaining);
        if (currentRange?.id === id) {
            setCurrentRange(remaining[0]);
            setActiveRangeId(remaining[0].id);
        }
    };

    // Equity Logic
    const handleCardSelect = (card: string) => {
        const target = pickerState.target;
        if (target === 'hero') {
            if (heroHand.includes(card)) setHeroHand(prev => prev.filter(c => c !== card));
            else if (heroHand.length < 2) setHeroHand(prev => [...prev, card]);
        } else if (target === 'villain') {
            if (villainHand.includes(card)) setVillainHand(prev => prev.filter(c => c !== card));
            else if (villainHand.length < 2) setVillainHand(prev => [...prev, card]);
        } else if (target === 'board') {
            if (board.includes(card)) setBoard(prev => prev.filter(c => c !== card));
            else if (board.length < 5) setBoard(prev => [...prev, card]);
        }
        setResults(null);
    };

    const calculateEquity = () => {
        const villainInput = villainMode === 'range' ? villainRange : villainHand;
        setResults(calculateApproxEquity(heroHand, villainInput, board, villainMode === 'range'));
    };

    const clearEquity = () => {
        setHeroHand([]); setVillainHand([]); setVillainRange([]); setBoard([]); setResults(null);
        setLabContext({});
    };

    // Components
    const Slot = ({ label, cards, onClick, active, subtext, emptyIcon: Icon }: any) => (
        <div 
            onClick={onClick}
            className={`
                relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer h-40 bg-[#09090b] overflow-hidden group
                ${active ? 'border-poker-gold shadow-[0_0_20px_rgba(251,191,36,0.15)]' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}
            `}
        >
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest z-10">{label}</div>
            
            <div className="flex gap-2 relative z-10">
                {cards.length > 0 ? (
                    cards.map((c: string) => <Card key={c} card={c} size="md" />)
                ) : (
                    <div className="flex gap-2 opacity-20">
                        <div className="w-12 h-16 rounded-md border-2 border-dashed border-zinc-500 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                        <div className="w-12 h-16 rounded-md border-2 border-dashed border-zinc-500 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                    </div>
                )}
            </div>
            
            {subtext && <div className="text-[10px] text-poker-blue font-bold z-10 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{subtext}</div>}
            
            {/* Background Flair */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background text-zinc-100 font-sans overflow-hidden">
            
            {/* --- Lab Header --- */}
            <div className="h-16 px-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <FlaskConical className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight">The Lab</h1>
                        <p className="text-[10px] text-zinc-500 font-medium">Research & Analysis Center</p>
                    </div>
                </div>

                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    <button 
                        onClick={() => setActiveTab('equity')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'equity' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Swords className="w-3.5 h-3.5" /> Equity Cruncher
                    </button>
                    <button 
                        onClick={() => setActiveTab('ranges')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'ranges' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Grid3X3 className="w-3.5 h-3.5" /> Range Commander
                    </button>
                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="flex-1 overflow-hidden relative">
                
                {/* EQUITY TAB */}
                {activeTab === 'equity' && (
                    <div className="h-full flex flex-col lg:flex-row">
                        
                        {/* Left Panel: Table Visualizer */}
                        <div className="flex-1 bg-[#050505] p-6 lg:p-10 flex flex-col items-center justify-center relative overflow-y-auto">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-[#050505] to-[#050505] pointer-events-none"></div>
                            
                            <div className="w-full max-w-4xl relative z-10 space-y-8">
                                {/* Top Row: Hero vs Villain */}
                                <div className="grid grid-cols-2 gap-8 lg:gap-16">
                                    <Slot 
                                        label="Hero Hand" 
                                        cards={heroHand} 
                                        onClick={() => setPickerState({ isOpen: true, target: 'hero' })}
                                        active={pickerState.target === 'hero'}
                                        emptyIcon={Users}
                                    />
                                    
                                    <div className="relative">
                                        {villainMode === 'hand' ? (
                                            <Slot 
                                                label="Villain Hand" 
                                                cards={villainHand} 
                                                onClick={() => setPickerState({ isOpen: true, target: 'villain' })}
                                                active={pickerState.target === 'villain'}
                                                emptyIcon={Users}
                                            />
                                        ) : (
                                            <div 
                                                onClick={() => setPickerState({ isOpen: true, target: 'villain' })}
                                                className={`h-40 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#09090b] transition-all hover:bg-zinc-900 ${pickerState.target === 'villain' ? 'border-poker-gold' : 'border-zinc-800'}`}
                                            >
                                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Villain Range</div>
                                                <Grid3X3 className="w-8 h-8 text-blue-500" />
                                                <div className="text-xl font-black text-white">{((villainRange.length / 1326) * 100).toFixed(1)}%</div>
                                                <div className="text-[9px] text-zinc-600">{villainRange.length} combos</div>
                                            </div>
                                        )}
                                        
                                        {/* Villain Mode Toggle */}
                                        <div className="absolute -top-3 right-4 flex bg-zinc-900 border border-zinc-700 rounded-lg p-0.5 shadow-lg">
                                            <button onClick={(e) => { e.stopPropagation(); setVillainMode('hand'); }} className={`px-2 py-0.5 text-[9px] font-bold rounded ${villainMode === 'hand' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Cards</button>
                                            <button onClick={(e) => { e.stopPropagation(); setVillainMode('range'); }} className={`px-2 py-0.5 text-[9px] font-bold rounded ${villainMode === 'range' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>Range</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle: Board */}
                                <div className="max-w-2xl mx-auto">
                                    <Slot 
                                        label="Community Cards" 
                                        cards={board} 
                                        onClick={() => setPickerState({ isOpen: true, target: 'board' })}
                                        active={pickerState.target === 'board'}
                                        emptyIcon={Layout}
                                    />
                                </div>

                                {/* Bottom: Controls */}
                                <div className="flex justify-center gap-4">
                                    <button 
                                        onClick={calculateEquity}
                                        className="px-8 py-4 bg-poker-gold hover:bg-yellow-500 text-black font-black text-lg rounded-xl shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_50px_rgba(251,191,36,0.5)] hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Microscope className="w-6 h-6" /> Calculate
                                    </button>
                                    <button 
                                        onClick={clearEquity}
                                        className="p-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-all"
                                    >
                                        <Eraser className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Results & Tools */}
                        <div className="w-full lg:w-96 bg-surface border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col relative z-20 shadow-2xl">
                            <div className="flex-1 p-6 flex flex-col">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <Percent className="w-4 h-4" /> Analysis Results
                                </h3>

                                {results ? (
                                    <div className="space-y-8 animate-in slide-in-from-right-4">
                                        <div className="text-center p-6 bg-black/40 rounded-3xl border border-zinc-800 relative overflow-hidden">
                                            <div className="relative z-10">
                                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Hero Equity</div>
                                                <div className="text-6xl font-black text-poker-green tracking-tighter">{results.hero.toFixed(1)}%</div>
                                                <div className="mt-4 flex gap-2 justify-center text-xs font-mono">
                                                    <span className="text-red-500 font-bold">V: {results.villain.toFixed(1)}%</span>
                                                    <span className="text-zinc-600">|</span>
                                                    <span className="text-zinc-400">Tie: {results.split.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className={`absolute inset-0 opacity-10 blur-xl ${results.hero > 50 ? 'bg-poker-green' : 'bg-red-500'}`}></div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold text-zinc-400">
                                                <span>Win</span>
                                                <span>Loss</span>
                                            </div>
                                            <div className="h-4 bg-zinc-900 rounded-full overflow-hidden flex">
                                                <div style={{ width: `${results.hero}%` }} className="bg-poker-green transition-all duration-1000"></div>
                                                <div style={{ width: `${results.split}%` }} className="bg-zinc-600 transition-all duration-1000"></div>
                                                <div style={{ width: `${results.villain}%` }} className="bg-red-500 transition-all duration-1000"></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50">
                                        <Calculator className="w-16 h-16" />
                                        <p className="text-sm font-medium">Input hands to calculate odds</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Picker Overlay */}
                        {pickerState.isOpen && (
                            <div 
                                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
                                onClick={() => setPickerState({ isOpen: false, target: null })}
                            >
                                <div className="relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                                    <div className="mb-4 flex justify-between items-center text-white">
                                        <h3 className="text-lg font-bold flex items-center gap-2 capitalize">
                                            Select {pickerState.target} {villainMode === 'range' && pickerState.target === 'villain' ? 'Range' : 'Cards'}
                                        </h3>
                                        <button onClick={() => setPickerState({ isOpen: false, target: null })} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                                    </div>
                                    
                                    {pickerState.target === 'villain' && villainMode === 'range' ? (
                                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 shadow-2xl">
                                            <div className="w-[300px] sm:w-[500px] aspect-square">
                                                <RangeGrid 
                                                    selectedHands={villainRange} 
                                                    onToggle={(h) => handleRangeToggle(h, true)}
                                                    color="#3b82f6"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <CardPicker 
                                            selectedCards={[...heroHand, ...villainHand, ...board]} 
                                            onSelect={handleCardSelect} 
                                            limit={pickerState.target === 'board' ? 5 : 2}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* RANGE COMMANDER TAB */}
                {activeTab === 'ranges' && (
                    <div className="h-full grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                        
                        {/* Sidebar: Range List */}
                        <div className="md:col-span-3 bg-surface border-r border-zinc-800 flex flex-col h-full overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">My Ranges</span>
                                <button onClick={handleCreateRange} className="p-1.5 bg-zinc-800 hover:bg-poker-gold hover:text-black rounded text-zinc-400 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {ranges.map(range => (
                                    <div 
                                        key={range.id}
                                        onClick={() => { setCurrentRange(range); setActiveRangeId(range.id); }}
                                        className={`p-3 rounded-xl cursor-pointer border transition-all group ${
                                            activeRangeId === range.id 
                                            ? 'bg-zinc-800 border-zinc-700 shadow-md' 
                                            : 'border-transparent hover:bg-zinc-900'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-sm font-bold truncate ${activeRangeId === range.id ? 'text-white' : 'text-zinc-400'}`}>{range.name}</span>
                                            {ranges.length > 1 && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteRange(range.id); }} 
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/30 text-zinc-600 hover:text-red-400 rounded transition-all"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: range.color }}></div>
                                            <span className="text-[10px] text-zinc-600 font-mono">
                                                {((range.hands.length / 1326) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Editor */}
                        <div className="md:col-span-9 bg-background flex flex-col h-full overflow-hidden relative">
                            {currentRange ? (
                                <>
                                    {/* Toolbar */}
                                    <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30">
                                        <div className="flex items-center gap-4 flex-1">
                                            <input 
                                                value={currentRange.name}
                                                onChange={(e) => {
                                                    const updated = { ...currentRange, name: e.target.value };
                                                    setCurrentRange(updated);
                                                    setRanges(prev => prev.map(r => r.id === updated.id ? updated : r));
                                                }}
                                                className="bg-transparent text-xl font-bold text-white focus:outline-none w-full max-w-md placeholder-zinc-700"
                                                placeholder="Range Name"
                                            />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-800">
                                                <div className="text-xs text-zinc-500 font-bold uppercase">Color</div>
                                                <input 
                                                    type="color" 
                                                    value={currentRange.color}
                                                    onChange={(e) => {
                                                        const updated = { ...currentRange, color: e.target.value };
                                                        setCurrentRange(updated);
                                                        setRanges(prev => prev.map(r => r.id === updated.id ? updated : r));
                                                    }}
                                                    className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                                                />
                                            </div>
                                            <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-mono text-poker-gold font-bold">
                                                {((currentRange.hands.length / 1326) * 100).toFixed(2)}% of Hands
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grid Container */}
                                    <div className="flex-1 p-6 flex items-center justify-center bg-black/20 overflow-y-auto">
                                        <div className="w-full max-w-[650px] aspect-square shadow-2xl rounded-xl overflow-hidden border border-zinc-800">
                                            <RangeGrid 
                                                selectedHands={currentRange.hands} 
                                                onToggle={handleRangeToggle} 
                                                color={currentRange.color}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4">
                                    <BookOpen className="w-16 h-16 opacity-20" />
                                    <p>Select a range to edit</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};