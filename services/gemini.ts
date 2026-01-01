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

const HAND_PARSER_INSTRUCTION = "You are an expert Poker Hand History Transcriber specializing in Hustler Casino Live (HCL). Watch the video and convert the action into a PokerStars Hand History text block. Visual IDs: Stacks are at nameplates, dealer has a white 'D' disc, the active player has a gold glowing border. Extract player names, stacks, hole cards from RFID graphics, and community cards. FORMAT: Return ONLY the raw text block, no markdown or comments.";

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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let contents: any;
  
  if (videoFile) {
    progressCallback("Uploading video data to Gemini...");
    const base64Data = await fileToGenerativePart(videoFile);
    contents = {
        parts: [
            { text: `Analyze the poker hand in this HCL footage. Source: ${youtubeUrl || 'Uploaded File'}` },
            { inlineData: { mimeType: videoFile.type, data: base64Data } }
        ]
    };
  } else {
    progressCallback("Searching video metadata...");
    contents = {
        parts: [{ text: `Examine the poker action at this YouTube URL: ${youtubeUrl}. Provide a full PokerStars Hand History block.` }]
    };
  }

  try {
    const responseStream = await retryOperation(async () => {
        return await ai.models.generateContentStream({
            model: MODEL_NAME,
            contents,
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

    if (!fullText) throw new Error("No text generated from analysis.");
    
    return { handHistory: fullText, summary: "HCL Analysis Complete" };

  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(error.message || "Poker Analysis Pipeline Failed.");
  }
};

export const getCoachChat = (systemContext: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
        model: MODEL_NAME,
        config: {
            systemInstruction: `You are 'PokerVision Pro', an elite poker coach. Use the provided context to offer strategic advice. Context: ${systemContext}`,
            tools: COACH_TOOLS
        }
    });
};

export const generateQueryFromNaturalLanguage = async (nlQuery: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: `Convert to PokerQL: "${nlQuery}". Fields: win, loss, pot, hand, range, pos, action, tag. Output raw query string only.` }] }
        });
        return response.text?.trim() || "";
    } catch (e) {
        return "";
    }
};