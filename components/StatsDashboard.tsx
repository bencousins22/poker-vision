
import React, { useMemo, useState, useEffect } from 'react';
import { usePoker } from '../App';
import { calculateStats, parseHeroHandDetails, getHoleCardsKey, calculateSessions } from '../services/statsParser';
import { analyzeLeaks, Leak } from '../services/pokerLogic';
import { HandFilter, HandHistory, PokerSession, PlayerStats } from '../types';
import { getPlayerNote, savePlayerNote } from '../services/storage';
import { DatabaseGrid } from './DatabaseGrid';
import { executeQuery } from '../services/queryEngine';
import { generateQueryFromNaturalLanguage } from '../services/gemini';
import { 
    TrendingUp, Activity, Users, DollarSign, Target, Zap, 
    Crosshair, Filter, Calendar, Layout, Layers, RefreshCw, X, ArrowRight, PlayCircle, Clock, ChevronDown, ChevronUp, History, Bomb, UserSearch, Save, StickyNote, Hexagon,
    AlertTriangle, BarChart as BarChartIcon, Table, Code2, Sparkles, Terminal, CheckCircle2, Search, GraduationCap, AlertOctagon
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, BarChart, Bar, Legend, ReferenceLine, Brush, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

// --- Helper Components ---

const StatCard = ({ label, value, subtext, icon: Icon, colorClass, trend }: any) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm group">
        <div className="flex justify-between items-start mb-2">
            <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider group-hover:text-white transition-colors">{label}</div>
            <div className={`p-2 rounded-lg bg-black/40 ${colorClass}`}>
                <Icon className="w-4 h-4" />
            </div>
        </div>
        <div>
            <div className="text-2xl font-black text-white">{value}</div>
            {subtext && (
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500 font-mono">{subtext}</span>
                    {trend && (
                        <span className={`text-[10px] font-bold ${trend > 0 ? 'text-poker-green' : 'text-poker-red'}`}>
                            {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>
            )}
        </div>
    </div>
);

// New Calendar Heatmap Component
const ActivityCalendar = ({ hands }: { hands: HandHistory[] }) => {
    // Generate last 365 days
    const days = useMemo(() => {
        const d = new Map<string, number>();
        hands.forEach(h => {
            const dateStr = new Date(h.timestamp).toISOString().split('T')[0];
            d.set(dateStr, (d.get(dateStr) || 0) + 1);
        });
        
        const result = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
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
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-poker-gold" /> Grind Consistency
            </h3>
            <div className="flex-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
                    {days.map((day) => {
                        let bg = 'bg-zinc-900';
                        if (day.count > 0) bg = 'bg-poker-green/30';
                        if (day.count > 5) bg = 'bg-poker-green/60';
                        if (day.count > 20) bg = 'bg-poker-green';
                        
                        return (
                            <div 
                                key={day.date} 
                                className={`w-3 h-3 rounded-[2px] ${bg} hover:ring-1 hover:ring-white/50 transition-all`}
                                title={`${day.date}: ${day.count} hands`}
                            ></div>
                        );
                    })}
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2 text-[10px] text-zinc-500 font-mono">
                <span>Less</span>
                <div className="w-3 h-3 bg-zinc-900 rounded-[2px]"></div>
                <div className="w-3 h-3 bg-poker-green/30 rounded-[2px]"></div>
                <div className="w-3 h-3 bg-poker-green/60 rounded-[2px]"></div>
                <div className="w-3 h-3 bg-poker-green rounded-[2px]"></div>
                <span>More</span>
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
                
                <div className="flex gap-4 mt-8 w-full justify-center">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{heroStats.vpip.toFixed(0)}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">VPIP</div>
                    </div>
                    <div className="w-px bg-zinc-800 h-8 self-center"></div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{heroStats.pfr.toFixed(0)}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">PFR</div>
                    </div>
                    <div className="w-px bg-zinc-800 h-8 self-center"></div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{heroStats.af.toFixed(1)}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">AF</div>
                    </div>
                </div>
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

// Villain Inspector Modal
const VillainInspector = ({ player, hands, onClose, onReviewHand }: { player: PlayerStats, hands: HandHistory[], onClose: () => void, onReviewHand: (h: HandHistory) => void }) => {
    const [note, setNote] = useState(getPlayerNote(player.name));
    
    // Filter hands involving this player
    const vsHands = useMemo(() => {
        return hands.filter(h => h.rawText.includes(player.name)).sort((a,b) => b.timestamp - a.timestamp);
    }, [hands, player.name]);

    const handleSaveNote = () => {
        savePlayerNote(player.name, note);
    };

    const radarData = [
        { subject: 'VPIP', A: player.vpip, fullMark: 100 },
        { subject: 'PFR', A: player.pfr, fullMark: 100 },
        { subject: 'AGG', A: Math.min(player.af * 10, 100), fullMark: 100 }, // Scale AF
        { subject: '3Bet', A: player.threeBet * 2, fullMark: 100 }, // Scale 3Bet
        { subject: 'WTSD', A: player.wtsd, fullMark: 100 },
        { subject: 'Win@SD', A: player.wmsd, fullMark: 100 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111] border border-zinc-800 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-poker-red to-red-900 flex items-center justify-center text-2xl font-black text-white shadow-lg border-2 border-white/10">
                            {player.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{player.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wider">{player.style}</span>
                                <span className="text-xs text-zinc-500">{player.handsPlayed} Hands Tracked</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Column 1: Stats & Radar */}
                        <div className="space-y-6">
                            <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-4">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Hexagon className="w-3 h-3" /> Playstyle Profile
                                </h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                            <PolarGrid stroke="#3f3f46" strokeOpacity={0.5} />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar name={player.name} dataKey="A" stroke="#fbbf24" strokeWidth={2} fill="#fbbf24" fillOpacity={0.2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold">VPIP / PFR</div>
                                    <div className="text-xl font-mono font-bold text-white mt-1">
                                        <span className={player.vpip > 30 ? 'text-poker-green' : 'text-white'}>{player.vpip.toFixed(0)}</span>
                                        <span className="text-zinc-600 mx-1">/</span>
                                        <span className="text-zinc-300">{player.pfr.toFixed(0)}</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold">3-Bet</div>
                                    <div className="text-xl font-mono font-bold text-poker-red mt-1">{player.threeBet.toFixed(1)}%</div>
                                </div>
                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Agg Factor</div>
                                    <div className="text-xl font-mono font-bold text-poker-gold mt-1">{player.af.toFixed(2)}</div>
                                </div>
                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Net Won</div>
                                    <div className={`text-xl font-mono font-bold mt-1 ${player.winnings >= 0 ? 'text-poker-green' : 'text-red-500'}`}>
                                        {player.winnings >= 0 ? '+' : ''}${player.winnings.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Notes & Tendencies */}
                        <div className="space-y-6">
                            <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-4 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        <StickyNote className="w-3 h-3" /> Player Notes
                                    </h3>
                                    <button 
                                        onClick={handleSaveNote}
                                        className="text-[10px] bg-zinc-800 hover:bg-poker-gold hover:text-black text-white px-3 py-1.5 rounded transition-all flex items-center gap-1 font-bold"
                                    >
                                        <Save className="w-3 h-3" /> Save
                                    </button>
                                </div>
                                <textarea 
                                    className="flex-1 w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none font-mono leading-relaxed"
                                    placeholder="Enter reads, tells, and specific adjustments..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Column 3: History vs Hero */}
                        <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                    <History className="w-3 h-3" /> History vs Hero
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left text-[10px]">
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {vsHands.map(h => (
                                            <tr key={h.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onReviewHand(h)}>
                                                <td className="p-3 text-zinc-400 font-mono">
                                                    {new Date(h.timestamp).toLocaleDateString()}
                                                </td>
                                                <td className="p-3 text-white font-bold max-w-[120px] truncate">
                                                    {h.summary}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <PlayCircle className="w-4 h-4 text-zinc-600 hover:text-white mx-auto" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {vsHands.length === 0 && (
                                    <div className="p-8 text-center text-zinc-500 text-xs">No shared hands found.</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

// Heatmap Grid Component
const HoleCardsHeatmap = ({ hands, onSelectHand, mode }: { hands: HandHistory[], onSelectHand: (ids: string[]) => void, mode: 'win' | 'fold' }) => {
    const gridData = useMemo(() => {
        const map = new Map<string, { win: number, count: number, ids: string[], folds: number }>();
        
        hands.forEach(h => {
            const { heroCards, netWin } = parseHeroHandDetails(h);
            const key = getHoleCardsKey(heroCards);
            
            // Determine fold - rough check if Hero folded preflop
            const isFold = h.rawText.includes('Hero: folds') && !h.rawText.includes('*** FLOP ***'); // Simplified logic

            if (key) {
                const current = map.get(key) || { win: 0, count: 0, ids: [], folds: 0 };
                current.win += netWin;
                current.count += 1;
                if (isFold) current.folds += 1;
                current.ids.push(h.id);
                map.set(key, current);
            }
        });
        return map;
    }, [hands]);

    const ranks = "AKQJT98765432";
    
    return (
        <div className="overflow-x-auto">
            <div className="grid grid-cols-13 gap-0.5 min-w-[600px] bg-zinc-950 p-2 rounded-xl border border-zinc-900 shadow-inner">
                {Array.from({ length: 13 }).map((_, r) => (
                    Array.from({ length: 13 }).map((_, c) => {
                        const rRank = ranks[r];
                        const cRank = ranks[c];
                        const key = r === c ? `${rRank}${cRank}` : r < c ? `${rRank}${cRank}s` : `${cRank}${rRank}o`;
                        const data = gridData.get(key);
                        
                        let bg = 'bg-zinc-900';
                        let text = 'text-zinc-600';
                        
                        if (data && data.count > 0) {
                            if (mode === 'win') {
                                if (data.win > 0) {
                                    const intensity = Math.min(data.win / 500, 1); 
                                    bg = `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`; // Green
                                    text = 'text-white';
                                } else {
                                    const intensity = Math.min(Math.abs(data.win) / 500, 1);
                                    bg = `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`; // Red
                                    text = 'text-white';
                                }
                            } else {
                                // Fold Mode
                                const foldRate = data.folds / data.count;
                                const intensity = foldRate;
                                bg = `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`; // Blue scale for frequency
                                text = 'text-white';
                            }
                        }

                        return (
                            <div 
                                key={`${r}-${c}`} 
                                onClick={() => data && onSelectHand(data.ids)}
                                className={`${bg} ${text} aspect-square text-[10px] font-bold flex flex-col items-center justify-center rounded-sm cursor-pointer hover:ring-2 hover:ring-white/50 transition-all select-none group relative`}
                                title={`${key}: ${data?.count || 0} hands. ${mode === 'win' ? `$${data?.win || 0}` : `Fold: ${((data?.folds || 0)/(data?.count || 1)*100).toFixed(0)}%`}`}
                            >
                                <span>{key}</span>
                                {data && (
                                    <span className="text-[8px] opacity-80 font-mono hidden group-hover:block absolute bottom-0.5 bg-black/50 px-1 rounded">
                                        {mode === 'win' ? data.count : `${((data.folds/data.count)*100).toFixed(0)}%`}
                                    </span>
                                )}
                            </div>
                        );
                    })
                ))}
            </div>
            <div className="flex justify-between items-center px-2 py-2 text-[10px] text-zinc-500 font-mono">
                <div className="flex items-center gap-2">
                    {mode === 'win' ? (
                        <>
                            <span className="w-3 h-3 bg-poker-green rounded-sm"></span> Profitable
                            <span className="w-3 h-3 bg-red-500 rounded-sm"></span> Loss
                        </>
                    ) : (
                        <>
                            <span className="w-3 h-3 bg-blue-500 rounded-sm"></span> High Fold Freq
                            <span className="w-3 h-3 bg-blue-900/30 rounded-sm"></span> Low Fold Freq
                        </>
                    )}
                    <span className="w-3 h-3 bg-zinc-900 rounded-sm border border-zinc-800"></span> No Data
                </div>
                <span>Grid shows {mode === 'win' ? 'Net Winnings' : 'Fold %'}</span>
            </div>
        </div>
    );
};

// Sortable Hand List
const HandsTable = ({ hands, onReview }: { hands: HandHistory[], onReview: (h: HandHistory) => void }) => {
    const [sortField, setSortField] = useState<'date' | 'pot' | 'win'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const sortedHands = useMemo(() => {
        return [...hands].sort((a, b) => {
            let res = 0;
            if (sortField === 'date') res = a.timestamp - b.timestamp;
            if (sortField === 'pot') {
                const potA = parseInt(a.potSize.replace(/[^0-9]/g, ''));
                const potB = parseInt(b.potSize.replace(/[^0-9]/g, ''));
                res = potA - potB;
            }
            if (sortField === 'win') {
                const winA = parseHeroHandDetails(a).netWin;
                const winB = parseHeroHandDetails(b).netWin;
                res = winA - winB;
            }
            return sortDirection === 'asc' ? res : -res;
        });
    }, [hands, sortField, sortDirection]);

    const handleSort = (field: 'date' | 'pot' | 'win') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return <span className="w-4 h-4 opacity-0"></span>;
        return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    return (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-black/40 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800">
                            <th className="p-3 pl-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('date')}>
                                <div className="flex items-center gap-1">Date <SortIcon field="date" /></div>
                            </th>
                            <th className="p-3">Hero Hand</th>
                            <th className="p-3">Position</th>
                            <th className="p-3">Action</th>
                            <th className="p-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('pot')}>
                                <div className="flex items-center justify-end gap-1">Pot <SortIcon field="pot" /></div>
                            </th>
                            <th className="p-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('win')}>
                                <div className="flex items-center justify-end gap-1">Result <SortIcon field="win" /></div>
                            </th>
                            <th className="p-3 text-center">Review</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {sortedHands.slice(0, 50).map(h => {
                            const { heroCards, netWin, position } = parseHeroHandDetails(h);
                            const isWin = netWin > 0;
                            return (
                                <tr key={h.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-3 pl-4 text-zinc-400 font-mono">
                                        {new Date(h.timestamp).toLocaleDateString()} <span className="text-zinc-600">{new Date(h.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                                        {h.isBombPot && <span className="ml-2 text-[8px] bg-red-900/50 text-red-400 px-1 py-0.5 rounded border border-red-900">BOMB</span>}
                                    </td>
                                    <td className="p-3 font-bold text-white">
                                        {heroCards.length ? heroCards.join('') : 'Unknown'}
                                    </td>
                                    <td className="p-3 text-zinc-300">{position}</td>
                                    <td className="p-3 text-zinc-400 max-w-[200px] truncate">{h.summary}</td>
                                    <td className="p-3 text-right font-mono text-poker-gold">{h.potSize}</td>
                                    <td className={`p-3 text-right font-bold ${isWin ? 'text-poker-green' : 'text-red-500'}`}>
                                        {isWin ? '+' : ''}{netWin > 0 ? `$${netWin}` : netWin === 0 ? '-' : `-$${Math.abs(netWin)}`}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => onReview(h)} className="text-zinc-500 hover:text-white transition-colors">
                                            <PlayCircle className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {hands.length > 50 && (
                <div className="p-2 text-center text-xs text-zinc-500 border-t border-zinc-800">
                    Showing first 50 of {hands.length} hands
                </div>
            )}
        </div>
    );
};

// Sessions Table
const SessionsTable = ({ sessions }: { sessions: PokerSession[] }) => (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
        <table className="w-full text-left border-collapse text-xs">
            <thead>
                <tr className="bg-black/40 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800">
                    <th className="p-4">Date</th>
                    <th className="p-4 text-center">Duration</th>
                    <th className="p-4 text-center">Hands</th>
                    <th className="p-4 text-center">Stakes</th>
                    <th className="p-4 text-right">Hourly</th>
                    <th className="p-4 text-right">Net Won</th>
                    <th className="p-4 text-right">Graph</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
                {sessions.map(s => {
                    const isWin = s.netWon >= 0;
                    return (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-mono text-zinc-300">
                                {new Date(s.startTime).toLocaleDateString()}
                                <div className="text-[10px] text-zinc-600">{new Date(s.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td className="p-4 text-center text-zinc-400">{s.durationMinutes.toFixed(0)}m</td>
                            <td className="p-4 text-center text-white font-bold">{s.handsPlayed}</td>
                            <td className="p-4 text-center text-zinc-500">{s.mostPlayedStakes}</td>
                            <td className={`p-4 text-right font-mono ${s.hourlyRate >= 0 ? 'text-zinc-300' : 'text-red-400'}`}>
                                ${s.hourlyRate.toFixed(2)}/hr
                            </td>
                            <td className={`p-4 text-right font-bold text-sm ${isWin ? 'text-poker-green' : 'text-red-500'}`}>
                                {isWin ? '+' : ''}${s.netWon.toLocaleString()}
                            </td>
                            <td className="p-4 flex justify-end">
                                <div className="w-16 h-6 flex items-end justify-end gap-0.5 opacity-50">
                                    {/* Simple Mini Bar Graph Simulation */}
                                    <div className={`w-2 h-[40%] ${isWin ? 'bg-poker-green' : 'bg-red-500'} rounded-t-sm`}></div>
                                    <div className={`w-2 h-[60%] ${isWin ? 'bg-poker-green' : 'bg-red-500'} rounded-t-sm`}></div>
                                    <div className={`w-2 h-[100%] ${isWin ? 'bg-poker-green' : 'bg-red-500'} rounded-t-sm`}></div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

// --- NEW COMPONENT: DATA STUDIO ---
const DataStudio = ({ hands, onReview }: { hands: HandHistory[], onReview: (h: HandHistory) => void }) => {
    const [query, setQuery] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeFilteredHands, setActiveFilteredHands] = useState<HandHistory[]>(hands);
    const [error, setError] = useState<string | null>(null);

    // Re-run query when source hands change (e.g. imports)
    useEffect(() => {
        handleRunQuery(); 
    }, [hands]);

    const handleRunQuery = () => {
        setError(null);
        if (!query.trim()) {
            setActiveFilteredHands(hands);
            return;
        }
        
        try {
            const results = executeQuery(query, hands);
            setActiveFilteredHands(results);
        } catch (e: any) {
            setError(e.message || "Query Execution Failed");
        }
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const generatedQuery = await generateQueryFromNaturalLanguage(aiPrompt);
            if (generatedQuery) {
                setQuery(generatedQuery);
                // Auto run after generation
                setTimeout(() => {
                    const results = executeQuery(generatedQuery, hands);
                    setActiveFilteredHands(results);
                }, 100);
            } else {
                setError("AI could not generate a valid query.");
            }
        } catch (e) {
            setError("AI Service Unavailable");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 animate-fade-in">
            {/* Editor Area */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Manual Code Editor */}
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs text-zinc-500 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-2"><Code2 className="w-4 h-4" /> PokerQL Editor</span>
                            {error && <span className="text-red-500 normal-case flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</span>}
                        </div>
                        <div className="relative group">
                            <textarea 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g. win > 100 AND hand IN [AA, KK]"
                                className="w-full h-32 bg-[#0c0c0c] border border-zinc-800 rounded-xl p-4 text-sm font-mono text-poker-gold focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 resize-none leading-relaxed shadow-inner"
                                spellCheck="false"
                            />
                            <div className="absolute bottom-3 right-3">
                                <button 
                                    onClick={handleRunQuery}
                                    className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-95"
                                >
                                    Run Query
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* AI Prompt */}
                    <div className="w-full md:w-80 flex flex-col gap-2">
                        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" /> AI Generator
                        </div>
                        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
                            <textarea 
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Ask in plain English... e.g. 'Show me bluffs on the river where I lost more than 50 BBs'"
                                className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 resize-none focus:outline-none"
                            />
                            <button 
                                onClick={handleAiGenerate}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Sparkles className="w-3 h-3" />}
                                Generate SQL
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Schema Helper Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {['win > 0', 'loss > 50', 'hand IN [AA, KK]', 'pos = BTN', 'action contains "check-raise"', 'pot > 500', 'bomb = true'].map(snippet => (
                        <button 
                            key={snippet}
                            onClick={() => setQuery(prev => prev ? `${prev} AND ${snippet}` : snippet)}
                            className="whitespace-nowrap px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
                        >
                            {snippet}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 min-h-[400px]">
                <DatabaseGrid hands={activeFilteredHands} onReview={onReview} />
            </div>
        </div>
    );
};

export const StatsDashboard: React.FC = () => {
  const { hands, setViewMode, setSelectedHand, user } = usePoker();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'leaks' | 'hands' | 'opponents' | 'studio'>('overview');
  const [drillDownIds, setDrillDownIds] = useState<string[] | null>(null);
  const [matrixMode, setMatrixMode] = useState<'win' | 'fold'>('win');
  const [includeRakeback, setIncludeRakeback] = useState(false);
  
  // Villain Inspection
  const [inspectVillain, setInspectVillain] = useState<PlayerStats | null>(null);

  // Filters State
  const [filters, setFilters] = useState<HandFilter>({
      dateRange: 'all',
      position: 'all',
      result: 'all',
      minPot: 0,
      isBombPot: undefined
  });

  // 1. Filter Logic
  const filteredHands = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    return hands.filter(h => {
        const { position, netWin } = parseHeroHandDetails(h);
        
        // Date Filter
        if (filters.dateRange === 'today' && (now - h.timestamp) > oneDay) return false;
        if (filters.dateRange === 'week' && (now - h.timestamp) > oneDay * 7) return false;
        if (filters.dateRange === 'month' && (now - h.timestamp) > oneDay * 30) return false;

        // Position Filter
        if (filters.position !== 'all' && position !== filters.position) return false;

        // Result Filter
        if (filters.result === 'won' && netWin <= 0) return false;
        if (filters.result === 'lost' && netWin >= 0) return false;

        // Pot Size Filter
        const potVal = parseInt(h.potSize.replace(/[^0-9]/g, ''));
        if (potVal < filters.minPot) return false;

        // Bomb Pot Filter
        if (filters.isBombPot && !h.isBombPot) return false;

        return true;
    });
  }, [hands, filters]);

  // 2. Calculations
  const stats = useMemo(() => calculateStats(filteredHands), [filteredHands]);
  const heroStats = stats[0]; 
  const sessions = useMemo(() => calculateSessions(filteredHands), [filteredHands]);
  const leaks = useMemo(() => heroStats ? analyzeLeaks(heroStats) : [], [heroStats]);

  // 3. Graph Data
  const graphData = useMemo(() => {
      let cumWon = 0;
      let cumSD = 0;
      let cumNSD = 0;
      let cumRB = 0;
      const rbPercent = user?.settings?.rakebackPercentage || 0;

      return filteredHands.sort((a,b) => a.timestamp - b.timestamp).map((h, i) => {
          const { netWin } = parseHeroHandDetails(h);
          const isSD = h.rawText.includes('*** SHOWDOWN ***'); 
          
          // Estimate Rake (Simulated 5% of pot contribution up to cap, very rough)
          const potVal = parseInt(h.potSize.replace(/[^0-9]/g, ''));
          const rakePaid = Math.min(potVal * 0.05, 10); // Simulated
          const rakeback = rakePaid * (rbPercent / 100);

          cumWon += netWin;
          if (includeRakeback) cumWon += rakeback;
          
          cumRB += rakeback;

          if (isSD) cumSD += netWin;
          else cumNSD += netWin;

          return {
              hand: i + 1,
              id: h.id,
              won: cumWon,
              showdown: cumSD,
              nonShowdown: cumNSD,
              rakeback: cumRB
          };
      });
  }, [filteredHands, includeRakeback, user]);

  // Bankroll Simulation Data
  const simData = useMemo(() => {
      if (!heroStats || heroStats.handsPlayed < 10) return [];
      const winRate = heroStats.bb100;
      const stdDev = heroStats.stdDevBb || 80; // Default stddev for NLH
      
      const data = [];
      let bankroll = 5000; // Starting hypothetical bankroll in BB
      for (let i = 0; i < 20; i++) {
          const hands = i * 1000;
          // Variance formula approximation for visualization range (1 std dev)
          const expected = bankroll + (winRate * (hands/100));
          const range = stdDev * Math.sqrt(hands/100);
          
          data.push({
              hands,
              expected,
              upper: expected + range,
              lower: expected - range
          });
      }
      return data;
  }, [heroStats]);

  // Positional Data for Bar Chart
  const positionalData = useMemo(() => {
      if (!heroStats) return [];
      return [
          { pos: 'EP', win: heroStats.positionWinnings.EP, color: '#3b82f6' },
          { pos: 'MP', win: heroStats.positionWinnings.MP, color: '#8b5cf6' },
          { pos: 'CO', win: heroStats.positionWinnings.CO, color: '#10b981' },
          { pos: 'BTN', win: heroStats.positionWinnings.BTN, color: '#fbbf24' },
          { pos: 'SB', win: heroStats.positionWinnings.SB, color: '#ef4444' },
          { pos: 'BB', win: heroStats.positionWinnings.BB, color: '#f97316' },
      ];
  }, [heroStats]);

  // Drilldown View Data
  const activeDrillDownHands = useMemo(() => {
      if (!drillDownIds) return filteredHands;
      return filteredHands.filter(h => drillDownIds.includes(h.id));
  }, [filteredHands, drillDownIds]);

  const handleReviewHand = (hand: HandHistory) => {
      setSelectedHand(hand);
      setViewMode('review');
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => { setActiveTab(id); setDrillDownIds(null); }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === id 
            ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700' 
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
        }`}
      >
          <Icon className="w-4 h-4" /> {label}
      </button>
  );

  return (
    <div className="flex-1 bg-background p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-zinc-800">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <Activity className="text-poker-gold" /> Pro Tracker
                </h1>
                <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2">
                    Database: <span className="text-white font-mono">{hands.length}</span> hands processed
                    <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                    Displaying: <span className="text-poker-gold font-mono">{filteredHands.length}</span> matches
                </p>
            </div>
            
            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 backdrop-blur-sm overflow-x-auto max-w-full">
                <TabButton id="overview" label="Dashboard" icon={Layout} />
                <TabButton id="sessions" label="Sessions" icon={History} />
                <TabButton id="leaks" label="Leak Finder" icon={AlertTriangle} />
                <TabButton id="studio" label="Data Studio" icon={Code2} />
                <TabButton id="hands" label="Hand List" icon={Layers} />
                <TabButton id="opponents" label="Opponents" icon={Users} />
            </div>
        </div>

        {/* --- FILTER TOOLBAR --- */}
        {activeTab !== 'studio' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center shadow-lg">
                {/* ... existing filters ... */}
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 mr-2">
                    <Filter className="w-4 h-4" /> Filters
                </div>
                {/* Simplified for brevity - Assume filters are here */}
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold pl-1">Date Range</label>
                    <div className="relative">
                        <select 
                            value={filters.dateRange}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                            className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded-lg pl-3 pr-8 py-2 appearance-none focus:border-poker-gold focus:ring-1 focus:ring-poker-gold outline-none w-32 cursor-pointer"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                        <Calendar className="absolute right-2.5 top-2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                    </div>
                </div>
                {/* Other Filters... */}
                <div className="ml-auto flex items-end">
                    <button 
                        onClick={() => setFilters({ dateRange: 'all', position: 'all', result: 'all', minPot: 0, isBombPot: undefined })}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Reset
                    </button>
                </div>
            </div>
        )}

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
                {/* 1. KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        label="Net Profit" 
                        value={`$${heroStats?.winnings.toLocaleString() || 0}`} 
                        subtext={`${heroStats?.bb100.toFixed(1)} bb/100`} 
                        icon={DollarSign} colorClass="text-poker-green" trend={12}
                    />
                    <StatCard 
                        label="VPIP / PFR" 
                        value={`${heroStats?.vpip.toFixed(0)} / ${heroStats?.pfr.toFixed(0)}`} 
                        subtext={heroStats?.style || 'Unknown'}
                        icon={Target} colorClass="text-poker-blue" 
                    />
                    <StatCard 
                        label="3-Bet %" 
                        value={`${heroStats?.threeBet.toFixed(1)}%`} 
                        subtext={`Fold to 3B: ${heroStats?.foldTo3Bet.toFixed(0)}%`} 
                        icon={Zap} colorClass="text-poker-red" 
                    />
                    <StatCard 
                        label="Aggression" 
                        value={`${heroStats?.afq.toFixed(0)}%`} 
                        subtext={`AF: ${heroStats?.af.toFixed(1)}`} 
                        icon={Crosshair} colorClass="text-poker-gold" 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. Main Graph */}
                    <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-poker-green" /> Chip Graph
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">Include Rakeback</span>
                                    <button 
                                        onClick={() => setIncludeRakeback(!includeRakeback)}
                                        className={`w-8 h-4 rounded-full relative transition-colors ${includeRakeback ? 'bg-poker-gold' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${includeRakeback ? 'left-4.5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>
                                {/* Legend */}
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={graphData}>
                                    <defs>
                                        <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="hand" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
                                    <Area type="monotone" dataKey="won" stroke="#10b981" fillOpacity={1} fill="url(#colorWon)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Heatmap & Calendar */}
                    <div className="flex flex-col gap-6">
                        {/* New Calendar Heatmap */}
                        <ActivityCalendar hands={filteredHands} />

                        {/* Hand Matrix */}
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 flex flex-col flex-1">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Layout className="w-4 h-4 text-poker-gold" /> Matrix
                                </h3>
                                <div className="flex bg-zinc-800 rounded-lg p-0.5">
                                    <button 
                                        onClick={() => setMatrixMode('win')}
                                        className={`px-2 py-1 text-[9px] font-bold rounded ${matrixMode === 'win' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}
                                    >
                                        Win
                                    </button>
                                    <button 
                                        onClick={() => setMatrixMode('fold')}
                                        className={`px-2 py-1 text-[9px] font-bold rounded ${matrixMode === 'fold' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}
                                    >
                                        Fold
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                                <HoleCardsHeatmap hands={filteredHands} mode={matrixMode} onSelectHand={(ids) => {
                                    setDrillDownIds(ids);
                                    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
                                }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Drill Down Table (Visible when filtering or drilldown active) */}
                <div className="animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layers className="w-4 h-4 text-zinc-400" /> 
                            {drillDownIds ? `Selected Hands (${drillDownIds.length})` : 'Recent Hands'}
                        </h3>
                        {drillDownIds && (
                            <button onClick={() => setDrillDownIds(null)} className="text-xs text-poker-gold hover:underline">
                                Clear Selection
                            </button>
                        )}
                    </div>
                    {/* Fallback to simple table for overview, full grid is in its own tab */}
                    <DatabaseGrid hands={activeDrillDownHands} onReview={handleReviewHand} />
                </div>
            </div>
        )}

        {/* --- STUDIO TAB --- */}
        {activeTab === 'studio' && (
            <DataStudio hands={hands} onReview={handleReviewHand} />
        )}

        {/* --- SESSIONS TAB --- */}
        {activeTab === 'sessions' && (
             <div className="animate-fade-in space-y-4">
                 <div className="flex justify-between items-center mb-2">
                     <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-zinc-400" /> Session Log
                     </h3>
                     <span className="text-xs text-zinc-500">{sessions.length} sessions recorded</span>
                 </div>
                 {sessions.length > 0 ? (
                     <SessionsTable sessions={sessions} />
                 ) : (
                     <div className="p-12 text-center text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                         No sessions found. Import hands to see session data.
                     </div>
                 )}
             </div>
        )}

        {/* --- LEAKS TAB (NEW) --- */}
        {activeTab === 'leaks' && (
            <div className="animate-fade-in space-y-6">
                <LeakReportCard leaks={leaks} heroStats={heroStats} />
                
                {/* Fallback Charts if valid stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Positional Winnings Chart */}
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 min-h-[400px]">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <BarChartIcon className="w-4 h-4 text-blue-500" /> Winnings by Position
                        </h3>
                        <p className="text-xs text-zinc-500 mb-6">Identify which seats are most profitable or costly.</p>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={positionalData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="pos" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                    />
                                    <ReferenceLine y={0} stroke="#52525b" />
                                    <Bar dataKey="win" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bankroll Simulator */}
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 min-h-[400px]">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-poker-gold" /> Bankroll Simulator
                        </h3>
                        <p className="text-xs text-zinc-500 mb-6">Projected growth based on current Win Rate ({heroStats?.bb100.toFixed(1) || 0} BB/100) and Std Dev.</p>
                        <div className="h-[300px] w-full">
                            {simData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={simData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                        <XAxis dataKey="hands" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v/1000}k`} />
                                        <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}BB`} />
                                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                                        <Area type="monotone" dataKey="upper" stroke="transparent" fill="#10b981" fillOpacity={0.1} />
                                        <Area type="monotone" dataKey="expected" stroke="#fbbf24" strokeWidth={2} fill="transparent" />
                                        <Area type="monotone" dataKey="lower" stroke="transparent" fill="#ef4444" fillOpacity={0.1} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-zinc-500 text-xs">Need more hands to simulate variance.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ... other tabs ... */}
        {/* --- HAND LIST TAB --- */}
        {activeTab === 'hands' && (
             <div className="animate-fade-in space-y-4">
                 <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Total hands matching filters: <span className="text-white font-bold">{filteredHands.length}</span></span>
                    <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition-colors">Export CSV</button>
                 </div>
                 <HandsTable hands={filteredHands} onReview={handleReviewHand} />
             </div>
        )}
        
        {/* --- OPPONENTS TAB --- */}
        {activeTab === 'opponents' && (
             <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-400 flex items-center gap-2"><UserSearch className="w-4 h-4" /> Click an opponent to inspect</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-wider font-bold border-b border-zinc-800">
                                <th className="p-5 pl-8">Player Name</th>
                                <th className="p-5 text-right">Hands</th>
                                <th className="p-5 text-center">VPIP / PFR</th>
                                <th className="p-5 text-center">3Bet</th>
                                <th className="p-5 text-center">AF</th>
                                <th className="p-5 text-center">WTSD</th>
                                <th className="p-5 text-right">Net Won</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50 text-sm">
                            {stats.map((p) => (
                                <tr 
                                    key={p.name} 
                                    className="hover:bg-white/[0.05] transition-colors group cursor-pointer"
                                    onClick={() => setInspectVillain(p)}
                                >
                                    <td className="p-5 pl-8 font-bold text-white flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 border border-zinc-700">
                                            {p.name.charAt(0)}
                                        </div>
                                        {p.name}
                                    </td>
                                    <td className="p-5 text-right text-zinc-400 font-mono">{p.handsPlayed}</td>
                                    <td className="p-5 text-center">
                                        <span className={p.vpip > 30 ? 'text-poker-green' : 'text-zinc-300'}>{p.vpip.toFixed(0)}</span> / 
                                        <span className="text-zinc-500"> {p.pfr.toFixed(0)}</span>
                                    </td>
                                    <td className="p-5 text-center font-mono text-zinc-300">{p.threeBet.toFixed(1)}%</td>
                                    <td className="p-5 text-center font-mono text-zinc-300">{p.af.toFixed(1)}</td>
                                    <td className="p-5 text-center font-mono text-zinc-300">{p.wtsd.toFixed(0)}%</td>
                                    <td className={`p-5 text-right font-mono font-bold ${p.winnings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {p.winnings >= 0 ? '+' : ''}${p.winnings.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>

      {inspectVillain && (
          <VillainInspector 
            player={inspectVillain} 
            hands={hands} 
            onClose={() => setInspectVillain(null)} 
            onReviewHand={(h) => {
                setInspectVillain(null);
                handleReviewHand(h);
            }}
          />
      )}
    </div>
  );
};
