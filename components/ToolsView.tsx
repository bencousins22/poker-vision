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

const Card: React.FC<{ card: string, size?: 'sm' | 'md' | 'lg' }> = ({ card, size = 'md' }) => {
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
                            {hand}
                        </div>
                    );
                })
            ))}
        </div>
    );
});

// --- Main Views ---

const EquityCalculator: React.FC = () => {
    const [heroHand, setHeroHand] = useState<string[]>([]);
    const [villainHand, setVillainHand] = useState<string[]>([]);
    const [board, setBoard] = useState<string[]>([]);
    const [activePicker, setActivePicker] = useState<'hero' | 'villain' | 'board' | null>(null);
    const [results, setResults] = useState<{hero: number, villain: number} | null>(null);

    const handleCardSelect = (card: string) => {
        if (!activePicker) return;
        
        const setter = activePicker === 'hero' ? setHeroHand : 
                       activePicker === 'villain' ? setVillainHand : setBoard;
        
        const current = activePicker === 'hero' ? heroHand : 
                        activePicker === 'villain' ? villainHand : board;
        
        const limit = activePicker === 'board' ? 5 : 2;

        if (current.includes(card)) {
            setter(current.filter(c => c !== card));
        } else if (current.length < limit) {
            setter([...current, card]);
        }
    };

    const getSelectedCardsForPicker = () => {
        return activePicker === 'hero' ? heroHand : 
               activePicker === 'villain' ? villainHand : board;
    };

    const calculate = () => {
        const res = calculateApproxEquity(heroHand, villainHand, board);
        setResults(res);
    };

    const clearAll = () => {
        setHeroHand([]);
        setVillainHand([]);
        setBoard([]);
        setResults(null);
        setActivePicker(null);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {/* Input Area */}
            <div className="lg:col-span-8 flex flex-col gap-8">
                {/* Board */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center">
                    <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-4">Community Cards</h3>
                    <div 
                        onClick={() => setActivePicker(activePicker === 'board' ? null : 'board')}
                        className={`flex gap-2 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[100px] items-center justify-center w-full max-w-md ${activePicker === 'board' ? 'border-poker-gold bg-poker-gold/5' : 'border-zinc-800 hover:border-zinc-600'}`}
                    >
                        {board.length === 0 ? (
                            <span className="text-zinc-600 font-bold text-sm">Select Board</span>
                        ) : (
                            board.map(c => <Card key={c} card={c} />)
                        )}
                        {board.length < 5 && <Plus className="w-6 h-6 text-zinc-700" />}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    {/* Hero */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center relative overflow-hidden group">
                        <div className={`absolute inset-0 bg-emerald-500/5 transition-opacity ${results && results.hero > results.villain ? 'opacity-100' : 'opacity-0'}`}></div>
                        <h3 className="text-emerald-500 font-bold uppercase tracking-widest text-xs mb-4 z-10 flex items-center gap-2">
                             <Users className="w-4 h-4" /> Hero Hand
                        </h3>
                        <div 
                            onClick={() => setActivePicker(activePicker === 'hero' ? null : 'hero')}
                            className={`flex gap-2 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[100px] items-center justify-center w-full ${activePicker === 'hero' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 hover:border-zinc-600'} z-10`}
                        >
                            {heroHand.length === 0 ? <span className="text-zinc-600 font-bold text-sm">Select Cards</span> : heroHand.map(c => <Card key={c} card={c} />)}
                        </div>
                        {results && (
                            <div className="mt-4 text-center z-10">
                                <div className="text-4xl font-black text-white">{results.hero.toFixed(1)}%</div>
                                <div className="text-[10px] text-emerald-400 font-bold uppercase">Equity</div>
                            </div>
                        )}
                    </div>

                    {/* Villain */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center relative overflow-hidden group">
                        <div className={`absolute inset-0 bg-red-500/5 transition-opacity ${results && results.villain > results.hero ? 'opacity-100' : 'opacity-0'}`}></div>
                        <h3 className="text-red-500 font-bold uppercase tracking-widest text-xs mb-4 z-10 flex items-center gap-2">
                             <Swords className="w-4 h-4" /> Villain Hand
                        </h3>
                        <div 
                            onClick={() => setActivePicker(activePicker === 'villain' ? null : 'villain')}
                            className={`flex gap-2 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[100px] items-center justify-center w-full ${activePicker === 'villain' ? 'border-red-500 bg-red-500/10' : 'border-zinc-800 hover:border-zinc-600'} z-10`}
                        >
                            {villainHand.length === 0 ? <span className="text-zinc-600 font-bold text-sm">Select Cards</span> : villainHand.map(c => <Card key={c} card={c} />)}
                        </div>
                        {results && (
                            <div className="mt-4 text-center z-10">
                                <div className="text-4xl font-black text-white">{results.villain.toFixed(1)}%</div>
                                <div className="text-[10px] text-red-400 font-bold uppercase">Equity</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={calculate}
                        disabled={heroHand.length < 2 || villainHand.length < 2}
                        className="flex-1 py-4 bg-poker-gold text-black font-black text-lg rounded-xl shadow-lg hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Calculator className="w-5 h-5" /> Calculate Equity
                    </button>
                    <button 
                        onClick={clearAll}
                        className="px-6 py-4 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-bold transition-all"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Picker Sidebar */}
            <div className="lg:col-span-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-poker-gold" /> Card Selector
                    </h3>
                    {activePicker && (
                        <span className="text-xs font-mono text-zinc-500 px-2 py-1 bg-zinc-900 rounded border border-zinc-800 capitalize">
                            Selecting: {activePicker}
                        </span>
                    )}
                </div>
                {activePicker ? (
                    <CardPicker 
                        selectedCards={getSelectedCardsForPicker()} 
                        onSelect={handleCardSelect}
                        limit={activePicker === 'board' ? 5 : 2}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                        <Layout className="w-12 h-12 opacity-20 mb-2" />
                        <p className="text-sm">Select a hand or board area to open picker.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const RangeManager: React.FC = () => {
    const { user, setUser, addToast } = usePoker();
    const [ranges, setRanges] = useState<PokerRange[]>(user?.settings?.savedRanges || DEFAULT_RANGES);
    const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
    const [currentRangeHands, setCurrentRangeHands] = useState<string[]>([]);
    const [isEditingRange, setIsEditingRange] = useState(false);
    const [newRangeName, setNewRangeName] = useState("");

    useEffect(() => {
        if (selectedRangeId) {
            const range = ranges.find(r => r.id === selectedRangeId);
            if (range) {
                setCurrentRangeHands(range.hands);
                setNewRangeName(range.name);
            }
        } else {
            setCurrentRangeHands([]);
            setNewRangeName("");
        }
    }, [selectedRangeId, ranges]);

    const handleToggleHand = (hand: string) => {
        if (!isEditingRange && selectedRangeId) return; // Read only mode unless editing
        
        setCurrentRangeHands(prev => 
            prev.includes(hand) ? prev.filter(h => h !== hand) : [...prev, hand]
        );
    };

    const handleSaveRange = () => {
        if (!newRangeName) return;

        let updatedRanges;
        if (selectedRangeId) {
            // Update existing
            updatedRanges = ranges.map(r => r.id === selectedRangeId ? { ...r, name: newRangeName, hands: currentRangeHands } : r);
        } else {
            // Create new
            const newRange: PokerRange = {
                id: crypto.randomUUID(),
                name: newRangeName,
                description: 'Custom Range',
                hands: currentRangeHands,
                color: '#3b82f6'
            };
            updatedRanges = [...ranges, newRange];
            setSelectedRangeId(newRange.id);
        }

        setRanges(updatedRanges);
        if (user) {
            setUser({ ...user, settings: { ...user.settings, savedRanges: updatedRanges } });
        }
        setIsEditingRange(false);
        addToast({ title: "Range Saved", type: 'success' });
    };

    const handleDeleteRange = () => {
        if (!selectedRangeId) return;
        const updated = ranges.filter(r => r.id !== selectedRangeId);
        setRanges(updated);
        setSelectedRangeId(null);
        if (user) {
            setUser({ ...user, settings: { ...user.settings, savedRanges: updated } });
        }
        addToast({ title: "Range Deleted", type: 'info' });
    };

    const percentage = ((currentRangeHands.length / 169) * 100).toFixed(1);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {/* Sidebar List */}
            <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-poker-gold" /> Saved Ranges
                    </h3>
                    <button 
                        onClick={() => { setSelectedRangeId(null); setIsEditingRange(true); setCurrentRangeHands([]); setNewRangeName("New Range"); }}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-y-auto p-2 space-y-1">
                    {ranges.map(range => (
                        <button
                            key={range.id}
                            onClick={() => { setSelectedRangeId(range.id); setIsEditingRange(false); }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all ${
                                selectedRangeId === range.id 
                                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md' 
                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                            }`}
                        >
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: range.color, backgroundColor: range.color }}></div>
                            <span className="text-xs font-bold truncate flex-1">{range.name}</span>
                            <span className="text-[9px] font-mono opacity-50">{((range.hands.length / 169) * 100).toFixed(0)}%</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor Area */}
            <div className="lg:col-span-9 flex flex-col gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                    {isEditingRange ? (
                        <input 
                            type="text" 
                            value={newRangeName}
                            onChange={(e) => setNewRangeName(e.target.value)}
                            className="bg-black border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-poker-gold outline-none w-64"
                            placeholder="Range Name..."
                        />
                    ) : (
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            {selectedRangeId ? ranges.find(r => r.id === selectedRangeId)?.name : 'Range Visualizer'}
                        </h2>
                    )}

                    <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-black rounded-lg border border-zinc-800">
                             <Percent className="w-4 h-4 text-zinc-500" />
                             <span className="text-sm font-mono text-poker-gold font-bold">{percentage}%</span>
                         </div>
                         
                         {isEditingRange ? (
                             <div className="flex gap-2">
                                 <button onClick={() => setIsEditingRange(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                 <button onClick={handleSaveRange} className="px-3 py-1.5 bg-poker-gold text-black rounded-lg text-xs font-bold hover:bg-yellow-500">Save</button>
                             </div>
                         ) : (
                             <div className="flex gap-2">
                                 {selectedRangeId && (
                                     <>
                                        <button onClick={() => handleDeleteRange()} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                        <button onClick={() => setIsEditingRange(true)} className="px-3 py-1.5 bg-zinc-800 text-white rounded-lg text-xs font-bold border border-zinc-700 hover:bg-zinc-700">Edit Range</button>
                                     </>
                                 )}
                             </div>
                         )}
                    </div>
                </div>

                <div className="flex-1 flex justify-center bg-[#050505] rounded-xl border border-zinc-800 p-6 relative">
                     {(!selectedRangeId && !isEditingRange) && (
                         <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm rounded-xl">
                             <div className="text-center">
                                 <Grid3X3 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                 <p className="text-zinc-400 font-bold">Select or Create a Range</p>
                             </div>
                         </div>
                     )}
                     <RangeGrid 
                        selectedHands={currentRangeHands} 
                        onToggle={handleToggleHand} 
                        color={selectedRangeId ? ranges.find(r => r.id === selectedRangeId)?.color : '#3b82f6'}
                     />
                </div>
                
                <div className="flex gap-2 text-[10px] text-zinc-500 justify-center">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#10b981] rounded-full"></div> Selected</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#09090b] border border-zinc-700 rounded-full"></div> Unselected</div>
                </div>
            </div>
        </div>
    );
};

export const ToolsView: React.FC = () => {
    const [activeTool, setActiveTool] = useState<'equity' | 'ranges'>('equity');

    return (
        <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden font-sans">
            <div className="shrink-0 px-8 py-6 border-b border-zinc-800 bg-[#050505]/95 backdrop-blur z-20 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                        <FlaskConical className="text-poker-gold w-6 h-6" /> Lab Tools
                    </h1>
                    <p className="text-zinc-500 text-xs mt-1 font-medium">Advanced Poker Utilities</p>
                </div>
                
                <div className="flex bg-[#121214] p-1 rounded-lg border border-zinc-800">
                    <button
                        onClick={() => setActiveTool('equity')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
                            activeTool === 'equity' 
                            ? 'bg-zinc-800 text-white shadow-sm' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                    >
                        <Calculator className="w-3.5 h-3.5" /> Equity Calc
                    </button>
                    <button
                        onClick={() => setActiveTool('ranges')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
                            activeTool === 'ranges' 
                            ? 'bg-zinc-800 text-white shadow-sm' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                    >
                        <Grid3X3 className="w-3.5 h-3.5" /> Range Manager
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="max-w-[1600px] mx-auto h-full">
                    {activeTool === 'equity' ? <EquityCalculator /> : <RangeManager />}
                </div>
            </div>
        </div>
    );
};