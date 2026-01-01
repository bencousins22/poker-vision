
import { GoogleGenAI, Tool, Type } from "@google/genai";
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

const HAND_PARSER_INSTRUCTION = `
You are an expert Poker Hand History Transcriber specializing in video analysis of "Hustler Casino Live" (HCL) streams.
Your task is to watch the poker footage and convert the action into a **STRICT PokerStars Hand History** format that imports perfectly into Holdem Manager 3 (HM3) and PokerTracker 4 (PT4).

**VISUAL ANALYSIS GUIDE (HCL DECALS):**
1.  **Player Nameplates**: Located in black boxes around the table. Top text is Name, bottom text (e.g., "$15,400") is Stack.
2.  **Dealer Button**: White disc labeled 'D'. Assign seat # based on button position (Button is usually Seat 1 for simplicity if not clear).
3.  **Active Player**: Look for the yellow/gold border around a player's nameplate.
4.  **Pot Size**: Displayed in the center widget (e.g., "POT: $450").
5.  **Cards**: RFID graphics appear next to nameplates.
6.  **Community Cards**: Appear in the center of the table.

**FORMATTING RULES (STRICT COMPLIANCE):**
1.  **Header**: \`PokerStars Hand #<Random10Digit>:  Hold'em No Limit ($<SB>/$<BB> USD) - <YYYY>/<MM>/<DD> <HH>:<MM>:<SS> ET\`
    *   *Invent a valid date/time if not visible.*
2.  **Table**: \`Table 'Hustler Live' 9-max Seat #1 is the button\`
3.  **Seats**: \`Seat <N>: <PlayerName> ($<StackAmount> in chips)\`
4.  **Blind Posting**: \`<Name>: posts small blind $<Amt>\` and \`<Name>: posts big blind $<Amt>\`
5.  **Hole Cards**: \`*** HOLE CARDS ***\` -> \`Dealt to <Hero> [<c1> <c2>]\` (Pick the main character as Hero).
6.  **Action**: \`folds\`, \`checks\`, \`calls $<Amt>\`, \`bets $<Amt>\`, \`raises $<Amt> to $<Total>\`.
7.  **Streets**: \`*** FLOP *** [c1 c2 c3]\`, \`*** TURN *** [b1 b2 b3] [c4]\`, \`*** RIVER *** [b1 b2 b3 c4] [c5]\`.
8.  **Showdown**: \`*** SHOWDOWN ***\` followed by \`<Name>: shows [c1 c2] (hand description)\`.
9.  **Summary**: \`*** SUMMARY ***\`, \`Total pot $<Amt> | Rake $0\`, \`Board [...]\`, \`Seat <N>: <Name> ...\`.

**Output**: Return ONLY the raw text. NO markdown.
`;

// --- Coach Tools Definition ---

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

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  const ai = getAIClient();
  let contents: any = null;
  let toolConfig = {};
  
  // Default Prompt
  let promptText = "Analyze this poker footage. Extract the hand history.";

  if (videoFile) {
    if (youtubeUrl) {
       promptText += ` Video Source: ${youtubeUrl}. Focus on the main hand. Use onscreen decals for stacks/actions.`;
    }
    progressCallback("Uploading video frame data...");
    const base64Data = await fileToGenerativePart(videoFile);
    
    // Strict Structure for Gemini Multimodal
    contents = {
      role: 'user',
      parts: [
        { text: promptText },
        { inlineData: { mimeType: videoFile.type, data: base64Data } }
      ]
    };
  } else {
    // YouTube URL Flow
    progressCallback("Scanning YouTube video context...");
    promptText = `Analyze the poker hand in this video URL: ${youtubeUrl}.
    
    **Task**: Create a PokerStars Hand History for the hand shown.
    **Method**: 
    1. If you can identify the video (e.g. Robbi vs Garrett J4o), use your knowledge or Search to get accurate details.
    2. VISUALIZE the onscreen graphics (Hustler Casino Live style):
       - Black nameplates with White text (Name) and Green/White numbers (Stacks).
       - RFID Card graphics next to players.
       - Pot size in the middle.
       
    **Output**: A valid PokerStars Hand History text block.
    `;

    contents = {
        role: 'user',
        parts: [{ text: promptText }]
    };
    // Enable Search to help with YouTube URLs which cannot be watched directly
    toolConfig = { tools: [{ googleSearch: {} }] };
  }

  progressCallback(`Starting Gemini 3 Pro Vision analysis...`);

  try {
    const responseStream = await retryOperation(async () => {
        return await ai.models.generateContentStream({
            model: MODEL_NAME,
            contents: contents, 
            config: {
                systemInstruction: HAND_PARSER_INSTRUCTION,
                ...toolConfig
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
    
    // Simple Post-Processing
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
    const ai = getAIClient();
    return ai.chats.create({
        model: MODEL_NAME,
        config: {
            // Using parts format for systemInstruction to avoid potential string/ContentUnion ambiguity in some SDK versions
            systemInstruction: {
                parts: [{ text: `You are 'PokerVision Pro', an elite poker coach and UI assistant.
            
            Your capabilities:
            1. **Navigate the App**: Switch views.
            2. **Analyze Videos**: Trigger analysis if URL provided.
            3. **Strategy Advice**: GTO and exploitative advice.
            
            **Current App Context**:
            ${systemContext}
            `}]
            },
            tools: COACH_TOOLS
        }
    });
};

export const generateQueryFromNaturalLanguage = async (nlQuery: string): Promise<string> => {
    const ai = getAIClient();
    const prompt = `Convert the following natural language poker question into a specific 'PokerQL' syntax.
    
    **Schema Fields**:
    - win (number)
    - loss (number)
    - pot (number)
    - hand (string, e.g. "AhKh")
    - range (string, e.g. "AKs", "TT")
    - pos (enum: BTN, SB, BB, EP, MP, CO)
    - action (contains string text)
    - tag (contains string text)
    
    **Syntax Rules**:
    - Use AND, OR for logic.
    - Use >, <, =, >=, <= for numbers.
    - Use 'IN [X, Y]' for lists.
    - Use 'contains' for text search.
    - Output ONLY the query string.
    
    **Examples**:
    - "Show me big winning pots" -> win > 500
    - "Lost with pockets aces" -> range = AA AND win < 0
    - "Bluffs on the river" -> action contains 'river' AND action contains 'raise'
    - "Button hands where I won" -> pos = BTN AND win > 0
    
    **User Input**: "${nlQuery}"
    `;
    
    try {
        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: prompt }] }
        });
        return result.response.text?.trim().replace(/```/g, '') || "";
    } catch (e) {
        console.error("Query gen failed", e);
        return "";
    }
};
