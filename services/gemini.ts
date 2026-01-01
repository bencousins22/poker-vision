import { GoogleGenAI, Tool, Type, Part } from "@google/genai";
import { AnalysisResult } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1] || base64String;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const GENERIC_INSTRUCTION = `
You are an expert Poker Hand History Transcriber. 
Your task is to watch the video clip and output a text block in PokerStars Hand History format.
`;

const HCL_INSTRUCTION = `
You are a specialized 'Hustler Casino Live' (HCL) Hand History Transcriber.
Your goal is to convert the video footage into a perfectly formatted PokerStars Hand History text block.

### VISUAL RECOGNITION PROTOCOL (HCL):
1. **Overlays**: Identify players by the nameplates (usually black/blue boxes). Stack sizes are in USD ($).
2. **Active Player**: Look for the golden/yellow border or highlight around a player's graphic.
3. **The Board**: Community cards (Flop/Turn/River) appear as digital overlays in the center or bottom center.
4. **Hole Cards**: Use the RFID graphics (usually near player names) to identify cards.
5. **Pot Size**: Track the total pot displayed in the center graphic.

### FORMATTING RULES:
- **Header**: "PokerStars Hand #<RandomID>: Hold'em No Limit ($<SB>/$<BB> USD) - <Date>"
- **Table**: "Table 'Hustler Live' 9-max Seat #1 is the button"
- **Seats**: "Seat 1: PlayerName ($Stack in chips)"
- **Action**: Use standard terms: "folds", "calls $X", "raises $X to $Y", "bets $X".
- **Hero**: If a specific player's cards are visible and the camera focuses on them, treat them as Hero (Dealt to Hero [Xx Xx]). If all cards are visible (stream view), you can pick the winner or the most active player as Hero, or just list all cards in summary.
- **Output**: ONLY the raw text block. No markdown, no commentary.
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
  siteFormat: string,
  progressCallback: (msg: string) => void,
  streamCallback?: (text: string) => void
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let model = VIDEO_MODEL;
  let parts: Part[] = [];
  
  // Select specialized instruction based on format
  const isHCL = siteFormat.includes("Hustler");
  const systemInstruction = isHCL ? HCL_INSTRUCTION : GENERIC_INSTRUCTION;
  
  let config: any = { systemInstruction };

  if (videoFile) {
    // --- REAL VIDEO ANALYSIS (MULTIMODAL) ---
    progressCallback(`Encoding video (${(videoFile.size / 1024 / 1024).toFixed(1)}MB) for Vision API...`);
    const base64Data = await fileToGenerativePart(videoFile);
    
    parts = [
        { text: isHCL 
            ? "Analyze this HCL video clip. Extract the hand history strictly following PokerStars format. Pay attention to the HCL overlays for stack sizes and actions." 
            : "Analyze this poker video clip. Extract the hand history exactly as it happened." 
        },
        { inlineData: { mimeType: videoFile.type, data: base64Data } }
    ];
    model = VIDEO_MODEL; 
  } else if (youtubeUrl) {
    // --- URL TEXT/SEARCH ANALYSIS ---
    progressCallback(`Analyzing URL (${siteFormat} Protocol)...`);
    
    const prompt = isHCL 
        ? `Find the poker hand history for this Hustler Casino Live video URL: ${youtubeUrl}. search for the hand details (players, stacks, cards, action) and reconstruct a PokerStars Hand History format text block. The video is likely a famous HCL hand.`
        : `Find the poker hand history for this video URL: ${youtubeUrl}. If you can't watch it directly, search for the hand details based on the video ID or title and reconstruct the hand history.`;

    parts = [{ text: prompt }];
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
            model: "gemini-3-flash-preview", 
            contents: [{ parts: [{ text: `Convert this natural language request into a specific SQL-like WHERE clause for poker hand filtering. Fields: win (number), hand (e.g. "AKs"), pos (string), pot (number), action (string). Input: "${nlQuery}". Output ONLY the raw string, e.g. "win > 100 AND hand = 'AA'".` }] }]
        });
        return response.text?.trim() || "";
    } catch (e) {
        return "";
    }
};