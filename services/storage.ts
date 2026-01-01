
import { HandHistory, User } from '../types';

const STORAGE_KEY = 'pokervision_hand_histories';
const USER_KEY = 'pokervision_user';
const PLAYER_NOTES_KEY = 'pokervision_player_notes';

// --- Hand History Storage ---

export const saveHand = (hand: Omit<HandHistory, 'id' | 'timestamp'>): HandHistory => {
  const newHand: HandHistory = {
    ...hand,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    notes: ''
  };

  const existing = getHands();
  const updated = [newHand, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newHand;
};

export const getHands = (): HandHistory[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateHand = (id: string, updates: Partial<HandHistory>): HandHistory[] => {
  const hands = getHands();
  const index = hands.findIndex(h => h.id === id);
  
  if (index !== -1) {
    hands[index] = { ...hands[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hands));
  }
  return hands;
};

export const deleteHand = (id: string): void => {
  const existing = getHands();
  const updated = existing.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const importDatabase = (jsonString: string): boolean => {
    try {
        const hands = JSON.parse(jsonString);
        if (Array.isArray(hands)) {
            // Basic validation
            const valid = hands.every(h => h.id && h.timestamp && h.rawText);
            if (valid) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(hands));
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
};

export const clearDatabase = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PLAYER_NOTES_KEY);
};

// --- User Session Storage ---

export const saveUser = (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export const getUser = (): User | null => {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
}

export const removeUser = (): void => {
    localStorage.removeItem(USER_KEY);
}

// --- Player Notes Storage ---

export const getPlayerNote = (playerName: string): string => {
    const data = localStorage.getItem(PLAYER_NOTES_KEY);
    const notes = data ? JSON.parse(data) : {};
    return notes[playerName] || '';
};

export const savePlayerNote = (playerName: string, note: string): void => {
    const data = localStorage.getItem(PLAYER_NOTES_KEY);
    const notes = data ? JSON.parse(data) : {};
    notes[playerName] = note;
    localStorage.setItem(PLAYER_NOTES_KEY, JSON.stringify(notes));
};
