
import React, { useState, useMemo, useEffect } from 'react';
import { usePoker } from '../App';
import { Trash2, Database, Search, Filter, CloudUpload, Download, X, Play, DollarSign, Plus, Save, Wand2, Loader2, Calendar } from 'lucide-react';
import { parseHeroHandDetails } from '../services/statsParser';
import { uploadToGCS, streamToBigQuery } from '../services/gcp';
import { getPlayerNote, savePlayerNote } from '../services/storage';
import { generatePlayerNote } from '../services/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from './Tooltip';

export const HistorySidebar: React.FC = () => {
  const { hands, setSelectedHand, deleteHand, selectedHand, updateHand, setViewMode, user, addToast } = usePoker();
  const [searchQuery, setSearchQuery] = useState('');
  const [noteText, setNoteText] = useState('');
  const [playerNoteText, setPlayerNoteText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeNoteTab, setActiveNoteTab] = useState<'hand' | 'player'>('hand');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  
  useEffect(() => {
    if (selectedHand) {
      setNoteText(selectedHand.notes || '');
      setPlayerNoteText(getPlayerNote(selectedHand.hero));
    }
  }, [selectedHand]);

  const filteredHands = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return hands.filter(hand => {
      const matchesText = 
        hand.hero.toLowerCase().includes(lowerQuery) || 
        hand.stakes.toLowerCase().includes(lowerQuery) ||
        (hand.summary && hand.summary.toLowerCase().includes(lowerQuery)) ||
        (hand.notes && hand.notes.toLowerCase().includes(lowerQuery)) ||
        (hand.tags && hand.tags.some(t => t.toLowerCase().includes(lowerQuery)));
      
      if (!matchesText) return false;
      const handDate = new Date(hand.timestamp);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (handDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (handDate > end) return false;
      }
      return true;
    });
  }, [hands, searchQuery, startDate, endDate]);

  const handleSaveNote = () => {
    if (selectedHand) {
      updateHand(selectedHand.id, { notes: noteText });
      addToast({ title: 'Hand Note Saved', type: 'success' });
    }
  };

  const handleSavePlayerNote = () => {
    if (selectedHand) {
        savePlayerNote(selectedHand.hero, playerNoteText);
        addToast({ title: 'Player Profile Updated', type: 'success' });
    }
  };

  const handleAiGenerateNote = async () => {
    if (!selectedHand) return;
    setIsGeneratingNote(true);
    try {
        const note = await generatePlayerNote(selectedHand, user?.settings?.ai);
        setPlayerNoteText(prev => prev ? `${prev}\n\n[AI]: ${note}` : `[AI]: ${note}`);
        addToast({ title: 'Note Generated', type: 'success' });
    } catch (e) {
        addToast({ title: 'AI Generation Failed', type: 'error' });
    } finally {
        setIsGeneratingNote(false);
    }
  };

  const handleCloudSync = async () => {
      if (!user?.settings?.gcp?.accessToken) {
          addToast({ title: "GCP Settings Missing", description: "Configure Google Cloud in Profile first.", type: 'error' });
          return;
      }
      setIsSyncing(true);
      try {
          await uploadToGCS(hands, user.settings.gcp);
          const bqResult = await streamToBigQuery(hands, user.settings.gcp);
          addToast({ title: "Cloud Sync Complete", description: `Streamed ${bqResult.inserted} rows.`, type: 'success' });
      } catch (e: any) {
          addToast({ title: "Sync Failed", description: e.message, type: 'error' });
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-zinc-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-900 bg-[#0a0a0a] z-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
            <Database className="w-3.5 h-3.5 text-poker-gold" />
            Hand Database
          </h2>
          <div className="flex items-center gap-1">
             <Tooltip content="Sync to Google Cloud" position="bottom">
                 <button 
                    onClick={handleCloudSync} 
                    disabled={isSyncing}
                    className={`p-1.5 rounded-lg transition-colors ${isSyncing ? 'text-poker-gold animate-pulse bg-zinc-800' : 'text-zinc-600 hover:text-white hover:bg-zinc-800'}`} 
                 >
                    {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                 </button>
             </Tooltip>
             <Tooltip content="Export CSV" position="bottom">
                 <button onClick={() => {}} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-white transition-colors">
                    <Download className="w-3.5 h-3.5" />
                 </button>
             </Tooltip>
             <div className="ml-1 h-4 w-px bg-zinc-800"></div>
             <span className="ml-2 text-[9px] font-mono font-bold text-zinc-500">{filteredHands.length}</span>
          </div>
        </div>
      
        <div className="flex gap-2">
            <div className="relative group flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search hero, stakes, tags..." 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-9 pr-8 text-xs text-white focus:outline-none focus:border-zinc-700 transition-colors placeholder-zinc-700 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-zinc-600 hover:text-zinc-300 p-0.5 hover:bg-zinc-800 rounded">
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
            <Tooltip content="Date Filters" position="bottom">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-2.5 rounded-lg border transition-all flex items-center justify-center h-9 ${
                        showFilters || startDate || endDate 
                        ? 'bg-zinc-800 border-zinc-700 text-poker-gold' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-300'
                    }`}
                >
                    <Filter className="w-3.5 h-3.5" />
                </button>
            </Tooltip>
        </div>

        <AnimatePresence>
            {showFilters && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="pt-2 grid grid-cols-2 gap-2">
                        <div className="relative">
                            <Calendar className="absolute left-2 top-2 w-3 h-3 text-zinc-600 pointer-events-none" />
                            <input type="date" className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 pl-7 text-[10px] text-zinc-400 focus:outline-none focus:border-zinc-700 [color-scheme:dark]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-2 top-2 w-3 h-3 text-zinc-600 pointer-events-none" />
                            <input type="date" className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 pl-7 text-[10px] text-zinc-400 focus:outline-none focus:border-zinc-700 [color-scheme:dark]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
      
      {/* Hand List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {filteredHands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-700 text-center px-4">
            <Search className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-xs font-medium text-zinc-500">No hands found.</p>
          </div>
        ) : (
          filteredHands.map((hand) => {
            const displayTitle = hand.summary ? hand.summary.split('|')[0].trim() : hand.hero;
            const isSelected = selectedHand?.id === hand.id;
            const { netWin } = parseHeroHandDetails(hand);
            const isWin = netWin >= 0;
            
            return (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={hand.id}
                  onClick={() => { setSelectedHand(hand); setViewMode('review'); }}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-zinc-800/80 border-zinc-700 shadow-lg ring-1 ring-white/5' 
                      : 'bg-transparent border-transparent hover:bg-zinc-900/60 hover:border-zinc-800'
                  }`}
                >
                  <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${isWin ? 'bg-poker-green' : 'bg-red-500'} opacity-60`}></div>

                  <div className="flex justify-between items-start mb-1.5 pl-3">
                    <span className={`text-xs font-bold truncate max-w-[150px] ${isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>{displayTitle}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{new Date(hand.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pl-3">
                     <span className="text-[10px] text-zinc-500 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{hand.stakes}</span>
                     <div className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${isWin ? 'text-poker-emerald' : 'text-red-400'}`}>
                         <DollarSign className="w-2.5 h-2.5" />
                         {Math.abs(netWin).toLocaleString()}
                     </div>
                  </div>

                  {hand.tags && hand.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pl-3">
                          {hand.tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[9px] px-1.5 py-px rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{t}</span>
                          ))}
                      </div>
                  )}
                  
                  {/* Actions Overlay */}
                  <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <Tooltip content="Delete Hand" position="left">
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteHand(hand.id); }}
                            className="p-1.5 bg-zinc-900/80 hover:bg-red-900/30 rounded-md text-zinc-500 hover:text-red-400 transition-colors border border-zinc-800"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                      </Tooltip>
                  </div>
                </motion.div>
            );
          })
        )}
      </div>

      {/* Footer / Editor */}
      {selectedHand && (
        <div className="flex-shrink-0 border-t border-zinc-900 bg-[#0c0c0c] p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20">
            <div className="flex items-center gap-4 mb-3 border-b border-zinc-800 pb-1">
                <button onClick={() => setActiveNoteTab('hand')} className={`text-[10px] font-bold uppercase tracking-wider pb-1 transition-all ${activeNoteTab === 'hand' ? 'text-poker-gold border-b-2 border-poker-gold' : 'text-zinc-500 hover:text-zinc-300'}`}>Hand Note</button>
                <button onClick={() => setActiveNoteTab('player')} className={`text-[10px] font-bold uppercase tracking-wider pb-1 transition-all ${activeNoteTab === 'player' ? 'text-poker-gold border-b-2 border-poker-gold' : 'text-zinc-500 hover:text-zinc-300'}`}>Hero Profile</button>
            </div>

            <div className="relative">
                {activeNoteTab === 'hand' ? (
                    <>
                        <button onClick={handleSaveNote} className="absolute right-2 top-2 flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px] font-bold hover:bg-poker-emerald hover:text-white transition-all z-10"><Save className="w-2.5 h-2.5" /> Save</button>
                        <textarea 
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all resize-none h-20 placeholder-zinc-700 font-mono leading-relaxed"
                            placeholder="Observations..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                        />
                    </>
                ) : (
                    <>
                        <div className="absolute right-2 top-2 flex gap-1 z-10">
                            <Tooltip content="Auto-generate notes with AI" position="top">
                                <button onClick={handleAiGenerateNote} disabled={isGeneratingNote} className="flex items-center gap-1 px-2 py-0.5 bg-purple-900/30 text-purple-300 border border-purple-800 rounded text-[10px] font-bold hover:bg-purple-800 hover:text-white transition-all disabled:opacity-50">
                                    {isGeneratingNote ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />} AI
                                </button>
                            </Tooltip>
                            <button onClick={handleSavePlayerNote} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px] font-bold hover:bg-poker-emerald hover:text-white transition-all"><Save className="w-2.5 h-2.5" /> Save</button>
                        </div>
                        <textarea 
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all resize-none h-20 placeholder-zinc-700 font-mono leading-relaxed"
                            placeholder="Player tendencies..."
                            value={playerNoteText}
                            onChange={(e) => setPlayerNoteText(e.target.value)}
                        />
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
