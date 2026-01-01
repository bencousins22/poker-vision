
import { HandHistory, PlayerStats, PlayerStyle, PokerSession } from '../types';

// Helper to determine player style based on stats
const determineStyle = (vpip: number, pfr: number, af: number): PlayerStyle => {
  if (vpip < 15 && pfr < 10) return 'Nit';
  if (vpip < 22 && pfr >= 15 && af >= 2) return 'TAG'; // Tight Aggressive
  if (vpip >= 25 && pfr >= 20 && af >= 2.5) return 'LAG'; // Loose Aggressive
  if (vpip > 40 && pfr < 10 && af < 1.5) return 'Station'; // Calling Station
  if (vpip > 50 && pfr > 30 && af > 3) return 'Maniac';
  if (vpip < 25 && pfr < 15) return 'Rock';
  return 'Unknown';
};

const initPlayer = (name: string, map: Map<string, PlayerStats>) => {
    if (!map.has(name)) {
      map.set(name, {
        name,
        handsPlayed: 0,
        vpip: 0, pfr: 0, af: 0, afq: 0, threeBet: 0, fourBet: 0, foldTo3Bet: 0,
        cBetFlop: 0, cBetTurn: 0, cBetRiver: 0, foldToCBetFlop: 0, donkBet: 0, checkRaise: 0,
        wtsd: 0, wmsd: 0, wwsf: 0,
        winnings: 0, bb100: 0, sdWinnings: 0, nsdWinnings: 0, stdDevBb: 0,
        style: 'Unknown',
        positionStats: { SB: 0, BB: 0, EP: 0, MP: 0, CO: 0, BTN: 0 },
        positionWinnings: { SB: 0, BB: 0, EP: 0, MP: 0, CO: 0, BTN: 0 },
        actions: { 
            calls: 0, bets: 0, raises: 0, folds: 0, checks: 0, 
            preFlopCalls: 0, preFlopRaises: 0, opportunities: 0,
            threeBetOpp: 0, cBetOpp: 0, foldTo3BetOpp: 0,
            showdowns: 0, flopsSeen: 0, flopsWon: 0
        }
      });
    }
};

const extractStakes = (text: string): number => {
    const match = text.match(/\(\$([\d.]+)\/\$([\d.]+)/);
    if (match) return parseFloat(match[2]); // Return BB amount
    return 200; // Default if not found
};

// --- NEW HELPER: Get Hand Matrix Key (e.g. "AKs", "JTo") ---
export const getHoleCardsKey = (cards: string[]): string | null => {
    if (!cards || cards.length !== 2) return null;
    
    const r1 = cards[0].slice(0, -1);
    const s1 = cards[0].slice(-1);
    const r2 = cards[1].slice(0, -1);
    const s2 = cards[1].slice(-1);

    const ranks = "AKQJT98765432";
    const i1 = ranks.indexOf(r1);
    const i2 = ranks.indexOf(r2);

    if (i1 === -1 || i2 === -1) return null;

    // Sort so higher rank is first
    const [high, low] = i1 <= i2 ? [r1, r2] : [r2, r1];
    
    if (r1 === r2) return `${r1}${r2}`; // Pair
    if (s1 === s2) return `${high}${low}s`; // Suited
    return `${high}${low}o`; // Offsuit
};

export const parseHeroHandDetails = (hand: HandHistory) => {
    // Basic regex extraction for specific hand details
    const lines = hand.rawText.split('\n');
    const heroLine = lines.find(l => l.includes('Dealt to'));
    let heroCards: string[] = [];
    if (heroLine) {
        const match = heroLine.match(/\[(.*?)\]/);
        if (match) heroCards = match[1].split(' ');
    }

    // Determine Net Win/Loss for filtering
    let netWin = 0;
    const heroName = hand.hero;
    
    let investment = 0;
    lines.forEach(l => {
        if (l.startsWith(heroName)) {
            const amtMatch = l.match(/\$([\d,]+)/);
            if (amtMatch && (l.includes('bets') || l.includes('calls') || l.includes('raises') || l.includes('posts'))) {
                investment += parseInt(amtMatch[1].replace(/,/g, ''));
            }
        }
    });

    const winLine = lines.find(l => l.includes(`${heroName} collected`) || l.includes(`${heroName} won`));
    if (winLine) {
        const match = winLine.match(/\(\$([\d,]+)\)/);
        if (match) {
            const wonAmount = parseInt(match[1].replace(/,/g, ''));
            netWin = wonAmount - investment;
        }
    } else {
        netWin = -investment;
    }

    // Determine Position (BTN/SB/BB/EP/MP/CO)
    let buttonSeat = 1;
    const btnLine = lines.find(l => l.includes('is the button'));
    if (btnLine) buttonSeat = parseInt(btnLine.match(/Seat #(\d+)/)?.[1] || '1');
    
    let heroSeat = 0;
    const seatLine = lines.find(l => l.includes(`: ${heroName} (`));
    if (seatLine) heroSeat = parseInt(seatLine.match(/Seat (\d+):/)?.[1] || '0');

    let position = 'MP'; // Default
    if (heroSeat > 0) {
        const dist = (heroSeat - buttonSeat + 9) % 9;
        if (dist === 0) position = 'BTN';
        else if (dist === 1) position = 'SB';
        else if (dist === 2) position = 'BB';
        else if (dist === 3 || dist === 4) position = 'EP';
        else if (dist === 5 || dist === 6) position = 'MP';
        else if (dist === 7 || dist === 8) position = 'CO'; 
    }

    return { heroCards, netWin, position };
};

const processHandText = (hand: HandHistory, playerMap: Map<string, PlayerStats>, handResults: Map<string, number[]>) => {
    const lines = hand.rawText.split('\n');
    const bbAmount = extractStakes(hand.stakes);

    // 1. Identify Players & Positions
    const playersInHand = new Set<string>();
    const positions = new Map<string, string>();
    let buttonSeat = 1;

    // Find button
    const btnLine = lines.find(l => l.includes('is the button'));
    if (btnLine) buttonSeat = parseInt(btnLine.match(/Seat #(\d+)/)?.[1] || '1');

    lines.forEach(line => {
        const match = line.match(/^Seat (\d+): (.+?) \(\$/);
        if (match) {
            const seat = parseInt(match[1]);
            const name = match[2];
            initPlayer(name, playerMap);
            playersInHand.add(name);
            
            // Calculate Position
            const dist = (seat - buttonSeat + 9) % 9;
            let pos = 'MP';
            if (dist === 0) pos = 'BTN';
            else if (dist === 1) pos = 'SB';
            else if (dist === 2) pos = 'BB';
            else if (dist === 3 || dist === 4) pos = 'EP';
            else if (dist === 7 || dist === 8) pos = 'CO';
            positions.set(name, pos);
        }
    });

    // 2. Track Action State
    let street = 'PREFLOP';
    let aggressor = ''; 
    let preflopRaises = 0;
    const wentToShowdown = new Set<string>();
    const investments = new Map<string, number>();

    lines.forEach(line => {
        if (line.includes('*** FLOP ***')) { street = 'FLOP'; }
        if (line.includes('*** TURN ***')) { street = 'TURN'; }
        if (line.includes('*** RIVER ***')) { street = 'RIVER'; }
        if (line.includes('*** SHOWDOWN ***')) { street = 'SHOWDOWN'; }
        if (line.includes('*** SUMMARY ***')) { street = 'SUMMARY'; }

        // Action Parsing
        if (line.includes(':') && !line.startsWith('Seat') && !line.startsWith('Total pot')) {
            const parts = line.split(':');
            const name = parts[0].trim();
            const action = parts.slice(1).join(':').toLowerCase();
            const stats = playerMap.get(name);

            // Track Money In
            const amtMatch = action.match(/\$([\d,]+)/);
            if (amtMatch) {
                const amt = parseInt(amtMatch[1].replace(/,/g, ''));
                investments.set(name, (investments.get(name) || 0) + amt);
            }

            if (stats && street !== 'SUMMARY') {
                if (street === 'PREFLOP') {
                    if (action.includes('raises')) {
                        stats.actions.raises++;
                        stats.actions.preFlopRaises++;
                        preflopRaises++;
                        aggressor = name;
                        if (preflopRaises >= 2) stats.threeBet++; 
                    } else if (action.includes('calls')) {
                        stats.actions.calls++;
                        stats.actions.preFlopCalls++;
                    } else if (action.includes('folds')) {
                        stats.actions.folds++;
                    }
                } 
                else if (['FLOP', 'TURN', 'RIVER'].includes(street)) {
                    if (action.includes('bets')) {
                        stats.actions.bets++;
                        if (name === aggressor && street === 'FLOP') stats.cBetFlop++;
                        aggressor = name;
                    } else if (action.includes('raises')) {
                        stats.actions.raises++;
                        aggressor = name;
                    } else if (action.includes('calls')) {
                        stats.actions.calls++;
                    }
                } else if (street === 'SHOWDOWN') {
                    if (action.includes('shows') || action.includes('mucks')) {
                        wentToShowdown.add(name);
                    }
                }
            }
        }

        // Summary / Winnings Parsing
        if (street === 'SUMMARY' && line.startsWith('Seat')) {
            const winMatch = line.match(/Seat \d+: (.+) (won|collected) \(\$([\d,]+)\)/);
            if (winMatch) {
                const name = winMatch[1].trim();
                const amount = parseInt(winMatch[3].replace(/,/g, ''), 10);
                const p = playerMap.get(name);
                if (p) {
                    const invest = investments.get(name) || 0;
                    const net = amount - invest;
                    p.winnings += net;
                    
                    const pos = positions.get(name) as keyof typeof p.positionWinnings;
                    if (pos) p.positionWinnings[pos] += net;

                    // Track result in BB for StdDev
                    const bbResult = net / bbAmount;
                    if (!handResults.has(name)) handResults.set(name, []);
                    handResults.get(name)?.push(bbResult);

                    if (wentToShowdown.has(name)) {
                        p.sdWinnings += net;
                        p.wmsd++;
                    } else {
                        p.nsdWinnings += net;
                    }
                    p.actions.flopsWon++;
                }
            } else if (line.includes('folded')) {
                // Determine loss for losers
                const match = line.match(/Seat \d+: (.+) folded/);
                if (match) {
                    const name = match[1].trim();
                    const p = playerMap.get(name);
                    if (p) {
                        const invest = investments.get(name) || 0;
                        const net = -invest;
                        p.winnings += net;
                        
                        const pos = positions.get(name) as keyof typeof p.positionWinnings;
                        if (pos) p.positionWinnings[pos] += net;

                        const bbResult = net / bbAmount;
                        if (!handResults.has(name)) handResults.set(name, []);
                        handResults.get(name)?.push(bbResult);

                        p.nsdWinnings += net;
                    }
                }
            }
        }
    });

    // End of Hand Updates
    playersInHand.forEach(name => {
        const p = playerMap.get(name)!;
        p.handsPlayed++;
        if (wentToShowdown.has(name)) p.wtsd++;
        
        // Track Positional Counts
        const pos = positions.get(name) as keyof typeof p.positionStats;
        if (pos && p.positionStats[pos] !== undefined) {
            p.positionStats[pos]++;
        }
    });
};

const calculateStandardDeviation = (results: number[]): number => {
    if (results.length < 2) return 0;
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const variance = results.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (results.length - 1);
    return Math.sqrt(variance);
};

const calculateFinalStats = (playerMap: Map<string, PlayerStats>, handResults: Map<string, number[]>): PlayerStats[] => {
    return Array.from(playerMap.values()).map(p => {
        const hp = p.handsPlayed || 1;
        
        p.vpip = ((p.actions.preFlopCalls + p.actions.preFlopRaises) / hp) * 100;
        p.pfr = (p.actions.preFlopRaises / hp) * 100;
        
        const aggMoves = p.actions.bets + p.actions.raises;
        p.af = p.actions.calls > 0 ? aggMoves / p.actions.calls : aggMoves;
        const totalActions = aggMoves + p.actions.calls + p.actions.folds;
        p.afq = totalActions > 0 ? (aggMoves / totalActions) * 100 : 0;

        p.wtsd = (p.wtsd / hp) * 100;
        p.wmsd = p.wtsd > 0 ? (p.wmsd / (p.wtsd/100 * hp)) * 100 : 0;
        p.wwsf = (p.actions.flopsWon / hp) * 100;

        // BB/100 (Placeholder calculation)
        p.bb100 = (p.winnings / 200) * (100 / hp); 
        
        const results = handResults.get(p.name) || [];
        p.stdDevBb = calculateStandardDeviation(results);

        p.style = determineStyle(p.vpip, p.pfr, p.af);
        
        return p;
    }).sort((a, b) => b.handsPlayed - a.handsPlayed);
};

export const calculateStats = (hands: HandHistory[]): PlayerStats[] => {
  const playerMap = new Map<string, PlayerStats>();
  const handResults = new Map<string, number[]>();
  hands.forEach(hand => processHandText(hand, playerMap, handResults));
  return calculateFinalStats(playerMap, handResults);
};

// --- SESSION CALCULATION LOGIC ---
export const calculateSessions = (hands: HandHistory[]): PokerSession[] => {
    if (hands.length === 0) return [];
    
    // Sort chronologically
    const sortedHands = [...hands].sort((a, b) => a.timestamp - b.timestamp);
    const sessions: PokerSession[] = [];
    
    // Config: Break session if gap > 60 minutes
    const SESSION_GAP_MS = 60 * 60 * 1000;
    
    let currentSessionHands: HandHistory[] = [sortedHands[0]];
    
    for (let i = 1; i < sortedHands.length; i++) {
        const prev = sortedHands[i-1];
        const curr = sortedHands[i];
        
        if (curr.timestamp - prev.timestamp > SESSION_GAP_MS) {
            // Gap detected, finalize current session
            sessions.push(createSessionFromHands(currentSessionHands));
            currentSessionHands = [curr];
        } else {
            currentSessionHands.push(curr);
        }
    }
    
    // Push last session
    if (currentSessionHands.length > 0) {
        sessions.push(createSessionFromHands(currentSessionHands));
    }
    
    return sessions.sort((a, b) => b.startTime - a.startTime); // Newest first
};

const createSessionFromHands = (sessionHands: HandHistory[]): PokerSession => {
    const startTime = sessionHands[0].timestamp;
    const endTime = sessionHands[sessionHands.length - 1].timestamp;
    
    // Duration: if 1 hand, estimate 2 mins, else diff
    let durationMinutes = (endTime - startTime) / (1000 * 60);
    if (durationMinutes < 2) durationMinutes = 2;
    
    let netWon = 0;
    const stakeCounts = new Map<string, number>();
    
    sessionHands.forEach(h => {
        const { netWin } = parseHeroHandDetails(h);
        netWon += netWin;
        
        const s = h.stakes || "Unknown";
        stakeCounts.set(s, (stakeCounts.get(s) || 0) + 1);
    });
    
    // Find most played stakes
    let mostPlayedStakes = "Unknown";
    let maxCount = 0;
    stakeCounts.forEach((count, stake) => {
        if (count > maxCount) {
            maxCount = count;
            mostPlayedStakes = stake;
        }
    });
    
    const hourlyRate = (netWon / durationMinutes) * 60;
    
    return {
        id: crypto.randomUUID(),
        startTime,
        endTime,
        durationMinutes,
        handsPlayed: sessionHands.length,
        netWon,
        hourlyRate,
        bb100: 0, // Placeholder
        mostPlayedStakes,
        hands: sessionHands.map(h => h.id)
    };
};
