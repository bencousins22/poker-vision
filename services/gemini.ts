
import { GoogleGenAI, Tool, Type, Part } from "@google/genai";
import { AnalysisResult, AISettings, ChatMessage, HandHistory } from "../types";

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
        },
        {
            name: "analyze_video_url",
            description: "Trigger analysis of a specific YouTube URL.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    url: { type: Type.STRING, description: "The YouTube URL to analyze." }
                },
                required: ["url"]
            }
        }
    ]
}];

// --- AI SERVICE ABSTRACTION ---

const DEFAULT_MODEL = "gemini-3-flash-preview"; 

export interface ChatSession {
    sendMessage: (payload: { message: string, history?: ChatMessage[] }) => Promise<{ text: string, functionCalls?: any[] }>;
}

const getActiveSettings = (settings?: AISettings) => {
    const provider = settings?.provider || 'google';
    let apiKey = '';
    const accessToken = settings?.accessToken;

    if (provider === 'openrouter') {
        apiKey = settings?.openRouterApiKey || '';
    } else {
        apiKey = settings?.googleApiKey || process.env.API_KEY || '';
    }
    
    const model = settings?.model || DEFAULT_MODEL;
    return { provider, apiKey, model, accessToken };
};

// --- Error Helper ---
const formatError = (e: any): string => {
    const msg = e.message || e.toString();
    if (msg.includes('401') || msg.includes('API key') || msg.includes('UNAUTHENTICATED')) return "Authentication Failed: Check your API Key or Login.";
    if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) return "Quota Exceeded: The model is overloaded or you reached your limit.";
    if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) return "Bad Request: The video format might be unsupported or the prompt is invalid.";
    if (msg.includes('503') || msg.includes('Overloaded')) return "Service Overloaded: Google AI is experiencing high traffic. Try again later.";
    return `AI Service Error: ${msg}`;
};

// --- OpenRouter Implementation ---

const callOpenRouter = async (
    apiKey: string, 
    model: string, 
    messages: any[], 
    streamCallback?: (text: string) => void
): Promise<string> => {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "https://pokervision.app",
                "X-Title": "PokerVision"
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false 
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (e: any) {
        throw new Error(`OpenRouter: ${e.message}`);
    }
};

// --- Google OAuth REST Implementation (Fallback) ---
// Used when provider is 'google-oauth' or when normal SDK fails but we have a token
const callGeminiRest = async (
    accessToken: string,
    model: string,
    contents: any[],
    systemInstruction: string,
    tools: any[] = []
): Promise<{ text: string }> => {
    // Basic REST implementation for generateContent
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const body: any = {
        contents: contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
            temperature: 0.2,
            topK: 64,
            topP: 0.95
        }
    };

    if (tools.length > 0) {
        // Simple mapping for tools if needed, but for analysis we usually don't use them in REST fallback
        // For simple Search:
        if (tools[0].googleSearch) {
            body.tools = [{ googleSearch: {} }];
        }
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || response.statusText);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { text };
};

export const analyzePokerVideo = async (
  videoFile: File | null, 
  youtubeUrl: string,
  siteFormat: string,
  progressCallback: (msg: string) => void,
  streamCallback?: (text: string) => void,
  settings?: AISettings
): Promise<AnalysisResult> => {
  const { provider, apiKey, model, accessToken } = getActiveSettings(settings);
  
  const isHCL = siteFormat.includes("Hustler");
  const systemInstruction = isHCL ? HCL_INSTRUCTION : GENERIC_INSTRUCTION;

  try {
      // --- GOOGLE NATIVE IMPLEMENTATION ---
      if (provider === 'google' || provider === 'google-oauth') {
          // If we have an API Key, use SDK
          if (apiKey && provider === 'google') {
              const ai = new GoogleGenAI({ apiKey });
              let parts: Part[] = [];
              let config: any = { 
                  systemInstruction,
                  temperature: 0.2, 
                  topK: 64,
                  topP: 0.95
              };

              if (videoFile) {
                progressCallback(`Encoding video (${(videoFile.size / 1024 / 1024).toFixed(1)}MB) for Gemini Native...`);
                const base64Data = await fileToGenerativePart(videoFile);
                parts = [
                    { text: "Analyze this video clip. Extract the hand history strictly following PokerStars format." },
                    { inlineData: { mimeType: videoFile.type, data: base64Data } }
                ];
              } else if (youtubeUrl) {
                progressCallback(`Analyzing URL via Search Grounding...`);
                const prompt = isHCL 
                    ? `Find the poker hand history for this Hustler Casino Live video URL: ${youtubeUrl}. Reconstruct a PokerStars Hand History format.`
                    : `Find the poker hand history for this video URL: ${youtubeUrl}. Reconstruct the hand history.`;
                parts = [{ text: prompt }];
                config.tools = [{ googleSearch: {} }];
              } else {
                  throw new Error("No source provided.");
              }

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
              return { handHistory: fullText, summary: "Analysis Complete" };
          } 
          
          // If OAuth/No API Key but Access Token exists
          if (accessToken) {
              progressCallback(`Using Google Account (OAuth) for ${model}...`);
              
              let contents = [];
              if (videoFile) {
                  const base64Data = await fileToGenerativePart(videoFile);
                  contents.push({
                      role: "user",
                      parts: [
                          { text: "Analyze this video clip. Extract the hand history." },
                          { inlineData: { mimeType: videoFile.type, data: base64Data } }
                      ]
                  });
              } else if (youtubeUrl) {
                  // OAuth REST endpoint might not support tools/googleSearch the same way without setup
                  // We'll try just text prompt
                  contents.push({
                      role: "user",
                      parts: [{ text: `Analyze this YouTube URL: ${youtubeUrl}. Extract hand history.` }]
                  });
              }

              const res = await callGeminiRest(accessToken, model, contents, systemInstruction);
              if (streamCallback) streamCallback(res.text);
              return { handHistory: res.text, summary: "Analysis Complete via OAuth" };
          }

          throw new Error("Missing Google API Key or OAuth Token.");
      }

      // --- OPENROUTER IMPLEMENTATION ---
      if (provider === 'openrouter') {
          if (!apiKey) throw new Error("OpenRouter API Key missing in settings.");
          
          const messages: any[] = [
              { role: "system", content: systemInstruction }
          ];

          if (videoFile) {
              progressCallback(`Encoding video for OpenRouter (Base64)...`);
              const base64Data = await fileToGenerativePart(videoFile);
              
              messages.push({
                  role: "user",
                  content: [
                      { type: "text", text: "Analyze this video file. Extract the hand history." },
                      { 
                          type: "image_url", 
                          image_url: { 
                              url: `data:${videoFile.type};base64,${base64Data}` 
                          } 
                      }
                  ]
              });
          } else if (youtubeUrl) {
              messages.push({
                  role: "user",
                  content: `Analyze this YouTube URL: ${youtubeUrl}. Extract hand history.`
              });
          }

          progressCallback(`Sending to OpenRouter (${model})...`);
          const text = await callOpenRouter(apiKey, model, messages);
          if (streamCallback) streamCallback(text);
          
          return { handHistory: text, summary: "Analysis Complete" };
      }

      throw new Error("Invalid AI Provider Configuration");

  } catch (error: any) {
      const friendlyMsg = formatError(error);
      console.error("Analysis Failed:", error);
      throw new Error(friendlyMsg);
  }
};

export const getCoachChat = (systemContext: string, settings?: AISettings): ChatSession => {
    const { provider, apiKey, model, accessToken } = getActiveSettings(settings);

    // --- GOOGLE NATIVE CHAT ---
    if (provider === 'google' && apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const chat = ai.chats.create({
            model: model,
            config: {
                systemInstruction: `You are 'PokerVision Pro', an AI coach. Context: ${systemContext}`,
                tools: COACH_TOOLS
            }
        });

        return {
            sendMessage: async ({ message }) => {
                try {
                    const result = await chat.sendMessage({ message });
                    return { 
                        text: result.text || "", 
                        functionCalls: result.functionCalls 
                    };
                } catch (e) {
                    throw new Error(formatError(e));
                }
            }
        };
    }

    // --- GOOGLE OAUTH FALLBACK ---
    if ((provider === 'google' || provider === 'google-oauth') && accessToken) {
        return {
            sendMessage: async ({ message, history }) => {
                const contents = [
                    ...(history || []).filter(m => m.role !== 'system').map(m => ({
                        role: m.role === 'model' ? 'model' : 'user', // REST API uses 'model' not 'assistant'
                        parts: [{ text: m.text || "" }]
                    })),
                    { role: "user", parts: [{ text: message }] }
                ];
                
                try {
                    const result = await callGeminiRest(
                        accessToken, 
                        model, 
                        contents, 
                        `You are 'PokerVision Pro', an AI coach. Context: ${systemContext}`
                    );
                    return { text: result.text, functionCalls: [] };
                } catch (e) {
                    throw new Error(formatError(e));
                }
            }
        };
    }

    // --- OPENROUTER STATELESS CHAT ---
    if (provider === 'openrouter') {
        return {
            sendMessage: async ({ message, history }) => {
                const apiMessages = [
                    { role: "system", content: `You are 'PokerVision Pro'. Context: ${systemContext}` },
                    ...(history || []).filter(m => m.role !== 'system').map(m => ({
                        role: m.role === 'model' ? 'assistant' : m.role,
                        content: m.text || ""
                    })),
                    { role: "user", content: message }
                ];

                try {
                    const text = await callOpenRouter(apiKey, model, apiMessages);
                    return { text, functionCalls: [] };
                } catch (e) {
                    throw new Error(formatError(e));
                }
            }
        };
    }

    throw new Error("Invalid AI Configuration");
};

export const generatePlayerNote = async (hand: HandHistory, settings?: AISettings): Promise<string> => {
    const { provider, apiKey, model, accessToken } = getActiveSettings(settings);
    const prompt = `Analyze this poker hand and write a concise player note about the Hero (${hand.hero}). Focus on tendencies, sizing tells, or leaks revealed in this specific hand. Keep it under 200 characters. Hand: ${hand.rawText}`;

    try {
        if (provider === 'google' && apiKey) {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model,
                contents: [{ parts: [{ text: prompt }] }]
            });
            return response.text?.trim() || "";
        } else if ((provider === 'google' || provider === 'google-oauth') && accessToken) {
             const res = await callGeminiRest(accessToken, model, [{ role: 'user', parts: [{ text: prompt }]}], "Note Taker");
             return res.text.trim();
        } else {
            const response = await callOpenRouter(apiKey, model, [{ role: "user", content: prompt }]);
            return response.trim();
        }
    } catch (e) {
        throw new Error(formatError(e));
    }
};
