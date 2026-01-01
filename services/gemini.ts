import { GoogleGenAI, Tool, Type, Part } from "@google/genai";
import { AnalysisResult } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:video/mp4;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const HAND_PARSER_INSTRUCTION = "You are an expert Poker Hand History Transcriber specializing in video analysis of 'Hustler Casino Live' (HCL) streams. Your task is to watch the poker footage and convert the action into a STRICT PokerStars Hand History format. VISUAL ANALYSIS GUIDE: 1. Player Nameplates: Top text is Name, bottom text is Stack. 2. Dealer Button: White disc labeled 'D'. 3. Active Player: Yellow/gold border around nameplate. 4. Cards: RFID graphics next to nameplates. FORMATTING RULES: 1. Header: PokerStars Hand #<ID>: Hold'em No Limit. 2. Seats: Seat <N>: <Name> ($<Stack> in chips). 3. Streets: *** FLOP *** [c1 c2 c3]. Return ONLY raw text.";

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
                        enum: ["analyze", "review", "channels", "tracker", "strategy", "pricing", "profile"]
                    }
                },
                required: ["view"]
            }
        },
        {
            name: "analyze_video_url",
            description: "Start analyzing a video from a given URL.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    url: { type: Type.STRING, description: "The valid YouTube URL." }
                },
                required: ["url"]
            }
        }
    ]
}];

const MODEL_NAME = "gemini-3-pro-preview";

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

export const analyzePokerVideo = async (
  videoFile: File | null, 
  youtubeUrl: string,
  progressCallback: (msg: string) => void,
  streamCallback?: (text: string) => void
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  let parts: Part[] = [];
  
  let promptText = "Analyze this poker footage. Extract the hand history.";

  if (videoFile) {
    progressCallback("Uploading video frame data...");
    const base64Data = await fileToGenerativePart(videoFile);
    parts = [
        { text: promptText + (youtubeUrl ? ` Video Source: ${youtubeUrl}.` : '') },
        { inlineData: { mimeType: videoFile.type, data: base64Data } }
    ];
  } else {
    progressCallback("Scanning YouTube video context...");
    promptText = `Analyze the poker hand in this video URL: ${youtubeUrl}. Create a PokerStars Hand History text block based on the visual graphics.`;
    parts = [{ text: promptText }];
  }

  progressCallback(`Starting Gemini 3 Pro Vision analysis...`);

  try {
    const responseStream = await retryOperation(async () => {
        return await ai.models.generateContentStream({
            model: MODEL_NAME,
            contents: [{ parts }],
            config: {
                systemInstruction: HAND_PARSER_INSTRUCTION,
            }
        });
    });

    let fullText = '';
    for await (const chunk of responseStream) {
        if (chunk.text) {
            fullText += chunk.text;
            if (streamCallback) streamCallback(fullText);
        }
    }

    if (!fullText) throw new Error("Analysis failed. No data returned.");
    
    const lines = fullText.split('\n');
    const heroLine = lines.find(l => l.includes('Dealt to'));
    const hero = heroLine ? heroLine.split('Dealt to ')[1].split(' [')[0] : 'Hero';
    const potLine = lines.find(l => l.includes('Total pot'));
    const pot = potLine ? potLine.split('Total pot ')[1].split(' ')[0] : 'Pot';
    
    return { handHistory: fullText, summary: `${hero} in ${pot} Pot` };

  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(error.message || "Failed to analyze video.");
  }
};

export const getCoachChat = (systemContext: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    return ai.chats.create({
        model: MODEL_NAME,
        config: {
            systemInstruction: `You are 'PokerVision Pro', an elite poker coach. Use the context below to help the user. Current Context: ${systemContext}`,
            tools: COACH_TOOLS
        }
    });
};

export const generateQueryFromNaturalLanguage = async (nlQuery: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const prompt = `Convert this natural language poker question into PokerQL: "${nlQuery}". Fields: win, loss, pot, hand, range, pos, action, tag. Output ONLY the query string.`;
    
    try {
        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }]
        });
        return result.text?.trim().replace(/```/g, '') || "";
    } catch (e) {
        console.error("Query gen failed", e);
        return "";
    }
};