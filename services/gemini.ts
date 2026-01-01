import { GoogleGenAI, Tool, Type, Part } from "@google/genai";
import { AnalysisResult } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Depending on the browser, result might be "data:video/mp4;base64,..."
      // We need just the base64 part.
      const base64 = base64String.split(',')[1] || base64String;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const HAND_PARSER_INSTRUCTION = `
You are an expert Poker Hand History Transcriber for 'Hustler Casino Live' (HCL). 
Your task is to watch the video clip and output a text block in PokerStars Hand History format.

VISUAL CUES TO TRACK:
1. **The Board**: Identify Flop, Turn, and River cards as they are dealt.
2. **The Players**: Identify Hero (active player) and Villains based on the on-screen graphics (Nameplates, Stacks).
3. **The Action**: Watch the chips moving and the on-screen action indicators (Check, Bet, Raise, Fold).
4. **Hole Cards**: Extract the RFID graphics for hole cards.

FORMATTING RULES:
- Return ONLY the raw PokerStars Hand History text.
- Do not use Markdown formatting (no \`\`\`).
- If exact stack sizes are unclear, estimate based on the on-screen graphics.
- Use a generic Tournament/Cash Game header if specific ID is missing.
`;

const COACH_TOOLS: Tool[] = [{
    functionDeclarations: [
        {
            name: "navigate_view",
            description: "Change the current application view/screen.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    view: {
                        type: Type.STRING,
                        description: "The target view ID.",
                        enum: ["analyze", "review", "channels", "tracker", "strategy", "pricing", "profile", "tools", "trainer"]
                    }
                },
                required: ["view"]
            }
        }
    ]
}];

// Models
const VIDEO_MODEL = "gemini-1.5-pro-latest"; // Best for Multimodal (Video/Audio/Text)
const REASONING_MODEL = "gemini-3-pro-preview"; // Best for complex reasoning/text

export const analyzePokerVideo = async (
  videoFile: File | null, 
  youtubeUrl: string,
  progressCallback: (msg: string) => void,
  streamCallback?: (text: string) => void
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let model = VIDEO_MODEL;
  let parts: Part[] = [];
  let config: any = { systemInstruction: HAND_PARSER_INSTRUCTION };

  if (videoFile) {
    // --- REAL VIDEO ANALYSIS (MULTIMODAL) ---
    progressCallback(`Encoding video (${(videoFile.size / 1024 / 1024).toFixed(1)}MB) for Vision API...`);
    const base64Data = await fileToGenerativePart(videoFile);
    
    parts = [
        { text: "Analyze this poker video clip. Extract the hand history exactly as it happened." },
        { inlineData: { mimeType: videoFile.type, data: base64Data } }
    ];
    model = VIDEO_MODEL; // 1.5 Pro is superior for video token handling
  } else if (youtubeUrl) {
    // --- URL TEXT/SEARCH ANALYSIS ---
    // Since we cannot download YouTube videos client-side due to CORS, we use the Search Tool
    // to find details about this hand if it's a famous HCL clip, or analyze the URL metadata.
    progressCallback("Analyzing via Search Grounding (Video File Recommended for Vision)...");
    
    parts = [{ text: `Find the poker hand history for this video URL: ${youtubeUrl}. If you can't watch it directly, search for the hand details based on the video ID or title and reconstruct the hand history.` }];
    model = REASONING_MODEL;
    
    // Enable Search Grounding for URL analysis
    config.tools = [{ googleSearch: {} }];
  } else {
      throw new Error("No video source provided.");
  }

  try {
    progressCallback(`Connecting to ${model}...`);
    
    const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: [{ parts }],
        config: config
    });

    let fullText = '';
    for await (const chunk of responseStream) {
        if (chunk.text) {
            fullText += chunk.text;
            if (streamCallback) streamCallback(fullText);
        }
    }

    if (!fullText) {
        throw new Error("AI returned empty response. Try uploading the video file directly.");
    }

    return { handHistory: fullText, summary: "Analysis Complete" };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let errorMsg = error.message || "Failed to analyze video.";
    if (errorMsg.includes("400")) errorMsg += " (Check API Key or File Size/Format)";
    throw new Error(errorMsg);
  }
};

export const getCoachChat = (systemContext: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
        model: REASONING_MODEL,
        config: {
            systemInstruction: `You are 'PokerVision Pro', an AI coach. Context: ${systemContext}`,
            tools: COACH_TOOLS
        }
    });
};

export const generateQueryFromNaturalLanguage = async (nlQuery: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", // Fast model for simple translation
            contents: [{ parts: [{ text: `Convert this natural language request into a specific SQL-like WHERE clause for poker hand filtering. Fields: win (number), hand (e.g. "AKs"), pos (string), pot (number), action (string). Input: "${nlQuery}". Output ONLY the raw string, e.g. "win > 100 AND hand = 'AA'".` }] }]
        });
        return response.text?.trim() || "";
    } catch (e) {
        return "";
    }
};