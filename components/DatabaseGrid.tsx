
import React, { useMemo, useState } from 'react';
import { HandHistory } from '../types';
import { parseHeroHandDetails } from '../services/statsParser';
import { ChevronDown, ChevronUp, PlayCircle, Filter, Download, Search } from 'lucide-react';

interface Props {
    hands: HandHistory[];
    onReview: (hand: HandHistory) => void;
}

export const DatabaseGrid: React.FC<Props> = ({ hands, onReview }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'timestamp', direction: 'desc' });
    const [textFilter, setTextFilter] = useState('');

    // Enhanced Data Preparation
    const gridData = useMemo(() => {
        return hands.map(h => {
            const { heroCards, netWin, position } = parseHeroHandDetails(h);
            const bb = h.stakes.includes('/') ? parseFloat(h.stakes.split('/')[1].replace('$','')) : 1;
            const bbWon = netWin / bb;
            
            return {
                id: h.id,
                raw: h,
                date: h.timestamp,
                hand: heroCards.join(''),
                position,
                stake: h.stakes,
                netWin,
                bbWon,
                pot: parseInt(h.potSize.replace(/[^0-9]/g, '')),
                tags: h.tags || []
            };
        }).filter(item => {
            if (!textFilter) return true;
            const s = textFilter.toLowerCase();
            return (
                item.hand.toLowerCase().includes(s) ||
                item.raw.hero.toLowerCase().includes(s) ||
                item.raw.summary.toLowerCase().includes(s)
            );
        });
    }, [hands, textFilter]);

    // Sorting Logic
    const sortedData = useMemo(() => {
        const sorted = [...gridData];
        sorted.sort((a: any, b: any) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [gridData, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIndicator = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <div className="w-3 h-3" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
            {/* Toolbar */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="Filter grid..." 
                            value={textFilter}
                            onChange={(e) => setTextFilter(e.target.value)}
                            className="bg-black/40 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-poker-gold w-64 transition-all"
                        />
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">
                        {sortedData.length} Records
                    </span>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-300 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
            </div>

            {/* Grid Header */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead className="sticky top-0 z-10 bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider shadow-sm">
                        <tr>
                            {[
                                { id: 'date', label: 'Time', width: '15%' },
                                { id: 'hand', label: 'Hole Cards', width: '10%' },
                                { id: 'position', label: 'Pos', width: '8%' },
                                { id: 'stake', label: 'Stakes', width: '12%' },
                                { id: 'netWin', label: 'Net ($)', width: '10%', align: 'right' },
                                { id: 'bbWon', label: 'BB +/-', width: '10%', align: 'right' },
                                { id: 'pot', label: 'Pot', width: '10%', align: 'right' },
                                { id: 'tags', label: 'Tags', width: '15%' },
                                { id: 'action', label: 'Review', width: '10%', align: 'center' },
                            ].map(col => (
                                <th 
                                    key={col.id} 
                                    className={`p-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-colors select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                    style={{ width: col.width }}
                                    onClick={() => col.id !== 'action' && col.id !== 'tags' && handleSort(col.id)}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                                        {col.label} <SortIndicator column={col.id} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 bg-black/20">
                        {sortedData.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-white/[0.03] transition-colors group">
                                <td className="p-3 text-zinc-500 whitespace-nowrap">
                                    {new Date(row.date).toLocaleString([], {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                </td>
                                <td className="p-3 font-bold text-white">
                                    <span className={`${row.hand.includes('s') ? 'text-poker-gold' : 'text-zinc-300'}`}>{row.hand || '-'}</span>
                                </td>
                                <td className="p-3 text-zinc-400">{row.position}</td>
                                <td className="p-3 text-zinc-500">{row.stake}</td>
                                <td className={`p-3 text-right font-bold ${row.netWin > 0 ? 'text-poker-green' : row.netWin < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                                    {row.netWin > 0 ? '+' : ''}{row.netWin.toLocaleString()}
                                </td>
                                <td className={`p-3 text-right ${row.bbWon > 0 ? 'text-emerald-400' : row.bbWon < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                                    {row.bbWon.toFixed(1)}
                                </td>
                                <td className="p-3 text-right text-zinc-300 font-bold">
                                    {row.pot.toLocaleString()}
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                        {row.tags.slice(0, 2).map((t: string) => (
                                            <span key={t} className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-400 border border-zinc-700">{t}</span>
                                        ))}
                                        {row.tags.length > 2 && <span className="text-[9px] text-zinc-600">+{row.tags.length - 2}</span>}
                                    </div>
                                </td>
                                <td className="p-3 text-center">
                                    <button 
                                        onClick={() => onReview(row.raw)}
                                        className="p-1.5 hover:bg-poker-gold hover:text-black rounded text-zinc-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <PlayCircle className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sortedData.length === 0 && (
                    <div className="p-12 text-center text-zinc-500 text-sm">No records found matching filters.</div>
                )}
            </div>
        </div>
    );
};
