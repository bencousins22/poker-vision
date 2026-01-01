
import React, { useState, useEffect, useMemo } from 'react';
import { usePoker } from '../App';
import { HandHistory } from '../types';
import { parseHandForReplay } from '../services/handReplayerParser';
import { HandReplayer } from './HandReplayer';
import { BrainCircuit, CheckCircle, XCircle, Trophy, ArrowRight, RefreshCw, Zap } from 'lucide-react';

export const SpotTrainer: React.FC = () => {
    const { hands, addToast, user, setUser } = usePoker();
    const [currentHand, setCurrentHand] = useState<HandHistory | null>(null);
    const [decisionPoint, setDecisionPoint] = useState<number>(0);
    const [correctAction, setCorrectAction] = useState<string>('');
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'decision' | 'result'>('loading');
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [showReplayer, setShowReplayer] = useState(true);

    // Pick a random hand that has Hero action
    const startNewHand = () => {
        if (hands.length < 5) {
            // Need more data
            return;
        }
        
        setGameState('loading');
        setShowReplayer(false);

        // Find a hand with interesting action (Hero bets or raises postflop)
        let attempts = 0;
        let found = false;
        
        while (!found && attempts < 50) {
            const rnd = Math.floor(Math.random() * hands.length);
            const hand = hands[rnd];
            const parsed = parseHandForReplay(hand.rawText);
            
            // Find Hero (assuming first player parsed with cards or just name matching)
            const heroName = hand.hero;
            
            // Find an action index where Hero acts
            const heroActions = parsed.timeline.map((act, idx) => ({ act, idx }))
                .filter(({ act }) => act.player === heroName && act.type === 'action' && act.street !== 'Preflop');
            
            if (heroActions.length > 0) {
                // Pick a random action point (River is best, but Turn ok)
                const targetAction = heroActions[Math.floor(Math.random() * heroActions.length)];
                
                setCurrentHand(hand);
                // Set decision point BEFORE this action happens
                setDecisionPoint(targetAction.idx - 1); 
                setCorrectAction(targetAction.act.actionType || 'check');
                setGameState('playing');
                found = true;
                
                // Allow replayer to reset
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

    // This simulates the Replayer hitting the decision point
    // In a real implementation, HandReplayer would accept a prop `stopAt={decisionPoint}` and `onStop={...}`
    // For this demo, we will simulate the UI overlay
    
    useEffect(() => {
        if (gameState === 'playing') {
            const timer = setTimeout(() => {
                setGameState('decision');
            }, 2500); // Simulate watching the replay for a few seconds
            return () => clearTimeout(timer);
        }
    }, [gameState]);

    const handleGuess = (guess: string) => {
        let isCorrect = false;
        // Normalize guess
        if (guess === 'fold' && correctAction === 'fold') isCorrect = true;
        if (guess === 'check' && correctAction === 'check') isCorrect = true;
        if ((guess === 'bet' || guess === 'raise') && (correctAction === 'bet' || correctAction === 'raise')) isCorrect = true;
        
        if (isCorrect) {
            setScore(s => s + 50 + (streak * 10));
            setStreak(s => s + 1);
            addToast({ title: "Correct!", description: `Hero did indeed ${correctAction}.`, type: 'success' });
            
            // Award XP to user
            if (user) {
                setUser({ ...user, credits: (user.credits || 0) + 1 });
            }
        } else {
            setStreak(0);
            addToast({ title: "Incorrect", description: `Hero actually decided to ${correctAction}.`, type: 'error' });
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
        <div className="flex flex-col h-full max-w-5xl mx-auto p-6 gap-6">
            {/* Header / Scoreboard */}
            <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-poker-gold/10 rounded-xl text-poker-gold">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Spot Trainer</h2>
                        <p className="text-xs text-zinc-400">Predict the Pro's Move</p>
                    </div>
                </div>
                <div className="flex gap-6">
                    <div className="text-center">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Streak</div>
                        <div className="text-xl font-black text-poker-gold flex items-center gap-1">
                            <Zap className="w-4 h-4 fill-current" /> {streak}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Score</div>
                        <div className="text-xl font-black text-white">{score}</div>
                    </div>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-black">
                {/* Background Replayer (Blurred during decision) */}
                <div className={`absolute inset-0 transition-all duration-500 ${gameState === 'decision' || gameState === 'result' ? 'blur-sm scale-[1.02] opacity-50' : ''}`}>
                    {currentHand && showReplayer ? (
                        <HandReplayer hand={currentHand} onAnalyzeSpot={() => {}} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <RefreshCw className="w-8 h-8 text-zinc-600 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Overlay: Decision */}
                {gameState === 'decision' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                        <h3 className="text-3xl font-black text-white mb-2 drop-shadow-lg">What's the Move?</h3>
                        <p className="text-zinc-300 mb-8 font-medium">Hero is facing a decision.</p>
                        
                        <div className="flex gap-4">
                            <button onClick={() => handleGuess('fold')} className="w-32 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl shadow-xl transition-transform hover:scale-105 border border-zinc-600">
                                FOLD
                            </button>
                            <button onClick={() => handleGuess('check')} className="w-32 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl transition-transform hover:scale-105">
                                CHECK/CALL
                            </button>
                            <button onClick={() => handleGuess('raise')} className="w-32 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl shadow-xl transition-transform hover:scale-105">
                                BET/RAISE
                            </button>
                        </div>
                    </div>
                )}

                {/* Overlay: Result */}
                {gameState === 'result' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
                        <div className="mb-6 scale-150">
                            {correctAction === 'fold' ? <XCircle className="w-12 h-12 text-zinc-500" /> : 
                             correctAction === 'check' || correctAction === 'call' ? <CheckCircle className="w-12 h-12 text-blue-500" /> :
                             <Trophy className="w-12 h-12 text-poker-gold" />}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                            Hero chose to <span className="text-poker-gold uppercase">{correctAction}</span>
                        </h3>
                        
                        <div className="max-w-md bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 mb-8 text-center text-sm text-zinc-400">
                            <p>Hand: {currentHand?.summary}</p>
                        </div>

                        <button 
                            onClick={startNewHand}
                            className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                        >
                            Next Hand <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
