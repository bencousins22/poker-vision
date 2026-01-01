
import { HandAction, ReplayerPlayer } from '../types';

export const parseHandForReplay = (rawText: string) => {
  const lines = rawText.split('\n');
  const players: ReplayerPlayer[] = [];
  const timeline: HandAction[] = [];
  
  // 1. Extract Players & Stacks
  lines.forEach(line => {
    // Robust Regex:
    // Support "Seat 1: Name ($1000)" and "Seat 1: Name ($1000 in chips)" and "Seat 1: Name (1000)"
    const seatMatch = line.match(/^Seat (\d+): (.+?) \(\$?([\d,.]+)(?: in chips)?\)/);
    if (seatMatch) {
      players.push({
        seat: parseInt(seatMatch[1]),
        name: seatMatch[2],
        initialStack: parseFloat(seatMatch[3].replace(/,/g, '')),
        currentStack: parseFloat(seatMatch[3].replace(/,/g, '')),
        isActive: true,
        isDealer: false, 
        bet: 0
      });
    }
  });

  // Determine Dealer (Button)
  const buttonLine = lines.find(l => l.includes('is the button'));
  if (buttonLine) {
    const buttonSeatMatch = buttonLine.match(/Seat #(\d+) is the button/);
    if (buttonSeatMatch) {
      const seat = parseInt(buttonSeatMatch[1]);
      const player = players.find(p => p.seat === seat);
      if (player) player.isDealer = true;
    }
  }

  // 2. Extract Hero Cards
  const heroLine = lines.find(l => l.includes('Dealt to'));
  if (heroLine) {
    const match = heroLine.match(/Dealt to (.+?) \[(.+?)\]/);
    if (match) {
      const name = match[1];
      const cards = match[2].split(' ');
      const player = players.find(p => p.name === name);
      if (player) player.cards = cards;
    }
  }

  // 3. Parse Timeline
  let currentStreet = 'Preflop';

  lines.forEach(line => {
    // Street Changes
    if (line.includes('*** FLOP ***')) {
      const match = line.match(/\[(.*?)\]/);
      timeline.push({ 
        type: 'street', 
        street: 'Flop', 
        cards: match ? match[1].split(' ') : [], 
        desc: 'Flop Dealt' 
      });
      currentStreet = 'Flop';
    } else if (line.includes('*** TURN ***')) {
      // PS: *** TURN *** [As Ks Qd] [2h]
      const cardsMatch = line.match(/\[(.*?)\] \[(.*?)\]/);
      if (cardsMatch) {
          timeline.push({ 
            type: 'street', 
            street: 'Turn', 
            cards: [cardsMatch[2]], 
            desc: 'Turn Dealt' 
          });
      }
      currentStreet = 'Turn';
    } else if (line.includes('*** RIVER ***')) {
        const cardsMatch = line.match(/\[(.*?)\] \[(.*?)\]/);
        if (cardsMatch) {
            timeline.push({ 
              type: 'street', 
              street: 'River', 
              cards: [cardsMatch[2]], 
              desc: 'River Dealt' 
            });
        }
      currentStreet = 'River';
    } else if (line.includes('*** SHOWDOWN ***')) {
      timeline.push({ type: 'showdown', desc: 'Showdown' });
      currentStreet = 'Showdown';
    } 
    // Blinds
    else if (line.includes('posts small blind')) {
      const match = line.match(/(.+?): posts small blind \$?([\d,.]+)/);
      if (match) {
        timeline.push({ 
          type: 'blind', 
          player: match[1], 
          amount: parseFloat(match[2].replace(/,/g, '')), 
          desc: 'SB' 
        });
      }
    } else if (line.includes('posts big blind')) {
      const match = line.match(/(.+?): posts big blind \$?([\d,.]+)/);
      if (match) {
        timeline.push({ 
          type: 'blind', 
          player: match[1], 
          amount: parseFloat(match[2].replace(/,/g, '')), 
          desc: 'BB' 
        });
      }
    }
    // Actions
    else if (line.includes(':') && !line.startsWith('Seat') && !line.startsWith('Total pot') && !line.includes('Dealt to') && !line.includes('Board') && !line.startsWith('Uncalled bet')) {
      const parts = line.split(':');
      const name = parts[0].trim();
      const actionRaw = parts.slice(1).join(':').trim(); // Handle potential colons in chat (though rare in hand history)
      
      const player = players.find(p => p.name === name);
      
      // Skip lines that aren't players (e.g. "Chat: hello")
      if (!player) return;

      let type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'win' | undefined;
      let amount = 0;

      if (actionRaw.includes('folds')) type = 'fold';
      else if (actionRaw.includes('checks')) type = 'check';
      else if (actionRaw.includes('calls')) {
        type = 'call';
        const amt = actionRaw.match(/\$?([\d,.]+)/);
        if (amt) amount = parseFloat(amt[1].replace(/,/g, ''));
      }
      else if (actionRaw.includes('bets')) {
        type = 'bet';
        const amt = actionRaw.match(/\$?([\d,.]+)/);
        if (amt) amount = parseFloat(amt[1].replace(/,/g, ''));
      }
      else if (actionRaw.includes('raises')) {
        type = 'raise';
        // "raises $100 to $200" -> We need the TOTAL amount they put in
        const amt = actionRaw.match(/to \$?([\d,.]+)/);
        if (amt) amount = parseFloat(amt[1].replace(/,/g, ''));
      }
      else if (actionRaw.includes('collected') || actionRaw.includes('won')) {
          type = 'win';
          const amt = actionRaw.match(/\$?([\d,.]+)/);
          if (amt) amount = parseFloat(amt[1].replace(/,/g, ''));
      }

      if (type) {
        timeline.push({
          type: type === 'win' ? 'summary' : 'action',
          player: name,
          actionType: type,
          amount,
          desc: actionRaw,
          street: currentStreet
        });
      }
    }
    // Return uncalled bets (important for pot accuracy)
    else if (line.startsWith('Uncalled bet')) {
       // "Uncalled bet ($50) returned to PlayerName"
       const match = line.match(/Uncalled bet \(\$?([\d,.]+)\) returned to (.+)/);
       if (match) {
         // This is technically a negative action or a refund, but for visual replay 
         // we typically handle this by just fixing the pot at the start of next street
         // or we can add a specific event if we want high fidelity
       }
    }
  });

  return { players, timeline };
};
