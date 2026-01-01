import { GoogleGenAI, Tool, Type, Part } from "@google/genai";
import { AnalysisResult } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const HAND_PARSER_INSTRUCTION = "You are an expert Poker Hand History Transcriber for 'Hustler Casino Live' (HCL). Convert the video action into a standard PokerStars Hand History text block. Visual cues: Dealer has white 'D' disc. Active player has gold border. Cards are RFID graphics. Extract: Player names, stacks, bets, and cards. FORMAT: Return raw text only, no markdown.";

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
        }
    ]
}];

const MODEL_NAME = "gemini-3-pro-preview";

export const analyzePokerVideo = async (
  videoFile: File | null, 
  youtubeUrl: string,
  progressCallback: (msg: string) => void,
  streamCallback?: (text: string) => void
): Promise<AnalysisResult> => {
  // Correct initialization following @google/genai guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let parts: Part[] = [];
  if (videoFile) {
    progressCallback("Extracting visual data...");
    const base64Data = await fileToGenerativePart(videoFile);
    parts = [
        { text: "Analyze this HCL poker hand." },
        { inlineData: { mimeType: videoFile.type, data: base64Data } }
    ];
  } else {
    progressCallback("Parsing video URL...");
    parts = [{ text: `Analyze the HCL poker hand at: ${youtubeUrl}. Output PokerStars Hand History.` }];
  }

  try {
    const responseStream = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: [{ parts }],
        config: { systemInstruction: HAND_PARSER_INSTRUCTION }
    });

    let fullText = '';
    for await (const chunk of responseStream) {
        if (chunk.text) {
            fullText += chunk.text;
            if (streamCallback) streamCallback(fullText);
        }
    }

    return { handHistory: fullText, summary: "HCL Hand Transcribed" };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(error.message || "Failed to analyze video.");
  }
};

export const getCoachChat = (systemContext: string) => {
    // Correct initialization following @google/genai guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
        model: MODEL_NAME,
        config: {
            systemInstruction: `You are 'PokerVision Pro', an AI coach. Context: ${systemContext}`,
            tools: COACH_TOOLS
        }
    });
};

export const generateQueryFromNaturalLanguage = async (nlQuery: string): Promise<string> => {
    // Correct initialization following @google/genai guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: `Convert to PokerQL: "${nlQuery}". Output raw string.` }] }
        });
        return response.text?.trim() || "";
    } catch (e) {
        return "";
    }
};
