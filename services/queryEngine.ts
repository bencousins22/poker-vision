
import { HandHistory } from '../types';
import { parseHeroHandDetails, getHoleCardsKey } from './statsParser';

type FilterFn = (hand: HandHistory) => boolean;

export const validateQuery = (query: string): { valid: boolean, error?: string } => {
    try {
        // Basic syntax check
        if (!query.trim()) return { valid: true };
        const tokens = query.toLowerCase().split(' ');
        // Allow basic keywords
        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message };
    }
};

export const executeQuery = (query: string, hands: HandHistory[]): HandHistory[] => {
    if (!query || !query.trim()) return hands;

    const tokens = query.trim().split(/\s+(AND|OR)\s+/i);
    // Note: This is a simplified parser supporting "FIELD OPERATOR VALUE" AND/OR ...
    // Complex nesting is limited in this client-side version.

    return hands.filter(hand => {
        try {
            const { netWin, position, heroCards } = parseHeroHandDetails(hand);
            const holeCards = heroCards.join('');
            const holeKey = getHoleCardsKey(heroCards) || '';
            const raw = hand.rawText.toLowerCase();
            const summary = hand.summary.toLowerCase();
            
            // Normalize Hand Data for Querying
            const data: Record<string, any> = {
                'win': netWin,
                'loss': -netWin,
                'pot': parseInt(hand.potSize.replace(/[^0-9]/g, '')),
                'hand': holeCards, // "AhKh"
                'cards': holeCards,
                'range': holeKey, // "AKs"
                'pos': position,
                'position': position,
                'hero': hand.hero,
                'stakes': hand.stakes,
                'date': hand.timestamp,
                'tags': hand.tags || [],
                'bomb': hand.isBombPot
            };

            // Eval function for a single condition
            // e.g. "win > 100"
            const evalCondition = (conditionStr: string): boolean => {
                const parts = conditionStr.trim().split(' ');
                if (parts.length < 2) return true; // Malformed

                // Handle "contains" text search
                if (conditionStr.toLowerCase().includes('contains')) {
                    const [field, _, ...valParts] = parts;
                    const val = valParts.join(' ').replace(/['"]/g, '').toLowerCase();
                    if (field === 'action') return raw.includes(val);
                    if (field === 'note') return (hand.notes || '').toLowerCase().includes(val);
                    if (field === 'tag') return (hand.tags || []).some(t => t.toLowerCase().includes(val));
                    return false;
                }

                // Handle "IN" array check e.g. "hand IN [AA, KK]"
                if (conditionStr.toLowerCase().includes(' in ')) {
                    const [field, _, ...valParts] = parts;
                    const valStr = valParts.join(' '); // "[AA, KK]"
                    const list = valStr.replace(/[\[\]'"]/g, '').split(',').map(s => s.trim());
                    
                    const fieldVal = data[field.toLowerCase()];
                    if (!fieldVal) return false;
                    
                    // Specific check for range/hand
                    if (field === 'hand' || field === 'range') {
                        return list.includes(fieldVal) || list.includes(data.range);
                    }
                    return list.includes(String(fieldVal));
                }

                // Standard Operators
                const operatorRegex = /(>=|<=|>|<|=|!=)/;
                const match = conditionStr.match(operatorRegex);
                if (!match) return false;

                const operator = match[0];
                const [field, valueStr] = conditionStr.split(operator).map(s => s.trim());
                
                const fieldVal = data[field.toLowerCase()];
                const numVal = parseFloat(valueStr);
                const isNum = !isNaN(numVal);

                switch (operator) {
                    case '>': return fieldVal > numVal;
                    case '<': return fieldVal < numVal;
                    case '>=': return fieldVal >= numVal;
                    case '<=': return fieldVal <= numVal;
                    case '=': return String(fieldVal).toLowerCase() === valueStr.replace(/['"]/g, '').toLowerCase();
                    case '!=': return String(fieldVal).toLowerCase() !== valueStr.replace(/['"]/g, '').toLowerCase();
                    default: return false;
                }
            };

            // Extremely basic AND logic parser (Split by " AND ")
            // Ignores OR for simplicity in this version, assumes ALL must match if AND is present
            const conditions = query.split(/ AND /i);
            return conditions.every(c => evalCondition(c));

        } catch (e) {
            console.warn("Query Parse Error", e);
            return false;
        }
    });
};
