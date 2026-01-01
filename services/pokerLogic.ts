
import { PlayerStats } from '../types';

// Utility functions for Poker Logic, Equity Approximations, and Range Management

export const RANKS = "AKQJT98765432";
export const SUITS = ['s', 'h', 'd', 'c']; // Spades, Hearts, Diamonds, Clubs

// Generate all 169 starting hands grid (13x13)
// Diagonal is Pairs (AA, KK...), Top Right is Suited (AKs), Bottom Left is Offsuit (AKo)
export const getMatrixCell = (row: number, col: number) => {
    const r1 = RANKS[row];
    const r2 = RANKS[col];
    if (row === col) return `${r1}${r2}`; // Pair
    if (row < col) return `${r1}${r2}s`; // Suited
    return `${r2}${r1}o`; // Offsuit
};

// Basic Equity Estimator (Rule of 2 and 4 with Variance for Graphing)
// This is a simplified client-side estimator for the demo.
export const calculateApproxEquity = (
    heroCards: string[], 
    villainInput: string[] | string[], // Can be specific cards OR list of hand keys (Range)
    board: string[],
    isVillainRange: boolean = false
): { hero: number, villain: number, split: number } => {
    
    // 1. Preflop / Range Logic
    if (isVillainRange || board.length === 0) {
        // Heuristic: Estimate equity based on Hero Hand Strength vs Avg Range Strength
        // This is a simulation for UI demonstration purposes
        
        const rangeSize = villainInput.length;
        const tightness = Math.max(0, 100 - (rangeSize / 169 * 100)); // 0-100 score
        
        // Mock Hero Strength
        let heroStrength = 50;
        if (heroCards.length === 2) {
            const r1 = RANKS.indexOf(heroCards[0][0]);
            const r2 = RANKS.indexOf(heroCards[1][0]);
            heroStrength = 100 - ((r1 + r2) * 3);
            if (heroCards[0][0] === heroCards[1][0]) heroStrength += 20; // Pair bonus
            // Suited bonus
            if (heroCards[0][1] === heroCards[1][1]) heroStrength += 5;
        }

        // Base equity
        let eq = 50 + (heroStrength - (tightness * 0.8)) / 2;
        
        // Refine with board if present
        if (board.length > 0) {
             const heroStr = heroCards.join('');
             const boardStr = board.join('');
             
             // Simple Hit Detection Simulation for Graph
             let hits = 0;
             heroCards.forEach(c => {
                 if (boardStr.includes(c[0])) hits += 20; // Pair hit
             });
             // Flush draw detection (simple)
             const suits = (heroStr + boardStr).match(/[shdc]/g) || [];
             const suitCounts: any = {};
             suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
             if (Object.values(suitCounts).some((c: any) => c >= 4)) hits += 15;

             eq += hits;
        }
        
        eq = Math.max(5, Math.min(95, eq));
        return { hero: eq, villain: 100 - eq, split: 0 };
    }

    // 2. Specific Hand vs Specific Hand Post-flop (Legacy / Simple Mode)
    // Post-flop: Simulated deterministic result based on card hash to keep graph stable
    const seed = heroCards.join('') + (villainInput as string[]).join('') + board.join('');
    const pseudoRandom = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;
    
    // Create variance based on board texture length to simulate street progression confidence
    const confidence = 50 + (board.length * 10); 
    const skew = (pseudoRandom / 100) * confidence;
    
    let heroEq = Math.min(Math.max(skew, 5), 95);
    let villEq = 100 - heroEq;
    
    return { hero: heroEq, villain: villEq, split: 0 };
};

export const DEFAULT_RANGES = [
    {
        id: 'rfi_utg_6max',
        name: 'UTG Open (6-Max)',
        description: 'Standard 15% Opening Range. Tight & Aggressive.',
        color: '#10b981', // Emerald
        hands: [
            'AA','KK','QQ','JJ','TT','99','88','77','66','55',
            'AKs','AQs','AJs','ATs','A9s','A8s','A5s','A4s',
            'KQs','KJs','KTs','QJs','QTs','JTs','T9s','98s','87s',
            'AKo','AQo','AJo','KQo'
        ]
    },
    {
        id: 'rfi_mp_6max',
        name: 'MP Open (6-Max)',
        description: 'Standard 19% Opening Range. Adding suited broadways.',
        color: '#3b82f6', // Blue
        hands: [
            'AA','KK','QQ','JJ','TT','99','88','77','66','55',
            'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s',
            'KQs','KJs','KTs','K9s','QJs','QTs','Q9s','JTs','J9s','T9s','98s','87s','76s',
            'AKo','AQo','AJo','ATo','KQo','KJo'
        ]
    },
    {
        id: 'rfi_co_6max',
        name: 'CO Open (6-Max)',
        description: 'Loose 26% Opening Range. Stealing potential.',
        color: '#8b5cf6', // Violet
        hands: [
            'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
            'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
            'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','QJs','QTs','Q9s','Q8s',
            'JTs','J9s','J8s','T9s','T8s','98s','87s','76s','65s','54s',
            'AKo','AQo','AJo','ATo','A9o','KQo','KJo','KTo','QJo','QTo','JTo'
        ]
    },
    {
        id: 'rfi_btn_6max',
        name: 'BTN Open (6-Max)',
        description: 'Wide 45% Opening Range. Positional advantage.',
        color: '#fbbf24', // Gold
        hands: [
            'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
            'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
            'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
            'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
            'JTs','J9s','J8s','J7s','J6s','T9s','T8s','T7s','T6s','98s','97s','96s','87s','86s','76s','75s','65s','64s','54s','43s',
            'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
            'KQo','KJo','KTo','K9o','K8o','K7o','QJo','QTo','Q9o','Q8o','JTo','J9o','J8o','T9o','T8o','98o','87o'
        ]
    },
    {
        id: 'bb_def_vs_btn',
        name: 'BB Defend vs BTN',
        description: 'Calling/3-betting range from Big Blind.',
        color: '#ef4444', // Red
        hands: [
            'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
            'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
            'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
            'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
            'JTs','J9s','J8s','J7s','J6s','T9s','T8s','T7s','98s','97s','87s','86s','76s','75s','65s','54s',
            'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o',
            'KQo','KJo','KTo','K9o','K8o','QJo','QTo','Q9o','JTo','J9o','T9o'
        ]
    }
];

// --- Leak Detection Engine ---

export interface Leak {
    id: string;
    title: string;
    severity: 'critical' | 'major' | 'minor' | 'good';
    metric: string;
    currentVal: number;
    targetVal: string;
    description: string;
    advice: string;
}

const BENCHMARKS = {
    vpip: { min: 21, max: 28, label: 'Voluntarily Put Money In Pot' },
    pfr: { min: 16, max: 23, label: 'Pre-Flop Raise' },
    threeBet: { min: 6, max: 11, label: '3-Bet Percentage' },
    af: { min: 1.8, max: 3.5, label: 'Aggression Factor' },
    cbet: { min: 55, max: 75, label: 'Continuation Bet' },
    wtsd: { min: 25, max: 32, label: 'Went to Showdown' }
};

export const analyzeLeaks = (stats: PlayerStats): Leak[] => {
    const leaks: Leak[] = [];

    // 1. VPIP Analysis
    if (stats.vpip > 35) {
        leaks.push({
            id: 'vpip_high', title: 'Too Loose Preflop', severity: stats.vpip > 45 ? 'critical' : 'major',
            metric: 'VPIP', currentVal: stats.vpip, targetVal: '21-28%',
            description: `You are playing ${stats.vpip.toFixed(1)}% of hands. This is significantly wider than optimal ranges.`,
            advice: 'Fold more weak offsuit hands (KJo, QTo, A9o) from early position. Stick to a stricter opening chart.'
        });
    } else if (stats.vpip < 18) {
        leaks.push({
            id: 'vpip_low', title: 'Too Tight / Nit', severity: 'major',
            metric: 'VPIP', currentVal: stats.vpip, targetVal: '21-28%',
            description: `You are only playing ${stats.vpip.toFixed(1)}% of hands. You are missing profitable opening opportunities.`,
            advice: 'Open up your range on the Button and Cutoff. Steal the blinds more aggressively.'
        });
    } else {
        leaks.push({ id: 'vpip_ok', title: 'Solid VPIP', severity: 'good', metric: 'VPIP', currentVal: stats.vpip, targetVal: '21-28%', description: 'Your hand selection frequency is solid.', advice: 'Maintain this frequency.' });
    }

    // 2. PFR Gap (VPIP - PFR)
    const gap = stats.vpip - stats.pfr;
    if (gap > 8) {
        leaks.push({
            id: 'pfr_gap', title: 'Passive Preflop (Limp/Calling)', severity: gap > 12 ? 'critical' : 'major',
            metric: 'Gap', currentVal: gap, targetVal: '< 6%',
            description: `There is a ${gap.toFixed(1)}% gap between your VPIP and PFR. You are calling too often instead of raising.`,
            advice: 'If a hand is good enough to play, it is usually good enough to raise. Avoid open-limping.'
        });
    }

    // 3. 3-Bet
    if (stats.threeBet < 4) {
        leaks.push({
            id: '3bet_low', title: 'Passive 3-Bettor', severity: 'major',
            metric: '3Bet', currentVal: stats.threeBet, targetVal: '6-10%',
            description: 'You are rarely re-raising preflop without a monster hand.',
            advice: 'Start adding light 3-bets with suited connectors (89s, TJs) or suited wheel aces (A4s, A5s) in position.'
        });
    }

    // 4. Aggression Factor
    if (stats.af < 1.5) {
        leaks.push({
            id: 'af_low', title: 'Calling Station', severity: 'critical',
            metric: 'AF', currentVal: stats.af, targetVal: '> 2.0',
            description: 'You call way more than you bet or raise postflop.',
            advice: 'Stop calling with marginal hands. Either raise for value/bluff or fold. Calling rarely wins pots.'
        });
    }

    // 5. WTSD
    if (stats.wtsd > 35) {
        leaks.push({
            id: 'wtsd_high', title: 'Over-calling Rivers', severity: 'major',
            metric: 'WTSD', currentVal: stats.wtsd, targetVal: '25-30%',
            description: 'You are going to showdown too often, likely paying off value bets.',
            advice: 'Believe the story. When an opponent fires 3 barrels, top pair weak kicker is usually no good.'
        });
    }

    return leaks;
};
