
import { PlayerStats, ExploitAdvice, StrategyCell, SolverSolution } from '../types';
import { getMatrixCell } from './pokerLogic';

// --- Deterministic Exploit Engine ---

export const calculateExploits = (villain: PlayerStats, street: string, pot: number): ExploitAdvice[] => {
    const advice: ExploitAdvice[] = [];

    // 1. Preflop Exploits
    if (street === 'Preflop') {
        if (villain.foldTo3Bet > 65) {
            advice.push({
                id: 'overfold_3bet',
                villainStat: `Fold to 3-Bet: ${villain.foldTo3Bet.toFixed(0)}%`,
                deviation: 'Villain overfolds to 3-bets.',
                confidence: 90,
                action: 'Raise',
                sizing: '3x - 4x'
            });
        }
        if (villain.vpip > 40 && villain.pfr < 10) {
            advice.push({
                id: 'fish_limp',
                villainStat: `VPIP ${villain.vpip}% / PFR ${villain.pfr}%`,
                deviation: 'Villain is a calling station.',
                confidence: 95,
                action: 'Raise',
                sizing: 'Isolate Larger (4bb+)'
            });
        }
    }

    // 2. Postflop - CBetting
    if (villain.foldToCBetFlop > 60) {
        advice.push({
            id: 'overfold_cbet',
            villainStat: `Fold to Flop CBet: ${villain.foldToCBetFlop.toFixed(0)}%`,
            deviation: 'Villain plays "Fit or Fold".',
            confidence: 85,
            action: 'Bet',
            sizing: '33% Pot (Any two cards)'
        });
    }

    // 3. Postflop - Aggression
    if (villain.af < 1.0 && street !== 'Preflop') {
        advice.push({
            id: 'passive_af',
            villainStat: `Aggression Factor: ${villain.af.toFixed(1)}`,
            deviation: 'Villain is extremely passive.',
            confidence: 80,
            action: 'Fold',
            sizing: 'Respect all raises'
        });
    }

    // 4. Showdown
    if (villain.wtsd > 35) {
        advice.push({
            id: 'calling_station',
            villainStat: `WTSD: ${villain.wtsd.toFixed(0)}%`,
            deviation: 'Villain calls down too light.',
            confidence: 90,
            action: 'Bet',
            sizing: 'Value Bet Thin / NO BLUFFS'
        });
    }

    return advice;
};

// --- GTO Simulation (Mock/Heuristic) ---
// In a real app, this would call a solver API (Pio/GTO Wizard)
// Here we procedurally generate a plausible GTO strategy matrix based on board texture.

export const generateGTOStrategy = (board: string[]): Record<string, StrategyCell> => {
    const strategy: Record<string, StrategyCell> = {};
    
    // Simple heuristic for board texture
    const isWet = board.length >= 3 && (
        board.join('').match(/[shdc]/g)?.length! >= 3 || // Flush possible
        ['9','T','J','Q','K','A'].filter(r => board.join('').includes(r)).length >= 3 // Broadways
    );

    for (let i = 0; i < 13; i++) {
        for (let j = 0; j < 13; j++) {
            const hand = getMatrixCell(i, j);
            
            // Randomize slightly to look like a solver, but bias based on hand strength logic
            // Pair logic
            let ev = 0;
            let checkFreq = 0.5;
            let betFreq = 0.5;
            
            if (i === j) { // Pocket Pair
                if (i < 3) { ev = 50; betFreq = 0.8; checkFreq = 0.2; } // AA, KK, QQ
                else if (i > 8) { ev = 5; betFreq = 0.1; checkFreq = 0.9; } // 22-66
            } else if (i < j) { // Suited
                if (i < 2 && j < 5) { ev = 30; betFreq = 0.6; checkFreq = 0.4; } // High Suited
                else { ev = -5; betFreq = 0.2; checkFreq = 0.3; } // Trash suited
            } else { // Offsuit
                ev = -10; betFreq = 0.1; checkFreq = 0.2; // Mostly fold/check
            }

            // Adjust for wet board (Check more often oop generally in GTO)
            if (isWet) {
                checkFreq += 0.2;
                betFreq -= 0.2;
            }

            // Normalize
            const totalAction = checkFreq + betFreq;
            const foldFreq = Math.max(0, 1 - totalAction);

            strategy[hand] = {
                hand,
                ev: parseFloat(ev.toFixed(2)),
                frequencies: {
                    fold: foldFreq,
                    check: checkFreq,
                    call: 0,
                    betSmall: betFreq * 0.4,
                    betLarge: betFreq * 0.6,
                    raise: 0
                }
            };
        }
    }
    return strategy;
};
