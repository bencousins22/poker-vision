
import React, { useState, useEffect, useMemo } from 'react';
import { usePoker } from '../App';
import { HandHistory } from '../types';
import { parseHandForReplay } from '../services/handReplayerParser';
import { HandReplayer } from './HandReplayer';
import { BrainCircuit, CheckCircle, XCircle, Trophy, ArrowRight, RefreshCw, Zap, Target } from 'lucide-react';

export const SpotTrainer: React.FC = () => {
    const { hands, addToast, user, setUser } = usePoker();
    const [currentHand, setCurrentHand] = useState<HandHistory | null>(null);
    const [decisionPoint, setDecisionPoint] = useState<number>(0);
    const [correctAction, setCorrectAction] = useState<string>('');
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'decision' | 'result'>('loading');
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [showReplayer, setShowReplayer] = useState(true);

    const startNewHand = () => {
        if (hands.length < 5) return;
        
        setGameState('loading');
        setShowReplayer(false);

        // Find a hand with interesting action (Hero bets or raises postflop)
        let attempts = 0;
        let found = false;
        
        while (!found && attempts < 50) {
            const rnd = Math.floor(Math.random() * hands.length);
            const hand = hands[rnd];
            const parsed = parseHandForReplay(hand.rawText);
            const heroName = hand.hero;
            
            const heroActions = parsed.timeline.map((act, idx) => ({ act, idx }))
                .filter(({ act }) => act.player === heroName && act.type === 'action' && act.street !== 'Preflop');
            
            if (heroActions.length > 0) {
                const targetAction = heroActions[Math.floor(Math.random() * heroActions.length)];
                
                setCurrentHand(hand);
                setDecisionPoint(targetAction.idx - 1); 
                setCorrectAction(targetAction.act.actionType || 'check');
                setGameState('playing');
                found = true;
                setTimeout(() => setShowReplayer(true), 100);
            }
            attempts++;
        }
    };

    useEffect(() => {
        if (hands.length > 0 && !currentHand) {
            startNewHand();
        }
    }, [hands]);

    // Simulate Replayer reaching decision point
    useEffect(() => {
        if (gameState === 'playing') {
            const timer = setTimeout(() => {
                setGameState('decision');
            }, 2000); 
            return () => clearTimeout(timer);
        }
    }, [gameState]);

    const handleGuess = (guess: string) => {
        let isCorrect = false;
        if (guess === 'fold' && correctAction === 'fold') isCorrect = true;
        if (guess === 'check' && (correctAction === 'check' || correctAction === 'call')) isCorrect = true;
        if ((guess === 'bet' || guess === 'raise') && (correctAction === 'bet' || correctAction === 'raise')) isCorrect = true;
        
        if (isCorrect) {
            setScore(s => s + 50 + (streak * 10));
            setStreak(s => s + 1);
            if (user) setUser({ ...user, credits: (user.credits || 0) + 1 });
        } else {
            setStreak(0);
        }
        setGameState('result');
    };

    if (hands.length < 5) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                <BrainCircuit className="w-16 h-16 opacity-20" />
                <p>Import at least 5 hands to start training.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto p-6 gap-6">
            {/* Header / Scoreboard */}
            <div className="flex items-center justify-between bg-zinc-900/80 backdrop-blur p-4 rounded-2xl border border-zinc-800 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-poker-gold/10 rounded-xl text-poker-gold border border-poker-gold/20">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Spot Trainer</h2>
                        <p className="text-xs text-zinc-400 font-medium">Predict the Pro's Move</p>
                    </div>
                </div>
                <div className="flex gap-8">
                    <div className="text-center">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Streak</div>
                        <div className={`text-2xl font-black flex items-center gap-1 justify-center ${streak > 2 ? 'text-poker-gold animate-pulse' : 'text-zinc-300'}`}>
                            <Zap className="w-4 h-4 fill-current" /> {streak}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Score</div>
                        <div className="text-2xl font-black text-white">{score.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative rounded-3xl overflow-hidden border-[8px] border-zinc-800 shadow-2xl bg-black">
                {/* Background Replayer */}
                <div className={`absolute inset-0 transition-all duration-700 ${gameState === 'decision' || gameState === 'result' ? 'blur-md scale-105 opacity-40' : ''}`}>
                    {currentHand && showReplayer ? (
                        <HandReplayer hand={currentHand} onAnalyzeSpot={() => {}} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <RefreshCw className="w-10 h-10 text-zinc-600 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Overlay: Decision */}
                {gameState === 'decision' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 animate-in fade-in zoom-in-95 duration-300">
                        <h3 className="text-4xl font-black text-white mb-2 drop-shadow-lg tracking-tight">What's the Move?</h3>
                        <p className="text-zinc-200 mb-12 font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">Hero is facing action</p>
                        
                        <div className="flex gap-6 w-full max-w-2xl px-6">
                            <button onClick={() => handleGuess('fold')} className="flex-1 py-8 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white font-black text-xl rounded-2xl shadow-2xl transition-all hover:scale-105 border-2 border-zinc-700 hover:border-zinc-500 flex flex-col items-center gap-2 group">
                                <XCircle className="w-8 h-8 group-hover:text-red-400 transition-colors" />
                                FOLD
                            </button>
                            <button onClick={() => handleGuess('check')} className="flex-1 py-8 bg-blue-900/90 hover:bg-blue-800 text-blue-100 hover:text-white font-black text-xl rounded-2xl shadow-2xl transition-all hover:scale-105 border-2 border-blue-700 hover:border-blue-500 flex flex-col items-center gap-2 group">
                                <CheckCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                CHECK / CALL
                            </button>
                            <button onClick={() => handleGuess('raise')} className="flex-1 py-8 bg-red-900/90 hover:bg-red-800 text-red-100 hover:text-white font-black text-xl rounded-2xl shadow-2xl transition-all hover:scale-105 border-2 border-red-700 hover:border-red-500 flex flex-col items-center gap-2 group">
                                <Trophy className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                BET / RAISE
                            </button>
                        </div>
                    </div>
                )}

                {/* Overlay: Result */}
                {gameState === 'result' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
                        <div className={`mb-6 p-6 rounded-full border-4 shadow-2xl scale-125 ${
                            correctAction === 'fold' ? 'bg-zinc-800 border-zinc-600' :
                            correctAction === 'check' || correctAction === 'call' ? 'bg-blue-900/50 border-blue-500' :
                            'bg-red-900/50 border-red-500'
                        }`}>
                            {correctAction === 'fold' ? <XCircle className="w-16 h-16 text-zinc-400" /> : 
                             correctAction === 'check' || correctAction === 'call' ? <CheckCircle className="w-16 h-16 text-blue-400" /> :
                             <Trophy className="w-16 h-16 text-poker-gold" />}
                        </div>
                        
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight">
                            Hero chose to <span className={`uppercase px-2 rounded ${
                                correctAction === 'fold' ? 'bg-zinc-800 text-zinc-300' :
                                correctAction === 'check' || correctAction === 'call' ? 'bg-blue-900 text-blue-300' :
                                'bg-red-900 text-red-300'
                            }`}>{correctAction}</span>
                        </h3>
                        
                        <div className="max-w-md bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 mb-10 text-center text-sm text-zinc-400 shadow-xl">
                            <p className="font-mono text-xs">{currentHand?.summary}</p>
                        </div>

                        <button 
                            onClick={startNewHand}
                            className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-zinc-200 text-black font-black text-lg rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                            Next Hand <ArrowRight className="w-5 h-5 stroke-[3px]" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
