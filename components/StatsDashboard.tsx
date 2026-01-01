
import React, { useMemo, useState, useEffect } from 'react';
import { usePoker } from '../App';
import { calculateStats, parseHeroHandDetails, getHoleCardsKey, calculateSessions } from '../services/statsParser';
import { analyzeLeaks, Leak, getMatrixCell } from '../services/pokerLogic';
import { HandFilter, HandHistory, PokerSession, PlayerStats } from '../types';
import { 
    TrendingUp, Activity, Users, DollarSign, Target, Zap, 
    Crosshair, Filter, Calendar, Layout, Layers, RefreshCw, X, ArrowRight, PlayCircle, Clock, ChevronDown, ChevronUp, History, Bomb, UserSearch, Save, StickyNote, Hexagon,
    AlertTriangle, BarChart as BarChartIcon, Table, Code2, Sparkles, Terminal, CheckCircle2, Search, GraduationCap, AlertOctagon,
    Swords, Fingerprint
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, BarChart, Bar, Legend, ReferenceLine, Brush, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

// --- Helper Components ---

const StatCard = ({ label, value, subtext, icon: Icon, colorClass, trend }: any) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm group relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
            <Icon className="w-12 h-12" />
        </div>
        <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider group-hover:text-white transition-colors">{label}</div>
            <div className={`p-1.5 rounded-lg bg-black/40 ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
        </div>
        <div className="relative z-10">
            <div className="text-xl font-black text-white">{value}</div>
            {subtext && (
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-zinc-500 font-mono">{subtext}</span>
                    {trend && (
                        <span className={`text-[9px] font-bold ${trend > 0 ? 'text-poker-green' : 'text-poker-red'}`}>
                            {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>
            )}
        </div>
    </div>
);

const ActivityCalendar = ({ hands }: { hands: HandHistory[] }) => {
    const days = useMemo(() => {
        const d = new Map<string, number>();
        hands.forEach(h => {
            const dateStr = new Date(h.timestamp).toISOString().split('T')[0];
            d.set(dateStr, (d.get(dateStr) || 0) + 1);
        });
        
        const result = [];
        const today = new Date();
        for (let i = 150; i >= 0; i--) { // Last ~5 months
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                count: d.get(dateStr) || 0
            });
        }
        return result;
    }, [hands]);

    return (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 flex flex-col h-full">
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-poker-gold" /> Grind Consistency
            </h3>
            <div className="flex-1 flex flex-wrap gap-1 content-start overflow-hidden">
                 {days.map((day, i) => {
                    let bg = 'bg-zinc-800/50';
                    if (day.count > 0) bg = 'bg-poker-green/30';
                    if (day.count > 5) bg = 'bg-poker-green/60';
                    if (day.count > 10) bg = 'bg-poker-green';
                    
                    return (
                        <div 
                            key={day.date} 
                            className={`w-2 h-2 rounded-[1px] ${bg} hover:scale-150 hover:z-10 transition-all cursor-help`}
                            title={`${day.date}: ${day.count} hands`}
                        ></div>
                    );
                })}
            </div>
            <div className="mt-2 text-[9px] text-zinc-500 flex items-center justify-between">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-[1px] bg-zinc-800/50"></div>
                    <div className="w-2 h-2 rounded-[1px] bg-poker-green/30"></div>
                    <div className="w-2 h-2 rounded-[1px] bg-poker-green/60"></div>
                    <div className="w-2 h-2 rounded-[1px] bg-poker-green"></div>
                </div>
                <span>More</span>
            </div>
        </div>
    );
};

const ChipGraph = ({ hands }: { hands: HandHistory[] }) => {
    const data = useMemo(() => {
        const sorted = [...hands].sort((a, b) => a.timestamp - b.timestamp);
        let runningTotal = 0;
        return sorted.map((h, i) => {
            const { netWin } = parseHeroHandDetails(h);
            runningTotal += netWin;
            return {
                index: i + 1,
                date: new Date(h.timestamp).toLocaleDateString(),
                win: netWin,
                total: runningTotal,
                hero: h.hero
            };
        });
    }, [hands]);

    if (hands.length === 0) return <div className="h-full flex items-center justify-center text-zinc-600 text-xs">No data to plot</div>;

    const isPositive = data.length > 0 && data[data.length - 1].total >= 0;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                    dataKey="index" 
                    stroke="#52525b" 
                    tick={{fontSize: 10}} 
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis 
                    stroke="#52525b" 
                    tick={{fontSize: 10}} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(val: number) => [`$${val.toLocaleString()}`, 'Bankroll']}
                    labelFormatter={(label) => `Hand #${label}`}
                />
                <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={isPositive ? "#10b981" : "#ef4444"} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

const HoleCardsHeatmap = ({ hands, mode }: { hands: HandHistory[], mode: 'win' | 'vol' }) => {
    const gridData = useMemo(() => {
        const map = new Map<string, { win: number, count: number }>();
        
        hands.forEach(h => {
            const { heroCards, netWin } = parseHeroHandDetails(h);
            const key = getHoleCardsKey(heroCards);
            if (key) {
                const curr = map.get(key) || { win: 0, count: 0 };
                curr.win += netWin;
                curr.count += 1;
                map.set(key, curr);
            }
        });
        return map;
    }, [hands]);

    const maxVal = useMemo(() => {
        let max = 0;
        gridData.forEach(v => {
            const val = mode === 'win' ? Math.abs(v.win) : v.count;
            if (val > max) max = val;
        });
        return max || 1;
    }, [gridData, mode]);

    return (
        <div className="grid grid-cols-13 gap-[2px] bg-zinc-950 p-1 rounded-xl border border-zinc-900 aspect-square max-h-full">
            {Array.from({ length: 13 }).map((_, r) => (
                Array.from({ length: 13 }).map((_, c) => {
                    const hand = getMatrixCell(r, c);
                    const data = gridData.get(hand);
                    const val = data ? (mode === 'win' ? data.win : data.count) : 0;
                    
                    let bg = 'bg-zinc-900';
                    let text = 'text-zinc-700';
                    
                    if (data) {
                        text = 'text-white';
                        if (mode === 'vol') {
                            const intensity = Math.min((data.count / maxVal), 1);
                            bg = `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`; // Blue scale
                        } else {
                            // Win mode
                            if (val > 0) {
                                const intensity = Math.min((val / maxVal), 1);
                                bg = `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`; // Green
                            } else if (val < 0) {
                                const intensity = Math.min((Math.abs(val) / maxVal), 1);
                                bg = `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`; // Red
                            }
                        }
                    }

                    return (
                        <div 
                            key={hand}
                            className={`flex items-center justify-center rounded-[2px] text-[8px] sm:text-[10px] font-bold cursor-help transition-all hover:scale-150 hover:z-10 hover:shadow-xl ${bg} ${text}`}
                            title={`${hand}: ${data ? (mode === 'win' ? `$${data.win}` : `${data.count} hands`) : '-'}`}
                        >
                            {hand}
                        </div>
                    );
                })
            ))}
        </div>
    );
};

const VillainInspector = ({ stats }: { stats: PlayerStats[] }) => {
    const [selectedVillainId, setSelectedVillainId] = useState<string>('');
    const villains = useMemo(() => stats.slice(1, 20), [stats]); // Top 20 opponents by volume, skipping Hero (index 0)
    
    useEffect(() => {
        if (villains.length > 0 && !selectedVillainId) setSelectedVillainId(villains[0].name);
    }, [villains]);

    const selectedVillain = villains.find(v => v.name === selectedVillainId);
    
    if (villains.length === 0) return <div className="text-zinc-500 text-center p-4">No opponent data available yet.</div>;

    const radarData = selectedVillain ? [
        { subject: 'VPIP', A: selectedVillain.vpip, fullMark: 100 },
        { subject: 'PFR', A: selectedVillain.pfr, fullMark: 100 },
        { subject: 'Agg %', A: selectedVillain.afq, fullMark: 100 },
        { subject: '3-Bet', A: selectedVillain.threeBet * 3, fullMark: 100 }, // Scale up for visual
        { subject: 'C-Bet', A: selectedVillain.cBetFlop, fullMark: 100 },
        { subject: 'WTSD', A: selectedVillain.wtsd, fullMark: 100 },
    ] : [];

    return (
        <div className="flex flex-col h-full bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <UserSearch className="w-4 h-4 text-poker-gold" /> Opponent Intel
                </h3>
                <select 
                    className="bg-black/50 border border-zinc-700 rounded-lg text-xs text-white px-2 py-1 outline-none focus:border-poker-gold"
                    value={selectedVillainId}
                    onChange={(e) => setSelectedVillainId(e.target.value)}
                >
                    {villains.map(v => (
                        <option key={v.name} value={v.name}>{v.name} ({v.handsPlayed}h)</option>
                    ))}
                </select>
             </div>

             <div className="flex-1 flex flex-col md:flex-row gap-4 items-center">
                 <div className="flex-1 w-full h-[250px] relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#3f3f46" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name={selectedVillain?.name} dataKey="A" stroke="#fbbf24" strokeWidth={2} fill="#fbbf24" fillOpacity={0.3} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid #333' }}
                                itemStyle={{ color: '#fbbf24' }}
                            />
                        </RadarChart>
                     </ResponsiveContainer>
                     <div className="absolute top-0 right-0 text-[9px] text-zinc-500 font-mono border border-zinc-800 rounded p-1">
                         Style: <span className="text-white font-bold">{selectedVillain?.style}</span>
                     </div>
                 </div>

                 <div className="w-full md:w-1/3 space-y-2">
                     <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                         <div className="text-[10px] text-zinc-500 uppercase font-bold">Winnings off Villain</div>
                         <div className={`text-xl font-black ${selectedVillain && selectedVillain.winnings < 0 ? 'text-poker-green' : 'text-red-500'}`}>
                             ${selectedVillain ? Math.abs(selectedVillain.winnings).toLocaleString() : 0}
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <div className="p-2 bg-zinc-900 rounded-lg text-center">
                             <div className="text-[9px] text-zinc-500">Fold to 3B</div>
                             <div className="text-sm font-bold text-white">{selectedVillain?.foldTo3Bet.toFixed(0)}%</div>
                         </div>
                         <div className="p-2 bg-zinc-900 rounded-lg text-center">
                             <div className="text-[9px] text-zinc-500">Fold to CBet</div>
                             <div className="text-sm font-bold text-white">{selectedVillain?.foldToCBetFlop.toFixed(0)}%</div>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
};

// --- Leak Report Card Component ---
const LeakReportCard = ({ leaks, heroStats }: { leaks: Leak[], heroStats: PlayerStats | undefined }) => {
    if (!heroStats) return <div className="text-zinc-500 p-8 text-center">No data available for analysis.</div>;

    // Calculate Grade
    const criticalCount = leaks.filter(l => l.severity === 'critical').length;
    const majorCount = leaks.filter(l => l.severity === 'major').length;
    
    let grade = 'A';
    let gradeColor = 'text-poker-green';
    
    if (criticalCount > 0 || majorCount > 2) {
        grade = 'C';
        gradeColor = 'text-poker-gold';
    }
    if (criticalCount > 1 || majorCount > 4) {
        grade = 'F';
        gradeColor = 'text-red-500';
    }
    if (criticalCount === 0 && majorCount <= 1) {
        grade = 'B';
        gradeColor = 'text-blue-400';
    }
    if (leaks.every(l => l.severity === 'good')) {
        grade = 'A+';
        gradeColor = 'text-purple-400';
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Scorecard */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-poker-gold/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Overall Grade</h3>
                <div className={`text-9xl font-black ${gradeColor} drop-shadow-2xl`}>{grade}</div>
                <p className="text-zinc-400 mt-4 text-sm max-w-[200px]">
                    {grade === 'A+' ? 'You are playing near optimal ranges.' : 
                     grade === 'F' ? 'Major leaks detected. Immediate adjustments needed.' : 
                     'Solid foundation, but room for improvement.'}
                </p>
            </div>

            {/* Leak List */}
            <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-500" /> Detected Leaks
                </h3>
                
                <div className="space-y-3">
                    {leaks.length === 0 && (
                        <div className="p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800 text-center text-zinc-500">
                            No significant leaks detected. Great job!
                        </div>
                    )}
                    
                    {leaks.map((leak) => (
                        <div key={leak.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-4 items-start relative overflow-hidden transition-all ${
                            leak.severity === 'critical' ? 'bg-red-950/20 border-red-900/50' : 
                            leak.severity === 'major' ? 'bg-orange-950/20 border-orange-900/50' : 
                            leak.severity === 'good' ? 'bg-green-950/10 border-green-900/20' :
                            'bg-zinc-900/30 border-zinc-800'
                        }`}>
                            {leak.severity !== 'good' && (
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                    leak.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                                }`}></div>
                            )}

                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text-sm font-bold ${
                                        leak.severity === 'critical' ? 'text-red-400' : 
                                        leak.severity === 'major' ? 'text-orange-400' : 
                                        leak.severity === 'good' ? 'text-green-400' : 'text-zinc-300'
                                    }`}>{leak.title}</h4>
                                    
                                    <div className="flex items-center gap-2 text-xs font-mono bg-black/40 px-2 py-1 rounded">
                                        <span className="text-zinc-400">{leak.metric}:</span>
                                        <span className="text-white font-bold">{leak.currentVal.toFixed(1)}</span>
                                        <span className="text-zinc-600">/</span>
                                        <span className="text-poker-gold">{leak.targetVal}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-300 mb-2">{leak.description}</p>
                                {leak.severity !== 'good' && (
                                    <div className="flex items-start gap-2 text-xs bg-black/20 p-2 rounded-lg text-zinc-400 border border-white/5">
                                        <GraduationCap className="w-4 h-4 shrink-0 text-poker-gold" />
                                        <span>{leak.advice}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const HandsTable = ({ hands, onReview }: any) => (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider">
                    <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Hero</th>
                        <th className="p-4">Hand</th>
                        <th className="p-4 text-right">Pot</th>
                        <th className="p-4 text-right">Result</th>
                        <th className="p-4 text-center">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {hands.slice(0, 10).map((h: HandHistory) => {
                         const { heroCards, netWin } = parseHeroHandDetails(h);
                         return (
                            <tr key={h.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 text-zinc-400">{new Date(h.timestamp).toLocaleDateString()}</td>
                                <td className="p-4 font-bold text-white">{h.hero}</td>
                                <td className="p-4 font-mono text-poker-gold">{heroCards.join('') || '-'}</td>
                                <td className="p-4 text-right font-mono text-zinc-300">{h.potSize}</td>
                                <td className={`p-4 text-right font-bold ${netWin >= 0 ? 'text-poker-green' : 'text-red-500'}`}>
                                    {netWin >= 0 ? '+' : ''}{netWin}
                                </td>
                                <td className="p-4 text-center">
                                    <button onClick={() => onReview(h)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors">
                                        <PlayCircle className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                         );
                    })}
                </tbody>
            </table>
        </div>
        {hands.length > 10 && (
            <div className="p-3 text-center text-xs text-zinc-500 border-t border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-colors">
                View all {hands.length} hands
            </div>
        )}
    </div>
);

// --- MAIN DASHBOARD ---

export const StatsDashboard: React.FC = () => {
  const { hands, setViewMode, setSelectedHand, user } = usePoker();
  const [activeTab, setActiveTab] = useState<'overview' | 'leaks' | 'hands' | 'opponents'>('overview');
  const [matrixMode, setMatrixMode] = useState<'win' | 'vol'>('win');

  // Filters State
  const [filters, setFilters] = useState<HandFilter>({
      dateRange: 'all',
      position: 'all',
      result: 'all',
      minPot: 0,
      isBombPot: undefined
  });

  const filteredHands = useMemo(() => {
      // Basic filtering logic could go here
      return hands; 
  }, [hands, filters]);
  
  const stats = useMemo(() => calculateStats(filteredHands), [filteredHands]);
  const heroStats = stats[0]; 
  const leaks = useMemo(() => heroStats ? analyzeLeaks(heroStats) : [], [heroStats]);

  const handleReviewHand = (hand: HandHistory) => {
      setSelectedHand(hand);
      setViewMode('review');
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => { setActiveTab(id); }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === id 
            ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700' 
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
        }`}
      >
          <Icon className="w-3.5 h-3.5" /> {label}
      </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      
      {/* Header & Controls - Fixed at Top */}
      <div className="shrink-0 p-4 lg:p-6 pb-2 space-y-4 bg-background/95 backdrop-blur z-10 border-b border-zinc-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                    <Activity className="text-poker-gold w-6 h-6" /> Pro Tracker
                </h1>
                <p className="text-zinc-400 mt-1 text-xs flex items-center gap-2">
                    Database: <span className="text-white font-mono">{hands.length}</span> hands
                </p>
            </div>
            
            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 backdrop-blur-sm overflow-x-auto max-w-full">
                <TabButton id="overview" label="Dashboard" icon={Layout} />
                <TabButton id="opponents" label="Villains" icon={Swords} />
                <TabButton id="leaks" label="Leak Finder" icon={AlertTriangle} />
                <TabButton id="hands" label="Hand List" icon={Layers} />
            </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500 mr-2 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Filters
            </div>
            <select 
                className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 focus:border-poker-gold outline-none"
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
            >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
            </select>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
            
            {/* --- DASHBOARD VIEW --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Net Profit" value={`$${heroStats?.winnings.toLocaleString() || 0}`} subtext={`${heroStats?.bb100.toFixed(1) || 0} bb/100`} icon={DollarSign} colorClass="text-poker-green" trend={12} />
                        <StatCard label="VPIP / PFR" value={`${heroStats?.vpip.toFixed(0) || 0} / ${heroStats?.pfr.toFixed(0) || 0}`} subtext={heroStats?.style || 'Unknown'} icon={Target} colorClass="text-poker-blue" />
                        <StatCard label="3-Bet %" value={`${heroStats?.threeBet.toFixed(1) || 0}%`} subtext={`Fold to 3B: ${heroStats?.foldTo3Bet.toFixed(0) || 0}%`} icon={Zap} colorClass="text-poker-red" />
                        <StatCard label="Aggression" value={`${heroStats?.afq.toFixed(0) || 0}%`} subtext={`AF: ${heroStats?.af.toFixed(1) || 0}`} icon={Crosshair} colorClass="text-poker-gold" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Graph */}
                        <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 flex flex-col h-[350px]">
                            <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-poker-green" /> Chip Graph
                            </h3>
                            <div className="flex-1 w-full bg-zinc-950/50 rounded-xl overflow-hidden">
                                <ChipGraph hands={filteredHands} />
                            </div>
                        </div>

                        {/* Side Widgets */}
                        <div className="flex flex-col gap-4 h-[350px]">
                            <div className="h-[120px] min-h-0">
                                <ActivityCalendar hands={filteredHands} />
                            </div>
                            <div className="flex-1 min-h-0 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 flex flex-col">
                                 <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                                        <Fingerprint className="w-3.5 h-3.5 text-blue-400" /> Heatmap
                                    </h3>
                                    <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                                        <button onClick={() => setMatrixMode('win')} className={`px-2 py-0.5 text-[9px] font-bold rounded ${matrixMode === 'win' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>$</button>
                                        <button onClick={() => setMatrixMode('vol')} className={`px-2 py-0.5 text-[9px] font-bold rounded ${matrixMode === 'vol' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>#</button>
                                    </div>
                                 </div>
                                 <div className="flex-1 flex items-center justify-center">
                                     <HoleCardsHeatmap hands={filteredHands} mode={matrixMode} />
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- OPPONENTS TAB --- */}
            {activeTab === 'opponents' && (
                <div className="animate-slide-up h-[600px]">
                    <VillainInspector stats={stats} />
                </div>
            )}

            {/* --- LEAKS TAB --- */}
            {activeTab === 'leaks' && (
                <LeakReportCard leaks={leaks} heroStats={heroStats} />
            )}

            {/* --- HAND LIST TAB --- */}
            {activeTab === 'hands' && (
                 <div className="animate-slide-up">
                    <HandsTable hands={filteredHands} onReview={handleReviewHand} />
                 </div>
            )}
            
        </div>
      </div>
    </div>
  );
};
