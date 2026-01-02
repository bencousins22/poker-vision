
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult, AnalysisStatus, HandHistory } from '../types';
import { analyzePokerVideo, getVideoIntelligence } from '../services/gemini';
import { saveHand } from '../services/storage';
import { usePoker } from '../App';
import ReactPlayer from 'react-player';
import { Upload, Loader2, Youtube, Terminal, Copy, Save, Wand2, FileText, Film, Sparkles, FileVideo, Eye, DollarSign, Layers, Maximize, Minimize, Scan, Activity, Aperture, AlertTriangle, PlayCircle, ArrowRight, Settings2, ExternalLink, Check, Cloud, RefreshCw, BrainCircuit, Tag, TextSelect } from 'lucide-react';
import { Tooltip } from './Tooltip';

const AnalysisPipeline: React.FC<{ step: number }> = ({ step }) => {
    const steps = [
        { id: 1, label: 'Upload' },
        { id: 2, label: 'Connect' },
        { id: 3, label: 'Vision' },
        { id: 4, label: 'Parse' },
        { id: 5, label: 'Done' }
    ];

    return (
        <div className="flex items-center justify-between w-full max-w-lg mx-auto mb-6 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -z-10"></div>
            <div 
                className="absolute top-1/2 left-0 h-0.5 bg-poker-emerald transition-all duration-500 -z-10" 
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            ></div>
            
            {steps.map((s) => {
                const isActive = step >= s.id;
                
                return (
                    <div key={s.id} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                            isActive ? 'bg-poker-emerald border-poker-emerald text-black scale-110' : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                        }`}>
                            {isActive ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{s.id}</span>}
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                            {s.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export const AnalysisView: React.FC = () => {
  const { addHand, activeVideoUrl, setSelectedHand, setViewMode, user, addToast } = usePoker();
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<{id: string, time: string, msg: string, type: string}[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [siteFormat, setSiteFormat] = useState('Hustler Casino Live');
  const [activeTab, setActiveTab] = useState<'output' | 'logs' | 'intelligence'>('output');

  // Player State
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [playerError, setPlayerError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const Player = ReactPlayer as any;

  useEffect(() => {
    if (activeVideoUrl) {
        setUrl(activeVideoUrl || '');
        setFile(null);
        setStatus(AnalysisStatus.IDLE);
        setResult(null);
        setIntelligence(null);
        setStreamingContent('');
        setLogs([]);
        setPlayerError(false);
        addLog(`Loaded video context: ${activeVideoUrl}`, 'system');
    }
  }, [activeVideoUrl]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsCinemaMode(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const extractedData = useMemo(() => {
      const content = result?.handHistory || streamingContent;
      
      const heroMatch = content.match(/Dealt to (.+?) \[/);
      const potMatch = content.match(/Total pot \$([\d,]+)/);
      const stakesMatch = content.match(/\(\$([\d.]+)\/\$([\d.]+)/);
      
      let boardCards: string[] = [];
      const flopMatch = content.match(/\*\*\* FLOP \*\*\* \[(.*?)\]/);
      const turnMatch = content.match(/\*\*\* TURN \*\*\* .*? \[(.*?)\]/);
      const riverMatch = content.match(/\*\*\* RIVER \*\*\* .*? \[(.*?)\]/);
      
      if (flopMatch) boardCards = [...boardCards, ...flopMatch[1].split(' ')];
      if (turnMatch) boardCards.push(turnMatch[1].replace(/[\[\]]/g, ''));
      if (riverMatch) boardCards.push(riverMatch[1].replace(/[\[\]]/g, ''));

      return {
          hero: heroMatch ? heroMatch[1] : 'Scanning...',
          pot: potMatch ? `$${potMatch[1]}` : '$0',
          stakes: stakesMatch ? `$${stakesMatch[1]}/$${stakesMatch[2]}` : 'Unknown',
          board: boardCards
      };
  }, [streamingContent, result]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' | 'system' = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
      msg: message,
      type
    }]);
  };

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setFilePreviewUrl(objectUrl);
      addLog(`Loaded local file: ${file.name}`, 'system');
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setFilePreviewUrl(null);
    }
  }, [file]);

  const handleAnalyze = async () => {
    if (!url && !file) {
      setError("Provide a valid YouTube URL or video file.");
      return;
    }

    // Basic validation
    if (url && !ReactPlayer.canPlay(url)) {
        setError("Invalid URL format or unsupported video source.");
        return;
    }

    setStatus(AnalysisStatus.PROCESSING);
    setProgressStep(1);
    setError(null);
    setResult(null);
    setIntelligence(null);
    setStreamingContent('');
    setLogs([]); 
    
    const sourceMsg = file ? `Video File (${file.name})` : 'YouTube URL';
    addLog(`Initializing Analysis for ${sourceMsg}...`, 'system');
    addLog(`Protocol: ${siteFormat}`, 'system');
    addLog(`AI Provider: ${user?.settings?.ai?.provider || 'Default'} - Model: ${user?.settings?.ai?.model}`, 'system');

    try {
        setTimeout(() => setProgressStep(2), 1500);

        const res = await analyzePokerVideo(
            file, 
            url,
            siteFormat,
            (msg) => { 
                addLog(msg, 'info'); 
                if (msg.includes('Generating')) setProgressStep(3);
            },
            (streamText) => {
                setStreamingContent(streamText);
                if (streamText.length > 50 && progressStep < 4) setProgressStep(4);
            },
            user?.settings?.ai
        );
        
        setResult(res);
        setStatus(AnalysisStatus.COMPLETE);
        setProgressStep(5);
        addLog("Hand History Extraction Complete.", 'success');
        
        // Auto-trigger intelligence for file uploads
        if (file && user?.settings?.ai?.provider === 'google') {
            handleDeepAnalysis();
        }

    } catch (err: any) {
        setError(err.message);
        setStatus(AnalysisStatus.ERROR);
        addLog(`Analysis Failed: ${err.message}`, 'error');
    }
  };

  const handleDeepAnalysis = async () => {
      addLog("Starting Deep Video Intelligence scan...", "system");
      try {
          const data = await getVideoIntelligence(file, url, user?.settings?.ai);
          setIntelligence(data);
          setActiveTab('intelligence');
          addLog("Video Intelligence metadata extracted.", "success");
      } catch (e: any) {
          addToast({ title: "Deep Analysis Failed", description: e.message, type: "error" });
          addLog(`Deep Scan Error: ${e.message}`, "error");
      }
  };

  const sanitizeHandHistory = (text: string) => {
    let clean = text.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
    if (!clean.includes("PokerStars Hand #")) {
         const id = Math.floor(Math.random() * 10000000000);
         const now = new Date();
         const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} ET`;
         clean = `PokerStars Hand #${id}:  Hold'em No Limit ($100/$200 USD) - ${dateStr}\n` + clean;
    }
    return clean;
  };

  const handleSaveAndReview = () => {
    const rawContent = result?.handHistory || streamingContent;
    if (!rawContent) return;
    
    const cleanText = sanitizeHandHistory(rawContent);
    const lines = cleanText.split('\n');
    const heroLine = lines.find(l => l.includes('Dealt to'));
    const hero = heroLine ? (heroLine.split('Dealt to ')[1]?.split(' [')[0] || 'Hero') : 'Hero';
    const potLine = lines.find(l => l.includes('Total pot'));
    const pot = potLine ? (potLine.match(/\$[\d,.]+/)?.[0] || '$0') : '$0';
    const stakesLine = lines.find(l => l.includes('($'));
    const stakes = stakesLine?.match(/\(\$[\d.]+\/\$[\d.]+/)?.[0]?.replace(/[()]/g, '') || '$100/$200';

    const handData: Omit<HandHistory, 'id' | 'timestamp'> = {
      videoUrl: url || undefined,
      hero,
      stakes,
      rawText: cleanText,
      summary: `${hero} vs Villain | ${pot} Pot`,
      potSize: pot,
      tags: intelligence?.labels ? intelligence.labels.slice(0,3) : []
    };

    const newHand = saveHand(handData);
    addHand(newHand);
    addLog(`Hand saved to database: ${newHand.id}`, 'success');
    
    setSelectedHand(newHand);
    setViewMode('review');
  };

  const canAnalyze = (!!url && url.length > 5) || !!file;

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-background to-black/80 overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 px-6 py-4 border-b border-white/5 bg-background/50 backdrop-blur-sm z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-poker-emerald/10 border border-poker-emerald/20 text-poker-emerald text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="w-3 h-3 animate-pulse" /> Vision Engine v2.4
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Video Analysis
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={`px-3 py-1.5 border rounded-full flex items-center gap-2 transition-colors ${status === AnalysisStatus.ERROR ? 'bg-red-950/30 border-red-900 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                {status === AnalysisStatus.ERROR ? <AlertTriangle className="w-3 h-3" /> : <div className={`w-1.5 h-1.5 rounded-full ${status === AnalysisStatus.PROCESSING ? 'bg-poker-gold animate-pulse' : 'bg-poker-green'}`}></div>}
                <span className="text-[10px] font-mono uppercase tracking-wider">
                    {status === AnalysisStatus.ERROR ? 'ERROR' : status === AnalysisStatus.PROCESSING ? 'PROCESSING' : 'READY'}
                </span>
             </div>
          </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            
            {/* LEFT: Controls */}
            <div className="lg:col-span-3 flex flex-col h-full overflow-hidden order-2 lg:order-1">
                <div className="bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 shadow-xl backdrop-blur-md h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-poker-emerald/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex flex-col gap-2 relative overflow-hidden animate-in slide-in-from-left-2 z-20">
                            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                                <AlertTriangle className="w-3.5 h-3.5" /> Analysis Failed
                            </div>
                            <p className="text-[10px] text-zinc-300 leading-snug">{error}</p>
                            <button 
                                onClick={handleAnalyze} 
                                className="mt-2 flex items-center justify-center gap-2 w-full py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold rounded transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" /> Retry Analysis
                            </button>
                        </div>
                    )}

                    <div className="space-y-4 relative z-10 overflow-y-auto flex-1 scrollbar-none">
                        <Tooltip content="Upload MP4 or MOV. Max 2GB." position="bottom" className="w-full">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`group relative border border-dashed rounded-xl p-4 transition-all cursor-pointer text-center flex flex-col items-center justify-center min-h-[100px] w-full ${
                                    file ? 'border-poker-emerald/50 bg-poker-emerald/5' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50'
                                }`}
                            >
                                <input 
                                    id="video-upload"
                                    name="videoFile"
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="video/*" 
                                    onChange={(e) => { setFile(e.target.files?.[0] || null); if(url) setUrl(''); }} 
                                />
                                {file ? (
                                    <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-300">
                                        <FileVideo className="w-6 h-6 text-poker-emerald" />
                                        <span className="text-xs font-bold text-white max-w-[150px] truncate">{file.name}</span>
                                        <span className="text-[9px] text-zinc-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-zinc-500 group-hover:text-zinc-300">
                                        <Upload className="w-5 h-5" />
                                        <span className="text-xs font-bold text-white">Upload File</span>
                                        <span className="text-[9px]">Best for Vision API</span>
                                    </div>
                                )}
                            </div>
                        </Tooltip>

                        <div className="relative group">
                            <label htmlFor="video-url" className="sr-only">YouTube URL</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Youtube className="h-4 w-4 text-zinc-600 group-focus-within:text-red-500 transition-colors" />
                            </div>
                            <input 
                                id="video-url"
                                name="videoUrl"
                                type="text" 
                                placeholder="YouTube URL..."
                                className="w-full bg-black/40 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white focus:border-poker-emerald focus:ring-1 focus:ring-poker-emerald transition-all shadow-inner"
                                value={url}
                                onChange={(e) => { setUrl(e.target.value); if(file) setFile(null); setPlayerError(false); }}
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="site-format" className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                <Settings2 className="w-3 h-3" /> Protocol
                            </label>
                            <div className="relative">
                                <select 
                                    id="site-format"
                                    name="siteFormat"
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600 appearance-none"
                                    value={siteFormat}
                                    onChange={(e) => setSiteFormat(e.target.value)}
                                >
                                    <option>Hustler Casino Live</option>
                                    <option>Triton Poker</option>
                                    <option>PokerGO</option>
                                    <option>The Lodge Live</option>
                                    <option>Generic Online</option>
                                </select>
                                <div className="absolute right-3 top-2.5 pointer-events-none text-zinc-500 text-[10px]">▼</div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleAnalyze}
                        disabled={!canAnalyze || status === AnalysisStatus.PROCESSING}
                        className={`w-full shrink-0 relative overflow-hidden rounded-xl font-bold text-xs py-3.5 shadow-lg transition-all ${
                            canAnalyze && status !== AnalysisStatus.PROCESSING
                            ? 'bg-white text-black hover:shadow-poker-emerald/20 hover:scale-[1.02]' 
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                    >
                        {status === AnalysisStatus.PROCESSING ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <Wand2 className="w-3 h-3" />
                                <span>Start Analysis</span>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* CENTER: Video & HUD */}
            <div className="lg:col-span-6 flex flex-col h-full overflow-hidden gap-4 order-1 lg:order-2">
                
                {status !== AnalysisStatus.IDLE && (
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 animate-slide-up">
                        <AnalysisPipeline step={progressStep} />
                    </div>
                )}

                <div className={`transition-all duration-500 ease-in-out shrink-0 ${
                    isCinemaMode 
                    ? 'fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl' 
                    : 'relative w-full aspect-video rounded-2xl group shadow-2xl bg-black border border-zinc-800'
                }`}>
                    <div className={`relative overflow-hidden w-full h-full ${
                        isCinemaMode ? 'max-w-7xl aspect-video rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10' : 'rounded-2xl'
                    }`}>
                        
                        {playerError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-20 p-6 text-center">
                                <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                                <p className="text-sm font-bold text-zinc-200">Playback Restricted</p>
                                <p className="text-[10px] text-zinc-500 mt-1 max-w-xs">
                                    Owner disabled embedded playback. Analysis still works.
                                </p>
                                {url && (
                                    <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold rounded-full transition-colors"
                                    >
                                        <Youtube className="w-3 h-3" /> Open in YouTube
                                    </a>
                                )}
                            </div>
                        )}

                        {(url || filePreviewUrl) && !playerError && (
                            <div className="w-full h-full relative z-10 bg-black">
                                <Player
                                    url={filePreviewUrl || url}
                                    width="100%"
                                    height="100%"
                                    controls={true}
                                    playing={false}
                                    onError={(e: any) => {
                                        setPlayerError(true);
                                        addLog(`Player Warning: Video restricted. UI fallback active.`, "warning");
                                    }}
                                    config={{ 
                                        youtube: { 
                                            playerVars: { 
                                                showinfo: 0, modestbranding: 1, rel: 0, origin: typeof window !== 'undefined' ? window.location.origin : undefined
                                            } 
                                        } 
                                    }}
                                />
                            </div>
                        )}

                        {!(url || filePreviewUrl) && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 bg-zinc-950">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                                <div className="relative w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 shadow-2xl animate-pulse-slow">
                                    <Aperture className="w-8 h-8 text-zinc-600" />
                                </div>
                                <p className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-widest z-10">System Idle</p>
                            </div>
                        )}

                        {showHud && (status === AnalysisStatus.PROCESSING || isCinemaMode) && (
                            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-red-500/30">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-[8px] font-mono font-bold text-red-500 tracking-widest uppercase">REC</span>
                                    </div>
                                </div>
                                {status === AnalysisStatus.PROCESSING && (
                                     <div className="absolute top-0 left-0 w-full h-0.5 bg-poker-emerald/50 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-[scan_3s_linear_infinite] opacity-50"></div>
                                )}
                            </div>
                        )}

                        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <Tooltip content="Toggle HUD" position="left">
                                 <button onClick={() => setShowHud(!showHud)} className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md border border-white/10">
                                    <Scan className="w-3.5 h-3.5" />
                                 </button>
                             </Tooltip>
                             <Tooltip content="Cinema Mode" position="left">
                                 <button onClick={() => setIsCinemaMode(!isCinemaMode)} className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md border border-white/10">
                                    {isCinemaMode ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                                 </button>
                             </Tooltip>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4 overflow-y-auto">
                    {(streamingContent || result) ? (
                        <div className="grid grid-cols-3 gap-3 animate-slide-up">
                            <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl flex flex-col gap-1">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase flex items-center gap-1.5"><Eye className="w-3 h-3" /> Hero</span>
                                <span className="text-white font-bold truncate text-sm">{extractedData.hero}</span>
                            </div>
                            <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl flex flex-col gap-1">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Pot</span>
                                <span className="text-poker-gold font-mono font-bold truncate text-sm">{extractedData.pot}</span>
                            </div>
                            <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl flex flex-col gap-1">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase flex items-center gap-1.5"><Layers className="w-3 h-3" /> Board</span>
                                <div className="flex gap-1 overflow-hidden h-5 items-center">
                                    {extractedData.board.length > 0 ? (
                                        extractedData.board.map((c, i) => (
                                            <span key={i} className="text-[10px] font-mono bg-white text-black px-1 rounded shadow-sm font-bold">{c}</span>
                                        ))
                                    ) : <span className="text-zinc-600 text-[10px] italic">Pending...</span>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                            <Activity className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs font-medium">No live data extracted</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Output & Tabs */}
            <div className="lg:col-span-3 flex flex-col h-full gap-4 overflow-hidden order-3">
                
                {/* Tab Switcher */}
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
                    {['output', 'logs', 'intelligence'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                activeTab === tab 
                                ? 'bg-zinc-800 text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {tab === 'output' && <FileText className="w-3 h-3" />}
                            {tab === 'logs' && <Terminal className="w-3 h-3" />}
                            {tab === 'intelligence' && <BrainCircuit className="w-3 h-3" />}
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-[#0c0c0c] rounded-2xl border border-zinc-800 overflow-hidden flex flex-col shadow-xl relative">
                    
                    {activeTab === 'logs' && (
                        <div className="flex-1 overflow-y-auto p-3 font-mono text-[9px] space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 animate-in fade-in">
                            {logs.map(log => (
                                <div key={log.id} className="flex gap-2 text-zinc-400">
                                    <span className="text-zinc-600 select-none">[{log.time}]</span>
                                    <span className={`${
                                        log.type === 'error' ? 'text-red-400' :
                                        log.type === 'success' ? 'text-poker-green' :
                                        log.type === 'system' ? 'text-blue-400' : 'text-zinc-300'
                                    }`}>{log.msg}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}

                    {activeTab === 'output' && (
                        <div className="flex-1 relative flex flex-col animate-in fade-in">
                            <div className="absolute inset-0 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-zinc-800">
                                <pre className="text-[9px] font-mono text-zinc-400 whitespace-pre-wrap font-medium leading-relaxed select-text">
                                    {sanitizeHandHistory(result?.handHistory || streamingContent)}
                                </pre>
                            </div>
                            {status === AnalysisStatus.COMPLETE && (
                                <div className="absolute bottom-3 left-3 right-3 animate-slide-up">
                                    <button 
                                        onClick={handleSaveAndReview}
                                        className="w-full py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                    >
                                        <PlayCircle className="w-3.5 h-3.5 fill-current" /> Save & Review
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'intelligence' && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 animate-in fade-in">
                            {intelligence ? (
                                <>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Tag className="w-3 h-3" /> Labels Detected
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {intelligence.labels?.map((label: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-[9px] text-zinc-300 border border-zinc-700">
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <TextSelect className="w-3 h-3" /> OCR Text
                                        </h4>
                                        <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 text-[9px] font-mono text-zinc-400 break-words">
                                            {intelligence.text_detected?.join(', ')}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Activity className="w-3 h-3" /> Key Events
                                        </h4>
                                        <div className="space-y-1">
                                            {intelligence.key_events?.map((evt: any, i: number) => (
                                                <div key={i} className="flex gap-2 text-[10px]">
                                                    <span className="font-mono text-poker-gold">{evt.time}</span>
                                                    <span className="text-zinc-300">{evt.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                    <BrainCircuit className="w-8 h-8 text-zinc-700 mb-2" />
                                    <p className="text-xs text-zinc-500 mb-4">Run deep analysis to extract entities and metadata.</p>
                                    <button 
                                        onClick={handleDeepAnalysis} 
                                        disabled={!file}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Run Video Intelligence
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
