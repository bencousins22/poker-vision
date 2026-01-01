
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { usePoker } from '../App';
import { ChannelVideo, QueueStatus, YouTubeChannel, HandHistory } from '../types';
import { searchChannels, getChannelVideos, getChannelDetails, getFeaturedVideos, FEATURED_CHANNELS } from '../services/youtube';
import { Youtube, Plus, Play, Clock, CheckCircle, AlertCircle, Loader2, ListVideo, Zap, Trash2, Search, Radio, MonitorPlay, Eye, ChevronLeft, ChevronRight, Flame, Signal, Calendar, Layout, PlayCircle, History, X } from 'lucide-react';

// --- Sub-components for Performance Optimization ---

const VideoSkeleton = () => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full animate-pulse min-w-[280px]">
        <div className="aspect-video bg-zinc-800/50 w-full relative"></div>
        <div className="p-4 flex-1 space-y-3">
            <div className="h-4 bg-zinc-800/50 rounded w-3/4"></div>
            <div className="h-3 bg-zinc-800/50 rounded w-1/2"></div>
        </div>
    </div>
);

interface VideoCardProps {
    video: ChannelVideo;
    isInQueue: boolean;
    isAnalyzed: boolean;
    onAnalyze: (url: string) => void;
    onReview: () => void;
    onQueue: (video: ChannelVideo) => void;
}

const VideoCard = memo(({ video, isInQueue, isAnalyzed, onAnalyze, onReview, onQueue }: VideoCardProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className="group relative flex-shrink-0 w-[300px] bg-[#121214] border border-zinc-800/50 hover:border-zinc-700 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Thumbnail Area */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
                <img 
                    src={video.thumbnail} 
                    alt={video.title} 
                    loading="lazy"
                    className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-105 opacity-80' : 'scale-100 opacity-90'}`} 
                />
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    {video.isLive && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-600 text-white rounded text-[9px] font-bold uppercase tracking-wider animate-pulse shadow-lg">
                            <Radio className="w-3 h-3" /> LIVE
                        </div>
                    )}
                    {isAnalyzed && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-poker-green/90 backdrop-blur-md text-white rounded text-[9px] font-bold uppercase tracking-wider shadow-lg">
                            <CheckCircle className="w-3 h-3" /> Analyzed
                        </div>
                    )}
                </div>

                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-zinc-300 font-mono tracking-wide z-10">
                    {video.uploaded}
                </div>
                
                {/* Overlay Action */}
                <div 
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    onClick={isAnalyzed ? onReview : () => onAnalyze(video.url)}
                >
                    <div className="transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        {isAnalyzed ? (
                            <button className="flex items-center gap-2 px-4 py-2 bg-poker-green text-white rounded-full font-bold text-xs shadow-xl">
                                <History className="w-4 h-4" /> Review Hand
                            </button>
                        ) : (
                            <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-bold text-xs shadow-xl">
                                <Play className="w-4 h-4 fill-current" /> Analyze
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Content */}
            <div className="p-3 flex flex-col gap-2">
                <h3 className="text-sm font-bold text-zinc-200 line-clamp-2 leading-snug group-hover:text-poker-gold transition-colors" title={video.title}>
                    {video.title}
                </h3>
                
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide truncate max-w-[120px]">{video.channelTitle}</span>
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views}</span>
                    </div>
                    
                    {!video.isLive && !isAnalyzed && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onQueue(video); }}
                            disabled={isInQueue}
                            className={`p-2 rounded-lg transition-all ${
                                isInQueue 
                                ? 'bg-zinc-800 text-poker-green cursor-default' 
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                            }`}
                            title="Add to Queue"
                        >
                            {isInQueue ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

// Horizontal Scrolling Section
const VideoSection: React.FC<{ 
    title: string, 
    icon: any, 
    videos: ChannelVideo[], 
    loading: boolean,
    onAnalyze: (url: string) => void,
    onQueue: (v: ChannelVideo) => void,
    hands: HandHistory[],
    queue: any[],
    setSelectedHand: (h: HandHistory) => void,
    setViewMode: (v: any) => void
}> = ({ title, icon: Icon, videos, loading, onAnalyze, onQueue, hands, queue, setSelectedHand, setViewMode }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = dir === 'left' ? -320 : 320;
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icon className="w-5 h-5 text-poker-gold" /> {title}
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => scroll('left')} className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => scroll('right')} className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
            
            <div 
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-6 scrollbar-none snap-x padding-x-1"
                style={{ scrollBehavior: 'smooth' }}
            >
                {loading ? (
                    Array(5).fill(0).map((_, i) => <VideoSkeleton key={i} />)
                ) : (
                    videos.map(video => {
                        // Check if analyzed
                        const existingHand = hands.find(h => h.videoUrl === video.url);
                        
                        return (
                            <VideoCard 
                                key={video.id} 
                                video={video} 
                                isInQueue={queue.some((q: any) => q.id === video.id)} 
                                isAnalyzed={!!existingHand}
                                onAnalyze={onAnalyze} 
                                onReview={() => {
                                    if (existingHand) {
                                        setSelectedHand(existingHand);
                                        setViewMode('review');
                                    }
                                }}
                                onQueue={onQueue} 
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

export const ChannelsView: React.FC = () => {
    const { addToQueue, queue, removeFromQueue, isQueueProcessing, user, launchAnalysis, hands, setSelectedHand, setViewMode } = usePoker();
    
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<YouTubeChannel[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [featuredVideos, setFeaturedVideos] = useState<ChannelVideo[]>([]);
    const [channelVideos, setChannelVideos] = useState<ChannelVideo[]>([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const [loadingChannel, setLoadingChannel] = useState(false);

    // Initial Load
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                const feats = await getFeaturedVideos();
                if (mounted) {
                    setFeaturedVideos(feats);
                    setLoadingFeatured(false);
                }
            } catch (e) {
                console.error(e);
                if (mounted) setLoadingFeatured(false);
            }
        };
        init();
        return () => { mounted = false; };
    }, []);

    // Load Channel Videos
    const loadChannel = async (channelId: string) => {
        setActiveChannelId(channelId);
        setLoadingChannel(true);
        setSearchResults([]); // Close search dropdown
        setSearchQuery('');
        try {
            const vids = await getChannelVideos(channelId);
            setChannelVideos(vids);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingChannel(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await searchChannels(searchQuery);
            setSearchResults(results);
        } finally {
            setIsSearching(false);
        }
    };

    // Derived State
    const heroVideo = featuredVideos[0];
    const trendingVideos = featuredVideos.slice(1);

    const getStatusIcon = (status: QueueStatus) => {
        switch(status) {
            case 'pending': return <Clock className="w-3.5 h-3.5 text-zinc-500" />;
            case 'processing': return <Loader2 className="w-3.5 h-3.5 text-poker-gold animate-spin" />;
            case 'completed': return <CheckCircle className="w-3.5 h-3.5 text-poker-green" />;
            case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
        }
    };

    return (
        <div className="flex h-full bg-[#050505] text-zinc-100 overflow-hidden font-sans">
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                
                {/* Navbar Area (Search & Credits) */}
                <div className="h-16 border-b border-zinc-800 bg-[#050505]/95 backdrop-blur z-20 px-6 flex items-center justify-between shrink-0">
                    <form onSubmit={handleSearch} className="relative w-full max-w-md">
                        <div className="relative group">
                            <input 
                                type="text" 
                                placeholder="Search channels..." 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-xs text-white focus:border-poker-gold focus:ring-1 focus:ring-poker-gold transition-all placeholder-zinc-600"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-600 group-focus-within:text-white transition-colors" />
                            {isSearching && <Loader2 className="absolute right-3.5 top-2.5 w-4 h-4 text-poker-gold animate-spin" />}
                        </div>
                        
                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="p-1 max-h-[300px] overflow-y-auto">
                                    {searchResults.map(channel => (
                                        <div 
                                            key={channel.id}
                                            onClick={() => loadChannel(channel.id)}
                                            className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <img src={channel.thumbnail} alt="" className="w-8 h-8 rounded-full border border-zinc-700 object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-white text-xs truncate">{channel.title}</h4>
                                                <p className="text-[10px] text-zinc-500">{channel.subscriberCount} subs</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-zinc-900 p-2 text-center text-[10px] text-zinc-500 border-t border-zinc-800 cursor-pointer hover:text-white" onClick={() => setSearchResults([])}>
                                    Close Results
                                </div>
                            </div>
                        )}
                    </form>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
                            <Zap className="w-3.5 h-3.5 text-poker-gold fill-current" />
                            <span className="text-[10px] font-bold text-zinc-400">CREDITS</span>
                            <span className="text-sm font-bold text-white font-mono">{user?.credits || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-thin scrollbar-thumb-zinc-800">
                    
                    {/* Hero Spotlight */}
                    {!activeChannelId && heroVideo && (
                        <div className="relative w-full aspect-[21/9] max-h-[400px] rounded-3xl overflow-hidden group shadow-2xl border border-white/5 animate-in fade-in duration-1000">
                            <img src={heroVideo.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-700" alt="Hero" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/50 to-transparent"></div>
                            
                            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full md:w-2/3 space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Featured</span>
                                    <span className="text-zinc-300 text-xs font-bold flex items-center gap-1"><Youtube className="w-3.5 h-3.5" /> {heroVideo.channelTitle}</span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-xl">{heroVideo.title}</h1>
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => launchAnalysis(heroVideo.url)}
                                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold text-sm hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                    >
                                        <Play className="w-4 h-4 fill-current" /> Analyze Now
                                    </button>
                                    <button 
                                        onClick={() => addToQueue(heroVideo)}
                                        className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-full font-bold text-sm hover:bg-white/20 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Add to Queue
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Channel View */}
                    {activeChannelId && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setActiveChannelId(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h2 className="text-2xl font-bold text-white">Channel Videos</h2>
                                </div>
                                {loadingChannel && <Loader2 className="w-5 h-5 text-poker-gold animate-spin" />}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {channelVideos.map(video => {
                                    const existingHand = hands.find(h => h.videoUrl === video.url);
                                    return (
                                        <div key={video.id} className="flex justify-center">
                                            <VideoCard 
                                                video={video} 
                                                isInQueue={queue.some(q => q.id === video.id)} 
                                                isAnalyzed={!!existingHand}
                                                onAnalyze={launchAnalysis} 
                                                onReview={() => { if(existingHand) { setSelectedHand(existingHand); setViewMode('review'); } }}
                                                onQueue={addToQueue} 
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Trending Rows */}
                    {!activeChannelId && (
                        <>
                            <VideoSection 
                                title="Trending High Stakes" 
                                icon={Flame} 
                                videos={trendingVideos} 
                                loading={loadingFeatured}
                                onAnalyze={launchAnalysis}
                                onQueue={addToQueue}
                                hands={hands}
                                queue={queue}
                                setSelectedHand={setSelectedHand}
                                setViewMode={setViewMode}
                            />

                            {/* Additional Categories using mock filtering for demo */}
                            <VideoSection 
                                title="Latest Uploads" 
                                icon={Signal} 
                                videos={[...trendingVideos].reverse()} 
                                loading={loadingFeatured}
                                onAnalyze={launchAnalysis}
                                onQueue={addToQueue}
                                hands={hands}
                                queue={queue}
                                setSelectedHand={setSelectedHand}
                                setViewMode={setViewMode}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Right Sidebar: Queue */}
            <div className="w-80 bg-[#080808] border-l border-zinc-800 flex flex-col shrink-0 z-10 shadow-2xl">
                <div className="p-5 border-b border-zinc-800 bg-[#080808]/95 backdrop-blur">
                    <h2 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-widest">
                        <ListVideo className="w-4 h-4 text-poker-gold" /> Processing Queue
                    </h2>
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-zinc-500 font-medium">{queue.filter(i => i.status === 'completed').length} / {queue.length} processed</span>
                        {isQueueProcessing && (
                            <span className="text-[9px] text-poker-green flex items-center gap-1.5 font-bold animate-pulse">
                                <Zap className="w-3 h-3 fill-current" /> ACTIVE
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
                    {queue.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-zinc-700 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
                                <ListVideo className="w-6 h-6 opacity-30" />
                            </div>
                            <p className="text-xs font-medium">Queue is empty</p>
                            <p className="text-[10px] text-zinc-600 max-w-[150px]">Add videos to batch process hand histories.</p>
                        </div>
                    ) : (
                        queue.map((item, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-2 group relative transition-all ${
                                item.status === 'processing' ? 'bg-zinc-900/80 border-poker-gold/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 
                                item.status === 'error' ? 'bg-red-950/10 border-red-900/20' : 
                                'bg-[#121214] border-zinc-800 hover:border-zinc-700'
                            }`}>
                                <div className="flex gap-3">
                                    <div className="w-16 h-10 rounded-lg bg-black shrink-0 overflow-hidden relative">
                                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                        <h4 className="text-[11px] font-bold text-zinc-300 truncate">{item.title}</h4>
                                        <div className="flex items-center gap-2">
                                             {getStatusIcon(item.status)}
                                             <span className={`text-[9px] font-bold uppercase ${
                                                item.status === 'completed' ? 'text-poker-green' :
                                                item.status === 'processing' ? 'text-poker-gold' :
                                                item.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                                            }`}>{item.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => removeFromQueue(item.id)} className="text-zinc-600 hover:text-red-400 p-1">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                
                                {item.status === 'processing' && (
                                    <div className="w-full h-0.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                                        <div className="h-full bg-poker-gold w-1/3 animate-[shimmer_1s_infinite]"></div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
