
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { solveSpot } from '../../services/solver';
import { calculateStats, parseHeroHandDetails } from '../../services/statsParser';
import { getHoleCardsKey } from '../../services/statsParser';

describe('Poker Services', () => {

    it('solver should return a mock solution when no API key is present', async () => {
        const request = {
            pot: 100,
            board: ['Ah', 'Kh', '2d'],
            heroCard1: 'As',
            heroCard2: 'Ks',
            heroPosition: 'BTN',
            villainPosition: 'BB',
            stackSize: 1000,
            actions: []
        };
        const solution = await solveSpot(request);
        assert.ok(solution.ev !== undefined);
        assert.ok(solution.strategy);
        assert.ok(solution.rangeGrid);
    });

    it('statsParser should parse hero hand details', () => {
        const hand = {
            id: '1',
            timestamp: 123,
            hero: 'HeroPlayer',
            stakes: '1/2',
            rawText: 'Dealt to HeroPlayer [Ah Kh]\nHeroPlayer collected $150',
            summary: '',
            potSize: '$150'
        };
        const details = parseHeroHandDetails(hand);
        assert.deepStrictEqual(details.heroCards, ['Ah', 'Kh']);
        assert.strictEqual(details.netWin, 150);
    });

    it('getHoleCardsKey should normalize card strings', () => {
        assert.strictEqual(getHoleCardsKey(['Ah', 'Ks']), 'AhKs');
    });

});
