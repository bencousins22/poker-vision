import { ChannelVideo, YouTubeChannel } from '../types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
// Note: In a production environment, restrict this key or use a backend proxy.
const API_KEY = 'AIzaSyBjuDHLbZtqERIrMZRx_i6QbWXujwK7RYk'; 

export const FEATURED_CHANNELS = {
  HCL: 'UCQe7wB0o_cZgv1ogdBpGDtQ',
  TRITON: 'UCLcJXS48P95X-7ZYDb99r4A',
  POKERGO: 'UCCZ7e-C2iAAe8b9N_YtJ_wA'
};

// Mock Data for Fallback (Prevents app crash on API quota limits)
const MOCK_VIDEOS: ChannelVideo[] = [
    {
        id: 'gzAvM1OabZc',
        title: 'MAX PAIN MONDAY! $100/200/400 No Limit Hold\'em',
        thumbnail: 'https://i.ytimg.com/vi/gzAvM1OabZc/maxresdefault.jpg',
        url: 'https://www.youtube.com/watch?v=gzAvM1OabZc',
        views: '452K',
        uploaded: '2 days ago',
        isLive: false,
        channelTitle: 'Hustler Casino Live',
        channelId: FEATURED_CHANNELS.HCL
    },
    {
        id: '9NNKjWscKWo',
        title: 'Tom Dwan vs Wesley $3.1 Million Pot - Biggest in TV History',
        thumbnail: 'https://i.ytimg.com/vi/9NNKjWscKWo/maxresdefault.jpg',
        url: 'https://www.youtube.com/watch?v=9NNKjWscKWo',
        views: '2.4M',
        uploaded: '1 year ago',
        isLive: false,
        channelTitle: 'Hustler Casino Live',
        channelId: FEATURED_CHANNELS.HCL
    },
    {
        id: '2Kj5lX8j1Gk',
        title: 'Phil Ivey vs Garrett Adelstein - LEGENDARY HAND',
        thumbnail: 'https://i.ytimg.com/vi/2Kj5lX8j1Gk/maxresdefault.jpg',
        url: 'https://www.youtube.com/watch?v=2Kj5lX8j1Gk',
        views: '1.8M',
        uploaded: '2 years ago',
        isLive: false,
        channelTitle: 'Hustler Casino Live',
        channelId: FEATURED_CHANNELS.HCL
    },
    {
        id: 'uY5sXk8r7cI',
        title: 'High Stakes Poker Season 12 - Episode 1',
        thumbnail: 'https://i.ytimg.com/vi/uY5sXk8r7cI/maxresdefault.jpg', 
        url: 'https://www.youtube.com/watch?v=uY5sXk8r7cI',
        views: '850K',
        uploaded: '2 weeks ago',
        isLive: false,
        channelTitle: 'PokerGO',
        channelId: FEATURED_CHANNELS.POKERGO
    },
    {
        id: 'LiveStream1',
        title: '🔴 $100/200/400 High Stakes NLH - Friday Night Stream',
        thumbnail: 'https://i.ytimg.com/vi/LiveStream1/maxresdefault.jpg', 
        url: 'https://www.youtube.com/watch?v=live',
        views: '12K',
        uploaded: 'LIVE',
        isLive: true,
        channelTitle: 'Hustler Casino Live',
        channelId: FEATURED_CHANNELS.HCL
    }
];

// Helper to format large numbers (e.g., 1200000 -> 1.2M)
const formatCount = (count: string) => {
  if (!count) return '0';
  const n = parseInt(count);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

// Helper for relative time
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

export const searchChannels = async (query: string): Promise<YouTubeChannel[]> => {
  try {
    const response = await fetch(`${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=5&key=${API_KEY}`);
    
    // Fail fast on API limit to trigger fallback
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const data = await response.json();
    if (!data.items) return [];

    // Need to fetch detailed stats (subscriber count) separately
    const channelIds = data.items.map((item: any) => item.snippet.channelId).join(',');
    const statsResponse = await fetch(`${BASE_URL}/channels?part=statistics,snippet&id=${channelIds}&key=${API_KEY}`);
    
    if (!statsResponse.ok) throw new Error("Stats API Error");
    const statsData = await statsResponse.json();

    return statsData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      subscriberCount: formatCount(item.statistics.subscriberCount),
      videoCount: formatCount(item.statistics.videoCount),
      description: item.snippet.description
    }));
  } catch (error) {
    console.warn("YouTube API Error (Search Channels), utilizing fallback:", error);
    // Return mock channel if query matches known ones, otherwise empty
    if (query.toLowerCase().includes('hustler') || query.toLowerCase().includes('hcl')) {
        return [{
            id: FEATURED_CHANNELS.HCL,
            title: 'Hustler Casino Live',
            thumbnail: 'https://yt3.googleusercontent.com/ytc/AIdro_kM-1G_C8f9X_X7zQ=s176-c-k-c0x00ffffff-no-rj',
            subscriberCount: '320K',
            videoCount: '1.2K',
            description: 'High stakes poker livestream.'
        }];
    }
    return [];
  }
};

export const getChannelDetails = async (channelId: string): Promise<YouTubeChannel | null> => {
  try {
    const response = await fetch(`${BASE_URL}/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${API_KEY}`);
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) throw new Error("Channel not found");
    
    const item = data.items[0];
    return {
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      subscriberCount: formatCount(item.statistics.subscriberCount),
      videoCount: formatCount(item.statistics.videoCount),
      description: item.snippet.description
    };
  } catch (error) {
    console.warn("YouTube API Error (Channel Details), using mock:", error);
    if (channelId === FEATURED_CHANNELS.HCL) {
        return {
            id: channelId,
            title: 'Hustler Casino Live',
            thumbnail: 'https://yt3.googleusercontent.com/ytc/AIdro_kM-1G_C8f9X_X7zQ=s176-c-k-c0x00ffffff-no-rj',
            subscriberCount: '320K',
            videoCount: '1.2K',
            description: 'The wildest high stakes poker stream in the world.'
        };
    }
    return null;
  }
};

export const getChannelVideos = async (channelId: string): Promise<ChannelVideo[]> => {
  try {
    // 1. Search for videos in the channel (ordered by date)
    const response = await fetch(`${BASE_URL}/search?part=snippet&channelId=${channelId}&order=date&maxResults=12&type=video&key=${API_KEY}`);
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
        throw new Error("No videos found");
    }

    const videoIds = data.items.map((item: any) => item.id?.videoId).filter(Boolean).join(',');
    if (!videoIds) throw new Error("No video IDs extracted");
    
    // 2. Fetch statistics (views) and live streaming details
    const statsResponse = await fetch(`${BASE_URL}/videos?part=statistics,liveStreamingDetails&id=${videoIds}&key=${API_KEY}`);
    if (!statsResponse.ok) throw new Error("Stats API Error");
    
    const statsData = await statsResponse.json();
    
    const statsMap = new Map();
    statsData.items?.forEach((item: any) => {
      statsMap.set(item.id, {
        views: item.statistics?.viewCount,
        isLive: item.liveStreamingDetails && !item.liveStreamingDetails.actualEndTime
      });
    });

    return data.items.map((item: any) => {
        const videoId = item.id.videoId;
        const stats = statsMap.get(videoId);
        return {
            id: videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            views: formatCount(stats?.views || '0'),
            uploaded: timeAgo(item.snippet.publishedAt),
            isLive: stats?.isLive || item.snippet.liveBroadcastContent === 'live',
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle
        };
    });

  } catch (error) {
    console.warn(`YouTube API Error (Get Videos for ${channelId}), using mock:`, error);
    // Return mock data filtered by channel to maintain functionality
    return MOCK_VIDEOS.filter(v => v.channelId === channelId);
  }
};

export const getFeaturedVideos = async (): Promise<ChannelVideo[]> => {
    // Fetch specifically from HCL and PokerGO as requested
    try {
        const [hcl, pokergo] = await Promise.all([
            getChannelVideos(FEATURED_CHANNELS.HCL),
            getChannelVideos(FEATURED_CHANNELS.POKERGO)
        ]);
        
        // Interleave the results to show a mix
        const combined = [];
        const maxLength = Math.max(hcl.length, pokergo.length);
        for (let i = 0; i < maxLength; i++) {
            if (hcl[i]) combined.push(hcl[i]);
            if (pokergo[i]) combined.push(pokergo[i]);
        }
        
        // Prioritize Live videos at the start
        return combined.sort((a, b) => (a.isLive === b.isLive ? 0 : a.isLive ? -1 : 1));
    } catch (e) {
        console.warn("Featured Videos API Error, returning full mock list");
        return MOCK_VIDEOS;
    }
};