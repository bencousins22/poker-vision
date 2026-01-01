
import React, { useState, useMemo, useEffect } from 'react';
import { usePoker } from '../App';
import { RANKS, getMatrixCell, calculateApproxEquity, DEFAULT_RANGES } from '../services/pokerLogic';
import { PokerRange } from '../types';
import { 
    Calculator, Grid3X3, Save, Plus, Trash2, RotateCcw, 
    Play, Percent, Shuffle, ArrowRightLeft, MousePointerClick, 
    Copy, BookOpen, AlertCircle, CheckCircle, X, Users
} from 'lucide-react';

// --- Card Picker Component ---
const CardPicker: React.FC<{ 
    selectedCards: string[], 
    onSelect: (card: string) => void,
    limit?: number 
}> = ({ selectedCards, onSelect, limit = 2 }) => {
    const suits = [
        { key: 's', label: '♠', color: 'text-zinc-400' },
        { key: 'h', label: '♥', color: 'text-red-500' },
        { key: 'c', label: '♣', color: 'text-emerald-500' },
        { key: 'd', label: '♦', color: 'text-blue-500' },
    ];

    return (
        <div className="grid grid-cols-13 gap-1 min-w-[300px] p-2 bg-black/40 rounded-xl border border-zinc-800">
            {RANKS.split('').map(rank => (
                <div key={rank} className="contents">
                    {suits.map(suit => {
                        const card = `${rank}${suit.key}`;
                        const isSelected = selectedCards.includes(card);
                        const isDisabled = !isSelected && selectedCards.length >= limit;
                        
                        return (
                            <button
                                key={card}
                                onClick={() => onSelect(card)}
                                disabled={isDisabled && !isSelected}
                                className={`
                                    w-6 h-8 text-[10px] font-bold rounded flex items-center justify-center border transition-all
                                    ${isSelected 
                                        ? 'bg-zinc-200 text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-110 z-10' 
                                        : isDisabled 
                                            ? 'bg-zinc-900/20 text-zinc-700 border-transparent opacity-30 cursor-not-allowed'
                                            : `bg-zinc-900 ${suit.color} border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600`
                                    }
                                `}
                            >
                                <span className="absolute top-0.5 left-0.5 leading-none text-[8px]">{rank}</span>
                                <span className="text-xs">{suit.label}</span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

// --- Range Grid Component ---
const RangeGrid: React.FC<{ 
    selectedHands: string[], 
    onToggle: (hand: string) => void,
    color?: string
}> = React.memo(({ selectedHands, onToggle, color = '#10b981' }) => {
    const isSelected = (h: string) => selectedHands.includes(h);

    return (
        <div className="grid grid-cols-13 gap-0.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800 shadow-inner select-none">
            {Array.from({ length: 13 }).map((_, r) => (
                Array.from({ length: 13 }).map((_, c) => {
                    const hand = getMatrixCell(r, c);
                    const active = isSelected(hand);
                    
                    return (
                        <div 
                            key={hand}
                            onMouseDown={() => onToggle(hand)}
                            onMouseEnter={(e) => { if(e.buttons === 1) onToggle(hand); }}
                            className={`
                                aspect-square flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors
                                ${active ? 'text-black shadow-inner' : 'bg-zinc-950 text-zinc-600 hover:bg-zinc-900'}
                            `}
                            style={{ backgroundColor: active ? color : undefined }}
                        >
                            {hand}
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
    const [activeTab, setActiveTab] = useState<'ranges' | 'equity'>('equity');
    
    // Range State
    const [ranges, setRanges] = useState<PokerRange[]>(user?.settings?.savedRanges?.length ? user.settings.savedRanges : DEFAULT_RANGES);
    const [activeRangeId, setActiveRangeId] = useState<string>(ranges[0]?.id || '');
    const [currentRange, setCurrentRange] = useState<PokerRange | null>(ranges[0] || null);
    
    // Equity State
    const [heroHand, setHeroHand] = useState<string[]>(labContext?.heroHand || []);
    const [villainMode, setVillainMode] = useState<'hand' | 'range'>('hand');
    const [villainHand, setVillainHand] = useState<string[]>(labContext?.villainHand || []);
    const [villainRange, setVillainRange] = useState<string[]>([]);
    const [board, setBoard] = useState<string[]>(labContext?.board || []);
    const [results, setResults] = useState<{hero: number, villain: number, split: number} | null>(null);
    const [pickerTarget, setPickerTarget] = useState<'hero' | 'villain' | 'board' | null>(null);

    // Sync Ranges to User Settings
    useEffect(() => {
        if (user && ranges !== user.settings.savedRanges) {
            setUser({
                ...user,
                settings: { ...user.settings, savedRanges: ranges }
            });
        }
    }, [ranges, user, setUser]);

    useEffect(() => {
        if (labContext) {
            if (labContext.heroHand) setHeroHand(labContext.heroHand);
            if (labContext.villainHand) setVillainHand(labContext.villainHand);
            if (labContext.board) setBoard(labContext.board);
            setResults(null); // Reset results on new context
        }
    }, [labContext]);

    // --- Range Handlers ---
    const handleRangeToggle = (hand: string, isEquityContext: boolean = false) => {
        if (isEquityContext) {
            const exists = villainRange.includes(hand);
            const newHands = exists ? villainRange.filter(h => h !== hand) : [...villainRange, hand];
            setVillainRange(newHands);
            setResults(null);
            return;
        }

        if (!currentRange) return;
        const exists = currentRange.hands.includes(hand);
        const newHands = exists 
            ? currentRange.hands.filter(h => h !== hand)
            : [...currentRange.hands, hand];
        
        const updatedRange = { ...currentRange, hands: newHands };
        setCurrentRange(updatedRange);
        setRanges(prev => prev.map(r => r.id === updatedRange.id ? updatedRange : r));
    };

    const handleCreateRange = () => {
        const newRange: PokerRange = {
            id: crypto.randomUUID(),
            name: 'New Range',
            description: 'Description here...',
            color: '#fbbf24',
            hands: []
        };
        setRanges(prev => [...prev, newRange]);
        setCurrentRange(newRange);
        setActiveRangeId(newRange.id);
    };

    const handleDeleteRange = (id: string) => {
        const newRanges = ranges.filter(r => r.id !== id);
        setRanges(newRanges);
        if (currentRange?.id === id) {
            setCurrentRange(newRanges[0] || null);
            setActiveRangeId(newRanges[0]?.id || '');
        }
    };

    // --- Equity Handlers ---
    const handleCardSelect = (card: string) => {
        if (pickerTarget === 'hero') {
            if (heroHand.includes(card)) setHeroHand(prev => prev.filter(c => c !== card));
            else if (heroHand.length < 2) setHeroHand(prev => [...prev, card]);
        } else if (pickerTarget === 'villain') {
            if (villainHand.includes(card)) setVillainHand(prev => prev.filter(c => c !== card));
            else if (villainHand.length < 2) setVillainHand(prev => [...prev, card]);
        } else if (pickerTarget === 'board') {
            if (board.includes(card)) setBoard(prev => prev.filter(c => c !== card));
            else if (board.length < 5) setBoard(prev => [...prev, card]);
        }
        setResults(null); // Invalidate results on change
    };

    const calculateEquity = () => {
        const villainInput = villainMode === 'range' ? villainRange : villainHand;
        const res = calculateApproxEquity(heroHand, villainInput, board, villainMode === 'range');
        setResults(res);
    };

    const clearEquity = () => {
        setHeroHand([]);
        setVillainHand([]);
        setVillainRange([]);
        setBoard([]);
        setResults(null);
        setLabContext({}); // Clear global context
    };

    const getPickerLimit = () => pickerTarget === 'board' ? 5 : 2;

    const CardDisplay = ({ cards, placeholder, target, active }: any) => (
        <div 
            onClick={() => setPickerTarget(active ? null : target)}
            className={`
                h-24 rounded-xl border-2 flex items-center justify-center gap-2 cursor-pointer transition-all relative overflow-hidden group
                ${active ? 'border-poker-gold bg-zinc-900' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}
            `}
        >
            {cards.length > 0 ? cards.map((c: string) => (
                <div key={c} className="w-10 h-14 bg-white rounded flex items-center justify-center text-lg font-bold shadow-lg">
                    <span className={['h','d'].includes(c[1]) ? 'text-red-600' : 'text-black'}>
                        {c.replace('s','♠').replace('h','♥').replace('d','♦').replace('c','♣')}
                    </span>
                </div>
            )) : (
                <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">{placeholder}</span>
            )}
            
            {/* Active Indicator */}
            {active && <div className="absolute top-2 right-2 w-2 h-2 bg-poker-gold rounded-full animate-pulse"></div>}
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto bg-background p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header Tabs */}
                <div className="flex items-center justify-between">
                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                        <button 
                            onClick={() => setActiveTab('equity')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'equity' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Calculator className="w-4 h-4" /> Equity Cruncher
                        </button>
                        <button 
                            onClick={() => setActiveTab('ranges')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'ranges' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Grid3X3 className="w-4 h-4" /> Range Commander
                        </button>
                    </div>
                </div>

                {/* --- EQUITY CRUNCHER TAB --- */}
                {activeTab === 'equity' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                        {/* Left: Input Deck */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <CardDisplay cards={heroHand} placeholder="Select Hero" target="hero" active={pickerTarget === 'hero'} />
                                
                                {/* Villain Toggle */}
                                <div className="relative">
                                    {villainMode === 'hand' ? (
                                        <CardDisplay cards={villainHand} placeholder="Select Villain" target="villain" active={pickerTarget === 'villain'} />
                                    ) : (
                                        <div 
                                            onClick={() => setPickerTarget(pickerTarget === 'villain' ? null : 'villain')}
                                            className={`h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${pickerTarget === 'villain' ? 'border-poker-gold bg-zinc-900' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}
                                        >
                                            <Grid3X3 className="w-6 h-6 text-poker-blue" />
                                            <span className="text-xs font-bold text-white">{villainRange.length > 0 ? `${((villainRange.length/169)*100).toFixed(1)}% Range` : 'Select Range'}</span>
                                        </div>
                                    )}
                                    
                                    {/* Toggle Button */}
                                    <div className="absolute -top-3 right-4 flex bg-zinc-900 border border-zinc-700 rounded-lg p-0.5 z-10">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setVillainMode('hand'); setPickerTarget(null); }}
                                            className={`px-2 py-0.5 text-[9px] font-bold rounded ${villainMode === 'hand' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
                                        >
                                            Cards
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setVillainMode('range'); setPickerTarget(null); }}
                                            className={`px-2 py-0.5 text-[9px] font-bold rounded ${villainMode === 'range' ? 'bg-poker-blue text-white' : 'text-zinc-500'}`}
                                        >
                                            Range
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <CardDisplay cards={board} placeholder="Select Board (0-5 cards)" target="board" active={pickerTarget === 'board'} />
                                <div className="absolute -top-3 left-4 bg-background px-2 text-xs text-zinc-500 font-bold">Community Cards</div>
                            </div>

                            {/* Picker Area */}
                            {pickerTarget && (
                                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 animate-slide-up">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <MousePointerClick className="w-4 h-4 text-poker-gold" /> 
                                            Select {pickerTarget === 'board' ? 'Board Cards' : `${pickerTarget} ${villainMode === 'range' && pickerTarget === 'villain' ? 'Range' : 'Cards'}`}
                                        </h3>
                                        <button onClick={() => setPickerTarget(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                    
                                    {pickerTarget === 'villain' && villainMode === 'range' ? (
                                        <div className="aspect-square max-w-[400px] mx-auto">
                                            <RangeGrid 
                                                selectedHands={villainRange} 
                                                onToggle={(h) => handleRangeToggle(h, true)}
                                                color="#3b82f6"
                                            />
                                        </div>
                                    ) : (
                                        <CardPicker 
                                            selectedCards={[...heroHand, ...villainHand, ...board]} 
                                            onSelect={handleCardSelect} 
                                            limit={getPickerLimit()}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button 
                                    onClick={calculateEquity}
                                    className="flex-1 py-4 bg-poker-gold hover:bg-yellow-500 text-black font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg"
                                >
                                    <Play className="w-5 h-5 fill-current" /> Calculate Odds
                                </button>
                                <button 
                                    onClick={clearEquity}
                                    className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl font-bold transition-all"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Right: Results */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 h-full flex flex-col justify-center relative overflow-hidden shadow-2xl">
                                {results ? (
                                    <div className="space-y-8 relative z-10 animate-fade-in">
                                        <div className="text-center">
                                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Hero Equity</h3>
                                            <div className="text-6xl font-black text-poker-green">{results.hero.toFixed(1)}%</div>
                                        </div>
                                        
                                        <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden flex">
                                            <div style={{ width: `${results.hero}%` }} className="bg-poker-green h-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                                            <div style={{ width: `${results.villain}%` }} className="bg-red-500 h-full shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                                        </div>

                                        <div className="flex justify-between items-end">
                                            <div className="text-left">
                                                <div className="text-zinc-500 text-[10px] font-bold uppercase">Villain</div>
                                                <div className="text-2xl font-bold text-red-500">{results.villain.toFixed(1)}%</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-zinc-500 text-[10px] font-bold uppercase">Tie</div>
                                                <div className="text-2xl font-bold text-zinc-400">{results.split.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4 opacity-30">
                                        <Percent className="w-24 h-24 mx-auto text-zinc-600" />
                                        <p className="text-sm font-bold text-zinc-500">Enter hands to crunch numbers</p>
                                    </div>
                                )}
                                {/* Background Glow */}
                                {results && (
                                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[100px] opacity-20 pointer-events-none ${results.hero > 50 ? 'bg-poker-green' : 'bg-red-500'}`}></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- RANGE COMMANDER TAB --- */}
                {activeTab === 'ranges' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in h-[calc(100vh-200px)] min-h-[600px]">
                        
                        {/* Sidebar List */}
                        <div className="lg:col-span-3 flex flex-col gap-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">My Ranges</h3>
                                <button onClick={handleCreateRange} className="p-1 hover:bg-zinc-800 rounded text-poker-gold"><Plus className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {ranges.map(range => (
                                    <div 
                                        key={range.id}
                                        onClick={() => { setCurrentRange(range); setActiveRangeId(range.id); }}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all group ${
                                            activeRangeId === range.id 
                                            ? 'bg-zinc-900 border-zinc-700 shadow-md' 
                                            : 'bg-transparent border-transparent hover:bg-zinc-900/50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm font-bold ${activeRangeId === range.id ? 'text-white' : 'text-zinc-400'}`}>{range.name}</span>
                                            {activeRangeId === range.id && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteRange(range.id); }} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: range.color }}></div>
                                            <span className="text-[10px] text-zinc-600 truncate">{range.description}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Editor Area */}
                        {currentRange ? (
                            <div className="lg:col-span-9 flex flex-col gap-6">
                                <div className="flex justify-between items-start bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                                    <div className="space-y-3 flex-1 max-w-md">
                                        <input 
                                            value={currentRange.name}
                                            onChange={(e) => {
                                                const updated = { ...currentRange, name: e.target.value };
                                                setCurrentRange(updated);
                                                setRanges(prev => prev.map(r => r.id === updated.id ? updated : r));
                                            }}
                                            className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none placeholder-zinc-700"
                                            placeholder="Range Name"
                                        />
                                        <input 
                                            value={currentRange.description}
                                            onChange={(e) => {
                                                const updated = { ...currentRange, description: e.target.value };
                                                setCurrentRange(updated);
                                                setRanges(prev => prev.map(r => r.id === updated.id ? updated : r));
                                            }}
                                            className="w-full bg-transparent text-sm text-zinc-400 focus:outline-none placeholder-zinc-700"
                                            placeholder="Description..."
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={currentRange.color}
                                            onChange={(e) => {
                                                const updated = { ...currentRange, color: e.target.value };
                                                setCurrentRange(updated);
                                                setRanges(prev => prev.map(r => r.id === updated.id ? updated : r));
                                            }}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" 
                                        />
                                        <div className="bg-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400">
                                            {((currentRange.hands.length / 1326) * 100).toFixed(1)}% Hands
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-900 p-4 flex items-center justify-center shadow-inner">
                                    <div className="w-full max-w-[600px] aspect-square">
                                        <RangeGrid 
                                            selectedHands={currentRange.hands} 
                                            onToggle={handleRangeToggle}
                                            color={currentRange.color}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="lg:col-span-9 flex items-center justify-center text-zinc-600 flex-col gap-4">
                                <BookOpen className="w-16 h-16 opacity-20" />
                                <p>Select or create a range to edit</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
