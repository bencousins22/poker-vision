import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult, AnalysisStatus } from '../types';
import { analyzePokerVideo } from '../services/gemini';
import { saveHand } from '../services/storage';
import { usePoker } from '../App';
import ReactPlayer from 'react-player';
import { Upload, Loader2, Youtube, Terminal, Copy, Save, Wand2, FileText, Film, Sparkles, FileVideo, Eye, DollarSign, Layers, Maximize, Minimize, Scan, Activity, Aperture, AlertTriangle, PlayCircle, ArrowRight, Settings2, ExternalLink } from 'lucide-react';

export const AnalysisView: React.FC = () => {
  const { addHand, activeVideoUrl, setSelectedHand, setViewMode } = usePoker();
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<{id: string, time: string, msg: string, type: string}[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [siteFormat, setSiteFormat] = useState('Hustler Casino Live');

  // Player State
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [playerError, setPlayerError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fix: Cast ReactPlayer to any to avoid internal library type definition conflicts
  // where it is sometimes incorrectly inferred as a native HTMLVideoElement.
  const Player = ReactPlayer as any;

  useEffect(() => {
    if (activeVideoUrl) {
        setUrl(activeVideoUrl);
        setFile(null);
        setStatus(AnalysisStatus.IDLE);
        setResult(null);
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

    setStatus(AnalysisStatus.PROCESSING);
    setProgressStep(1);
    setError(null);
    setResult(null);
    setStreamingContent('');
    setLogs([]); 
    addLog(`Initializing Vision pipeline for ${siteFormat}...`, 'system');

    try {
        setTimeout(() => setProgressStep(2), 1500);

        const res = await analyzePokerVideo(
            file, 
            url, 
            (msg) => { 
                addLog(msg, 'info'); 
                if (msg.includes('Generating')) setProgressStep(3);
            },
            (streamText) => {
                setStreamingContent(streamText);
                if (streamText.length > 50 && progressStep < 4) setProgressStep(4);
            }
        );
        
        setResult(res);
        setStatus(AnalysisStatus.COMPLETE);
        setProgressStep(5);
        addLog("Analysis pipeline finished successfully.", 'success');
    } catch (err: any) {
        setError(err.message);
        setStatus(AnalysisStatus.ERROR);
        addLog(`Error: ${err.message}`, 'error');
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
    const hero = heroLine ? heroLine.split('Dealt to ')[1].split(' [')[0] : 'Hero';
    const potLine = lines.find(l => l.includes('Total pot'));
    const pot = potLine ? potLine.match(/\$[\d,.]+/)?.[0] : '$0';
    
    const newHand = saveHand({
      videoUrl: url,
      hero,
      stakes: lines.find(l => l.includes('($'))?.match(/\(\$[\d.]+\/\$[\d.]+/)?.[0]?.replace(/[()]/g, '') || '$100/$200',
      rawText: cleanText,
      summary: `${hero} vs Villain | ${pot} Pot`,
      potSize: pot
    });
    addHand(newHand);
    addLog(`Hand saved to database: ${newHand.id}`, 'success');
    
    // Navigation
    setSelectedHand(newHand);
    setViewMode('review');
  };

  const canAnalyze = (!!url && url.length > 5) || !!file;

  return (
    <div className="flex-1 p-6 lg:p-10 overflow-y-auto scroll-smooth bg-gradient-to-b from-background to-black/80">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-poker-emerald/10 border border-poker-emerald/20 text-poker-emerald text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="w-3 h-3 animate-pulse" /> Vision Engine v2.4
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Video Analysis
            </h1>
            <p className="text-sm text-zinc-400 font-medium max-w-xl">
              Upload footage or paste a URL. Our AI extracts player stacks, hole cards, and action history in real-time.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status === AnalysisStatus.PROCESSING ? 'bg-poker-gold animate-pulse' : 'bg-poker-green'}`}></div>
                <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider">
                    {status === AnalysisStatus.PROCESSING ? 'ENGINE ACTIVE' : 'SYSTEM READY'}
                </span>
             </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-280px)] min-h-[600px]">
            
            {/* LEFT: Controls & Input */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full">
                <div className="bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 shadow-xl backdrop-blur-md flex-1 relative overflow-hidden">
                    {/* Decorative Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-poker-emerald/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="space-y-4 relative z-10">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Film className="w-3 h-3" /> Input Source
                        </label>
                        
                        <div className="space-y-3">
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    placeholder="YouTube URL..."
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 pl-10 text-xs text-white focus:border-poker-emerald focus:ring-1 focus:ring-poker-emerald transition-all shadow-inner"
                                    value={url}
                                    onChange={(e) => { setUrl(e.target.value); if(file) setFile(null); setPlayerError(false); }}
                                />
                                <Youtube className="absolute left-3 top-3 w-4 h-4 text-zinc-600 group-focus-within:text-red-500 transition-colors" />
                            </div>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-zinc-800"></div>
                                <span className="flex-shrink-0 mx-3 text-zinc-700 text-[9px] font-bold uppercase">OR</span>
                                <div className="flex-grow border-t border-zinc-800"></div>
                            </div>

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`group relative border border-dashed rounded-xl p-6 transition-all cursor-pointer text-center flex flex-col items-center justify-center ${
                                    file ? 'border-poker-emerald/50 bg-poker-emerald/5' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50'
                                }`}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={(e) => { setFile(e.target.files?.[0] || null); if(url) setUrl(''); }} />
                                {file ? (
                                    <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-300">
                                        <FileVideo className="w-8 h-8 text-poker-emerald" />
                                        <span className="text-xs font-bold text-white max-w-[150px] truncate">{file.name}</span>
                                        <span className="text-[10px] text-zinc-500">Click to change</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-zinc-300">
                                        <Upload className="w-6 h-6" />
                                        <span className="text-xs font-medium">Upload File</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 pt-2">
                            <Settings2 className="w-3 h-3" /> Format
                        </label>
                        <select 
                            className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-zinc-600"
                            value={siteFormat}
                            onChange={(e) => setSiteFormat(e.target.value)}
                        >
                            <option>Hustler Casino Live</option>
                            <option>Triton Poker</option>
                            <option>PokerGO / High Stakes Poker</option>
                            <option>The Lodge Live</option>
                            <option>Generic Online (Stars/GG)</option>
                        </select>
                    </div>

                    <div className="flex-1"></div>

                    <button 
                        onClick={handleAnalyze}
                        disabled={!canAnalyze || status === AnalysisStatus.PROCESSING}
                        className={`w-full group relative overflow-hidden rounded-xl font-bold text-sm py-4 shadow-lg transition-all ${
                            canAnalyze && status !== AnalysisStatus.PROCESSING
                            ? 'bg-white text-black hover:shadow-poker-emerald/20 hover:scale-[1.02]' 
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                    >
                        {status === AnalysisStatus.PROCESSING ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <Wand2 className="w-4 h-4" />
                                <span>Start Analysis</span>
                                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all" />
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* CENTER: Video & Results */}
            <div className="lg:col-span-6 flex flex-col gap-6 h-full relative z-20">
                {/* Advanced Player Container */}
                <div className={`transition-all duration-500 ease-in-out ${
                    isCinemaMode 
                    ? 'fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl' 
                    : 'relative w-full aspect-video rounded-3xl group shadow-2xl'
                }`}>
                    <div className={`relative overflow-hidden ${
                        isCinemaMode ? 'w-full max-w-6xl aspect-video rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10' : 'w-full h-full rounded-3xl border border-zinc-800 ring-1 ring-white/5'
                    }`}>
                        
                        {/* Error State */}
                        {playerError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-20 p-6 text-center">
                                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                                <p className="text-base font-bold text-zinc-200">Embedded Playback Restricted</p>
                                <p className="text-xs text-zinc-500 mt-2 max-w-sm">
                                    The video owner has disabled playback on external sites. You can still analyze it by clicking 'Start Analysis'.
                                </p>
                                {url && (
                                    <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-full transition-colors"
                                    >
                                        <Youtube className="w-4 h-4" /> Watch on YouTube
                                        <ExternalLink className="w-3 h-3 opacity-50" />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* React Player Instance */}
                        {(url || filePreviewUrl) && !playerError && (
                            <div className="w-full h-full relative z-10 bg-black">
                                <Player
                                    url={filePreviewUrl || url}
                                    width="100%"
                                    height="100%"
                                    controls={true}
                                    playing={false}
                                    onError={(e: any) => {
                                        // Suppress common YouTube restriction error codes from console if possible, but mostly handle UI
                                        setPlayerError(true);
                                        addLog(`Player Warning: Video restricted (Code ${e}). UI fallback active.`, "warning");
                                    }}
                                    config={{ 
                                        youtube: { 
                                            playerVars: { 
                                                showinfo: 0, 
                                                modestbranding: 1, 
                                                rel: 0,
                                                origin: typeof window !== 'undefined' ? window.location.origin : undefined
                                            } 
                                        } 
                                    }}
                                />
                            </div>
                        )}

                        {/* Placeholder */}
                        {!(url || filePreviewUrl) && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 bg-zinc-950">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
                                <div className="relative w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-2xl animate-pulse-slow">
                                    <Aperture className="w-10 h-10 text-zinc-600" />
                                </div>
                                <p className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-widest z-10">System Idle • No Source</p>
                            </div>
                        )}

                        {/* AI Vision HUD Overlay */}
                        {showHud && (status === AnalysisStatus.PROCESSING || isCinemaMode) && (
                            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-poker-gold/50 rounded-tl-lg"></div>
                                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-poker-gold/50 rounded-tr-lg"></div>
                                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-poker-gold/50 rounded-bl-lg"></div>
                                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-poker-gold/50 rounded-br-lg"></div>
                                
                                <div className="absolute top-6 right-6 flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-red-500/30">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-[9px] font-mono font-bold text-red-500 tracking-widest uppercase">REC</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-poker-gold/30">
                                        <Activity className="w-3 h-3 text-poker-gold" />
                                        <span className="text-[9px] font-mono font-bold text-poker-gold tracking-widest uppercase">VISION: ON</span>
                                    </div>
                                </div>

                                {status === AnalysisStatus.PROCESSING && (
                                     <div className="absolute top-0 left-0 w-full h-1 bg-poker-emerald/50 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-[scan_3s_linear_infinite] opacity-50"></div>
                                )}
                            </div>
                        )}

                        {/* Floating Player Controls */}
                        <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <button 
                                onClick={() => setShowHud(!showHud)}
                                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md border border-white/10 transition-colors"
                             >
                                <Scan className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => setIsCinemaMode(!isCinemaMode)}
                                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md border border-white/10 transition-colors"
                             >
                                {isCinemaMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                             </button>
                        </div>
                    </div>
                </div>

                {/* Real-time Extraction HUD */}
                {(streamingContent || result) && (
                    <div className="grid grid-cols-3 gap-4 animate-slide-up">
                        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1.5"><Eye className="w-3 h-3" /> Hero</span>
                            <span className="text-white font-bold truncate">{extractedData.hero}</span>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Pot</span>
                            <span className="text-poker-gold font-mono font-bold truncate">{extractedData.pot}</span>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1.5"><Layers className="w-3 h-3" /> Board</span>
                            <div className="flex gap-1 overflow-hidden">
                                {extractedData.board.length > 0 ? (
                                    extractedData.board.map((c, i) => (
                                        <span key={i} className="text-xs font-mono bg-white text-black px-1 rounded shadow-sm font-bold">{c}</span>
                                    ))
                                ) : <span className="text-zinc-600 text-xs italic">Pending...</span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT: Logs & Output */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-[400px]">
                <div className="flex-1 bg-[#0c0c0c] rounded-3xl border border-zinc-800 overflow-hidden flex flex-col shadow-xl">
                    <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Terminal className="w-3 h-3" /> Logs
                        </span>
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                            <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
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
                </div>

                {(result || streamingContent) && (
                    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden flex flex-col h-1/3 min-h-[200px] shadow-xl animate-fade-in relative">
                        <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-black/20">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Raw Text
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        const text = sanitizeHandHistory(result?.handHistory || streamingContent);
                                        navigator.clipboard.writeText(text);
                                        addLog('Copied to clipboard', 'success');
                                    }} 
                                    className="text-zinc-500 hover:text-white transition-colors"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                                {status === AnalysisStatus.COMPLETE && (
                                    <button onClick={handleSaveAndReview} className="text-poker-emerald hover:text-white transition-colors">
                                        <Save className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 relative bg-black/20 group">
                            <div className="absolute inset-0 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-600 pb-16">
                                <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap font-medium leading-relaxed select-text">
                                    {sanitizeHandHistory(result?.handHistory || streamingContent)}
                                </pre>
                            </div>
                            {/* CTA Button */}
                            {status === AnalysisStatus.COMPLETE && (
                                <div className="absolute bottom-4 left-4 right-4 animate-slide-up">
                                    <button 
                                        onClick={handleSaveAndReview}
                                        className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                    >
                                        <PlayCircle className="w-4 h-4 fill-current" /> Save & Review Hand
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
