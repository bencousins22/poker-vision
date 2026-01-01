
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HandHistory, ReplayerPlayer, HandAction } from '../types';
import { parseHandForReplay } from '../services/handReplayerParser';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, BrainCircuit, RotateCcw, FastForward, Rewind, Copy, Share2, Eye, EyeOff, Coins, Hash, Calculator, Edit, Save, X, Grid3X3, List, PieChart, TrendingUp, Activity, Scale, Maximize2, Minimize2, Settings2 } from 'lucide-react';
import { usePoker } from '../App';
import { getMatrixCell, DEFAULT_RANGES, calculateApproxEquity } from '../services/pokerLogic';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  hand: HandHistory;
  onAnalyzeSpot: (context: string) => void;
}

const SUIT_COLORS: Record<string, string> = {
  'h': 'text-[#ff5555]', 
  'd': 'text-[#3b82f6]', 
  'c': 'text-[#10b981]', 
  's': 'text-[#a1a1aa]'  
};

const SUIT_ICONS: Record<string, string> = {
  'h': '♥', 'd': '♦', 'c': '♣', 's': '♠'
};

// 3D CSS Chip Stack Component
const ChipStack: React.FC<{ amount: number; className?: string }> = ({ amount, className }) => {
    // Determine chip color based on value (simplified)
    let bg = 'bg-red-600';
    let border = 'border-red-700';
    let ring = 'border-red-400';
    
    if (amount >= 1000) { bg = 'bg-yellow-500'; border = 'border-yellow-600'; ring = 'border-yellow-200'; }
    else if (amount >= 500) { bg = 'bg-purple-600'; border = 'border-purple-700'; ring = 'border-purple-300'; }
    else if (amount >= 100) { bg = 'bg-black'; border = 'border-zinc-800'; ring = 'border-zinc-600'; }
    else if (amount >= 25) { bg = 'bg-green-600'; border = 'border-green-700'; ring = 'border-green-400'; }

    // Visual height of stack (max 5 chips)
    const chips = Math.min(Math.max(1, Math.floor(Math.log10(amount || 1) * 2)), 6);

    return (
        <div className={`relative w-6 h-8 sm:w-8 sm:h-10 flex flex-col-reverse items-center ${className}`}>
            {Array.from({ length: chips }).map((_, i) => (
                <div 
                    key={i} 
                    className={`absolute w-full h-2.5 sm:h-3 rounded-[50%] ${bg} border-[0.5px] ${border} shadow-[0_1px_1px_rgba(0,0,0,0.5)] z-${i}`}
                    style={{ bottom: `${i * 3}px` }}
                >
                    <div className={`absolute inset-[2px] rounded-[50%] border border-dashed ${ring} opacity-50`}></div>
                </div>
            ))}
        </div>
    );
};

const CardComponent: React.FC<{ cardString: string, small?: boolean, hidden?: boolean, className?: string }> = React.memo(({ cardString, small, hidden, className }) => {
  if (hidden) {
    return (
        <div className={`${small ? 'w-10 h-14 rounded-sm' : 'w-16 h-24 sm:w-20 sm:h-28 rounded-md'} bg-zinc-900 border border-zinc-700 shadow-xl relative overflow-hidden group ${className}`}>
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.03)_5px,rgba(255,255,255,0.03)_10px)]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-700/50 flex items-center justify-center opacity-30">
                    <Activity className="w-4 h-4 text-zinc-500" />
                </div>
            </div>
        </div>
    );
  }
  
  if (!cardString || cardString.length < 2) return null;
  
  const rank = cardString.slice(0, -1);
  const suit = cardString.slice(-1).toLowerCase();
  const colorClass = SUIT_COLORS[suit] || 'text-zinc-200';
  
  return (
    <div className={`${small ? 'w-10 h-14 text-sm' : 'w-16 h-24 sm:w-20 sm:h-28 text-2xl sm:text-3xl'} bg-[#e8e8e8] rounded-md sm:rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center font-black select-none relative overflow-hidden transition-transform duration-200 hover:-translate-y-2 z-10 ${className}`}>
      <span className={`absolute top-0.5 left-1 leading-none ${colorClass}`}>{rank}</span>
      <span className={`${small ? 'text-xl' : 'text-4xl'} ${colorClass} drop-shadow-sm`}>{SUIT_ICONS[suit]}</span>
      <span className={`absolute bottom-0.5 right-1 leading-none rotate-180 ${colorClass}`}>{rank}</span>
    </div>
  );
});

const DealerButton: React.FC = () => (
    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center shadow-[0_2px_5px_rgba(0,0,0,0.3)] border-2 border-zinc-200 z-20">
        <span className="text-[10px] sm:text-xs font-black text-black">D</span>
    </div>
);

const MiniRangeGrid: React.FC<{ selectedHands: string[], color?: string }> = React.memo(({ selectedHands, color = '#10b981' }) => {
    return (
        <div className="grid grid-cols-13 gap-[1px] bg-zinc-950 border border-zinc-800 p-[1px] w-32 h-32 shadow-xl">
             {Array.from({ length: 13 }).map((_, r) => (
                Array.from({ length: 13 }).map((_, c) => {
                    const hand = getMatrixCell(r, c);
                    const active = selectedHands.includes(hand);
                    return (
                        <div 
                            key={hand}
                            className={`w-full h-full ${active ? '' : 'bg-zinc-900/50'}`}
                            style={{ backgroundColor: active ? color : undefined }}
                        />
                    );
                })
            ))}
        </div>
    );
});

export const HandReplayer: React.FC<Props> = ({ hand, onAnalyzeSpot }) => {
  const { players: initialPlayers, timeline } = useMemo(() => parseHandForReplay(hand.rawText), [hand.rawText]); 
  const { addToast, user, setViewMode, setLabContext, updateHand } = usePoker(); 
  
  const [actionIndex, setActionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1500);
  const [showBB, setShowBB] = useState(false);
  const [hudOpacity, setHudOpacity] = useState(user?.settings?.hudOpacity ?? 1);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(hand.rawText);
  const [showLog, setShowLog] = useState(false);
  const [showEquity, setShowEquity] = useState(true); 
  
  const [assignedRanges, setAssignedRanges] = useState<Record<string, string>>({}); 
  const [showRangeSelector, setShowRangeSelector] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard Navigation
  useEffect(() => {
      if (isEditing) return;
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') setActionIndex(prev => Math.max(0, prev - 1));
          if (e.key === 'ArrowRight') setActionIndex(prev => Math.min(timeline.length - 1, prev + 1));
          if (e.key === ' ') {
              e.preventDefault();
              setIsPlaying(prev => !prev);
          }
          if (e.key === 'r' || e.key === 'R') {
              setActionIndex(0);
              setIsPlaying(false);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeline.length, isEditing]);

  useEffect(() => {
      if (showLog && logContainerRef.current) {
          const activeItem = logContainerRef.current.children[actionIndex] as HTMLElement;
          if (activeItem) {
              activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [actionIndex, showLog]);

  const currentState = useMemo(() => {
    const players = JSON.parse(JSON.stringify(initialPlayers)) as ReplayerPlayer[];
    let pot = 0;
    let board: string[] = [];
    let street = 'Preflop';
    let lastActionDesc = 'Hand Started';
    let lastActivePlayer = '';
    let currentBet = 0; 
    let heroFacingBet = 0; 

    for (let i = 0; i <= actionIndex && i < timeline.length; i++) {
      const action = timeline[i];
      
      if (action.type === 'street') {
        street = action.street || street;
        if (action.cards) board = [...board, ...action.cards];
        players.forEach(p => { pot += p.bet; p.bet = 0; p.action = ''; });
        currentBet = 0;
        lastActionDesc = action.desc;
      } 
      else if (action.type === 'blind') {
        const p = players.find(pl => pl.name === action.player);
        if (p) {
          p.currentStack -= (action.amount || 0);
          p.bet += (action.amount || 0);
          currentBet = Math.max(currentBet, p.bet);
          p.action = action.desc;
        }
        lastActionDesc = `${action.player} posts ${action.desc}`;
      }
      else if (action.type === 'action') {
        lastActivePlayer = action.player || '';
        const p = players.find(pl => pl.name === action.player);
        if (p) {
          if (action.actionType === 'fold') {
            p.isActive = false;
            p.action = 'Fold';
          } else if (action.actionType === 'check') {
            p.action = 'Check';
          } else if (action.actionType === 'call') {
             const cost = (action.amount || 0); 
             p.currentStack -= cost;
             p.bet += cost;
             p.action = 'Call';
          } else if (action.actionType === 'bet') {
             const cost = (action.amount || 0);
             p.currentStack -= cost;
             p.bet += cost;
             currentBet = Math.max(currentBet, p.bet);
             p.action = `Bet ${cost}`;
          } else if (action.actionType === 'raise') {
             const total = (action.amount || 0);
             const cost = total - p.bet;
             p.currentStack -= cost;
             p.bet = total;
             currentBet = Math.max(currentBet, p.bet);
             p.action = `Raise ${total}`;
          }
          lastActionDesc = action.desc;
        }
      }
      else if (action.type === 'summary' && action.actionType === 'win') {
         const p = players.find(pl => pl.name === action.player);
         if (p) {
             p.action = `Win $${action.amount}`;
             p.bet = 0;
         }
         if (i === timeline.length - 1) pot = 0;
      }
    }

    const hero = players.find(p => p.cards && p.cards.length > 0 && p.isActive);
    if (hero) {
        if (currentBet > hero.bet) {
            heroFacingBet = currentBet - hero.bet;
        }
    }

    return { players, pot, board, street, lastActionDesc, lastActivePlayer, currentBet, heroFacingBet };
  }, [initialPlayers, timeline, actionIndex]);

  const equityTimeline = useMemo(() => {
      const hero = initialPlayers.find(p => p.cards && p.cards.length === 2);
      if (!hero) return [];

      let currentBoard: string[] = [];
      const dataPoints = [];
      const allRanges = [...DEFAULT_RANGES, ...(user?.settings?.savedRanges || [])];

      for (let i = 0; i < timeline.length; i++) {
          const action = timeline[i];
          if (action.type === 'street' && action.cards) {
              currentBoard = [...currentBoard, ...action.cards];
          }
          
          let villainInput: string[] = [];
          const actorName = action.player;
          if (actorName && actorName !== hero.name) {
              const rangeId = assignedRanges[actorName];
              if (rangeId) {
                  const r = allRanges.find(x => x.id === rangeId);
                  if (r) villainInput = r.hands;
              }
          }
          
          if (villainInput.length === 0) {
              const opponentWithRange = initialPlayers.find(p => p.name !== hero.name && assignedRanges[p.name]);
              if (opponentWithRange) {
                  const r = allRanges.find(x => x.id === assignedRanges[opponentWithRange.name]);
                  if (r) villainInput = r.hands;
              }
          }

          if (villainInput.length === 0) {
              villainInput = Array.from({length: 169}, (_, k) => getMatrixCell(Math.floor(k/13), k%13));
          }

          const eq = calculateApproxEquity(
              hero.cards!,
              villainInput,
              currentBoard,
              true
          );

          dataPoints.push({
              index: i,
              heroEquity: eq.hero,
              street: action.street || '',
              desc: action.desc
          });
      }
      return dataPoints;
  }, [initialPlayers, timeline, assignedRanges, user?.settings?.savedRanges]);

  const liveEquity = useMemo(() => {
      const hero = currentState.players.find(p => p.cards && p.cards.length === 2 && p.isActive);
      if (!hero) return null;

      const opponents = currentState.players.filter(p => p.name !== hero.name && p.isActive);
      if (opponents.length === 0) return { hero: 100, villain: 0 }; 

      const primaryVillain = opponents.find(p => p.name === currentState.lastActivePlayer) || opponents[0];
      
      const rangeId = assignedRanges[primaryVillain.name];
      const rangeObj = DEFAULT_RANGES.find(r => r.id === rangeId) || (user?.settings?.savedRanges || []).find(r => r.id === rangeId);
      const villainInput = rangeObj ? rangeObj.hands : []; 
      
      return calculateApproxEquity(
          hero.cards!,
          villainInput.length > 0 ? villainInput : Array.from({length: 169}, (_, i) => getMatrixCell(Math.floor(i/13), i%13)), 
          currentState.board,
          true 
      );
  }, [currentState, assignedRanges, user]);

  const potOddsData = useMemo(() => {
      if (currentState.heroFacingBet <= 0 || !liveEquity) return null;
      
      const currentStreetBets = currentState.players.reduce((acc, p) => acc + p.bet, 0);
      const finalPot = currentState.pot + currentStreetBets + currentState.heroFacingBet;
      
      const potOddsPct = (currentState.heroFacingBet / finalPot) * 100;
      const isProfitable = liveEquity.hero > potOddsPct;
      
      return {
          potOdds: potOddsPct,
          equity: liveEquity.hero,
          isProfitable,
          diff: liveEquity.hero - potOddsPct
      };
  }, [currentState, liveEquity]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setActionIndex(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeline.length, playbackSpeed]);

  const jumpToStreet = (targetStreet: string) => {
    const idx = timeline.findIndex(t => t.street === targetStreet && t.type === 'street');
    if (idx !== -1) setActionIndex(idx);
    else if (targetStreet === 'Preflop') setActionIndex(0);
  };

  const handleAnalyze = () => {
    setIsPlaying(false);
    const activePlayers = currentState.players.filter(p => p.isActive);
    const hero = activePlayers.find(p => p.cards && p.cards.length > 0) || activePlayers[0];
    const spr = hero ? (hero.currentStack / (currentState.pot || 1)).toFixed(2) : '?';

    const context = `
    **POKER HAND ANALYSIS REQUEST**
    - Stakes: ${hand.stakes} | Street: ${currentState.street} | Pot: $${currentState.pot}
    - Board: [${currentState.board.join(' ')}]
    - Hero: ${hero?.name} ($${hero?.currentStack}, Hand: ${hero?.cards ? `[${hero.cards.join(' ')}]` : 'Unknown'})
    - SPR: ${spr}
    
    **Action History:**
    ${timeline.slice(0, actionIndex + 1).map(t => t.type === 'street' ? `--- ${t.street} ---` : t.type === 'action' ? `${t.player}: ${t.desc}` : '').filter(x => x).slice(-10).join('\n')}
    `;
    onAnalyzeSpot(context);
  };

  const handleSaveEdit = () => {
      updateHand(hand.id, { rawText: editedText });
      setIsEditing(false);
      addToast({ title: "Hand Updated", type: 'success' });
      setActionIndex(0);
  };

  const getSeatStyle = (seatIdx: number) => {
     const totalSeats = 9;
     const offset = Math.PI / 2; 
     const angle = ((seatIdx - 1) / totalSeats) * 2 * Math.PI + offset; 
     const x = 50 + 40 * Math.cos(angle); 
     const y = 48 + 36 * Math.sin(angle); 
     return { left: `${x}%`, top: `${y}%` };
  };
  
  const getButtonPosition = (seatIdx: number) => {
      const style = getSeatStyle(seatIdx);
      let left = parseFloat(style.left as string);
      let top = parseFloat(style.top as string);
      const dx = 50 - left;
      const dy = 48 - top;
      left += dx * 0.18;
      top += dy * 0.18;
      return { left: `${left}%`, top: `${top}%` };
  };

  const formatAmt = (amt: number) => {
      if (showBB) {
          const match = hand.stakes.match(/\/|\$([\d.]+)/);
          const bb = match ? 200 : 1; 
          return (amt / bb).toFixed(1) + ' BB';
      }
      return '$' + amt.toLocaleString();
  };

  const assignRange = (playerName: string, rangeId: string) => {
      setAssignedRanges(prev => ({ ...prev, [playerName]: rangeId }));
      setShowRangeSelector(null);
  };

  const allRanges = [...DEFAULT_RANGES, ...(user?.settings?.savedRanges || [])];

  if (isEditing) {
      return (
          <div className="w-full h-full flex flex-col bg-[#1a1a1a] rounded-3xl p-6 border-[1px] border-zinc-800 shadow-2xl relative animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                      <Edit className="w-5 h-5 text-poker-gold" /> Edit Hand History
                  </h3>
                  <div className="flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors">Cancel</button>
                      <button onClick={handleSaveEdit} className="px-4 py-2 rounded-lg bg-poker-gold hover:bg-yellow-500 text-black font-bold flex items-center gap-2 transition-colors">
                          <Save className="w-4 h-4" /> Save Changes
                      </button>
                  </div>
              </div>
              <textarea 
                  className="flex-1 w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:border-poker-gold focus:ring-1 focus:ring-poker-gold outline-none resize-none leading-relaxed"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
              />
          </div>
      );
  }

  return (
    <div className="flex flex-col w-full h-full select-none" onClick={() => setShowRangeSelector(null)}>
      {/* Immersive Felt Area */}
      <div className="relative flex-1 min-h-[300px] bg-[#1a1a1a] rounded-t-3xl border-x-[10px] border-t-[10px] border-[#18181b] shadow-inner overflow-hidden group">
        
        {/* Advanced Felt Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-800 via-emerald-950 to-[#022c22]">
           {/* Fabric Noise */}
           <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/felt.png')] mix-blend-overlay"></div>
           {/* Table Ring */}
           <div className="absolute inset-[30px] rounded-[150px] border-[2px] border-emerald-500/10 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>
           
           {/* Center Logo / Branding */}
           <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none select-none transform skew-x-12">
                <span className="text-6xl sm:text-8xl font-black text-white tracking-[0.2em] blur-[1px]">VISION</span>
                <span className="text-2xl sm:text-4xl font-bold text-poker-gold tracking-[0.5em] mt-2">REPLAYER</span>
           </div>
           
           {/* Community Cards - Centered & Elevated */}
           <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 sm:gap-3 z-20 perspective-[1000px]">
                {currentState.board.map((card, i) => (
                    <div key={i} className="animate-in zoom-in slide-in-from-top-4 duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-4 transition-transform duration-300">
                        <CardComponent cardString={card} />
                    </div>
                ))}
                {Array(5 - currentState.board.length).fill(0).map((_, i) => (
                    <div key={`empty-${i}`} className="w-16 h-24 sm:w-20 sm:h-28 rounded-md border-2 border-dashed border-emerald-500/20 bg-black/10 backdrop-blur-sm" />
                ))}
           </div>

           {/* Pot Display - Enhanced */}
           <div className="absolute top-[25%] left-1/2 -translate-x-1/2 text-center z-10 w-full pointer-events-none">
                <div className="inline-flex flex-col items-center bg-black/40 backdrop-blur-xl px-6 py-2 rounded-2xl border border-white/5 shadow-2xl">
                    <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-[0.2em] mb-0.5">Total Pot</div>
                    <div className="text-poker-gold font-mono text-2xl font-bold tracking-tight text-shadow-glow">
                        ${currentState.players.reduce((acc, p) => acc + p.bet, currentState.pot).toLocaleString()}
                    </div>
                </div>
                {currentState.currentBet > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md animate-in fade-in zoom-in text-[10px]">
                        <span className="text-zinc-400">Odds:</span>
                        <span className="text-white font-bold">{((currentState.currentBet / (currentState.pot + currentState.players.reduce((acc,p)=>acc+p.bet,0) + currentState.currentBet)) * 100).toFixed(1)}%</span>
                    </div>
                )}
           </div>
        </div>

        {/* Action Log Drawer */}
        <div className={`absolute top-4 right-4 bottom-4 w-60 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl z-50 transform transition-transform duration-300 flex flex-col shadow-2xl ${showLog ? 'translate-x-0' : 'translate-x-[120%]'}`}>
            <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <List className="w-3.5 h-3.5 text-poker-gold" /> Hand History
                </h3>
                <button onClick={() => setShowLog(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700" ref={logContainerRef}>
                {timeline.map((item, idx) => (
                    <div 
                        key={idx}
                        onClick={() => setActionIndex(idx)}
                        className={`p-2 rounded-lg text-[10px] cursor-pointer transition-all border-l-2 ${
                            idx === actionIndex 
                            ? 'bg-zinc-800 border-poker-gold text-white shadow-md pl-3' 
                            : 'border-transparent text-zinc-400 hover:bg-white/5 pl-2'
                        }`}
                    >
                        {item.type === 'street' ? (
                            <div className="font-black text-center text-zinc-500 py-1 uppercase tracking-widest text-[9px] bg-white/5 rounded my-1">{item.street}</div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="font-bold truncate max-w-[80px]">{item.player}</span>
                                <span className={`font-mono font-bold ${
                                    item.actionType === 'fold' ? 'text-zinc-600' :
                                    item.actionType === 'raise' ? 'text-red-400' :
                                    item.actionType === 'bet' ? 'text-amber-400' :
                                    item.actionType === 'call' ? 'text-blue-400' : 'text-zinc-300'
                                }`}>{item.desc.replace(item.player + ': ', '')}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Decision Assistant Overlay */}
        {potOddsData && (
            <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-40 shadow-2xl animate-in fade-in slide-in-from-left-4 max-w-[200px]">
                <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                    <Scale className="w-4 h-4 text-poker-gold" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">Math</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-bold">Pot Odds</span>
                        <span className="font-mono text-white">{potOddsData.potOdds.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-bold">Equity</span>
                        <span className={`font-mono font-bold ${potOddsData.isProfitable ? 'text-poker-green' : 'text-red-500'}`}>
                            {potOddsData.equity.toFixed(1)}%
                        </span>
                    </div>
                    <div className={`mt-2 p-1.5 rounded-lg text-center text-[10px] font-black uppercase tracking-wider border flex items-center justify-center gap-2 ${
                        potOddsData.isProfitable ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900' : 'bg-red-950/50 text-red-400 border-red-900'
                    }`}>
                        {potOddsData.isProfitable ? 'Call' : 'Fold'} 
                        <span className="opacity-50 font-normal normal-case">
                            ({potOddsData.isProfitable ? '+' : ''}{(potOddsData.equity - potOddsData.potOdds).toFixed(1)}% Diff)
                        </span>
                    </div>
                </div>
            </div>
        )}

        {/* Players */}
        {currentState.players.map((player) => (
            <React.Fragment key={player.seat}>
                {player.isDealer && (
                    <div className="absolute transition-all duration-700 ease-in-out z-20" style={getButtonPosition(player.seat)}>
                        <DealerButton />
                    </div>
                )}

                <div 
                    className={`absolute transition-all duration-500 w-28 h-28 sm:w-32 sm:h-32 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30 ${!player.isActive ? 'opacity-40 grayscale blur-[1px]' : ''}`}
                    style={getSeatStyle(player.seat)}
                >
                    {/* Range Selector */}
                    {showRangeSelector === player.name && (
                        <div className="absolute bottom-full mb-2 bg-black border border-zinc-800 rounded-xl p-2 z-[100] shadow-2xl w-48 animate-in slide-in-from-bottom-2" onClick={(e) => e.stopPropagation()}>
                            <div className="text-[9px] font-bold text-zinc-500 mb-2 px-2 uppercase tracking-wide flex justify-between items-center">
                                <span>Assign Range</span>
                                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setShowRangeSelector(null)} />
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
                                {allRanges.map(r => (
                                    <button 
                                        key={r.id} 
                                        onClick={() => assignRange(player.name, r.id)}
                                        className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 rounded flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: r.color}}></div>
                                        {r.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowRangeSelector(player.name === showRangeSelector ? null : player.name); }}
                        className="absolute -right-2 top-0 bg-zinc-900 border border-zinc-700 p-1.5 rounded-full text-zinc-400 hover:text-white hover:border-poker-gold transition-colors z-40 shadow-lg group/range"
                    >
                        <Grid3X3 className="w-3 h-3" />
                        {assignedRanges[player.name] && (
                            <div className="absolute left-full ml-2 top-0 bg-zinc-950 p-2 rounded-lg border border-zinc-800 shadow-xl opacity-0 group-hover/range:opacity-100 pointer-events-none transition-opacity z-50">
                                <div className="text-[9px] font-bold text-zinc-400 mb-1 whitespace-nowrap">{allRanges.find(r => r.id === assignedRanges[player.name])?.name}</div>
                                <MiniRangeGrid 
                                    selectedHands={allRanges.find(r => r.id === assignedRanges[player.name])?.hands || []} 
                                    color={allRanges.find(r => r.id === assignedRanges[player.name])?.color} 
                                />
                            </div>
                        )}
                    </button>

                    {/* Action Bubble */}
                    <div className={`absolute -top-12 transition-all duration-300 z-50 ${player.action ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}`}>
                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black shadow-xl whitespace-nowrap border backdrop-blur-md ${
                            player.action?.includes('Fold') ? 'bg-zinc-900/90 text-zinc-400 border-zinc-700' :
                            player.action?.includes('Raise') ? 'bg-red-950/90 text-red-400 border-red-500/50' :
                            player.action?.includes('Bet') ? 'bg-amber-950/90 text-amber-400 border-amber-500/50' :
                            player.action?.includes('Win') ? 'bg-emerald-950/90 text-emerald-400 scale-110 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' :
                            'bg-white text-black border-white'
                        }`}>
                            {player.action}
                        </div>
                    </div>

                    {/* Avatar Circle */}
                    <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] shadow-2xl transition-all duration-300 ${
                        player.name === currentState.lastActivePlayer ? 'border-poker-gold scale-110 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 
                        player.isActive ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-800 bg-zinc-900'
                    } flex items-center justify-center overflow-hidden bg-zinc-900 z-20`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-black"></div>
                        <span className="relative text-xs sm:text-sm font-black text-zinc-500 z-10 select-none">{player.name.substring(0, 2).toUpperCase()}</span>
                    </div>

                    {/* Name Plate */}
                    <div 
                        className="mt-[-12px] bg-black/80 border border-white/10 rounded-lg px-2 py-1 text-center min-w-[85px] shadow-xl z-30 relative transition-opacity duration-300 backdrop-blur-md"
                        style={{ opacity: hudOpacity }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = String(hudOpacity)}
                    >
                        <div className="text-[10px] font-bold text-white truncate max-w-[80px] leading-tight">{player.name}</div>
                        <div className="text-[9px] font-mono text-poker-emerald leading-tight tracking-tight font-bold">{formatAmt(player.currentStack)}</div>
                    </div>

                    {/* Hole Cards */}
                    {player.isActive && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex -space-x-5 sm:-space-x-7 hover:space-x-1 transition-all z-10 perspective-[500px]">
                            {player.cards && player.cards.length > 0 ? (
                                player.cards.map((c, i) => (
                                    <div key={i} className="transform rotate-y-6 hover:rotate-0 transition-transform duration-300 origin-bottom-left shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                                        <CardComponent cardString={c} small />
                                    </div>
                                ))
                            ) : (
                                <>
                                  <div className="transform -rotate-6 shadow-xl"><CardComponent cardString="" small hidden /></div>
                                  <div className="transform rotate-6 shadow-xl"><CardComponent cardString="" small hidden /></div>
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Bet Chips */}
                    {player.bet > 0 && (
                        <div className="absolute top-24 flex flex-col items-center animate-in slide-in-from-top-4 fade-in duration-300 z-20">
                            <ChipStack amount={player.bet} />
                            <span className="mt-1 text-[8px] font-mono font-bold text-white bg-black/60 px-1.5 py-0.5 rounded border border-white/10 shadow-lg backdrop-blur-sm">{formatAmt(player.bet)}</span>
                        </div>
                    )}
                </div>
            </React.Fragment>
        ))}
      </div>

      {/* Control Deck */}
      <div className="bg-[#09090b] border-x-[10px] border-b-[10px] border-[#18181b] rounded-b-3xl shadow-xl flex flex-col">
         {/* Equity Graph Section */}
         {showEquity && (
             <div className="h-24 bg-black/40 border-b border-zinc-800 relative flex items-center px-4">
                 <div className="absolute left-4 top-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                     <TrendingUp className="w-3 h-3" /> Equity
                 </div>
                 <div className="flex-1 h-full mt-2 ml-4 relative min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityTimeline} onClick={(e) => {
                            if (e.activePayload && e.activePayload[0]) {
                                setActionIndex(e.activePayload[0].payload.index);
                            }
                        }}>
                            <defs>
                                <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="index" hide />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip 
                                contentStyle={{backgroundColor: '#000', borderColor: '#333', fontSize: '10px'}}
                                itemStyle={{color: '#fff'}}
                                formatter={(val: number) => [`${val.toFixed(0)}%`, 'Win %']}
                                labelFormatter={() => ''}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="heroEquity" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorEq)" 
                                strokeWidth={2}
                                animationDuration={300}
                            />
                            <ReferenceLine x={actionIndex} stroke="#fbbf24" strokeDasharray="3 3" />
                        </AreaChart>
                    </ResponsiveContainer>
                 </div>
                 {/* Live Equity Badge */}
                 {liveEquity && (
                     <div className="ml-4 flex flex-col items-center">
                         <span className="text-2xl font-black text-poker-green">{liveEquity.hero.toFixed(0)}%</span>
                         <span className="text-[9px] text-zinc-500">Win Rate</span>
                     </div>
                 )}
             </div>
         )}

         {/* Controls */}
         <div className="p-4 flex flex-col gap-4">
             {/* Timeline Bar */}
             <div className="flex items-center gap-3 text-xs">
                <span className="w-16 text-right font-mono text-poker-gold font-bold">{currentState.street}</span>
                <div className="relative flex-1 h-2 bg-zinc-800 rounded-full cursor-pointer group transition-all" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    setActionIndex(Math.floor(pct * timeline.length));
                }}>
                    {timeline.map((t, i) => t.type === 'street' ? (
                        <div key={i} className="absolute top-0 w-0.5 h-full bg-white/20 z-10" style={{ left: `${((i)/timeline.length)*100}%` }}></div>
                    ) : null)}
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-poker-gold to-yellow-600 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all duration-100" style={{ width: `${((actionIndex + 1) / timeline.length) * 100}%` }}></div>
                </div>
                <span className="w-16 font-mono text-zinc-500">{actionIndex + 1}/{timeline.length}</span>
             </div>

             <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                     {['Preflop', 'Flop', 'Turn', 'River'].map(st => (
                         <button key={st} onClick={() => jumpToStreet(st)} className="px-3 py-1.5 text-[10px] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors font-bold uppercase tracking-wide">{st.charAt(0)}</button>
                     ))}
                 </div>

                 <div className="flex items-center gap-3">
                     <button onClick={() => setActionIndex(0)} className="text-zinc-500 hover:text-white transition-colors"><RotateCcw className="w-4 h-4" /></button>
                     <button onClick={() => setActionIndex(Math.max(0, actionIndex - 1))} className="text-zinc-400 hover:text-white transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                     <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg ${isPlaying ? 'bg-zinc-800 text-white' : 'bg-white text-black'}`}
                     >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                     </button>
                     <button onClick={() => setActionIndex(Math.min(timeline.length - 1, actionIndex + 1))} className="text-zinc-400 hover:text-white transition-colors"><ChevronRight className="w-6 h-6" /></button>
                     <button onClick={() => setActionIndex(timeline.length - 1)} className="text-zinc-500 hover:text-white transition-colors"><FastForward className="w-4 h-4" /></button>
                 </div>

                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                        <button onClick={() => setShowLog(!showLog)} className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${showLog ? 'text-white bg-zinc-800' : 'text-zinc-400'}`} title="Log">
                            <List className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowEquity(!showEquity)} className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${showEquity ? 'text-white bg-zinc-800' : 'text-zinc-400'}`} title="Graph">
                            <Activity className="w-4 h-4" />
                        </button>
                        <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                        <button onClick={() => setShowBB(!showBB)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
                            {showBB ? <Hash className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(true)} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white border border-zinc-800"><Edit className="w-4 h-4" /></button>
                        <button onClick={handleAnalyze} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/20">
                            <BrainCircuit className="w-4 h-4" /> Analyze
                        </button>
                    </div>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};
