
export interface HandHistory {
  id: string;
  timestamp: number;
  videoUrl?: string;
  hero: string;
  stakes: string;
  rawText: string;
  summary: string;
  potSize: string;
  notes?: string;
  tags?: string[];
  isBombPot?: boolean;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  handHistory: string;
  summary: string;
}

export interface HandFilter {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  position: 'all' | 'EP' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';
  result: 'all' | 'won' | 'lost';
  minPot: number;
  isBombPot?: boolean;
}

export interface PokerSession {
    id: string;
    startTime: number;
    endTime: number;
    durationMinutes: number;
    handsPlayed: number;
    netWon: number;
    hourlyRate: number;
    bb100: number;
    mostPlayedStakes: string;
    hands: string[]; // Hand IDs
}

export interface PlayerStats {
  name: string;
  handsPlayed: number;
  // Core Stats
  vpip: number;
  pfr: number;
  af: number; // Aggression Factor
  afq: number; // Aggression Frequency %
  aggFreq: number; // ADDED THIS FIELD
  threeBet: number;
  fourBet: number;
  foldTo3Bet: number;
  
  // Postflop
  cBetFlop: number;
  cBetTurn: number;
  cBetRiver: number;
  foldToCBetFlop: number;
  donkBet: number;
  checkRaise: number;
  
  // Showdown
  wtsd: number; // Went to Showdown %
  wmsd: number; // Won Money at Showdown %
  wwsf: number; // Won When Saw Flop %
  
  // Financials
  winnings: number; // Net winnings in $
  bb100: number; // Winrate in big blinds per 100 hands
  sdWinnings: number; // Showdown winnings
  nsdWinnings: number; // Non-showdown winnings
  stdDevBb: number; // Standard Deviation in BB (for variance)
  
  style: PlayerStyle;
  
  // Positional Data (VPIP per position)
  positionStats: {
    SB: number;
    BB: number;
    EP: number;
    MP: number;
    CO: number;
    BTN: number;
  };
  
  // Positional Winnings (Net $ per position)
  positionWinnings: {
    SB: number;
    BB: number;
    EP: number;
    MP: number;
    CO: number;
    BTN: number;
  };

  // Internal counts for calculation
  actions: {
    calls: number;
    bets: number;
    raises: number;
    folds: number;
    checks: number;
    preFlopCalls: number;
    preFlopRaises: number;
    opportunities: number; // For VPIP
    threeBetOpp: number;
    cBetOpp: number;
    foldTo3BetOpp: number;
    showdowns: number;
    flopsSeen: number;
    flopsWon: number;
  }
}

export type PlayerStyle = 'Rock' | 'TAG' | 'LAG' | 'Station' | 'Maniac' | 'Nit' | 'Unknown';

export type SubscriptionTier = 'free' | 'pro' | 'elite';

export interface PokerRange {
    id: string;
    name: string;
    description: string;
    hands: string[]; // Array of hand keys e.g. ["AA", "AKs", "KQs"]
    color: string;
}

export interface GCPSettings {
    projectId: string;
    bucketName: string;
    datasetId: string;
    tableId: string;
    accessToken?: string; // Stored temporarily or handled via Auth provider in prod
}

export interface AISettings {
    provider: 'google' | 'openrouter' | 'google-oauth' | 'jules';
    googleApiKey?: string;
    openRouterApiKey?: string;
    model: string; 
    accessToken?: string;
}

export interface UserSettings {
  rakebackPercentage: number; // 0-100
  currencyRates: Record<string, number>;
  appScale: number; // 0.75 - 1.25
  uiDensity: 'compact' | 'normal' | 'spacious';
  hudOpacity: number; // 0 - 1
  tagTemplates: string[];
  savedRanges: PokerRange[];
  gcp?: GCPSettings;
  ai: AISettings;
  youtubeApiKey?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  subscription: SubscriptionTier;
  billingCycle?: 'monthly' | 'annual';
  nextBillingDate?: number;
  credits: number; // New field for credit consumption
  settings: UserSettings;
}

export type ViewMode = 'analyze' | 'review' | 'channels' | 'tracker' | 'strategy' | 'pricing' | 'profile' | 'tools' | 'trainer' | 'solver' | 'store';

// Queue Types
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface QueueItem {
  id: string;
  videoUrl: string;
  title: string;
  thumbnail: string;
  status: QueueStatus;
  addedAt: number;
  error?: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  description: string;
}

export interface ChannelVideo {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  views: string;
  uploaded: string; // ISO date or relative string
  isLive?: boolean;
  channelId?: string;
  channelTitle?: string;
}

// Chat Types
export interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'system';
    text?: string;
    isToolCall?: boolean;
    toolCalls?: any[];
    timestamp: number;
}

// Toast Notification Type
export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
}

// Solver Types
export interface StrategyCell {
    hand: string;
    frequencies: {
        fold: number; // 0-1
        check: number;
        call: number;
        betSmall: number;
        betLarge: number;
        raise: number;
    };
    ev: number;
}

export interface SolverSolution {
    street: 'Preflop' | 'Flop' | 'Turn' | 'River';
    board: string[];
    pot: number;
    strategy: Record<string, StrategyCell>; // Key is hand "AKs"
    exploitNote?: string;
}

export interface ExploitAdvice {
    id: string;
    villainStat: string; // e.g. "Fold to CBet 70%"
    deviation: string; // e.g. "Over-bluff Flop"
    confidence: number; // 0-100
    action: 'Bet' | 'Check' | 'Fold' | 'Raise';
    sizing?: string;
}

// Context Type Definition
export interface PokerContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  hands: HandHistory[];
  loadHands: () => void;
  addHand: (hand: HandHistory) => void;
  updateHand: (id: string, updates: Partial<HandHistory>) => void;
  deleteHand: (id: string) => void;
  selectedHand: HandHistory | null;
  setSelectedHand: (hand: HandHistory | null) => void;
  
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Navigation & Analysis
  activeVideoUrl: string | null;
  launchAnalysis: (url: string) => void;
  analyzeSpot: (context: string) => void;
  
  // Queue Context
  queue: QueueItem[];
  addToQueue: (video: ChannelVideo) => void;
  removeFromQueue: (id: string) => void;
  isQueueProcessing: boolean;
  
  // Notifications
  addToast: (toast: Omit<Toast, 'id'>) => void;

  // Data Management
  clearAllData: () => void;
  
  // Lab Integration
  labContext?: {
      heroHand?: string[];
      villainHand?: string[];
      board?: string[];
  };
  setLabContext: (ctx: any) => void;
}

// Replayer Types
export interface ReplayerPlayer {
  seat: number;
  name: string;
  initialStack: number;
  currentStack: number;
  cards?: string[];
  isActive: boolean;
  isDealer: boolean;
  bet: number; // Current bet in front of player
  action?: string; // Last action text (e.g. "Check", "Bet 50")
}

export interface ReplayerState {
  players: ReplayerPlayer[];
  pot: number;
  board: string[];
  street: 'Preflop' | 'Flop' | 'Turn' | 'River' | 'Showdown';
  currentActionIndex: number;
  message: string;
}

export interface HandAction {
  type: 'blind' | 'deal' | 'action' | 'street' | 'showdown' | 'summary';
  player?: string;
  actionType?: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'win';
  amount?: number;
  street?: string;
  cards?: string[];
  desc: string;
}
