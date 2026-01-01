
import React, { useState, useMemo, useEffect } from 'react';
import { usePoker } from '../App';
import { calculateStats, parseHeroHandDetails } from '../services/statsParser';
import { calculateExploits, generateGTOStrategy } from '../services/solver';
import { PlayerStats, ExploitAdvice, StrategyCell } from '../types';
import { RANKS, getMatrixCell } from '../services/pokerLogic';
import { 
    Grid3X3, Zap, BrainCircuit, Target, Shield, 
    ArrowRight, Lock, Unlock, RefreshCw, Layers, 
    ChevronDown, ChevronUp, AlertTriangle, PlayCircle 
} from 'lucide-react';

// --- Matrix Component ---

const StrategyMatrix: React.FC<{ strategy: Record<string, StrategyCell>, hoverHand: string | null, setHoverHand: (h: string | null) => void }> = ({ strategy, hoverHand, setHoverHand }) => {
    return (
        <div className="aspect-square w-full max-w-[600px] mx-auto bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl relative">
            <div className="grid grid-cols-13 h-full w-full gap-[1px] bg-zinc-950 p-[1px]">
                {Array.from({ length: 13 }).map((_, r) => (
                    Array.from({ length: 13 }).map((_, c) => {
                        const hand = getMatrixCell(r, c);
                        const cell = strategy[hand];
                        const isHovered = hoverHand === hand;

                        // Calculate Gradient based on frequencies
                        // Red = Bet, Green = Check, Blue = Fold
                        const f = cell?.frequencies || { fold: 1, check: 0, betSmall: 0, betLarge: 0 };
                        const foldPct = f.fold * 100;
                        const checkPct = f.check * 100;
                        const betPct = (f.betSmall + f.betLarge) * 100;

                        const background = `linear-gradient(to top, 
                            #3b82f6 ${foldPct}%, 
                            #10b981 ${foldPct}% ${foldPct + checkPct}%, 
                            #ef4444 ${foldPct + checkPct}% 100%)`;

                        return (
                            <div 
                                key={hand}
                                onMouseEnter={() => setHoverHand(hand)}
                                onMouseLeave={() => setHoverHand(null)}
                                className={`relative flex items-center justify-center text-[8px] sm:text-[10px] font-bold cursor-crosshair transition-all duration-75 ${isHovered ? 'z-10 scale-125 shadow-xl ring-1 ring-white' : 'opacity-90'}`}
                                style={{ background }}
                            >
                                <span className="drop-shadow-md text-white mix-blend-difference">{hand}</span>
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
    );
};

// --- Main Solver View ---

export const SolverView: React.FC = () => {
    const { hands, selectedHand } = usePoker();
    
    // State
    const [selectedVillain, setSelectedVillain] = useState<string>('');
    const [boardInput, setBoardInput] = useState<string>('');
    const [street, setStreet] = useState<'Preflop' | 'Flop' | 'Turn' | 'River'>('Flop');
    const [potSize, setPotSize] = useState<number>(100);
    const [hoverHand, setHoverHand] = useState<string | null>(null);
    const [nodeLocks, setNodeLocks] = useState<string[]>([]); // Array of locked tendencies

    // Computed Data
    const villains = useMemo(() => calculateStats(hands).filter(p => p.name !== 'Hero'), [hands]);
    const currentVillainStats = useMemo(() => villains.find(v => v.name === selectedVillain) || villains[0], [villains, selectedVillain]);
    
    const exploits = useMemo(() => {
        if (!currentVillainStats) return [];
        return calculateExploits(currentVillainStats, street, potSize);
    }, [currentVillainStats, street, potSize]);

    const strategy = useMemo(() => {
        // Mock GTO generation based on board state
        const boardCards = boardInput.split(' ').filter(c => c.length >= 2);
        return generateGTOStrategy(boardCards);
    }, [boardInput, street]);

    // Auto-fill from selected hand if available
    useEffect(() => {
        if (selectedHand) {
            const { position } = parseHeroHandDetails(selectedHand);
            // Try to find a villain involved (heuristic: simple regex)
            const villainMatch = selectedHand.rawText.match(/Seat \d+: (.+?) \(/);
            if (villainMatch && villainMatch[1] !== selectedHand.hero) setSelectedVillain(villainMatch[1]);
            
            // Extract board
            const boardMatch = selectedHand.rawText.match(/\[(.*?)\]/g);
            if (boardMatch) {
                const rawBoard = boardMatch.map(b => b.replace(/[\[\]]/g, '')).join(' ');
                setBoardInput(rawBoard);
            }
        }
    }, [selectedHand]);

    return (
        <div className="flex flex-col h-full bg-[#050505] text-zinc-100 overflow-hidden font-sans">
            {/* Header */}
            <div className="shrink-0 h-16 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2 rounded-lg shadow-lg shadow-purple-900/20">
                        <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight leading-none">PRO SOLVER <span className="text-purple-500 text-xs align-top">BETA</span></h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Live GTO + Database Exploit Engine</p>
                    </div>
                </div>
                
                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    {['Preflop', 'Flop', 'Turn', 'River'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStreet(s as any)}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${street === s ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT: Configuration */}
                <div className="w-80 bg-[#080808] border-r border-zinc-800 flex flex-col overflow-y-auto p-5 gap-6 z-10">
                    {/* Villain Select */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Target className="w-3 h-3" /> Opponent
                        </label>
                        <select 
                            value={selectedVillain}
                            onChange={(e) => setSelectedVillain(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-all"
                        >
                            <option value="">Select Villain...</option>
                            {villains.map(v => (
                                <option key={v.name} value={v.name}>{v.name} ({v.handsPlayed} hands)</option>
                            ))}
                        </select>
                        {currentVillainStats && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                    <div className="text-[9px] text-zinc-500">VPIP</div>
                                    <div className="text-sm font-mono font-bold text-white">{currentVillainStats.vpip.toFixed(0)}%</div>
                                </div>
                                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                    <div className="text-[9px] text-zinc-500">PFR</div>
                                    <div className="text-sm font-mono font-bold text-white">{currentVillainStats.pfr.toFixed(0)}%</div>
                                </div>
                                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                    <div className="text-[9px] text-zinc-500">3-Bet</div>
                                    <div className="text-sm font-mono font-bold text-white">{currentVillainStats.threeBet.toFixed(0)}%</div>
                                </div>
                                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                    <div className="text-[9px] text-zinc-500">Fold to CBet</div>
                                    <div className="text-sm font-mono font-bold text-white">{currentVillainStats.foldToCBetFlop.toFixed(0)}%</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Board Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Layers className="w-3 h-3" /> Board Texture
                        </label>
                        <input 
                            type="text" 
                            placeholder="e.g. As Ks 2d"
                            value={boardInput}
                            onChange={(e) => setBoardInput(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-purple-500 transition-all placeholder-zinc-700"
                        />
                    </div>

                    {/* Node Locks */}
                    <div className="space-y-3 pt-4 border-t border-zinc-800">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Lock className="w-3 h-3" /> Node Locking
                        </label>
                        <div className="space-y-2">
                            {['Villain Never Bluffs River', 'Villain Only Calls Draws', 'Villain Overfolds vs Raise'].map(lock => (
                                <button
                                    key={lock}
                                    onClick={() => setNodeLocks(prev => prev.includes(lock) ? prev.filter(l => l !== lock) : [...prev, lock])}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-between ${
                                        nodeLocks.includes(lock) 
                                        ? 'bg-red-950/20 border-red-900/50 text-red-400' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    {lock}
                                    {nodeLocks.includes(lock) && <Lock className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MIDDLE: Matrix Visualization */}
                <div className="flex-1 bg-[#0c0c0c] relative flex flex-col">
                    {/* Hover Info Bar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-full px-6 py-2 shadow-2xl flex items-center gap-6 min-w-[300px] justify-center transition-all duration-200 pointer-events-none"
                         style={{ opacity: hoverHand ? 1 : 0, transform: hoverHand ? 'translate(-50%, 0)' : 'translate(-50%, -20px)' }}>
                        <span className="text-lg font-black text-white font-mono">{hoverHand}</span>
                        {hoverHand && strategy[hoverHand] && (
                            <div className="flex gap-3 text-xs font-bold font-mono">
                                <span className="text-emerald-400">CHECK: {(strategy[hoverHand].frequencies.check * 100).toFixed(0)}%</span>
                                <span className="text-red-400">BET: {((strategy[hoverHand].frequencies.betSmall + strategy[hoverHand].frequencies.betLarge) * 100).toFixed(0)}%</span>
                                <span className="text-blue-400">FOLD: {(strategy[hoverHand].frequencies.fold * 100).toFixed(0)}%</span>
                                <span className="text-zinc-500 border-l border-zinc-700 pl-3">EV: {strategy[hoverHand].ev}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex items-center justify-center p-8">
                        <StrategyMatrix strategy={strategy} hoverHand={hoverHand} setHoverHand={setHoverHand} />
                    </div>

                    {/* Legend */}
                    <div className="h-12 border-t border-zinc-800 bg-zinc-950 flex items-center justify-center gap-8">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Bet / Raise</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Check / Call</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Fold</div>
                    </div>
                </div>

                {/* RIGHT: Live Exploits */}
                <div className="w-96 bg-[#080808] border-l border-zinc-800 flex flex-col z-10">
                    <div className="p-5 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950">
                        <h2 className="text-white font-black flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Zap className="w-4 h-4 text-yellow-400" /> Live Exploits
                        </h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {currentVillainStats ? (
                            exploits.length > 0 ? (
                                exploits.map(exp => (
                                    <div key={exp.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 relative overflow-hidden group hover:border-yellow-500/30 transition-all">
                                        <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            {exp.confidence > 85 && <Shield className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                        
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                exp.action === 'Bet' || exp.action === 'Raise' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {exp.action} {exp.sizing}
                                            </span>
                                        </div>
                                        
                                        <h3 className="text-sm font-bold text-white mb-1">{exp.deviation}</h3>
                                        <p className="text-xs text-zinc-500 mb-3">{exp.villainStat}</p>
                                        
                                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400" style={{ width: `${exp.confidence}%` }}></div>
                                        </div>
                                        <div className="flex justify-between mt-1 text-[9px] font-mono text-zinc-600">
                                            <span>Confidence</span>
                                            <span>{exp.confidence}%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-zinc-500">
                                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-bold">No Major Leaks Found</p>
                                    <p className="text-xs mt-1">Villain is playing balanced stats for this street.</p>
                                    <button className="mt-4 text-xs text-purple-400 font-bold hover:underline">Switch to GTO Mode</button>
                                </div>
                            )
                        ) : (
                            <div className="text-center py-10 text-zinc-500">
                                <p className="text-sm">Select a villain to see exploits.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
