
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { usePoker } from '../App';
import { calculateStats, parseHeroHandDetails } from '../services/statsParser';
import { solveSpot, SolverRequest } from '../services/solver';
import { PlayerStats, ExploitAdvice } from '../types';
import { RANKS, getMatrixCell } from '../services/pokerLogic';
import { 
    Grid3X3, Zap, BrainCircuit, Target, Shield, 
    ArrowRight, Lock, Unlock, RefreshCw, Layers, 
    ChevronDown, ChevronUp, AlertTriangle, PlayCircle, Loader2
} from 'lucide-react';

// --- Types ---
interface SolverState {
    loading: boolean;
    solution: any | null;
    error: string | null;
}

// --- Matrix Component ---

const StrategyMatrix: React.FC<{ rangeGrid: Record<string, number> | undefined, hoverHand: string | null, setHoverHand: (h: string | null) => void }> = ({ rangeGrid, hoverHand, setHoverHand }) => {
    return (
        <div className="aspect-square w-full max-w-[600px] mx-auto bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl relative">
            <div className="grid grid-cols-13 h-full w-full gap-[1px] bg-zinc-950 p-[1px]">
                {Array.from({ length: 13 }).map((_, r) => (
                    Array.from({ length: 13 }).map((_, c) => {
                        const hand = getMatrixCell(r, c);
                        const freq = rangeGrid ? (rangeGrid[hand] || 0) : 0;
                        const isHovered = hoverHand === hand;

                        // Calculate Gradient
                        // Frequency determines opacity/intensity of a "Bet" color (Red) vs Check/Fold (Blue/Grey)
                        // For this basic viz, we use freq as "Action Frequency" (e.g. Bet %)
                        // 0 = Check/Fold (Blue), 1 = Bet/Raise (Red)

                        const color = freq > 0.5
                            ? `rgba(239, 68, 68, ${freq})` // Red for aggressive
                            : `rgba(59, 130, 246, ${1 - freq})`; // Blue for passive

                        return (
                            <div 
                                key={hand}
                                onMouseEnter={() => setHoverHand(hand)}
                                onMouseLeave={() => setHoverHand(null)}
                                className={`relative flex items-center justify-center text-[8px] sm:text-[10px] font-bold cursor-crosshair transition-all duration-75 ${isHovered ? 'z-10 scale-150 shadow-xl ring-1 ring-white bg-zinc-800' : ''}`}
                                style={{ backgroundColor: isHovered ? undefined : color }}
                            >
                                <span className={`drop-shadow-md mix-blend-difference ${freq > 0.3 && freq < 0.7 ? 'text-white' : 'text-zinc-300'}`}>{hand}</span>
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
    
    // Inputs
    const [selectedVillain, setSelectedVillain] = useState<string>('');
    const [boardInput, setBoardInput] = useState<string>('');
    const [heroHand, setHeroHand] = useState<string>('');
    const [potSize, setPotSize] = useState<number>(100);
    const [stackSize, setStackSize] = useState<number>(1000);

    // UI State
    const [solverState, setSolverState] = useState<SolverState>({ loading: false, solution: null, error: null });
    const [hoverHand, setHoverHand] = useState<string | null>(null);

    // Computed Data
    const villains = useMemo(() => calculateStats(hands).filter(p => p.name !== 'Hero'), [hands]);
    const currentVillainStats = useMemo(() => villains.find(v => v.name === selectedVillain) || villains[0], [villains, selectedVillain]);

    // Auto-fill
    useEffect(() => {
        if (selectedHand) {
            const { position, holeCards } = parseHeroHandDetails(selectedHand);
            // Hero Hand
            if (holeCards && holeCards.length === 2) {
                setHeroHand(`${holeCards[0]}${holeCards[1]}`);
            }

            // Try to find a villain
            const villainMatch = selectedHand.rawText.match(/Seat \d+: (.+?) \(/);
            if (villainMatch && villainMatch[1] !== selectedHand.hero) setSelectedVillain(villainMatch[1]);
            
            // Extract board
            const boardMatch = selectedHand.rawText.match(/\[(.*?)\]/g);
            if (boardMatch) {
                const rawBoard = boardMatch.map(b => b.replace(/[\[\]]/g, '')).join(' ');
                setBoardInput(rawBoard);
            }

            // Parse Pot
            const potMatch = selectedHand.rawText.match(/Total pot \$(\d+)/);
            if (potMatch) setPotSize(parseInt(potMatch[1]));
        }
    }, [selectedHand]);

    const handleSolve = async () => {
        setSolverState({ loading: true, solution: null, error: null });
        try {
            const board = boardInput.split(/\s+/).filter(c => c.length >= 2);
            // Basic parsing of hero hand string "AsKh" -> "As", "Kh"
            const h1 = heroHand.slice(0, 2);
            const h2 = heroHand.slice(2, 4);

            const request: SolverRequest = {
                pot: potSize,
                board,
                heroCard1: h1 || 'Ah',
                heroCard2: h2 || 'Kh',
                heroPosition: 'BTN', // Default for now
                villainPosition: 'BB', // Default
                stackSize,
                actions: []
            };

            const result = await solveSpot(request);
            setSolverState({ loading: false, solution: result, error: null });
        } catch (e: any) {
            setSolverState({ loading: false, solution: null, error: e.message || "Solver failed" });
        }
    };

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
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">CheckMath API Integration</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                        <div className={`w-2 h-2 rounded-full ${solverState.loading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-xs font-mono text-zinc-400">{solverState.loading ? 'SOLVING...' : 'READY'}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT: Configuration */}
                <div className="w-80 bg-[#080808] border-r border-zinc-800 flex flex-col overflow-y-auto p-5 gap-6 z-10">
                     <div className="space-y-4">
                         {/* Hand & Board */}
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">My Hand</label>
                                <input
                                    value={heroHand}
                                    onChange={e => setHeroHand(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm font-mono text-center"
                                    placeholder="AhKh"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pot Size</label>
                                <input
                                    type="number"
                                    value={potSize}
                                    onChange={e => setPotSize(Number(e.target.value))}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm font-mono text-center"
                                />
                            </div>
                         </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Board</label>
                            <input
                                value={boardInput}
                                onChange={e => setBoardInput(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm font-mono"
                                placeholder="As Ks 2d"
                            />
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleSolve}
                            disabled={solverState.loading}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-sm shadow-lg hover:shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {solverState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            RUN SOLVER
                        </button>

                        {/* Error Display */}
                        {solverState.error && (
                            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-xs text-red-400">
                                {solverState.error}
                            </div>
                        )}
                    </div>

                    {/* Solution Stats */}
                    {solverState.solution && (
                        <div className="space-y-4 pt-6 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-4">
                            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Optimal Strategy</div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-center">
                                    <div className="text-xs text-zinc-500 mb-1">EV</div>
                                    <div className="text-xl font-black text-white">{solverState.solution.ev.toFixed(2)} BB</div>
                                </div>
                                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-center">
                                    <div className="text-xs text-zinc-500 mb-1">Best Action</div>
                                    <div className="text-lg font-black text-emerald-400 uppercase">{solverState.solution.bestAction}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span>Check</span>
                                    <span>{(solverState.solution.strategy.check * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${solverState.solution.strategy.check * 100}%` }} />
                                </div>

                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span>Bet</span>
                                    <span>{((solverState.solution.strategy.betSmall + solverState.solution.strategy.betBig) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${(solverState.solution.strategy.betSmall + solverState.solution.strategy.betBig) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* MIDDLE: Matrix Visualization */}
                <div className="flex-1 bg-[#0c0c0c] relative flex flex-col">
                    {/* Hover Info Bar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-full px-6 py-2 shadow-2xl flex items-center gap-6 min-w-[200px] justify-center transition-all duration-200 pointer-events-none"
                         style={{ opacity: hoverHand ? 1 : 0, transform: hoverHand ? 'translate(-50%, 0)' : 'translate(-50%, -20px)' }}>
                        <span className="text-lg font-black text-white font-mono">{hoverHand}</span>
                        {solverState.solution?.rangeGrid && hoverHand && (
                            <span className="text-sm font-mono text-emerald-400">
                                Freq: {(solverState.solution.rangeGrid[hoverHand] * 100).toFixed(0)}%
                            </span>
                        )}
                    </div>

                    <div className="flex-1 flex items-center justify-center p-8">
                        {solverState.solution ? (
                            <StrategyMatrix
                                rangeGrid={solverState.solution.rangeGrid}
                                hoverHand={hoverHand}
                                setHoverHand={setHoverHand}
                            />
                        ) : (
                            <div className="text-zinc-600 flex flex-col items-center">
                                <Grid3X3 className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-bold">Enter hand details and run solver</p>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="h-12 border-t border-zinc-800 bg-zinc-950 flex items-center justify-center gap-8">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> High Freq (Bet/Raise)</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Low Freq (Check/Fold)</div>
                    </div>
                </div>

                {/* RIGHT: Villain Stats (Context) */}
                <div className="w-72 bg-[#080808] border-l border-zinc-800 flex flex-col z-10 p-5">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Target className="w-3 h-3" /> Villain Profile
                    </h3>
                    
                    <select
                        value={selectedVillain}
                        onChange={(e) => setSelectedVillain(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-all mb-4"
                    >
                        <option value="">Select Villain...</option>
                        {villains.map(v => (
                            <option key={v.name} value={v.name}>{v.name} ({v.handsPlayed}h)</option>
                        ))}
                    </select>

                    {currentVillainStats && (
                         <div className="space-y-4 p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-400">VPIP</span>
                                <span className="font-mono font-bold text-emerald-400">{currentVillainStats.vpip.toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-400">PFR</span>
                                <span className="font-mono font-bold text-emerald-400">{currentVillainStats.pfr.toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-400">3-Bet</span>
                                <span className="font-mono font-bold text-emerald-400">{currentVillainStats.threeBet.toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-400">Agg Freq</span>
                                <span className="font-mono font-bold text-red-400">{currentVillainStats.aggFreq.toFixed(1)}</span>
                            </div>
                         </div>
                    )}
                </div>

            </div>
        </div>
    );
};
