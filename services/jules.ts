
import { AnalysisResult, HandHistory } from "../types";

const API_BASE_URL = import.meta.env.VITE_JULES_API_URL || "http://localhost:8000/api";

export const JulesService = {
  async analyzeVideo(videoFile: File | null, youtubeUrl: string): Promise<AnalysisResult> {
    const formData = new FormData();
    if (videoFile) {
      formData.append("file", videoFile);
    } else if (youtubeUrl) {
      formData.append("url", youtubeUrl);
    } else {
      throw new Error("No video source provided");
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: videoFile ? formData : JSON.stringify({ url: youtubeUrl }),
      headers: videoFile ? undefined : { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `Analysis failed: ${response.statusText}`);
    }

    return await response.json();
  },

  async getHandHistories(): Promise<HandHistory[]> {
    const response = await fetch(`${API_BASE_URL}/hands`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hands: ${response.statusText}`);
    }

    return await response.json();
  }
};
