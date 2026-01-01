
import { ChannelVideo, YouTubeChannel } from '../types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
// Default env key - usually restricted by referer
const DEFAULT_API_KEY = process.env.YOUTUBE_API_KEY || ''; 

export const FEATURED_CHANNELS = {
  HCL: 'UCQe7wB0o_cZgv1ogdBpGDtQ',
  TRITON: 'UCLcJXS48P95X-7ZYDb99r4A',
  POKERGO: 'UCCZ7e-C2iAAe8b9N_YtJ_wA'
};

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

// Get effective API key
const getKey = (userKey?: string) => {
    if (userKey && userKey.trim().length > 0) return userKey;
    if (DEFAULT_API_KEY && DEFAULT_API_KEY.trim().length > 0) return DEFAULT_API_KEY;
    return null;
};

export const searchChannels = async (query: string, userApiKey?: string): Promise<YouTubeChannel[]> => {
  const apiKey = getKey(userApiKey);
  if (!apiKey) throw new Error("YouTube API Key missing. Please configure it in Profile settings.");

  const response = await fetch(`${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=5&key=${apiKey}`);
  
  if (!response.ok) {
      const err = await response.json();
      throw new Error(`YouTube API Error: ${err.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  if (!data.items) return [];

  // Need to fetch detailed stats (subscriber count) separately
  const channelIds = data.items.map((item: any) => item.snippet.channelId).join(',');
  const statsResponse = await fetch(`${BASE_URL}/channels?part=statistics,snippet&id=${channelIds}&key=${apiKey}`);
  
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
};

export const getChannelDetails = async (channelId: string, userApiKey?: string): Promise<YouTubeChannel | null> => {
  const apiKey = getKey(userApiKey);
  if (!apiKey) throw new Error("YouTube API Key missing");

  const response = await fetch(`${BASE_URL}/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${apiKey}`);
  
  if (!response.ok) {
      const err = await response.json();
      throw new Error(`YouTube API Error: ${err.error?.message || response.statusText}`);
  }

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
};

export const getChannelVideos = async (channelId: string, userApiKey?: string): Promise<ChannelVideo[]> => {
  const apiKey = getKey(userApiKey);
  if (!apiKey) throw new Error("YouTube API Key missing");

  // 1. Search for videos in the channel (ordered by date)
  const response = await fetch(`${BASE_URL}/search?part=snippet&channelId=${channelId}&order=date&maxResults=12&type=video&key=${apiKey}`);
  
  if (!response.ok) {
      const err = await response.json();
      throw new Error(`YouTube API Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
      return [];
  }

  const videoIds = data.items.map((item: any) => item.id?.videoId).filter(Boolean).join(',');
  if (!videoIds) return [];
  
  // 2. Fetch statistics (views) and live streaming details
  const statsResponse = await fetch(`${BASE_URL}/videos?part=statistics,liveStreamingDetails&id=${videoIds}&key=${apiKey}`);
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
};

export const getFeaturedVideos = async (userApiKey?: string): Promise<ChannelVideo[]> => {
    // Check key before attempting parallel fetch to avoid double errors
    const apiKey = getKey(userApiKey);
    if (!apiKey) throw new Error("YouTube API Key missing. Please configure it in Profile settings.");

    // Fetch specifically from HCL and PokerGO as requested
    const [hcl, pokergo] = await Promise.allSettled([
        getChannelVideos(FEATURED_CHANNELS.HCL, userApiKey),
        getChannelVideos(FEATURED_CHANNELS.POKERGO, userApiKey)
    ]);
    
    // Combine results if successful
    const hclVideos = hcl.status === 'fulfilled' ? hcl.value : [];
    const pokergoVideos = pokergo.status === 'fulfilled' ? pokergo.value : [];

    // If both failed, throw error
    if (hcl.status === 'rejected' && pokergo.status === 'rejected') {
        const errorMsg = hcl.reason?.message || "Failed to load featured videos.";
        if (errorMsg.includes("Key missing")) {
             throw new Error("YouTube API Key missing. Please configure it in Profile settings.");
        }
        throw new Error("Failed to load featured videos. Check API Key quota.");
    }
    
    // Interleave the results
    const combined = [];
    const maxLength = Math.max(hclVideos.length, pokergoVideos.length);
    for (let i = 0; i < maxLength; i++) {
        if (hclVideos[i]) combined.push(hclVideos[i]);
        if (pokergoVideos[i]) combined.push(pokergoVideos[i]);
    }
    
    // Prioritize Live videos
    return combined.sort((a, b) => (a.isLive === b.isLive ? 0 : a.isLive ? -1 : 1));
};
