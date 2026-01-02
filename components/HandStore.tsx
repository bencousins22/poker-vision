
import React, { useState, useMemo } from 'react';
import { usePoker } from '../App';
import { HandHistory, AnalysisStatus } from '../types';
import { Search, Filter, Download, Trash2, Eye, PlayCircle, Calendar, DollarSign, User, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PLAYLIST_TITLES } from './playlistData';

export const HandStore: React.FC = () => {
    const { hands, deleteHand, setSelectedHand, setViewMode, addToQueue } = usePoker();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'pot'>('date');
    const [filterStakes, setFilterStakes] = useState<string>('all');

    const filteredHands = useMemo(() => {
        return hands
            .filter(h => {
                const matchSearch = h.hero.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  h.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  h.stakes.includes(searchQuery);
                const matchStakes = filterStakes === 'all' || h.stakes === filterStakes;
                return matchSearch && matchStakes;
            })
            .sort((a, b) => {
                if (sortBy === 'pot') {
                    const getPot = (s: string) => parseInt(s.replace(/[^0-9]/g, '')) || 0;
                    return getPot(b.potSize) - getPot(a.potSize);
                }
                return b.timestamp - a.timestamp;
            });
    }, [hands, searchQuery, sortBy, filterStakes]);

    const uniqueStakes = useMemo(() => Array.from(new Set(hands.map(h => h.stakes))), [hands]);

    // Chart Data
    const chartData = useMemo(() => {
        return [...hands]
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((h, i) => ({
                name: i + 1,
                pot: parseInt(h.potSize.replace(/[^0-9]/g, '')) || 0,
                date: new Date(h.timestamp).toLocaleDateString()
            }));
    }, [hands]);

    const handleBulkImport = async () => {
         try {
             if (confirm(`Import ${PLAYLIST_TITLES.length} videos from the playlist? This will process in the background.`)) {
                PLAYLIST_TITLES.forEach(title => {
                    addToQueue({
                        id: crypto.randomUUID(),
                        title: title,
                        url: '', // No URL known, system will use searchQuery
                        thumbnail: '',
                        views: '0',
                        uploaded: new Date().toISOString(),
                        searchQuery: title
                    });
                });
             }
         } catch (e) {
             console.error(e);
         }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-6 overflow-hidden">
             {/* Chart Header */}
            {hands.length > 0 && (
                <div className="h-48 mb-6 w-full bg-zinc-900/30 rounded-2xl border border-zinc-800 p-4 relative overflow-hidden shrink-0">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 absolute top-4 left-4 z-10">Activity Overview</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorPot" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area type="monotone" dataKey="pot" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#colorPot)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-1">Hand Library</h1>
                    <p className="text-zinc-500 text-sm">Manage and analyze your collected hand histories.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleBulkImport} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-all border border-zinc-700">
                        <Download className="w-4 h-4" /> Import Playlist
                    </button>

                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-poker-gold transition-colors" />
                        <input
                            type="text"
                            placeholder="Search hands..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-poker-gold/50 focus:ring-1 focus:ring-poker-gold/50 w-64 transition-all"
                        />
                    </div>

                    <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white">
                        <Filter className="w-4 h-4" />
                    </button>

                     <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white" onClick={() => setSortBy(prev => prev === 'date' ? 'pot' : 'date')}>
                        <ArrowUpDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter Tags */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 shrink-0 no-scrollbar">
                <button
                    onClick={() => setFilterStakes('all')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filterStakes === 'all' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
                >
                    All Stakes
                </button>
                {uniqueStakes.map(stake => (
                    <button
                        key={stake}
                        onClick={() => setFilterStakes(stake)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filterStakes === stake ? 'bg-poker-gold text-black border-poker-gold' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
                    >
                        {stake}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                {filteredHands.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border border-dashed border-zinc-800 rounded-3xl mt-10">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 opacity-50" />
                        </div>
                        <p>No hands found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {filteredHands.map((hand) => (
                                <HandCard
                                    key={hand.id}
                                    hand={hand}
                                    onDelete={() => deleteHand(hand.id)}
                                    onView={() => {
                                        setSelectedHand(hand);
                                        setViewMode('review');
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

const HandCard: React.FC<{ hand: HandHistory, onDelete: () => void, onView: () => void }> = ({ hand, onDelete, onView }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 hover:border-poker-gold/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-xs shadow-inner">
                        {hand.hero.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-zinc-200">{hand.hero}</h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase font-mono tracking-wider mt-0.5">
                            <DollarSign className="w-3 h-3" />
                            {hand.stakes}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onView} className="p-2 bg-zinc-800 hover:bg-poker-gold hover:text-black rounded-lg transition-colors">
                        <PlayCircle className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="p-2 bg-zinc-800 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center py-2 border-b border-dashed border-zinc-800/50">
                    <span className="text-xs text-zinc-500">Pot Size</span>
                    <span className="text-sm font-bold text-poker-emerald drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{hand.potSize}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-zinc-800/50">
                    <span className="text-xs text-zinc-500">Date</span>
                    <span className="text-xs text-zinc-300 font-mono">{new Date(hand.timestamp).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-auto">
                <div className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-400 border border-zinc-700/50 truncate max-w-[120px]">
                    {hand.isBombPot ? 'Bomb Pot' : 'Hold\'em'}
                </div>
                {hand.tags?.map(tag => (
                    <div key={tag} className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-400 border border-zinc-700/50">
                        {tag}
                    </div>
                ))}
            </div>

            <div className="absolute top-0 right-0 w-20 h-20 bg-poker-gold/5 rounded-bl-[4rem] rounded-tr-2xl pointer-events-none" />
        </motion.div>
    );
};
