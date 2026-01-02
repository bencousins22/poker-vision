import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HandHistory, ReplayerPlayer, HandAction } from '../types';
import { parseHandForReplay } from '../services/handReplayerParser';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, RotateCcw, FastForward, List, Activity, Hash, Coins, Edit, Save, Grid3X3, X, BrainCircuit, TrendingUp, Scale, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePoker } from '../App';
import { getMatrixCell, DEFAULT_RANGES, calculateApproxEquity } from '../services/pokerLogic';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

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

const CardComponent: React.FC<{ cardString: string, small?: boolean, hidden?: boolean, className?: string, highlight?: boolean }> = ({ cardString, small, hidden, className, highlight }) => {
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
    <div className={`${small ? 'w-9 h-14 text-xs' : 'w-16 h-24 sm:w-20 sm:h-28 text-2xl'} bg-white rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center font-bold select-none relative transition-transform hover:-translate-y-1 ${highlight ? 'ring-2 ring-poker-gold shadow-[0_0_20px_rgba(251,191,36,0.5)]' : ''} ${className}`}>
      <span className={`absolute top-1 left-1.5 leading-none ${color}`}>{rank}</span>
      <span className={`${small ? 'text-xl' : 'text-4xl'} ${color}`}>{SUIT_ICONS[suit]}</span>
      <span className={`absolute bottom-1 right-1.5 leading-none ${color} rotate-180`}>{rank}</span>
    </div>
  );
};

// Math Overlay Component
const MathOverlay: React.FC<{ pot: number, callAmount: number, heroEquity: number }> = ({ pot, callAmount, heroEquity }) => {
    const potOdds = callAmount > 0 ? (callAmount / (pot + callAmount)) * 100 : 0;
    const isGoodCall = heroEquity >= potOdds;

    return (
        <div className="absolute top-24 left-6 z-40 bg-black/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-2xl animate-fade-in w-64">
            <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
                <BrainCircuit className="w-4 h-4 text-poker-gold" />
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Vision Math</span>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Pot Odds</span>
                    <span className="text-sm font-mono font-bold text-white">{potOdds.toFixed(1)}%</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Req. Equity</span>
                    <span className={`text-sm font-mono font-bold ${isGoodCall ? 'text-poker-emerald' : 'text-poker-red'}`}>
                        {potOdds.toFixed(1)}%
                    </span>
                </div>

                <div className="h-px bg-zinc-800 my-2" />

                <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Hero Equity</span>
                    <span className="text-sm font-mono font-bold text-poker-gold">{heroEquity.toFixed(1)}%</span>
                </div>

                {callAmount > 0 && (
                     <div className={`mt-2 text-center text-[10px] font-bold py-1 rounded ${isGoodCall ? 'bg-poker-emerald/20 text-poker-emerald' : 'bg-poker-red/20 text-poker-red'}`}>
                         {isGoodCall ? 'PROFITABLE CALL' : 'NEGATIVE EV'}
                     </div>
                )}
            </div>
        </div>
    );
};

export const HandReplayer: React.FC<Props> = ({ hand, onAnalyzeSpot }) => {
  const { players: initialPlayers, timeline } = useMemo(() => parseHandForReplay(hand.rawText), [hand.rawText]); 
  const { addToast, user, updateHand } = usePoker(); 
  
  const [actionIndex, setActionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed] = useState(1200);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(hand.rawText);
  const [showLog, setShowLog] = useState(false);
  const [showGraph, setShowGraph] = useState(false); // Toggle for graph view overlay

  // --- State Calculation ---
  const currentState = useMemo(() => {
    const players = JSON.parse(JSON.stringify(initialPlayers)) as ReplayerPlayer[];
    let pot = 0;
    let board: string[] = [];
    let street = 'Preflop';
    let currentBet = 0; 
    let heroFacingBet = 0; 

    // Find active street for graph highlight
    let streetStartIndex = 0;

    for (let i = 0; i <= actionIndex && i < timeline.length; i++) {
      const action = timeline[i];
      if (action.type === 'street') {
        street = action.street || street;
        streetStartIndex = i;
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
                 const total = action.actionType === 'raise' ? amt : amt + p.bet;
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
    const hero = players.find(p => p.cards && p.cards.length > 0 && p.isActive); // Assuming Hero has cards
    if (hero && currentBet > hero.bet) heroFacingBet = currentBet - hero.bet;

    return { players, pot, board, street, currentBet, heroFacingBet, hero };
  }, [initialPlayers, timeline, actionIndex]);

  // --- Equity Calculation ---
  const equityData = useMemo(() => {
      // Calculate equity at each street start
      const data = [];
      let boardSoFar: string[] = [];
      const hero = initialPlayers.find(p => p.cards && p.cards.length > 0);

      if (!hero) return []; // No hero cards known

      // Streets: Pre, Flop, Turn, River
      const streets = ['Preflop', 'Flop', 'Turn', 'River'];

      // Initial Preflop Equity
      const preEq = calculateApproxEquity(hero.cards || [], [], [], true);
      data.push({ name: 'Pre', equity: preEq.hero });

      // Find street markers in timeline
      timeline.forEach(action => {
          if (action.type === 'street' && action.cards) {
              boardSoFar = [...boardSoFar, ...action.cards];
              const eq = calculateApproxEquity(hero.cards || [], [], boardSoFar, true);
              data.push({ name: action.street?.replace('*** ', '').replace(' ***', '') || 'Street', equity: eq.hero });
          }
      });
      return data;
  }, [timeline, initialPlayers]);

  const currentEquity = equityData.length > 0 ? equityData[equityData.length - 1].equity : 50;

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
     // Elliptical positioning
     const angle = ((i - 1) / 9) * 2 * Math.PI + (Math.PI/2); 
     return { left: `${50 + 40 * Math.cos(angle)}%`, top: `${48 + 35 * Math.sin(angle)}%` };
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
    <div className="flex flex-col w-full h-full relative select-none bg-[#09090b] overflow-hidden">

      {/* Top Bar: Vision Badge & Stats */}
      <div className="absolute top-4 left-0 right-0 z-30 px-6 flex justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-poker-emerald animate-pulse"></div>
              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Live Replay</span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-full px-4 py-1.5 shadow-xl">
              <CheckCircle2 className="w-3.5 h-3.5 text-poker-gold" />
              <span className="text-xs font-black text-white tracking-tight">VISION <span className="text-poker-gold">VERIFIED</span></span>
          </div>
      </div>

      {/* Equity Graph (Overlay or Panel) */}
      <div className="absolute top-20 right-6 w-64 h-32 bg-black/60 backdrop-blur-sm rounded-xl border border-white/5 z-20 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
           <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={equityData}>
                   <defs>
                       <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                       </linearGradient>
                   </defs>
                   <Area type="monotone" dataKey="equity" stroke="#fbbf24" fillOpacity={1} fill="url(#colorEq)" strokeWidth={2} />
               </AreaChart>
           </ResponsiveContainer>
           <div className="absolute bottom-2 right-2 text-[9px] font-mono text-poker-gold font-bold">HERO EQ</div>
      </div>

      {/* Main Table Area */}
      <div className="relative flex-1 bg-[#1a1a1a] overflow-hidden flex items-center justify-center">
        {/* Environment Background */}
        <div className="absolute inset-0 bg-zinc-950">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e293b_0%,_#020617_80%)] opacity-40"></div>
        </div>

        {/* The Felt */}
        <div className="relative w-[95%] max-w-[1200px] aspect-[2/1] bg-[#0c4a6e] rounded-[50%] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[16px] border-[#0f172a] transform rotate-x-10 preserve-3d">
            <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(circle_at_center,_#10b981_0%,_#064e3b_80%,_#022c22_100%)] shadow-inner">
                 <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
                 {/* Center Logo */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                     <span className="text-6xl font-black text-black tracking-[0.5em] -rotate-12">VISION</span>
                 </div>
                 {/* Betting Line */}
                 <div className="absolute inset-[15%] rounded-[50%] border-2 border-white/5"></div>
            </div>

            {/* Community Cards */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] flex gap-2 sm:gap-4 z-20">
                {currentState.board.map((card, i) => (
                    <div key={i} className="animate-slide-up shadow-2xl">
                        <CardComponent cardString={card} highlight={i >= currentState.board.length - (currentState.street === 'Flop' ? 3 : 1)} />
                    </div>
                ))}
                {Array(5 - currentState.board.length).fill(0).map((_, i) => (
                    <div key={`e-${i}`} className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-dashed border-emerald-500/10 bg-black/5" />
                ))}
            </div>

            {/* Pot Display */}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="px-5 py-2 bg-black/60 backdrop-blur-md rounded-full border border-poker-gold/30 shadow-[0_0_20px_rgba(251,191,36,0.2)] flex items-center gap-2">
                    <Coins className="w-4 h-4 text-poker-gold" />
                    <span className="text-poker-gold font-mono text-xl font-black tracking-tight">${currentState.players.reduce((acc, p) => acc + p.bet, currentState.pot).toLocaleString()}</span>
                </div>
            </div>

            {/* Players */}
            {currentState.players.map((p) => (
                <div key={p.seat} className={`absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30 transition-all duration-300 ${!p.isActive ? 'opacity-40 grayscale blur-[1px]' : ''}`} style={getSeatPos(p.seat)}>

                    {/* Dealer Button */}
                    {p.isDealer && <div className="absolute top-0 right-4 w-6 h-6 bg-white rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-zinc-300 text-black shadow-lg z-40">D</div>}

                    {/* Action Bubble */}
                    <div className={`absolute -top-10 transition-all duration-300 z-50 ${p.action ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'}`}>
                        <span className="px-3 py-1 rounded-lg text-[10px] font-black bg-white text-black shadow-xl uppercase tracking-wider">{p.action}</span>
                    </div>

                    {/* Avatar Ring */}
                    <div className={`w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center relative shadow-2xl transition-all duration-300 ${p.bet > 0 || p.action === 'Raise' ? 'ring-4 ring-poker-gold shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'ring-2 ring-zinc-700'}`}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center">
                             <UserAvatar name={p.name} />
                        </div>
                    </div>

                    {/* Nameplate */}
                    <div className="mt-[-12px] bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1 text-center min-w-[90px] shadow-lg z-40 relative">
                        <div className="text-[10px] font-bold text-white truncate max-w-[80px]">{p.name}</div>
                        <div className="text-[10px] font-mono text-poker-emerald font-bold">${p.currentStack}</div>
                    </div>

                    {/* Hole Cards */}
                    {p.isActive && (
                        <div className="absolute -top-4 flex -space-x-4 z-10 hover:z-50 hover:scale-110 transition-all">
                            {p.cards && p.cards.length > 0 ? p.cards.map((c, i) => (
                                <div key={i} className={`transform origin-bottom shadow-xl ${i===0?'-rotate-6':'rotate-6'}`}><CardComponent cardString={c} small /></div>
                            )) : (
                                <><div className="transform -rotate-6"><CardComponent cardString="" small hidden /></div><div className="transform rotate-6"><CardComponent cardString="" small hidden /></div></>
                            )}
                        </div>
                    )}

                    {/* Chips */}
                    {p.bet > 0 && (
                        <div className="absolute top-24 flex flex-col items-center animate-slide-up">
                            <ChipStack amount={p.bet} />
                            <span className="text-[9px] font-mono font-bold text-white bg-black/80 px-1.5 py-0.5 rounded mt-1 border border-white/10">${p.bet}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* Floating Math Overlay for Hero */}
        {currentState.hero && currentState.heroFacingBet > 0 && currentState.street !== 'River' && (
            <MathOverlay pot={currentState.pot + currentState.currentBet} callAmount={currentState.heroFacingBet} heroEquity={currentEquity} />
        )}

        {/* Log Drawer */}
        <div className={`absolute top-0 right-0 bottom-0 w-80 bg-zinc-950/95 border-l border-white/5 backdrop-blur-xl transform transition-transform duration-300 z-50 ${showLog ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Hand History</span>
                <button onClick={() => setShowLog(false)}><X className="w-4 h-4 text-zinc-500 hover:text-white" /></button>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto h-full pb-20 scrollbar-thin scrollbar-thumb-zinc-800">
                {timeline.map((item, i) => (
                    <div key={i} onClick={() => setActionIndex(i)} className={`p-3 text-[11px] rounded-lg cursor-pointer border border-transparent transition-all ${i === actionIndex ? 'bg-zinc-800/50 border-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:bg-white/5'}`}>
                        {item.type === 'street' ? (
                            <div className="flex items-center gap-2 py-1">
                                <div className="h-px bg-zinc-800 flex-1"></div>
                                <span className="font-bold text-poker-gold uppercase tracking-widest text-[10px]">{item.street}</span>
                                <div className="h-px bg-zinc-800 flex-1"></div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <span className={`font-bold ${item.player === currentState.hero?.name ? 'text-poker-emerald' : 'text-zinc-300'}`}>{item.player}</span>
                                <span className="text-zinc-400">{item.desc.replace(item.player + ': ', '')}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Control Bar - High Tech Style */}
      <div className="h-24 bg-[#050505] border-t border-zinc-800 flex flex-col justify-center px-6 gap-2 shrink-0 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
         
         {/* Scrubber */}
         <div className="w-full h-1 bg-zinc-800 rounded-full relative group cursor-pointer">
             <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-poker-gold to-amber-600 rounded-full transition-all duration-100" style={{ width: `${(actionIndex / (timeline.length - 1)) * 100}%` }}>
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </div>
             <input 
                type="range" min="0" max={timeline.length - 1} value={actionIndex} 
                onChange={(e) => setActionIndex(parseInt(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
             />
         </div>

         <div className="flex items-center justify-between mt-2">
             <div className="flex items-center gap-4">
                 <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                     {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                 </button>
                 <div className="flex items-center bg-zinc-900 rounded-full p-1 border border-zinc-800">
                     <button onClick={() => setActionIndex(Math.max(0, actionIndex - 1))} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"><ChevronLeft className="w-5 h-5" /></button>
                     <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                     <button onClick={() => setActionIndex(Math.min(timeline.length - 1, actionIndex + 1))} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"><ChevronRight className="w-5 h-5" /></button>
                 </div>
                 <div className="text-xs font-mono text-zinc-500">
                     <span className="text-white font-bold">{currentState.street}</span> <span className="opacity-50 mx-2">|</span> {actionIndex + 1} / {timeline.length}
                 </div>
             </div>

             <div className="flex items-center gap-3">
                 <button onClick={() => setShowLog(!showLog)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${showLog ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900'}`}>
                     <List className="w-4 h-4" /> History
                 </button>
                 <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-900 transition-all">
                     <Edit className="w-4 h-4" /> Edit
                 </button>
                 <div className="w-px h-8 bg-zinc-800 mx-1"></div>
                 <button onClick={() => onAnalyzeSpot("Analyze")} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5">
                     <BrainCircuit className="w-4 h-4" /> VISION AI
                 </button>
             </div>
         </div>
      </div>
    </div>
  );
};

const UserAvatar = ({ name }: { name: string }) => {
    // Generate a consistent gradient/color based on name
    const colors = ['from-red-500 to-orange-500', 'from-blue-500 to-cyan-500', 'from-emerald-500 to-green-500', 'from-purple-500 to-pink-500'];
    const idx = name.length % colors.length;
    return (
        <span className={`text-xs font-black text-transparent bg-clip-text bg-gradient-to-br ${colors[idx]} grayscale-0`}>
            {name.substring(0, 2).toUpperCase()}
        </span>
    );
};
