
import React, { useMemo, useState, useEffect } from 'react';
import { usePoker } from '../App';
import { calculateStats, parseHeroHandDetails, getHoleCardsKey, calculateSessions } from '../services/statsParser';
import { analyzeLeaks, Leak, getMatrixCell } from '../services/pokerLogic';
import { HandFilter, HandHistory, PokerSession, PlayerStats } from '../types';
import { 
    TrendingUp, Activity, Users, DollarSign, Target, Zap, 
    Crosshair, Filter, Calendar, Layout, Layers, RefreshCw, X, ArrowRight, PlayCircle, Clock, ChevronDown, ChevronUp, History, Bomb, UserSearch, Save, StickyNote, Hexagon,
    AlertTriangle, BarChart as BarChartIcon, Table, Code2, Sparkles, Terminal, CheckCircle2, Search, GraduationCap, AlertOctagon,
    Swords, Fingerprint, PieChart, Info, Grid3X3
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, BarChart, Bar, Legend, ReferenceLine, Brush, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

// --- Helper: Safe Number Formatting ---
const safeNum = (num: number | undefined | null, decimals: number = 0): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toFixed(decimals);
};

// --- Helper Components ---

const StatCard = ({ label, value, subtext, icon: Icon, colorClass, trend, loading }: any) => (
    <div className="relative overflow-hidden bg-[#121214] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-300 group shadow-lg">
        {/* Background Glow */}
        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 scale-125 group-hover:scale-150 ${colorClass}`}>
            <Icon className="w-16 h-16" />
        </div>
        
        <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{label}</div>
            <div className={`p-2 rounded-xl bg-black/40 border border-white/5 ${colorClass} bg-opacity-10`}>
                <Icon className="w-4 h-4" />
            </div>
        </div>
        
        <div className="relative z-10">
            {loading ? (
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse mb-1"></div>
            ) : (
                <div className="text-2xl font-black text-white tracking-tight">{value}</div>
            )}
            
            {(subtext || trend) && (
                <div className="flex items-center gap-2 mt-2">
                    {trend !== undefined && (
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                    <span className="text-[10px] text-zinc-500 font-medium truncate">{subtext}</span>
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
        // Generate last 126 days (18 weeks x 7 days) for a nice grid
        for (let i = 125; i >= 0; i--) { 
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                count: d.get(dateStr) || 0,
                obj: date
            });
        }
        return result;
    }, [hands]);

    return (
        <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 flex flex-col h-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-poker-gold" /> Activity Map
                </h3>
                <span className="text-[10px] text-zinc-600 font-mono">{hands.length} Hands</span>
            </div>
            
            <div className="flex-1 min-h-0 flex flex-col justify-center">
                <div className="grid grid-flow-col grid-rows-7 gap-[3px] self-start">
                    {days.map((day) => {
                        let bg = 'bg-zinc-900';
                        if (day.count > 0) bg = 'bg-emerald-900/40 border-emerald-900';
                        if (day.count > 5) bg = 'bg-emerald-600/40 border-emerald-600';
                        if (day.count > 15) bg = 'bg-emerald-500 border-emerald-400';
                        
                        return (
                            <div 
                                key={day.date} 
                                className={`w-2.5 h-2.5 rounded-[2px] border border-transparent ${bg} hover:scale-150 hover:z-10 transition-all cursor-help relative group`}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-zinc-800 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                                    {day.date}: {day.count} hands
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="mt-3 text-[9px] text-zinc-600 flex items-center gap-2 font-medium">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-900"></div>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-900/40"></div>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600/40"></div>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500"></div>
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

    if (hands.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
            <Activity className="w-8 h-8 opacity-20" />
            <div className="text-xs font-medium">No sessions recorded</div>
        </div>
    );

    const isPositive = data.length > 0 && data[data.length - 1].total >= 0;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                    dataKey="index" 
                    stroke="#52525b" 
                    tick={{fontSize: 9, fill: '#71717a'}} 
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                />
                <YAxis 
                    stroke="#52525b" 
                    tick={{fontSize: 9, fill: '#71717a'}} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                    width={40}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px', padding: '8px' }}
                    itemStyle={{ color: '#fff', fontWeight: 600 }}
                    cursor={{ stroke: '#52525b', strokeWidth: 1 }}
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
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
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

    if (hands.length === 0) return (
         <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
            <Grid3X3 className="w-8 h-8 opacity-20" />
            <div className="text-xs font-medium">No hands to map</div>
        </div>
    );

    return (
        <div className="w-full aspect-square max-h-full flex flex-col">
            <div className="grid grid-cols-13 gap-[1px] bg-zinc-900 border border-zinc-800 p-[1px] rounded-lg overflow-hidden">
                {Array.from({ length: 13 }).map((_, r) => (
                    Array.from({ length: 13 }).map((_, c) => {
                        const hand = getMatrixCell(r, c);
                        const data = gridData.get(hand);
                        const val = data ? (mode === 'win' ? data.win : data.count) : 0;
                        
                        let bg = 'bg-[#18181b]';
                        let text = 'text-zinc-700';
                        let opacity = 'opacity-100';
                        
                        if (data) {
                            text = 'text-white';
                            if (mode === 'vol') {
                                const intensity = Math.min((data.count / maxVal), 1);
                                bg = `rgba(59, 130, 246, ${0.1 + intensity * 0.9})`; 
                            } else {
                                // Win mode
                                if (val > 0) {
                                    const intensity = Math.min((val / maxVal), 1);
                                    bg = `rgba(16, 185, 129, ${0.1 + intensity * 0.9})`; 
                                } else if (val < 0) {
                                    const intensity = Math.min((Math.abs(val) / maxVal), 1);
                                    bg = `rgba(239, 68, 68, ${0.1 + intensity * 0.9})`; 
                                } else {
                                    bg = 'bg-zinc-700';
                                }
                            }
                        } else {
                            opacity = 'opacity-50';
                        }

                        return (
                            <div 
                                key={hand}
                                className={`flex items-center justify-center text-[7px] sm:text-[9px] font-bold cursor-help transition-all hover:scale-150 hover:z-20 hover:shadow-xl hover:rounded-sm ${bg} ${text} ${opacity}`}
                                title={`${hand}: ${data ? (mode === 'win' ? `$${data.win}` : `${data.count} hands`) : 'No Data'}`}
                            >
                                {hand}
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
    );
};

const VillainInspector = ({ stats }: { stats: PlayerStats[] }) => {
    const [selectedVillainId, setSelectedVillainId] = useState<string>('');
    const villains = useMemo(() => stats.slice(1, 25), [stats]); 
    
    useEffect(() => {
        if (villains.length > 0 && !selectedVillainId) setSelectedVillainId(villains[0].name);
    }, [villains]);

    const selectedVillain = villains.find(v => v.name === selectedVillainId);
    
    if (villains.length === 0) return (
        <div className="flex flex-col items-center justify-center h-full p-12 text-zinc-600 bg-[#121214] border border-white/5 rounded-2xl">
            <UserSearch className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-bold">No Opponent Data</p>
            <p className="text-xs mt-1">Import hands to analyze villain tendencies.</p>
        </div>
    );

    const radarData = selectedVillain ? [
        { subject: 'VPIP', A: selectedVillain.vpip || 0, fullMark: 100 },
        { subject: 'PFR', A: selectedVillain.pfr || 0, fullMark: 100 },
        { subject: 'Agg %', A: selectedVillain.afq || 0, fullMark: 100 },
        { subject: '3-Bet', A: (selectedVillain.threeBet || 0) * 3, fullMark: 100 }, 
        { subject: 'C-Bet', A: selectedVillain.cBetFlop || 0, fullMark: 100 },
        { subject: 'WTSD', A: selectedVillain.wtsd || 0, fullMark: 100 },
    ] : [];

    return (
        <div className="flex flex-col h-full bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-lg">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Swords className="w-4 h-4 text-poker-gold" /> Opponent Intel
                </h3>
                <div className="relative">
                    <select 
                        className="bg-black/40 border border-zinc-700 rounded-lg text-xs text-white pl-3 pr-8 py-2 outline-none focus:border-poker-gold appearance-none min-w-[200px]"
                        value={selectedVillainId}
                        onChange={(e) => setSelectedVillainId(e.target.value)}
                    >
                        {villains.map(v => (
                            <option key={v.name} value={v.name}>{v.name} ({v.handsPlayed}h)</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-3 h-3 text-zinc-500 pointer-events-none" />
                </div>
             </div>

             <div className="flex-1 flex flex-col lg:flex-row gap-8">
                 {/* Radar Chart */}
                 <div className="flex-1 relative min-h-[300px] bg-black/20 rounded-2xl border border-white/5 p-4">
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#3f3f46" strokeOpacity={0.5} />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name={selectedVillain?.name} dataKey="A" stroke="#fbbf24" strokeWidth={3} fill="#fbbf24" fillOpacity={0.2} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#09090b', borderRadius: '8px', border: '1px solid #27272a', fontSize: '12px' }}
                                itemStyle={{ color: '#fbbf24' }}
                            />
                        </RadarChart>
                     </ResponsiveContainer>
                     
                     <div className="absolute top-4 right-4 text-xs font-mono bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
                         <span className="text-zinc-500">Style: </span>
                         <span className={`font-bold ${
                             selectedVillain?.style === 'LAG' ? 'text-red-400' : 
                             selectedVillain?.style === 'TAG' ? 'text-emerald-400' : 'text-white'
                         }`}>{selectedVillain?.style || 'Unknown'}</span>
                     </div>
                 </div>

                 {/* Stats Column */}
                 <div className="w-full lg:w-80 space-y-4">
                     <div className="p-5 bg-gradient-to-br from-zinc-900 to-black rounded-2xl border border-zinc-800 shadow-inner">
                         <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Profit vs Villain</div>
                         <div className={`text-3xl font-black ${selectedVillain && selectedVillain.winnings < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                             {selectedVillain && selectedVillain.winnings < 0 ? '+' : '-'}${Math.abs(selectedVillain?.winnings || 0).toLocaleString()}
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3">
                         <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                             <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Fold to 3Bet</div>
                             <div className="text-lg font-bold text-white">{safeNum(selectedVillain?.foldTo3Bet)}%</div>
                         </div>
                         <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                             <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Fold to CBet</div>
                             <div className="text-lg font-bold text-white">{safeNum(selectedVillain?.foldToCBetFlop)}%</div>
                         </div>
                         <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                             <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Aggression Freq</div>
                             <div className="text-lg font-bold text-white">{safeNum(selectedVillain?.afq)}%</div>
                         </div>
                         <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                             <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Showdown Win</div>
                             <div className="text-lg font-bold text-white">{safeNum(selectedVillain?.wmsd)}%</div>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
};

// --- Leak Report Card Component ---
const LeakReportCard = ({ leaks, heroStats }: { leaks: Leak[], heroStats: PlayerStats | undefined }) => {
    if (!heroStats) return (
        <div className="flex flex-col items-center justify-center p-12 bg-[#121214] border border-white/5 rounded-2xl text-center">
            <AlertTriangle className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold text-white">Insufficient Data</h3>
            <p className="text-zinc-500 text-sm mt-2">Play more hands to generate a leak analysis.</p>
        </div>
    );

    // Calculate Grade
    const criticalCount = leaks.filter(l => l.severity === 'critical').length;
    const majorCount = leaks.filter(l => l.severity === 'major').length;
    
    let grade = 'A';
    let gradeColor = 'text-emerald-400';
    let gradeGradient = 'from-emerald-400 to-emerald-600';
    
    if (criticalCount > 0 || majorCount > 2) {
        grade = 'C';
        gradeColor = 'text-poker-gold';
        gradeGradient = 'from-amber-400 to-orange-500';
    }
    if (criticalCount > 1 || majorCount > 4) {
        grade = 'F';
        gradeColor = 'text-red-500';
        gradeGradient = 'from-red-500 to-red-700';
    }
    if (criticalCount === 0 && majorCount <= 1 && grade !== 'A') {
        grade = 'B';
        gradeColor = 'text-blue-400';
        gradeGradient = 'from-blue-400 to-indigo-500';
    }
    if (leaks.every(l => l.severity === 'good')) {
        grade = 'A+';
        gradeColor = 'text-purple-400';
        gradeGradient = 'from-purple-400 to-pink-500';
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Scorecard */}
            <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${gradeGradient} opacity-5 rounded-full blur-3xl pointer-events-none group-hover:opacity-10 transition-opacity`}></div>
                
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Performance Grade</h3>
                <div className={`text-9xl font-black bg-clip-text text-transparent bg-gradient-to-br ${gradeGradient} drop-shadow-2xl scale-110`}>{grade}</div>
                <div className="mt-8 px-4 py-2 bg-black/40 rounded-full border border-white/5 backdrop-blur-sm">
                    <p className="text-zinc-300 text-xs font-medium">
                        {grade === 'A+' ? 'Optimal GTO ranges detected.' : 
                         grade === 'F' ? 'Critical leaks found. Immediate fix required.' : 
                         'Solid play with room for optimization.'}
                    </p>
                </div>
            </div>

            {/* Leak List */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertOctagon className="w-5 h-5 text-red-500" /> Detected Leaks
                    </h3>
                    <span className="text-xs text-zinc-500">{leaks.length} items analyzed</span>
                </div>
                
                <div className="space-y-3">
                    {leaks.length === 0 && (
                        <div className="p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800 text-center text-zinc-500 flex flex-col items-center">
                            <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500/50" />
                            <span>No significant leaks detected. Great job!</span>
                        </div>
                    )}
                    
                    {leaks.map((leak) => (
                        <div key={leak.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-5 items-start relative overflow-hidden transition-all hover:translate-x-1 ${
                            leak.severity === 'critical' ? 'bg-red-950/10 border-red-900/30' : 
                            leak.severity === 'major' ? 'bg-orange-950/10 border-orange-900/30' : 
                            leak.severity === 'good' ? 'bg-emerald-950/5 border-emerald-900/20' :
                            'bg-zinc-900/30 border-zinc-800'
                        }`}>
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                leak.severity === 'critical' ? 'bg-red-500' : 
                                leak.severity === 'major' ? 'bg-orange-500' : 
                                leak.severity === 'good' ? 'bg-emerald-500' : 'bg-zinc-500'
                            }`}></div>

                            <div className="flex-1 w-full">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`text-sm font-bold ${
                                        leak.severity === 'critical' ? 'text-red-400' : 
                                        leak.severity === 'major' ? 'text-orange-400' : 
                                        leak.severity === 'good' ? 'text-emerald-400' : 'text-zinc-300'
                                    }`}>{leak.title}</h4>
                                    
                                    <div className="flex items-center gap-2 text-[10px] font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
                                        <span className="text-zinc-500">{leak.metric}</span>
                                        <span className="text-white font-bold">{leak.currentVal.toFixed(1)}</span>
                                        <span className="text-zinc-600">/</span>
                                        <span className="text-poker-gold">{leak.targetVal}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed mb-3">{leak.description}</p>
                                {leak.severity !== 'good' && (
                                    <div className="flex items-start gap-3 text-xs bg-black/30 p-3 rounded-lg text-zinc-300 border border-white/5">
                                        <GraduationCap className="w-4 h-4 shrink-0 text-poker-gold mt-0.5" />
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

const HandsTable = ({ hands, onReview }: any) => {
    if (hands.length === 0) return (
         <div className="flex flex-col items-center justify-center p-12 bg-[#121214] border border-white/5 rounded-2xl text-center min-h-[400px]">
            <Layers className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-lg font-bold text-white">No Hand History</h3>
            <p className="text-zinc-500 text-sm mt-2 max-w-sm">
                Start by analyzing a video or importing a database to populate your hand history.
            </p>
        </div>
    );

    return (
        <div className="bg-[#121214] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-black/40 text-zinc-500 font-bold uppercase tracking-wider border-b border-white/5">
                        <tr>
                            <th className="p-5 font-bold">Date</th>
                            <th className="p-5 font-bold">Hero</th>
                            <th className="p-5 font-bold">Hand</th>
                            <th className="p-5 text-right font-bold">Pot</th>
                            <th className="p-5 text-right font-bold">Result</th>
                            <th className="p-5 text-center font-bold">Review</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {hands.slice(0, 15).map((h: HandHistory) => {
                             const { heroCards, netWin } = parseHeroHandDetails(h);
                             return (
                                <tr key={h.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-5 text-zinc-400 font-mono text-[11px]">{new Date(h.timestamp).toLocaleDateString()}</td>
                                    <td className="p-5 font-bold text-white">{h.hero}</td>
                                    <td className="p-5">
                                        <span className={`font-mono px-2 py-1 rounded bg-black/40 border border-white/5 ${heroCards.join('').includes('s') ? 'text-poker-gold' : 'text-zinc-300'}`}>
                                            {heroCards.join('') || '-'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right font-mono text-zinc-300">{h.potSize}</td>
                                    <td className={`p-5 text-right font-bold ${netWin >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                        {netWin >= 0 ? '+' : ''}{netWin}
                                    </td>
                                    <td className="p-5 text-center">
                                        <button onClick={() => onReview(h)} className="p-2 bg-zinc-900 hover:bg-white hover:text-black rounded-full text-zinc-500 transition-all opacity-60 group-hover:opacity-100 shadow-lg">
                                            <PlayCircle className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </div>
            {hands.length > 15 && (
                <div className="p-4 text-center text-xs text-zinc-500 border-t border-white/5 cursor-pointer hover:bg-white/5 transition-colors font-medium">
                    View all {hands.length} hands
                </div>
            )}
        </div>
    );
};

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
      // Future expansion: Implement real filtering logic here
      return hands; 
  }, [hands, filters]);
  
  const stats = useMemo(() => calculateStats(filteredHands), [filteredHands]);
  const heroStats = stats[0] || undefined; // Explicit undefined for safety
  const leaks = useMemo(() => heroStats ? analyzeLeaks(heroStats) : [], [heroStats]);

  const handleReviewHand = (hand: HandHistory) => {
      setSelectedHand(hand);
      setViewMode('review');
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => { setActiveTab(id); }}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === id 
            ? 'bg-zinc-800 text-white shadow-md ring-1 ring-zinc-700' 
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
        }`}
      >
          <Icon className="w-4 h-4" /> {label}
      </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      
      {/* Header & Controls - Fixed at Top */}
      <div className="shrink-0 px-6 py-5 pb-2 space-y-5 bg-background/95 backdrop-blur z-20 border-b border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                    <Activity className="text-poker-gold w-8 h-8" /> Pro Tracker
                </h1>
                <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Database: <span className="text-white font-mono">{hands.length}</span> hands processed
                </p>
            </div>
            
            <div className="flex gap-1 bg-[#121214] p-1.5 rounded-2xl border border-white/5 overflow-x-auto max-w-full shadow-lg">
                <TabButton id="overview" label="Dashboard" icon={Layout} />
                <TabButton id="opponents" label="Villains" icon={Swords} />
                <TabButton id="leaks" label="Leak Finder" icon={AlertTriangle} />
                <TabButton id="hands" label="Hand List" icon={Layers} />
            </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 overflow-x-auto pb-3 scrollbar-none pt-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500 mr-2 shrink-0 tracking-wider">
                <Filter className="w-3.5 h-3.5" /> Quick Filters
            </div>
            <select 
                className="bg-[#121214] border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 focus:border-poker-gold outline-none shadow-sm hover:border-zinc-700 transition-colors"
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
            >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-background to-[#050505]">
        <div className="max-w-[1600px] mx-auto space-y-8 pb-10">
            
            {/* --- DASHBOARD VIEW --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                        <StatCard 
                            label="Net Profit" 
                            value={`$${safeNum(heroStats?.winnings).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`} 
                            subtext={`${safeNum(heroStats?.bb100, 1)} bb/100`} 
                            icon={DollarSign} 
                            colorClass="text-emerald-500" 
                            trend={heroStats?.winnings && heroStats.winnings > 0 ? 12 : undefined} 
                        />
                        <StatCard 
                            label="VPIP / PFR" 
                            value={`${safeNum(heroStats?.vpip)} / ${safeNum(heroStats?.pfr)}`} 
                            subtext={heroStats?.style || 'Unknown Style'} 
                            icon={Target} 
                            colorClass="text-blue-500" 
                        />
                        <StatCard 
                            label="3-Bet Freq" 
                            value={`${safeNum(heroStats?.threeBet, 1)}%`} 
                            subtext={`Fold to 3B: ${safeNum(heroStats?.foldTo3Bet)}%`} 
                            icon={Zap} 
                            colorClass="text-red-500" 
                        />
                        <StatCard 
                            label="Aggression" 
                            value={`${safeNum(heroStats?.afq)}%`} 
                            subtext={`Factor: ${safeNum(heroStats?.af, 1)}`} 
                            icon={Crosshair} 
                            colorClass="text-poker-gold" 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Graph */}
                        <div className="lg:col-span-2 bg-[#121214] border border-white/5 rounded-2xl p-6 flex flex-col h-[400px] shadow-lg">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Chip Graph
                                </h3>
                                <div className="flex gap-2">
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold border border-emerald-500/20">All Sessions</span>
                                </div>
                            </div>
                            <div className="flex-1 w-full bg-black/30 rounded-xl border border-white/5 overflow-hidden relative">
                                <ChipGraph hands={filteredHands} />
                            </div>
                        </div>

                        {/* Side Widgets */}
                        <div className="flex flex-col gap-6 h-[400px]">
                            <div className="h-[140px] min-h-0">
                                <ActivityCalendar hands={filteredHands} />
                            </div>
                            <div className="flex-1 min-h-0 bg-[#121214] border border-white/5 rounded-2xl p-5 flex flex-col shadow-lg">
                                 <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                                        <Fingerprint className="w-4 h-4 text-blue-500" /> Heatmap
                                    </h3>
                                    <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                                        <button onClick={() => setMatrixMode('win')} className={`px-2 py-1 text-[10px] font-bold rounded ${matrixMode === 'win' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>$ Win</button>
                                        <button onClick={() => setMatrixMode('vol')} className={`px-2 py-1 text-[10px] font-bold rounded ${matrixMode === 'vol' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>Vol</button>
                                    </div>
                                 </div>
                                 <div className="flex-1 flex items-center justify-center bg-black/20 rounded-xl border border-white/5 p-2">
                                     <HoleCardsHeatmap hands={filteredHands} mode={matrixMode} />
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- OPPONENTS TAB --- */}
            {activeTab === 'opponents' && (
                <div className="animate-in slide-in-from-bottom-4 h-[650px]">
                    <VillainInspector stats={stats} />
                </div>
            )}

            {/* --- LEAKS TAB --- */}
            {activeTab === 'leaks' && (
                <LeakReportCard leaks={leaks} heroStats={heroStats} />
            )}

            {/* --- HAND LIST TAB --- */}
            {activeTab === 'hands' && (
                 <div className="animate-in slide-in-from-bottom-4">
                    <HandsTable hands={filteredHands} onReview={handleReviewHand} />
                 </div>
            )}
            
        </div>
      </div>
    </div>
  );
};
