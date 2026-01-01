import React, { useMemo, useState, useEffect } from 'react';
import { usePoker } from '../App';
import { calculateStats, parseHeroHandDetails, getHoleCardsKey, calculateSessions } from '../services/statsParser';
import { analyzeLeaks, Leak, getMatrixCell } from '../services/pokerLogic';
import { HandFilter, HandHistory, PokerSession, PlayerStats } from '../types';
import { 
    TrendingUp, Activity, Users, DollarSign, Target, Zap, 
    Crosshair, Filter, Calendar, Layout, Layers, RefreshCw, X, ArrowRight, PlayCircle, Clock, ChevronDown, ChevronUp, History, Bomb, UserSearch, Save, StickyNote, Hexagon,
    AlertTriangle, BarChart as BarChartIcon, Table, Code2, Sparkles, Terminal, CheckCircle2, Search, GraduationCap, AlertOctagon,
    Swords, Fingerprint, PieChart, Info, Grid3X3, ArrowUpRight, ArrowDownRight, Award
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, BarChart, Bar, Cell, Legend, ReferenceLine, Brush, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

// --- Utility Components ---

const CustomTooltip = ({ active, payload, label, formatter }: { active?: boolean; payload?: any[]; label?: string; formatter?: (value: any) => React.ReactNode }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#09090b] border border-zinc-800 p-3 rounded-lg shadow-2xl backdrop-blur-md z-50">
                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs font-medium">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-zinc-300">{entry.name}:</span>
                        <span className="text-white font-mono font-bold">
                            {formatter ? formatter(entry.value) : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

interface KPICardProps {
    label: string;
    value: string | number;
    subtext: string;
    icon: any;
    trend?: number;
    color?: string;
}

const KPICard = ({ label, value, subtext, icon: Icon, trend, color = "emerald" }: KPICardProps) => {
    const colorStyles: Record<string, string> = {
        emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        red: "text-red-500 bg-red-500/10 border-red-500/20",
        gold: "text-poker-gold bg-poker-gold/10 border-poker-gold/20",
    };

    const activeStyle = colorStyles[color] || colorStyles.emerald;

    return (
        <div className="bg-[#121214] border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
                    <span className="text-2xl font-black text-white mt-1 tracking-tight">{value}</span>
                </div>
                <div className={`p-2.5 rounded-lg ${activeStyle}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[120px]">{subtext}</span>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend as number)}%
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-Views ---

const OverviewTab = ({ hands, stats, timeFilter, setTimeFilter }: { hands: HandHistory[], stats: PlayerStats[], timeFilter: string, setTimeFilter: (v: any) => void }) => {
    const heroStats = stats[0];
    const sessions = useMemo(() => calculateSessions(hands), [hands]);
    
    // Chart Data Preparation
    const chartData = useMemo(() => {
        const sorted = [...hands].sort((a, b) => a.timestamp - b.timestamp);
        let runningTotal = 0;
        let showdownTotal = 0;
        let nonShowdownTotal = 0;

        return sorted.map((h, i) => {
            const { netWin } = parseHeroHandDetails(h);
            const isShowdown = h.rawText.includes('*** SHOWDOWN ***');
            
            runningTotal += netWin;
            if (isShowdown) showdownTotal += netWin;
            else nonShowdownTotal += netWin;

            return {
                id: i,
                date: new Date(h.timestamp).toLocaleDateString(),
                total: runningTotal,
                sd: showdownTotal,
                nsd: nonShowdownTotal,
            };
        });
    }, [hands]);

    // Positional Data
    const positionData = useMemo(() => {
        if (!heroStats) return [];
        return Object.entries(heroStats.positionWinnings).map(([pos, val]) => ({
            pos,
            val: val as number
        }));
    }, [heroStats]);

    // Heatmap Data
    const heatmapData = useMemo(() => {
        const map = new Map<string, number>();
        hands.forEach((h: HandHistory) => {
            const { heroCards, netWin } = parseHeroHandDetails(h);
            const key = getHoleCardsKey(heroCards);
            if (key) map.set(key, (map.get(key) || 0) + netWin);
        });
        return map;
    }, [hands]);

    const maxWin = Math.max(...Array.from(heatmapData.values()), 1);

    // Safe accessors for heroStats
    const winnings = heroStats?.winnings ?? 0;
    const bb100 = heroStats?.bb100 ?? 0;
    const vpip = heroStats?.vpip ?? 0;
    const pfr = heroStats?.pfr ?? 0;
    const threeBet = heroStats?.threeBet ?? 0;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Control Bar */}
            <div className="flex justify-end">
                <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex text-[10px] font-bold">
                    {['all', 'month', 'week', 'day'].map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeFilter(tf)}
                            className={`px-3 py-1.5 rounded-md uppercase transition-all ${timeFilter === tf ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    label="Net Winnings" 
                    value={`$${winnings.toLocaleString()}`} 
                    subtext={`${hands.length} Hands Tracked`}
                    icon={DollarSign} 
                    trend={12} 
                    color={winnings >= 0 ? "emerald" : "red"}
                />
                <KPICard 
                    label="BB / 100" 
                    value={bb100.toFixed(1)} 
                    subtext="Winrate"
                    icon={Activity} 
                    trend={5} 
                    color="blue"
                />
                <KPICard 
                    label="VPIP / PFR" 
                    value={`${vpip.toFixed(0)} / ${pfr.toFixed(0)}`} 
                    subtext="Preflop Aggression"
                    icon={Target} 
                    color="gold"
                />
                <KPICard 
                    label="3-Bet %" 
                    value={`${threeBet.toFixed(1)}%`} 
                    subtext="Re-Raise Freq"
                    icon={Zap} 
                    color="red"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Graph */}
                <div className="lg:col-span-2 bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-sm h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                            <TrendingUp className="w-4 h-4 text-poker-gold" /> Profit Timeline
                        </h3>
                        <div className="flex gap-2 text-[10px] font-bold">
                            <span className="flex items-center gap-1 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Total</span>
                            <span className="flex items-center gap-1 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Showdown</span>
                            <span className="flex items-center gap-1 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400"></div> Non-SD</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full relative min-h-0 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="date" hide />
                                <YAxis 
                                    tick={{fontSize: 10, fill: '#52525b'}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickFormatter={(val: any) => `$${val}`}
                                    width={40}
                                />
                                <Tooltip content={<CustomTooltip formatter={(val: any) => `$${Number(val as any).toLocaleString()}`} />} />
                                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#colorTotal)" name="Total Profit" />
                                <Area type="monotone" dataKey="sd" stroke="#3b82f6" strokeWidth={2} fill="none" strokeDasharray="3 3" name="Showdown" />
                                <Area type="monotone" dataKey="nsd" stroke="#ef4444" strokeWidth={2} fill="none" strokeDasharray="3 3" name="Non-Showdown" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Side: Heatmap */}
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 flex flex-col shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                            <Grid3X3 className="w-4 h-4 text-poker-gold" /> Hand Heatmap
                        </h3>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                        <div className="grid grid-cols-13 gap-[1px] bg-zinc-800/50 p-[1px] rounded border border-zinc-800/50">
                            {Array.from({ length: 13 }).map((_, r) => (
                                Array.from({ length: 13 }).map((_, c) => {
                                    const hand = getMatrixCell(r, c);
                                    const val = heatmapData.get(hand) || 0;
                                    
                                    // Heatmap Logic
                                    let bg = 'bg-[#18181b]';
                                    let text = 'text-zinc-700';
                                    if (val !== 0) {
                                        const opacity = Math.min(Math.abs(val as number) / maxWin, 1) * 0.9 + 0.1;
                                        bg = val > 0 ? `rgba(16, 185, 129, ${opacity})` : `rgba(239, 68, 68, ${opacity})`;
                                        text = 'text-white';
                                    }

                                    return (
                                        <div 
                                            key={hand} 
                                            className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[7px] font-bold ${bg} ${text} hover:scale-150 hover:z-10 transition-transform rounded-[1px] cursor-help`}
                                            title={`${hand}: ${val > 0 ? '+' : ''}$${val}`}
                                        >
                                            {hand}
                                        </div>
                                    );
                                })
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Position Chart */}
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-sm h-[300px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                            <Crosshair className="w-4 h-4 text-poker-gold" /> Winrate by Position
                        </h3>
                    </div>
                    <div className="flex-1 w-full min-h-0 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={positionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="pos" tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: '#27272a'}} content={<CustomTooltip formatter={(v: any) => `$${v}`} />} />
                                <Bar dataKey="val" fill="#10b981" radius={[4, 4, 0, 0]}>
                                    {positionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.val >= 0 ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Sessions List */}
                <div className="lg:col-span-2 bg-[#121214] border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                            <History className="w-4 h-4 text-zinc-400" /> Recent Sessions
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Duration</th>
                                    <th className="p-4">Hands</th>
                                    <th className="p-4">Stakes</th>
                                    <th className="p-4">Hourly</th>
                                    <th className="p-4 text-right">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                                {sessions.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-zinc-500">No sessions recorded yet.</td></tr>
                                ) : (
                                    sessions.slice(0, 5).map(session => (
                                        <tr key={session.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="p-4">{new Date(session.startTime).toLocaleDateString()}</td>
                                            <td className="p-4">{session.durationMinutes.toFixed(0)}m</td>
                                            <td className="p-4">{session.handsPlayed}</td>
                                            <td className="p-4 font-mono text-zinc-400">{session.mostPlayedStakes}</td>
                                            <td className="p-4 font-mono">${session.hourlyRate.toFixed(0)}/hr</td>
                                            <td className={`p-4 text-right font-bold font-mono ${session.netWon >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {session.netWon >= 0 ? '+' : ''}${session.netWon.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VillainTab = ({ stats }: { stats: PlayerStats[] }) => {
    const villains = useMemo(() => stats.slice(1), [stats]);
    const [selectedId, setSelectedId] = useState<string>(villains[0]?.name || '');
    
    const selectedVillain = villains.find(v => v.name === selectedId);

    if (villains.length === 0) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
            <UserSearch className="w-16 h-16 opacity-20 mb-4" />
            <p className="text-sm font-bold">No Opponents Found</p>
            <p className="text-xs">Analyze hands to populate villain database.</p>
        </div>
    );

    const radarData = selectedVillain ? [
        { subject: 'VPIP', A: selectedVillain.vpip, fullMark: 100 },
        { subject: 'PFR', A: selectedVillain.pfr, fullMark: 100 },
        { subject: 'AGG', A: selectedVillain.afq, fullMark: 100 },
        { subject: '3-Bet', A: selectedVillain.threeBet * 3, fullMark: 100 },
        { subject: 'WTSD', A: selectedVillain.wtsd, fullMark: 100 },
        { subject: 'C-Bet', A: selectedVillain.cBetFlop, fullMark: 100 },
    ] : [];

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)] min-h-[600px] gap-6 animate-in slide-in-from-bottom-2">
            {/* Sidebar List */}
            <div className="w-full lg:w-80 bg-[#121214] border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider">Opponent List</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700">
                    {villains.map(v => (
                        <button
                            key={v.name}
                            onClick={() => setSelectedId(v.name)}
                            className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${selectedId === v.name ? 'bg-zinc-800 border border-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                        >
                            <div>
                                <div className="font-bold text-xs truncate max-w-[120px]">{v.name}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">{v.handsPlayed} hands</div>
                            </div>
                            <div className={`text-[10px] font-bold ${v.winnings < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {v.winnings < 0 ? '+' : '-'}${Math.abs(v.winnings)}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Detail View */}
            {selectedVillain && (
                <div className="flex-1 bg-[#121214] border border-zinc-800 rounded-xl p-6 lg:p-8 flex flex-col overflow-y-auto">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 flex items-center justify-center text-2xl font-black text-zinc-500 shadow-xl">
                                {selectedVillain.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white">{selectedVillain.name}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                        selectedVillain.style === 'LAG' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                        selectedVillain.style === 'TAG' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                                    }`}>
                                        {selectedVillain.style}
                                    </span>
                                    <span className="text-xs text-zinc-500 font-mono">{selectedVillain.handsPlayed} Hands tracked</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Profit vs Hero</div>
                            <div className={`text-3xl font-black ${selectedVillain.winnings < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {selectedVillain.winnings < 0 ? '+' : '-'}${Math.abs(selectedVillain.winnings)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-black/20 rounded-xl border border-white/5 p-4 relative min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#3f3f46" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name={selectedVillain.name} dataKey="A" stroke="#fbbf24" strokeWidth={3} fill="#fbbf24" fillOpacity={0.2} />
                                    <Tooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                            <div className="absolute top-2 right-2 text-[10px] text-zinc-600 font-mono">Tendency Radar</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 content-start">
                            {[
                                { label: 'VPIP', val: selectedVillain.vpip, ideal: '20-28', desc: 'Voluntarily Put $ In Pot' },
                                { label: 'PFR', val: selectedVillain.pfr, ideal: '16-24', desc: 'Pre-Flop Raise' },
                                { label: '3-Bet', val: selectedVillain.threeBet, ideal: '6-10', desc: 'Re-Raise Preflop' },
                                { label: 'Fold to 3B', val: selectedVillain.foldTo3Bet, ideal: '40-50', desc: 'Exploitability' },
                                { label: 'C-Bet Flop', val: selectedVillain.cBetFlop, ideal: '55-70', desc: 'Aggression' },
                                { label: 'Fold to C-Bet', val: selectedVillain.foldToCBetFlop, ideal: '40-50', desc: 'Defensiveness' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-zinc-400">{stat.label}</span>
                                        <span className="text-xs font-mono text-zinc-600">{stat.ideal}%</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white mb-1">{stat.val.toFixed(1)}%</div>
                                    <div className="text-[9px] text-zinc-500">{stat.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const LeaksTab = ({ leaks }: { leaks: Leak[] }) => {
    // Calculate Grade
    const critical = leaks.filter(l => l.severity === 'critical').length;
    const major = leaks.filter(l => l.severity === 'major').length;
    let grade = 'A';
    let color = 'text-emerald-500';
    
    if (critical > 0 || major > 2) { grade = 'C'; color = 'text-amber-500'; }
    if (critical > 1 || major > 4) { grade = 'F'; color = 'text-red-500'; }
    if (critical === 0 && major <= 1 && grade !== 'A') { grade = 'B'; color = 'text-blue-500'; }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
            <div className="lg:col-span-4">
                <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-8 text-center shadow-lg relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-current to-transparent opacity-5 rounded-full blur-3xl pointer-events-none ${color}`}></div>
                    <div className="relative z-10">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Overall Grade</div>
                        <div className={`text-9xl font-black ${color} drop-shadow-2xl`}>{grade}</div>
                        <div className="mt-6 flex flex-col gap-2">
                            <div className="flex justify-between text-xs px-4 py-2 bg-zinc-900 rounded border border-zinc-800">
                                <span className="text-zinc-400">Critical Leaks</span>
                                <span className="text-red-500 font-bold">{critical}</span>
                            </div>
                            <div className="flex justify-between text-xs px-4 py-2 bg-zinc-900 rounded border border-zinc-800">
                                <span className="text-zinc-400">Major Leaks</span>
                                <span className="text-amber-500 font-bold">{major}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-500" /> Action Required
                </h3>
                {leaks.length === 0 ? (
                    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl text-center text-zinc-500">
                        No leaks detected yet. Keep playing!
                    </div>
                ) : (
                    leaks.map(leak => (
                        <div key={leak.id} className={`p-6 rounded-xl border flex gap-6 relative overflow-hidden group ${
                            leak.severity === 'critical' ? 'bg-red-950/10 border-red-900/30' :
                            leak.severity === 'major' ? 'bg-amber-950/10 border-amber-900/30' :
                            'bg-zinc-900/30 border-zinc-800'
                        }`}>
                            <div className={`w-1.5 absolute left-0 top-0 bottom-0 ${
                                leak.severity === 'critical' ? 'bg-red-500' :
                                leak.severity === 'major' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}></div>
                            
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-base font-bold text-zinc-200">{leak.title}</h4>
                                    <span className="text-[10px] font-mono bg-black/40 px-2 py-1 rounded border border-white/5 text-zinc-400">
                                        Current: <span className="text-white font-bold">{leak.currentVal.toFixed(1)}</span> / Target: {leak.targetVal}
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-400 leading-relaxed mb-4">{leak.description}</p>
                                <div className="flex items-start gap-3 bg-black/20 p-3 rounded-lg">
                                    <GraduationCap className="w-4 h-4 text-poker-gold shrink-0 mt-0.5" />
                                    <span className="text-xs text-zinc-300 font-medium">{leak.advice}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const HandListTab = ({ hands, onReview }: { hands: HandHistory[], onReview: (h: HandHistory) => void }) => {
    return (
        <div className="bg-[#121214] border border-zinc-800 rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-4">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/80 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800">
                        <tr>
                            <th className="p-4 w-32">Date</th>
                            <th className="p-4">Hero</th>
                            <th className="p-4 w-24">Hand</th>
                            <th className="p-4 w-24">Pos</th>
                            <th className="p-4 text-right">Pot</th>
                            <th className="p-4 text-right">Result</th>
                            <th className="p-4 text-center w-20">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {hands.slice(0, 50).map(h => {
                            const { heroCards, netWin, position } = parseHeroHandDetails(h);
                            return (
                                <tr key={h.id} className="hover:bg-zinc-800/30 transition-colors group">
                                    <td className="p-4 font-mono text-zinc-500">{new Date(h.timestamp).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold text-zinc-300 truncate max-w-[150px]">{h.hero}</td>
                                    <td className="p-4">
                                        <span className={`font-mono font-bold ${heroCards.join('').includes('s') ? 'text-poker-gold' : 'text-zinc-400'}`}>
                                            {heroCards.join('') || '-'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-zinc-400">{position}</td>
                                    <td className="p-4 text-right font-mono text-zinc-300">{h.potSize}</td>
                                    <td className={`p-4 text-right font-bold font-mono ${netWin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {netWin >= 0 ? '+' : ''}{netWin}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => onReview(h)}
                                            className="p-1.5 bg-zinc-800 hover:bg-poker-gold hover:text-black rounded text-zinc-400 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---

export const StatsDashboard: React.FC = () => {
    const { hands, setViewMode, setSelectedHand } = usePoker();
    const [activeTab, setActiveTab] = useState<'overview' | 'opponents' | 'leaks' | 'hands'>('overview');
    const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week' | 'day'>('all');
    
    // Filtered Hands State
    const filteredHands = useMemo(() => {
        if (timeFilter === 'all') return hands;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        let limit = 0;
        if (timeFilter === 'day') limit = now - oneDay;
        else if (timeFilter === 'week') limit = now - (7 * oneDay);
        else if (timeFilter === 'month') limit = now - (30 * oneDay);
        
        return hands.filter(h => h.timestamp > limit);
    }, [hands, timeFilter]);

    // Derived Stats
    const stats = useMemo(() => calculateStats(filteredHands), [filteredHands]);
    const heroStats = stats[0] || null;
    const leaks = useMemo(() => heroStats ? analyzeLeaks(heroStats) : [], [heroStats]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden font-sans">
            {/* Header */}
            <div className="shrink-0 px-8 py-6 border-b border-zinc-800 bg-[#050505]/95 backdrop-blur z-20 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                        <Activity className="text-poker-gold w-6 h-6" /> Tracker Pro
                    </h1>
                    <p className="text-zinc-500 text-xs mt-1 font-medium">
                        Database: <span className="text-zinc-300">{filteredHands.length}</span> hands processed
                    </p>
                </div>

                <div className="flex bg-[#121214] p-1 rounded-lg border border-zinc-800">
                    {[
                        { id: 'overview', label: 'Dashboard', icon: Layout },
                        { id: 'opponents', label: 'Opponents', icon: Users },
                        { id: 'leaks', label: 'Leak Finder', icon: AlertTriangle },
                        { id: 'hands', label: 'Hand List', icon: Layers },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-zinc-800 text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="max-w-[1600px] mx-auto min-h-full">
                    {filteredHands.length === 0 && hands.length > 0 ? (
                         <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-600">
                            <Search className="w-16 h-16 opacity-20 mb-4" />
                            <h3 className="text-lg font-bold text-white">No hands in this period</h3>
                            <p className="text-sm mt-2">Try adjusting the time filter.</p>
                        </div>
                    ) : filteredHands.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-600 border border-zinc-800 border-dashed rounded-3xl bg-[#09090b]">
                            <Layers className="w-16 h-16 opacity-20 mb-4" />
                            <h3 className="text-lg font-bold text-white">Empty Database</h3>
                            <p className="text-sm mt-2 max-w-xs text-center">Analyze videos or import hands to populate your dashboard.</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab hands={filteredHands} stats={stats} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />}
                            {activeTab === 'opponents' && <VillainTab stats={stats} />}
                            {activeTab === 'leaks' && <LeaksTab leaks={leaks} />}
                            {activeTab === 'hands' && <HandListTab hands={filteredHands} onReview={(h) => { setSelectedHand(h); setViewMode('review'); }} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};