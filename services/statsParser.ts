import { HandHistory, PlayerStats, PokerSession, PlayerStyle } from '../types';

export const calculateStats = (hands: HandHistory[]): PlayerStats[] => {
    const playerStatsMap = new Map<string, PlayerStats>();

    // Helper to get or create stats
    const getStats = (name: string): PlayerStats => {
        if (!playerStatsMap.has(name)) {
            playerStatsMap.set(name, {
                name,
                handsPlayed: 0,
                vpip: 0, pfr: 0, af: 0, afq: 0, aggFreq: 0,
                threeBet: 0, fourBet: 0, foldTo3Bet: 0,
                cBetFlop: 0, cBetTurn: 0, cBetRiver: 0,
                foldToCBetFlop: 0, donkBet: 0, checkRaise: 0,
                wtsd: 0, wmsd: 0, wwsf: 0,
                winnings: 0, bb100: 0, sdWinnings: 0, nsdWinnings: 0, stdDevBb: 0,
                style: 'Unknown',
                positionStats: { SB: 0, BB: 0, EP: 0, MP: 0, CO: 0, BTN: 0 },
                positionWinnings: { SB: 0, BB: 0, EP: 0, MP: 0, CO: 0, BTN: 0 },
                actions: {
                    calls: 0, bets: 0, raises: 0, folds: 0, checks: 0,
                    preFlopCalls: 0, preFlopRaises: 0,
                    opportunities: 0, threeBetOpp: 0, cBetOpp: 0, foldTo3BetOpp: 0,
                    showdowns: 0, flopsSeen: 0, flopsWon: 0
                }
            });
        }
        return playerStatsMap.get(name)!;
    };

    hands.forEach(hand => {
        const text = hand.rawText;

        // Identify players
        const seatRegex = /Seat \d+: (.+?) \(\$/g;
        let match;
        const playersInHand = new Set<string>();

        while ((match = seatRegex.exec(text)) !== null) {
            playersInHand.add(match[1]);
        }

        playersInHand.forEach(player => {
            const stats = getStats(player);
            stats.handsPlayed++;

            // Split into streets
            const sections = text.split(/\*\*\* .*? \*\*\*/);
            const preflop = sections[0].split('\n').filter(l => l.startsWith(player + ':'));
            
            let vpip = false;
            let pfr = false;

            preflop.forEach(line => {
                if (line.includes('calls') || line.includes('raises') || line.includes('bets')) vpip = true;
                if (line.includes('raises')) pfr = true;
            });

            if (vpip) stats.actions.preFlopCalls++;
            if (pfr) stats.actions.preFlopRaises++;

            // Simple Winnings
            const collectedRegex = new RegExp(`${player} collected \\$(\\d+)`);
            const collectedMatch = text.match(collectedRegex);
            if (collectedMatch) {
                stats.winnings += parseInt(collectedMatch[1]);
            }
        });
    });

    // Calculate percentages
    return Array.from(playerStatsMap.values()).map(p => {
        const h = p.handsPlayed || 1;
        p.vpip = (p.actions.preFlopCalls / h) * 100;
        p.pfr = (p.actions.preFlopRaises / h) * 100;
        
        // Determine Style
        if (p.vpip < 18 && p.pfr < 15) p.style = 'Nit';
        else if (p.vpip < 25 && p.pfr > 18) p.style = 'TAG';
        else if (p.vpip > 35 && p.pfr > 25) p.style = 'LAG';
        else if (p.vpip > 40 && p.pfr < 10) p.style = 'Station';
        else if (p.vpip > 50) p.style = 'Maniac';
        else p.style = 'Unknown';

        return p;
    });
};

export const parseHeroHandDetails = (hand: HandHistory) => {
    let heroCards: string[] = [];
    let netWin = 0;
    let position = 'Unknown';
    let holeCards: string[] = [];

    if (!hand || !hand.rawText) return { heroCards, holeCards, netWin, position };

    const heroMatch = hand.rawText.match(/Dealt to (\w+) \[(.. ..)\]/);
    if (heroMatch) {
        heroCards = heroMatch[2].split(' ');
        holeCards = heroCards;
    }

    // Try to find pot size and winner
    const winMatch = hand.rawText.match(/collected \$(\d+)/);
    if (winMatch) {
         netWin = parseInt(winMatch[1]);
         // Note: this is gross revenue, not net.
         // Real parsing needs stack sizes before/after.
    }

    // Determine position from Seat info if Button is known
    const btnMatch = hand.rawText.match(/Seat #(\d+) is the button/);
    if (btnMatch) {
        // Logic to determine relative position would go here
        // For now default to Unknown to avoid crash
    }

    return { heroCards, holeCards, netWin, position };
};

export const getHoleCardsKey = (cards: string[]): string => {
    if (!cards || cards.length !== 2) return '';
    const r1 = cards[0][0];
    const r2 = cards[1][0];
    const s1 = cards[0][1];
    const s2 = cards[1][1];
    
    // Sort ranks: A before K before Q...
    const RANKS = "AKQJT98765432";
    if (RANKS.indexOf(r1) < RANKS.indexOf(r2)) {
        return r1 + r2 + (s1 === s2 ? 's' : 'o');
    } else {
        return r2 + r1 + (s1 === s2 ? 's' : 'o');
    }
};

export const calculateSessions = (hands: HandHistory[]): PokerSession[] => {
    if (!hands || hands.length === 0) return [];
    
    // Sort by timestamp asc
    const sorted = [...hands].sort((a, b) => a.timestamp - b.timestamp);
    const sessions: PokerSession[] = [];
    
    // Start first session
    let currentSession: PokerSession = {
        id: crypto.randomUUID(),
        startTime: sorted[0].timestamp,
        endTime: sorted[0].timestamp,
        durationMinutes: 0,
        handsPlayed: 0,
        netWon: 0,
        hourlyRate: 0,
        bb100: 0,
        mostPlayedStakes: sorted[0].stakes,
        hands: []
    };

    sorted.forEach(hand => {
        // Gap check (30 mins)
        if (hand.timestamp - currentSession.endTime > 30 * 60 * 1000) {
            // Close old
            currentSession.durationMinutes = (currentSession.endTime - currentSession.startTime) / 60000;
            sessions.push(currentSession);

            // Start new
            currentSession = {
                id: crypto.randomUUID(),
                startTime: hand.timestamp,
                endTime: hand.timestamp,
                durationMinutes: 0,
                handsPlayed: 0,
                netWon: 0,
                hourlyRate: 0,
                bb100: 0,
                mostPlayedStakes: hand.stakes,
                hands: []
            };
        }

        currentSession.endTime = hand.timestamp;
        currentSession.handsPlayed++;
        currentSession.hands.push(hand.id);
    });

    // Push final
    currentSession.durationMinutes = (currentSession.endTime - currentSession.startTime) / 60000;
    sessions.push(currentSession);

    return sessions.sort((a, b) => b.startTime - a.startTime); // Return newest first
import { HandHistory, PlayerStats, PokerSession } from '../types';

export const calculateStats = (hands: HandHistory[]): PlayerStats[] => {
    // Placeholder returning array
    return [];
};

export const parseHeroHandDetails = (hand: HandHistory) => {
    // Simplified parsing logic
    let heroCards: string[] = [];
    let netWin = 0;
    let position = 'Unknown';
    let holeCards: string[] = [];

    const heroMatch = hand.rawText.match(/Dealt to (\w+) \[(.. ..)\]/);
    if (heroMatch) {
        heroCards = heroMatch[2].split(' ');
        holeCards = heroCards;
    }

    const winMatch = hand.rawText.match(/collected \$(\d+)/);
    if (winMatch) {
         netWin = parseInt(winMatch[1]);
    }

    return { heroCards, holeCards, netWin, position };
};

export const getHoleCardsKey = (cards: string[]): string => {
    if (!cards || cards.length !== 2) return '';
    // Basic implementation: sorts ranks to normalize
    // e.g., ["Ah", "Ks"] -> "AKs" logic would be here
    return cards.join('');
};

export const calculateSessions = (hands: HandHistory[]): PokerSession[] => {
    return [];
};
