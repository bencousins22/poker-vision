import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HandHistory, ReplayerPlayer, HandAction } from '../types';
import { parseHandForReplay } from '../services/handReplayerParser';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, RotateCcw, FastForward, List, Activity, Hash, Coins, Edit, Save, Grid3X3, X, BrainCircuit, TrendingUp, Scale } from 'lucide-react';
import { usePoker } from '../App';
import { getMatrixCell, DEFAULT_RANGES, calculateApproxEquity } from '../services/pokerLogic';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  hand: HandHistory;
  onAnalyzeSpot: (context: string) => void;
}

const SUIT_COLORS: Record<string, string> = { 'h': 'text-red-500', 'd': 'text-blue-500', 'c': 'text-emerald-500', 's': 'text-zinc-400' };
const SUIT_ICONS: Record<string, string> = { 'h': '♥', 'd': '♦', 'c': '♣', 's': '♠' };

const ChipStack: React.FC<{ amount: number; className?: string }> = ({ amount, className }) => {
    let bg = 'bg-red-600', border = 'border-red-700';
    if (amount >= 1000) { bg = 'bg-amber-400'; border = 'border-amber-600'; }
    else if (amount >= 500) { bg = 'bg-purple-600'; border = 'border-purple-800'; }
    else if (amount >= 100) { bg = 'bg-zinc-900'; border = 'border-zinc-700'; }
    else if (amount >= 25) { bg = 'bg-emerald-600'; border = 'border-emerald-800'; }

    const count = Math.min(Math.max(1, Math.floor(Math.log10(amount || 1) * 2)), 5);

    return (
        <div className={`relative w-6 h-8 flex flex-col-reverse items-center ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={`absolute w-full h-2 rounded-full ${bg} border border-b-2 ${border} shadow-[0_2px_4px_rgba(0,0,0,0.4)] z-${i}`} style={{ bottom: `${i * 4}px` }} />
            ))}
        </div>
    );
};

const CardComponent: React.FC<{ cardString: string, small?: boolean, hidden?: boolean, className?: string }> = ({ cardString, small, hidden, className }) => {
  if (hidden) return (
    <div className={`${small ? 'w-8 h-12' : 'w-14 h-20 sm:w-16 sm:h-24'} bg-zinc-900 border border-zinc-700 rounded shadow-xl relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-zinc-700 opacity-20"></div></div>
    </div>
  );
  if (!cardString || cardString.length < 2) return null;
  const rank = cardString.slice(0, -1);
  const suit = cardString.slice(-1).toLowerCase();
  const color = SUIT_COLORS[suit] || 'text-zinc-200';
  
  return (
    <div className={`${small ? 'w-8 h-12 text-xs' : 'w-14 h-20 sm:w-16 sm:h-24 text-xl'} bg-white rounded shadow-[0_4px_8px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center font-bold select-none relative transition-transform hover:-translate-y-1 ${className}`}>
      <span className={`absolute top-0.5 left-1 leading-none ${color}`}>{rank}</span>
      <span className={`${small ? 'text-lg' : 'text-3xl'} ${color}`}>{SUIT_ICONS[suit]}</span>
    </div>
  );
};

export const HandReplayer: React.FC<Props> = ({ hand, onAnalyzeSpot }) => {
  const { players: initialPlayers, timeline } = useMemo(() => parseHandForReplay(hand.rawText), [hand.rawText]); 
  const { addToast, user, updateHand } = usePoker(); 
  
  const [actionIndex, setActionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed] = useState(1200);
  const [showBB, setShowBB] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(hand.rawText);
  const [showLog, setShowLog] = useState(false);
  const [showEquity, setShowEquity] = useState(true); 

  const currentState = useMemo(() => {
    const players = JSON.parse(JSON.stringify(initialPlayers)) as ReplayerPlayer[];
    let pot = 0;
    let board: string[] = [];
    let street = 'Preflop';
    let currentBet = 0; 
    let heroFacingBet = 0; 

    for (let i = 0; i <= actionIndex && i < timeline.length; i++) {
      const action = timeline[i];
      if (action.type === 'street') {
        street = action.street || street;
        if (action.cards) board = [...board, ...action.cards];
        players.forEach(p => { pot += p.bet; p.bet = 0; p.action = ''; });
        currentBet = 0;
      } else if (action.type === 'action' || action.type === 'blind') {
        const p = players.find(pl => pl.name === action.player);
        if (p) {
             const amt = action.amount || 0;
             if (action.actionType === 'fold') { p.isActive = false; p.action = 'Fold'; }
             else if (action.actionType === 'call') { p.currentStack -= amt; p.bet += amt; p.action = 'Call'; }
             else if (action.actionType === 'bet' || action.actionType === 'raise') { 
                 const total = action.actionType === 'raise' ? amt : amt + p.bet; // Parser usually gives total for raise
                 const cost = action.actionType === 'raise' ? amt - p.bet : amt;
                 p.currentStack -= cost; 
                 p.bet += cost; 
                 currentBet = Math.max(currentBet, p.bet);
                 p.action = action.actionType === 'raise' ? 'Raise' : 'Bet';
             } else if (action.type === 'blind') {
                 p.currentStack -= amt; p.bet += amt; currentBet = Math.max(currentBet, p.bet); p.action = action.desc;
             }
        }
      }
    }
    const hero = players.find(p => p.cards && p.cards.length > 0 && p.isActive);
    if (hero && currentBet > hero.bet) heroFacingBet = currentBet - hero.bet;

    return { players, pot, board, street, currentBet, heroFacingBet };
  }, [initialPlayers, timeline, actionIndex]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setActionIndex(prev => {
          if (prev >= timeline.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeline.length, playbackSpeed]);

  const handleSaveEdit = () => {
      updateHand(hand.id, { rawText: editedText });
      setIsEditing(false);
      addToast({ title: "Hand Updated", type: 'success' });
      setActionIndex(0);
  };

  const getSeatPos = (i: number) => {
     const angle = ((i - 1) / 9) * 2 * Math.PI + (Math.PI/2); 
     return { left: `${50 + 42 * Math.cos(angle)}%`, top: `${48 + 38 * Math.sin(angle)}%` };
  };

  if (isEditing) return (
      <div className="w-full h-full flex flex-col bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <div className="flex justify-between mb-4">
              <h3 className="text-white font-bold">Edit History</h3>
              <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1 bg-poker-gold text-black font-bold rounded">Save</button>
              </div>
          </div>
          <textarea className="flex-1 bg-black border border-zinc-800 rounded p-4 text-xs font-mono text-zinc-300" value={editedText} onChange={(e) => setEditedText(e.target.value)} />
      </div>
  );

  return (
    <div className="flex flex-col w-full h-full relative select-none bg-[#09090b]">
      {/* Table Surface */}
      <div className="relative flex-1 bg-[#1a1a1a] rounded-t-3xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#065f46_0%,_#022c22_70%,_#000_100%)]">
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
            <div className="absolute inset-[40px] rounded-[180px] border-[20px] border-[#064e3b] opacity-50 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-6xl font-black text-[#064e3b] opacity-20 tracking-widest blur-sm">POKERVISION</span>
            </div>
        </div>

        {/* Community Cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] flex gap-2 sm:gap-3 z-20">
            {currentState.board.map((card, i) => (
                <div key={i} className="animate-in zoom-in slide-in-from-top-4 duration-300 shadow-2xl">
                    <CardComponent cardString={card} />
                </div>
            ))}
            {Array(5 - currentState.board.length).fill(0).map((_, i) => (
                <div key={`e-${i}`} className="w-14 h-20 sm:w-16 sm:h-24 rounded border-2 border-dashed border-emerald-500/20 bg-black/10" />
            ))}
        </div>

        {/* Pot */}
        <div className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5 shadow-xl z-10">
            <span className="text-poker-gold font-mono text-xl font-bold tracking-tight">${currentState.players.reduce((acc, p) => acc + p.bet, currentState.pot).toLocaleString()}</span>
        </div>

        {/* Players */}
        {currentState.players.map((p) => (
            <div key={p.seat} className={`absolute w-28 h-28 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30 transition-all duration-300 ${!p.isActive ? 'opacity-50 grayscale' : ''}`} style={getSeatPos(p.seat)}>
                {/* Action Bubble */}
                <div className={`absolute -top-8 transition-all duration-200 ${p.action ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-black shadow-lg">{p.action}</span>
                </div>
                
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-full border-[3px] shadow-2xl bg-zinc-900 flex items-center justify-center relative ${p.name === currentState.players.find(x=>x.bet>0)?.name ? 'border-poker-gold' : 'border-zinc-700'}`}>
                    <span className="text-xs font-black text-zinc-500">{p.name.substring(0, 2).toUpperCase()}</span>
                    {p.isDealer && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full text-[8px] flex items-center justify-center font-bold border border-zinc-300 text-black">D</div>}
                </div>

                {/* Nameplate */}
                <div className="mt-[-10px] bg-black/90 border border-zinc-700 rounded px-2 py-0.5 text-center min-w-[80px] shadow-lg z-20">
                    <div className="text-[9px] font-bold text-white truncate max-w-[70px]">{p.name}</div>
                    <div className="text-[9px] font-mono text-poker-emerald font-bold">${p.currentStack}</div>
                </div>

                {/* Cards */}
                {p.isActive && (
                    <div className="absolute -top-5 flex -space-x-4">
                        {p.cards && p.cards.length > 0 ? p.cards.map((c, i) => (
                            <div key={i} className="transform origin-bottom hover:-translate-y-2 transition-transform"><CardComponent cardString={c} small /></div>
                        )) : (
                            <><div className="transform -rotate-6"><CardComponent cardString="" small hidden /></div><div className="transform rotate-6"><CardComponent cardString="" small hidden /></div></>
                        )}
                    </div>
                )}

                {/* Chips */}
                {p.bet > 0 && (
                    <div className="absolute top-20 flex flex-col items-center animate-in slide-in-from-top-2 fade-in">
                        <ChipStack amount={p.bet} />
                        <span className="text-[8px] font-mono font-bold text-white bg-black/60 px-1 rounded mt-0.5">${p.bet}</span>
                    </div>
                )}
            </div>
        ))}

        {/* Log Drawer */}
        <div className={`absolute top-0 right-0 bottom-0 w-64 bg-zinc-950/95 border-l border-white/5 backdrop-blur-xl transform transition-transform duration-300 z-50 ${showLog ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-3 border-b border-white/10 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-400">Action Log</span>
                <button onClick={() => setShowLog(false)}><X className="w-4 h-4 text-zinc-500" /></button>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto h-full pb-10">
                {timeline.map((item, i) => (
                    <div key={i} onClick={() => setActionIndex(i)} className={`p-2 text-[10px] rounded cursor-pointer ${i === actionIndex ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-white/5'}`}>
                        {item.type === 'street' ? <span className="font-bold text-zinc-300">--- {item.street} ---</span> : <span><span className="font-bold">{item.player}</span>: {item.desc.replace(item.player + ': ', '')}</span>}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-zinc-950 border-t border-zinc-800 flex items-center px-6 gap-6 shrink-0 z-40">
         <div className="flex items-center gap-1">
             <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                 {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
             </button>
         </div>
         
         <div className="flex-1 flex flex-col gap-1">
             <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                 <span>{currentState.street}</span>
                 <span>{actionIndex + 1} / {timeline.length}</span>
             </div>
             <input 
                type="range" min="0" max={timeline.length - 1} value={actionIndex} 
                onChange={(e) => setActionIndex(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-poker-gold"
             />
         </div>

         <div className="flex items-center gap-2">
             <button onClick={() => setActionIndex(Math.max(0, actionIndex - 1))} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"><ChevronLeft className="w-5 h-5" /></button>
             <button onClick={() => setActionIndex(Math.min(timeline.length - 1, actionIndex + 1))} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"><ChevronRight className="w-5 h-5" /></button>
         </div>

         <div className="h-8 w-px bg-zinc-800 mx-2"></div>

         <div className="flex gap-2">
             <button onClick={() => setShowLog(!showLog)} className={`p-2 rounded ${showLog ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><List className="w-4 h-4" /></button>
             <button onClick={() => setIsEditing(true)} className="p-2 text-zinc-500 hover:text-white"><Edit className="w-4 h-4" /></button>
             <button onClick={() => onAnalyzeSpot("Analyze")} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded flex items-center gap-2"><BrainCircuit className="w-3.5 h-3.5" /> AI</button>
         </div>
      </div>
    </div>
  );
};