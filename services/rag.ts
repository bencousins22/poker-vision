
import { HandHistory, PlayerStats } from '../types';
import { parseHeroHandDetails } from './statsParser';

interface RAGContext {
    relevantHands: HandHistory[];
    summaryStats?: PlayerStats;
    systemMessage: string;
}

// Simple keyword extractor/scorer for client-side RAG
const scoreHandRelevance = (hand: HandHistory, query: string): number => {
    const q = query.toLowerCase();
    const text = hand.rawText.toLowerCase();
    const { heroCards, position } = parseHeroHandDetails(hand);
    const handStr = heroCards.join('').toLowerCase();
    let score = 0;

    // 1. Hole Card Matching (High Priority)
    // Checks for "AK", "AKs", "Pocket Jacks", "JJ"
    if (handStr.length > 0) {
        if (q.includes(handStr)) score += 50;
        // Check for "Pocket X"
        if (heroCards[0][0] === heroCards[1][0]) {
            const rank = heroCards[0][0].toLowerCase();
            if (q.includes(`pocket ${rank}`) || q.includes(`${rank}${rank}`)) score += 40;
        }
    }

    // 2. Position Matching
    if (position && q.includes(position.toLowerCase())) score += 20;

    // 3. Action Matching
    if (q.includes('bluff') && (text.includes('raises') && !text.includes('shows'))) score += 10;
    if (q.includes('fold') && text.includes('folds')) score += 10;
    if (q.includes('shove') || q.includes('all-in')) {
        if (text.includes('all-in')) score += 20;
    }

    // 4. Player Name Matching
    const heroName = hand.hero.toLowerCase();
    if (q.includes(heroName)) score += 15;

    return score;
};

export const retrieveContext = (query: string, allHands: HandHistory[]): RAGContext => {
    // 1. Score and Sort Hands
    const scoredHands = allHands.map(h => ({
        hand: h,
        score: scoreHandRelevance(h, query)
    }));

    // Filter noise and get top 3 relevant hands
    const relevantHands = scoredHands
        .filter(item => item.score > 10)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.hand);

    // 2. Construct System Message with RAG Data
    let contextMsg = "";
    
    if (relevantHands.length > 0) {
        contextMsg += `\n\n[DATABASE CONTEXT - RELEVANT USER HANDS FOUND]\n`;
        contextMsg += `I have found ${relevantHands.length} similar hands in the user's database that might help context:\n`;
        
        relevantHands.forEach((h, i) => {
            const { heroCards, netWin, position } = parseHeroHandDetails(h);
            const summary = h.summary.replace(/\n/g, ' ');
            contextMsg += `${i+1}. [${new Date(h.timestamp).toLocaleDateString()}] ${position} holding [${heroCards.join(' ')}]. Result: ${netWin > 0 ? '+' : ''}$${netWin}. Summary: "${summary}"\n`;
        });
        contextMsg += `\nUse these specific past hands as examples or data points when answering the user's question. Reference them by date if relevant.\n`;
    } else {
        contextMsg += `\n[DATABASE SEARCH] No specific matching hands found in local history for this query. Provide general GTO advice.`;
    }

    return {
        relevantHands,
        systemMessage: contextMsg
    };
};
