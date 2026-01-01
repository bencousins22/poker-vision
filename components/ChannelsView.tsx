import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { usePoker } from '../App';
import { ChannelVideo, QueueStatus, YouTubeChannel } from '../types';
import { searchChannels, getChannelVideos, getChannelDetails, getFeaturedVideos, FEATURED_CHANNELS } from '../services/youtube';
import { Youtube, Plus, Play, Clock, CheckCircle, AlertCircle, Loader2, ListVideo, Zap, Trash2, Search, Radio, MonitorPlay, Eye, ChevronLeft, ChevronRight, Flame, Signal, Calendar } from 'lucide-react';

// --- Sub-components for Performance Optimization ---

const VideoSkeleton = () => (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden flex flex-col h-full animate-pulse">
        <div className="aspect-video bg-zinc-900 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-[shimmer_2s_infinite]"></div>
        </div>
        <div className="p-4 flex-1 space-y-3">
            <div className="h-4 bg-zinc-900 rounded w-3/4"></div>
            <div className="h-3 bg-zinc-900 rounded w-1/2"></div>
            <div className="flex justify-between pt-2">
                 <div className="h-8 w-8 bg-zinc-900 rounded-full"></div>
                 <div className="h-8 w-20 bg-zinc-900 rounded-lg"></div>
            </div>
        </div>
    </div>
);

interface VideoCardProps {
    video: ChannelVideo;
    isInQueue: boolean;
    onAnalyze: (url: string) => void;
    onQueue: (video: ChannelVideo) => void;
}

// Memoized Card to prevent unnecessary re-renders of the whole grid during hover/state changes
const VideoCard = memo(({ video, isInQueue, onAnalyze, onQueue }: VideoCardProps) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <div className="group bg-zinc-950 border border-zinc-900 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl flex flex-col will-change-transform">
            <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                <div 
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => onAnalyze(video.url)}
                >
                    {/* Progressive Image Loading */}
                    <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        loading="lazy"
                        onLoad={() => setImageLoaded(true)}
                        className={`w-full h-full object-cover transition-all duration-700 ${
                            imageLoaded ? 'opacity-80 group-hover:opacity-100 group-hover:scale-105' : 'opacity-0 scale-100'
                        }`} 
                    />
                    
                    {video.isLive ? (
                            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-600/90 backdrop-blur-md text-white rounded text-xs font-bold uppercase tracking-wider shadow-xl animate-pulse z-10">
                            <Radio className="w-3.5 h-3.5" /> LIVE
                            </div>
                    ) : (
                        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white z-10 border border-white/10">
                            {video.uploaded}
                        </div>
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[1px]">
                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <Play className="w-6 h-6 text-black fill-current ml-1" />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex-1">
                    <h3 
                        className="text-base font-bold text-white leading-tight line-clamp-2 cursor-pointer hover:text-poker-gold transition-colors mb-2"
                        onClick={() => onAnalyze(video.url)}
                        title={video.title}
                    >
                        {video.title}
                    </h3>
                    
                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                        <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer transition-colors truncate">{video.channelTitle}</span>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                                <span className="flex items-center gap-1 whitespace-nowrap"><Eye className="w-3 h-3" /> {video.views}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                            {!video.isLive && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onQueue(video); }}
                                    disabled={isInQueue}
                                    className={`p-2 rounded-lg transition-all ${
                                        isInQueue 
                                        ? 'bg-zinc-900 text-poker-green cursor-default' 
                                        : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
                                    }`}
                                    title="Add to Processing Queue"
                                >
                                    {isInQueue ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAnalyze(video.url); }}
                                className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all bg-white hover:bg-zinc-200 text-black shadow-lg"
                            >
                                {video.isLive ? <MonitorPlay className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                {video.isLive ? 'Watch' : 'Analyze'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});


export const ChannelsView: React.FC = () => {
    const { addToQueue, queue, removeFromQueue, isQueueProcessing, user, launchAnalysis } = usePoker();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<YouTubeChannel[]>([]);
    
    const [activeChannel, setActiveChannel] = useState<YouTubeChannel | null>(null);
    const [videos, setVideos] = useState<ChannelVideo[]>([]);
    const [featuredVideos, setFeaturedVideos] = useState<ChannelVideo[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);
    
    const carouselRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        // Load featured immediately
        getFeaturedVideos().then(vids => {
            if (mounted) setFeaturedVideos(vids);
        });
        
        // Initial load of default channel
        loadChannelData(FEATURED_CHANNELS.HCL).then(() => {
            // Optional: prefetch next potential data here if needed
        });

        return () => { mounted = false; };
    }, []);

    const loadChannelData = async (channelId: string) => {
        setIsLoadingVideos(true);
        try {
            const [channelDetails, vids] = await Promise.all([
                getChannelDetails(channelId),
                getChannelVideos(channelId)
            ]);
            if (channelDetails) setActiveChannel(channelDetails);
            setVideos(vids);
        } catch (e) {
            console.error("Failed to load channel data", e);
        } finally {
            setIsLoadingVideos(false);
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

    const selectChannel = useCallback((channel: YouTubeChannel) => {
        setActiveChannel(channel);
        setSearchResults([]);
        setSearchQuery(''); 
        
        setIsLoadingVideos(true);
        // Clean old videos immediately to show skeleton state
        setVideos([]); 
        
        getChannelVideos(channel.id)
            .then(setVideos)
            .finally(() => setIsLoadingVideos(false));
    }, []);

    const scrollCarousel = (dir: 'left' | 'right') => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
        }
    };

    // Memoized handlers for VideoCard to prevent re-renders
    const handleAnalyze = useCallback((url: string) => {
        launchAnalysis(url);
    }, [launchAnalysis]);

    const handleQueue = useCallback((video: ChannelVideo) => {
        addToQueue(video);
    }, [addToQueue]);

    const getStatusIcon = (status: QueueStatus) => {
        switch(status) {
            case 'pending': return <Clock className="w-3.5 h-3.5 text-zinc-500" />;
            case 'processing': return <Loader2 className="w-3.5 h-3.5 text-poker-gold animate-spin" />;
            case 'completed': return <CheckCircle className="w-3.5 h-3.5 text-poker-green" />;
            case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
        }
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-full">
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-background relative scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="max-w-[1600px] mx-auto space-y-12 pb-10">
                    
                    {/* Search & Header */}
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                         <form onSubmit={handleSearch} className="relative w-full md:max-w-xl z-20">
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    placeholder="Search channels..." 
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 pl-12 text-sm text-white focus:border-poker-gold focus:ring-1 focus:ring-poker-gold transition-all shadow-xl placeholder-zinc-500 backdrop-blur-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search className="absolute left-4 top-4 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                                {isSearching && <Loader2 className="absolute right-4 top-4 w-5 h-5 text-poker-gold animate-spin" />}
                            </div>
                            
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 max-h-[300px] overflow-y-auto">
                                        {searchResults.map(channel => (
                                            <div 
                                                key={channel.id}
                                                onClick={() => selectChannel(channel)}
                                                className="flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                                            >
                                                <img src={channel.thumbnail} alt="" className="w-10 h-10 rounded-full border border-zinc-700 object-cover" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-white text-sm truncate">{channel.title}</h4>
                                                    <p className="text-xs text-zinc-500">{channel.subscriberCount} subs</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-zinc-900 p-2 text-center text-[10px] text-zinc-500 border-t border-zinc-800 cursor-pointer hover:text-white" onClick={() => setSearchResults([])}>
                                        Close Search
                                    </div>
                                </div>
                            )}
                         </form>

                         <div className="flex items-center gap-4 bg-zinc-900/50 p-2 pr-4 rounded-full border border-zinc-800/50">
                            <div className="w-8 h-8 rounded-full bg-poker-gold flex items-center justify-center shadow-lg shadow-poker-gold/20">
                                <Zap className="w-4 h-4 text-black fill-current" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Credits</span>
                                <span className="text-lg font-mono font-bold text-white">{user?.credits || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Featured Carousel */}
                    <div className="relative group/carousel space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Flame className="w-5 h-5 text-red-500 fill-current" /> Featured High Stakes
                            </h2>
                            <div className="flex gap-2 opacity-50 group-hover/carousel:opacity-100 transition-opacity">
                                <button onClick={() => scrollCarousel('left')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800 shadow-lg"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => scrollCarousel('right')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800 shadow-lg"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                        
                        <div 
                            ref={carouselRef}
                            className="flex gap-5 overflow-x-auto pb-6 scrollbar-none snap-x"
                            style={{ scrollBehavior: 'smooth' }}
                        >
                            {featuredVideos.length === 0 
                                ? Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="shrink-0 w-[320px]"><VideoSkeleton /></div>
                                ))
                                : featuredVideos.map((video) => (
                                <div 
                                    key={video.id} 
                                    className="snap-start shrink-0 w-[320px] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group cursor-pointer hover:border-zinc-600 transition-all hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] hover:-translate-y-1 will-change-transform"
                                    onClick={() => handleAnalyze(video.url)}
                                >
                                    <div className="relative aspect-video bg-zinc-900">
                                        <img src={video.thumbnail} className="w-full h-full object-cover" alt={video.title} loading="lazy" />
                                        {video.isLive ? (
                                            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-wider animate-pulse shadow-lg z-10">
                                                <Radio className="w-3 h-3" /> Live
                                            </div>
                                        ) : (
                                            <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-mono tracking-wide">
                                                {video.uploaded}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <div className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                <Play className="w-5 h-5 text-black fill-current ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[9px] font-bold uppercase tracking-wider border px-1 rounded ${
                                                video.channelTitle?.toLowerCase().includes('pokergo') 
                                                ? 'text-red-400 border-red-500/30' 
                                                : 'text-zinc-500 border-zinc-800'
                                            }`}>
                                                {video.channelTitle}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views}</span>
                                        </div>
                                        <h3 className="text-sm font-bold text-white line-clamp-2 leading-relaxed group-hover:text-poker-gold transition-colors">{video.title}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>

                    {/* Active Channel Header */}
                    {activeChannel && (
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-zinc-900/50 to-transparent border border-zinc-800/50 p-8 rounded-3xl backdrop-blur-sm animate-fade-in">
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl shrink-0">
                                    <img src={activeChannel.thumbnail} alt={activeChannel.title} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                                        {activeChannel.title} 
                                        <CheckCircle className="w-5 h-5 text-blue-500 fill-current text-black" />
                                    </h1>
                                    <div className="flex items-center gap-4 mt-2 text-sm font-medium text-zinc-400">
                                        <span className="bg-zinc-800/50 px-3 py-1 rounded-full">{activeChannel.subscriberCount} Subscribers</span>
                                        <span>{activeChannel.videoCount} Videos</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => window.open(`https://www.youtube.com/channel/${activeChannel.id}`, '_blank')}
                                className="flex items-center gap-2 px-6 py-3 bg-[#ff0000] hover:bg-[#cc0000] text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg hover:-translate-y-0.5"
                            >
                                <Youtube className="w-4 h-4" /> Subscribe
                            </button>
                        </div>
                    )}

                    {/* Channel Videos Grid */}
                    <div className="space-y-8">
                         <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Signal className="w-6 h-6 text-poker-gold" /> Latest Uploads
                         </h3>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {isLoadingVideos ? (
                                Array(6).fill(0).map((_, i) => <VideoSkeleton key={i} />)
                            ) : (
                                videos.map(video => (
                                    <VideoCard 
                                        key={video.id} 
                                        video={video} 
                                        isInQueue={queue.some(q => q.id === video.id)} 
                                        onAnalyze={handleAnalyze} 
                                        onQueue={handleQueue} 
                                    />
                                ))
                            )}
                         </div>
                    </div>
                </div>
            </div>

            {/* Sidebar Queue */}
            <div className="w-full md:w-80 bg-zinc-950 border-l border-zinc-900 flex flex-col shrink-0 z-10 shadow-2xl">
                <div className="p-5 border-b border-zinc-900">
                    <h2 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                        <ListVideo className="w-4 h-4 text-poker-gold" /> Queue
                    </h2>
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-zinc-500 font-medium">{queue.filter(i => i.status === 'completed').length} / {queue.length} processed</span>
                        {isQueueProcessing && (
                            <span className="text-[10px] text-poker-green flex items-center gap-1.5 font-bold animate-pulse">
                                <Zap className="w-3 h-3" /> ACTIVE
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
                    {queue.length === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center text-zinc-700 text-center px-6">
                            <ListVideo className="w-8 h-8 mb-3 opacity-20" />
                            <p className="text-xs font-medium">Queue is empty</p>
                        </div>
                    ) : (
                        queue.map((item, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border flex flex-col gap-3 group relative transition-all ${
                                item.status === 'processing' ? 'bg-zinc-900 border-poker-gold/30 shadow-lg' : 
                                item.status === 'error' ? 'bg-red-900/10 border-red-900/20' : 
                                'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                            }`}>
                                <div className="flex gap-3">
                                    <div 
                                        className="w-16 h-10 rounded bg-black shrink-0 overflow-hidden relative cursor-pointer"
                                        onClick={() => launchAnalysis(item.videoUrl)}
                                    >
                                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <h4 className="text-xs font-bold text-zinc-300 truncate mb-1">{item.title}</h4>
                                        <div className="flex items-center gap-2">
                                             {getStatusIcon(item.status)}
                                             <span className={`text-[10px] font-bold uppercase ${
                                                item.status === 'completed' ? 'text-poker-green' :
                                                item.status === 'processing' ? 'text-poker-gold' :
                                                item.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                                            }`}>{item.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => removeFromQueue(item.id)} className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1">
                                        <Trash2 className="w-3 h-3" /> Remove
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};