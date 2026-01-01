
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePoker } from '../App';
import { Trash2, Database, Search, Pen, Save, Filter, Calendar, X, StickyNote, Download, ArrowUpRight, DollarSign, Tag, Plus, Trophy, CheckCircle2, Circle, Play, TrendingUp, CloudUpload, Loader2 } from 'lucide-react';
import { parseHeroHandDetails } from '../services/statsParser';
import { uploadToGCS, streamToBigQuery } from '../services/gcp';

export const HistorySidebar: React.FC = () => {
  const { hands, setSelectedHand, deleteHand, selectedHand, updateHand, setViewMode, user, addToast } = usePoker();
  const [searchQuery, setSearchQuery] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (selectedHand) {
      setNoteText(selectedHand.notes || '');
    }
  }, [selectedHand]);

  // Mission Calculation
  const missionProgress = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const handsAnalyzedToday = hands.filter(h => h.timestamp >= today.getTime()).length;
      const totalHands = hands.length;
      const rangesCount = user?.settings?.savedRanges?.length || 0;

      return [
          { id: 1, label: 'Analyze 3 Hands Today', current: handsAnalyzedToday, target: 3, reward: '50 XP' },
          { id: 2, label: 'Build Your Database', current: totalHands, target: 10, reward: 'Pro Badge' },
          { id: 3, label: 'Create Custom Ranges', current: rangesCount, target: 5, reward: 'Unlock GTO' }
      ];
  }, [hands, user?.settings?.savedRanges]);

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
    }
  };

  const handleAddTag = (tag: string) => {
      if (!selectedHand) return;
      const currentTags = selectedHand.tags || [];
      if (!currentTags.includes(tag)) {
          updateHand(selectedHand.id, { tags: [...currentTags, tag] });
      }
  };

  const handleRemoveTag = (tag: string) => {
      if (!selectedHand) return;
      const currentTags = selectedHand.tags || [];
      updateHand(selectedHand.id, { tags: currentTags.filter(t => t !== tag) });
  };

  const availableTags = user?.settings?.tagTemplates || ['Review', 'Bluff', 'Value', 'Tilt'];

  const handleExportDB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(hands));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pokervision_database.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleCloudSync = async () => {
      if (!user?.settings?.gcp?.accessToken) {
          addToast({ title: "GCP Settings Missing", description: "Configure Google Cloud in Profile first.", type: 'error' });
          return;
      }
      
      setIsSyncing(true);
      try {
          // 1. Storage Upload
          await uploadToGCS(hands, user.settings.gcp);
          
          // 2. BigQuery Streaming
          const bqResult = await streamToBigQuery(hands, user.settings.gcp);
          
          addToast({ 
              title: "Cloud Sync Complete", 
              description: `Uploaded backup. Streamed ${bqResult.inserted} rows to BigQuery.`, 
              type: 'success' 
          });
      } catch (e: any) {
          addToast({ title: "Sync Failed", description: e.message, type: 'error' });
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-zinc-900">
      {/* Header - Sticky */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-900 bg-[#0a0a0a] z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
            <Database className="w-3.5 h-3.5 text-poker-gold" />
            Hand History
          </h2>
          <div className="flex items-center gap-2">
             <button 
                onClick={handleCloudSync} 
                disabled={isSyncing}
                className={`p-1.5 rounded-lg transition-colors ${isSyncing ? 'text-poker-gold animate-pulse bg-zinc-800' : 'text-zinc-600 hover:text-white hover:bg-zinc-800'}`} 
                title="Sync to Google Cloud"
             >
                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
             </button>
             <button onClick={handleExportDB} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-white transition-colors" title="Export JSON">
                <Download className="w-3.5 h-3.5" />
             </button>
             <span className="text-[9px] font-mono font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                {filteredHands.length}
             </span>
          </div>
        </div>
      
        <div className="flex gap-2">
            <div className="relative group flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
                <input 
                    id="hand-search"
                    name="search"
                    type="text" 
                    placeholder="Search hands..." 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-8 text-xs text-white focus:outline-none focus:border-zinc-700 transition-colors placeholder-zinc-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-2 text-zinc-600 hover:text-zinc-300 p-0.5 hover:bg-zinc-800 rounded"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-2.5 rounded-xl border transition-all flex items-center justify-center ${
                    showFilters || startDate || endDate 
                    ? 'bg-zinc-800 border-zinc-700 text-poker-gold' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-300'
                }`}
                title="Filter by Date"
            >
                <Filter className="w-3.5 h-3.5" />
            </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
            <div className="mt-3 pt-3 border-t border-zinc-900 animate-slide-up">
                <div className="grid grid-cols-2 gap-2">
                    <input 
                        id="date-start"
                        name="startDate"
                        type="date" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-400 focus:outline-none focus:border-zinc-700 [color-scheme:dark]"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <input 
                        id="date-end"
                        name="endDate"
                        type="date" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-400 focus:outline-none focus:border-zinc-700 [color-scheme:dark]"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>
        )}
      </div>
      
      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
        {filteredHands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-700 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900/50 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 opacity-30" />
            </div>
            <p className="text-xs font-medium text-zinc-500">No hands found.</p>
            <p className="text-[10px] mt-1 text-zinc-600">Try analyzing a video first.</p>
          </div>
        ) : (
          filteredHands.map((hand) => {
            const displayTitle = hand.summary ? hand.summary.split('|')[0].trim() : hand.hero;
            const isSelected = selectedHand?.id === hand.id;
            const { netWin } = parseHeroHandDetails(hand);
            const isWin = netWin >= 0;
            
            return (
                <div 
                  key={hand.id}
                  onClick={() => { setSelectedHand(hand); setViewMode('review'); }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border relative group overflow-hidden ${
                    isSelected
                      ? 'bg-zinc-900 border-zinc-700 shadow-md ring-1 ring-zinc-700/50' 
                      : 'bg-transparent border-transparent hover:bg-zinc-900/40 hover:border-zinc-800/60'
                  }`}
                >
                  {/* Win/Loss Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isWin ? 'bg-poker-green' : 'bg-red-600'} opacity-50`}></div>

                  <div className="flex justify-between items-start mb-2 pl-2">
                    <span className={`text-xs font-bold truncate max-w-[150px] ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{displayTitle}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">{new Date(hand.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-1 pl-2">
                     <span className="text-[10px] text-zinc-500 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{hand.stakes}</span>
                     <div className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${isWin ? 'text-poker-emerald' : 'text-red-400'}`}>
                         <DollarSign className="w-2.5 h-2.5" />
                         {Math.abs(netWin).toLocaleString()}
                     </div>
                  </div>

                  {/* Tags */}
                  {hand.tags && hand.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 pl-2">
                          {hand.tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[9px] px-1.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{t}</span>
                          ))}
                      </div>
                  )}

                  {hand.notes && (
                     <div className="mt-2 text-[10px] text-zinc-500 line-clamp-1 italic pl-3 border-l-2 border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        {hand.notes}
                     </div>
                  )}
                  
                  {/* Quick Actions (Hover) */}
                  <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteHand(hand.id); }}
                        className="p-1.5 hover:bg-red-900/20 rounded-md text-zinc-600 hover:text-red-400 transition-all"
                        title="Delete Hand"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedHand(hand); setViewMode('review'); }}
                        className="p-1.5 hover:bg-zinc-700 rounded-md text-zinc-600 hover:text-white transition-all"
                        title="Quick Play"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                  </div>
                </div>
            );
          })
        )}
      </div>

      {/* Daily Grind Missions Widget */}
      {!selectedHand && (
          <div className="flex-shrink-0 p-4 border-t border-zinc-900 bg-[#0a0a0a]">
              <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-poker-gold" />
                  <span className="text-xs font-black text-zinc-300 uppercase tracking-widest">Daily Grind</span>
              </div>
              <div className="space-y-2">
                  {missionProgress.map(m => {
                      const progress = Math.min(m.current / m.target, 1);
                      const isComplete = m.current >= m.target;
                      
                      return (
                          <div key={m.id} className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800 relative overflow-hidden group">
                              <div className="flex items-center justify-between relative z-10">
                                  <div className="flex items-center gap-2">
                                      {isComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-poker-green" /> : <Circle className="w-3.5 h-3.5 text-zinc-600" />}
                                      <span className={`text-[10px] font-bold ${isComplete ? 'text-zinc-300 line-through decoration-zinc-600' : 'text-zinc-400'}`}>{m.label}</span>
                                  </div>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isComplete ? 'bg-poker-gold text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                                      {isComplete ? m.reward : `${m.current}/${m.target}`}
                                  </span>
                              </div>
                              {/* Progress Bar */}
                              {!isComplete && (
                                  <div className="absolute bottom-0 left-0 h-0.5 bg-poker-gold/30 transition-all duration-500" style={{ width: `${progress * 100}%` }}></div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Note & Tags Editor (Only visible when hand selected) */}
      {selectedHand && (
        <div className="flex-shrink-0 border-t border-zinc-900 bg-[#0a0a0a] p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 animate-slide-up">
            {/* Tag Selector */}
            <div className="mb-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedHand.tags?.map(t => (
                        <button key={t} onClick={() => handleRemoveTag(t)} className="flex items-center gap-1 px-2 py-0.5 bg-poker-gold/20 text-poker-gold border border-poker-gold/30 rounded text-[10px] hover:bg-red-900/30 hover:border-red-500 hover:text-red-400 transition-all group">
                            {t} <X className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                        </button>
                    ))}
                    <div className="relative group">
                        <button className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded text-[10px] hover:text-white hover:border-zinc-700">
                            <Plus className="w-2.5 h-2.5" /> Add Tag
                        </button>
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-zinc-900 border border-zinc-800 rounded-lg p-1 shadow-xl min-w-[120px] z-50">
                            {availableTags.map(t => (
                                <button key={t} onClick={() => handleAddTag(t)} className="block w-full text-left px-2 py-1 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 rounded">
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <StickyNote className="w-3 h-3 text-poker-gold" /> Player Notes
                </h3>
                {noteText !== (selectedHand.notes || '') && (
                    <button 
                        onClick={handleSaveNote}
                        className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px] font-bold hover:bg-poker-emerald hover:text-white transition-all animate-fade-in"
                    >
                        <Save className="w-2.5 h-2.5" /> Save
                    </button>
                )}
            </div>

            <div className="relative">
                <textarea 
                    ref={textareaRef}
                    id="note-textarea"
                    name="note"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all resize-none h-20 placeholder-zinc-700 font-mono leading-relaxed"
                    placeholder="Reads on player..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                />
            </div>
        </div>
      )}
    </div>
  );
};
