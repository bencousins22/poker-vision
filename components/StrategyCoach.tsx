import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getCoachChat } from '../services/gemini';
import { retrieveContext } from '../services/rag';
import { usePoker } from '../App';
import { BrainCircuit, Send, Sparkles, User, Bot, Loader2, Maximize2, Terminal, Lightbulb, Database } from 'lucide-react';
import { ChatMessage, ViewMode } from '../types';

export const StrategyCoach: React.FC = () => {
  const { selectedHand, hands, viewMode, setViewMode, activeVideoUrl, launchAnalysis } = usePoker();
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([{
      id: 'init',
      role: 'model',
      text: "I'm PokerVision Pro. I have access to your full hand database (RAG enabled). How can I help you improve?",
      timestamp: Date.now()
  }]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [ragStatus, setRagStatus] = useState<'idle' | 'searching' | 'found' | 'none'>('idle');
  
  // Ref to the Gemini Chat Session
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session with Current Context
  useEffect(() => {
    const contextString = `
      User is currently on view: ${viewMode}.
      ${selectedHand ? `Selected Hand ID: ${selectedHand.id}. Hero: ${selectedHand.hero}. Pot: ${selectedHand.potSize}.` : 'No hand currently selected.'}
      ${activeVideoUrl ? `Active Video URL: ${activeVideoUrl}` : ''}
    `;
    
    try {
        chatSessionRef.current = getCoachChat(contextString);
    } catch (e) {
        console.error("Failed to initialize chat session", e);
    }
  }, [viewMode, selectedHand, activeVideoUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle Send with strict validation
  const handleSend = useCallback(async (textOverride?: string) => {
      const text = (textOverride || input).trim();
      
      if (!text || isThinking || !chatSessionRef.current) return;

      // Add User Message
      const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          text: text,
          timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsThinking(true);
      setRagStatus('searching');

      try {
          // 1. Perform Local RAG Retrieval
          // Simulating DB Latency for UX
          await new Promise(r => setTimeout(r, 600));
          const ragResult = retrieveContext(text, hands);
          
          if (ragResult.relevantHands.length > 0) {
              setRagStatus('found');
          } else {
              setRagStatus('none');
          }

          const enhancedPrompt = `${text}\n${ragResult.systemMessage}`;

          // 2. Send to Gemini
          // Fix: Use 'message' parameter correctly for chat.sendMessage
          const result = await chatSessionRef.current.sendMessage({
              message: enhancedPrompt
          });
          const response = result; // result IS the response in @google/genai
          
          // Check for Function Calls
          const functionCalls = response.functionCalls || [];
          
          if (functionCalls && functionCalls.length > 0) {
              // Handle Tools
              const toolCallsData: { name: string; args: any }[] = [];
              
              for (const call of functionCalls) {
                  toolCallsData.push({ name: call.name, args: call.args });
                  
                  if (call.name === 'navigate_view') {
                      const target = call.args.view as ViewMode;
                      setViewMode(target);
                  } else if (call.name === 'analyze_video_url') {
                      const url = call.args.url as string;
                      launchAnalysis(url);
                  }
              }

              setMessages(prev => [...prev, {
                  id: crypto.randomUUID(),
                  role: 'model',
                  isToolCall: true,
                  toolCalls: toolCallsData,
                  timestamp: Date.now()
              }]);
              
              // If there's accompanying text, add it
              const textContent = response.text || null;
              if (textContent) {
                   setMessages(prev => [...prev, {
                      id: crypto.randomUUID(),
                      role: 'model',
                      text: textContent,
                      timestamp: Date.now() + 100
                  }]);
              }

          } else {
              // Standard Text Response
              const responseText = response.text || null;
              if (responseText) {
                  setMessages(prev => [...prev, {
                      id: crypto.randomUUID(),
                      role: 'model',
                      text: responseText,
                      timestamp: Date.now()
                  }]);
              }
          }

      } catch (error: any) {
          console.error("Chat Error", error);
          let errorText = "I encountered an error connecting to the strategy engine.";
          if (error.message?.includes("ContentUnion")) {
              errorText += " (Protocol Mismatch)";
          }
          setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'system',
              text: errorText,
              timestamp: Date.now()
          }]);
      } finally {
          setIsThinking(false);
          setTimeout(() => setRagStatus('idle'), 3000);
      }
  }, [input, isThinking, setViewMode, launchAnalysis, hands]);

  // Listener for events from other components
  useEffect(() => {
      const handleAnalyzeSpot = (e: CustomEvent) => {
          const context = e.detail;
          if (context && context.trim().length > 0) {
              handleSend(context);
          }
      };
      window.addEventListener('analyze-spot' as any, handleAnalyzeSpot);
      return () => window.removeEventListener('analyze-spot' as any, handleAnalyzeSpot);
  }, [handleSend]);

  const getQuickPrompts = () => {
      if (viewMode === 'review' && selectedHand) {
          return ["Analyze Hero's line", "Was the river fold correct?", "Calculate pot odds"];
      } else if (viewMode === 'tracker') {
          return ["How am I playing pocket pairs?", "Find my biggest pots", "Identify my leaks"];
      } else {
          return ["Show me high stakes hands", "Go to Analysis Dashboard", "Explain Bankroll Management"];
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#111111] border-l border-zinc-800 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="h-16 px-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
                        <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#111] rounded-full"></div>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white tracking-wide">Coach AI</h2>
                    <p className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                        <Database className="w-3 h-3" /> RAG Enabled
                    </p>
                </div>
            </div>
            <button className="text-zinc-500 hover:text-white transition-colors">
                <Maximize2 className="w-4 h-4" />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300`}>
                    
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-md ${
                        msg.role === 'user' ? 'bg-zinc-800 border-zinc-700' : 
                        msg.role === 'system' ? 'bg-red-900/20 border-red-900' :
                        'bg-purple-900/20 border-purple-500/30'
                    }`}>
                        {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-400" /> : 
                         msg.role === 'system' ? <Terminal className="w-4 h-4 text-red-400" /> :
                         <Bot className="w-4 h-4 text-purple-400" />}
                    </div>

                    {/* Bubble */}
                    <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-white text-black rounded-tr-none font-medium' 
                                : msg.role === 'system'
                                ? 'bg-red-900/10 text-red-200 border border-red-900/30'
                                : 'bg-zinc-800 text-zinc-200 border border-zinc-700/50 rounded-tl-none'
                        }`}>
                            {msg.isToolCall ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                                        <Terminal className="w-3 h-3" /> Executing Action
                                    </div>
                                    {msg.toolCalls?.map((tool, idx) => (
                                        <div key={idx} className="bg-black/30 rounded p-2 text-xs font-mono text-zinc-300 border border-purple-500/20">
                                            <span className="text-purple-300">{tool.name}</span>
                                            <span className="text-zinc-500">(</span>
                                            <span className="text-yellow-500">{JSON.stringify(tool.args).slice(0, 50)}...</span>
                                            <span className="text-zinc-500">)</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1.5 text-xs text-green-400 mt-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Processed
                                    </div>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                            )}
                        </div>
                        <span className="text-[10px] text-zinc-600 px-1 opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                </div>
            ))}
            
            {/* RAG Status Indicator */}
            {isThinking && (
                <div className="flex flex-col gap-2 ml-11">
                     {ragStatus === 'searching' && (
                         <div className="flex items-center gap-2 text-[10px] text-zinc-500 animate-pulse">
                             <Database className="w-3 h-3" /> Searching database for similar hands...
                         </div>
                     )}
                     {ragStatus === 'found' && (
                         <div className="flex items-center gap-2 text-[10px] text-green-500 animate-in fade-in slide-in-from-left-2">
                             <Sparkles className="w-3 h-3" /> Relevant context retrieved
                         </div>
                     )}
                     <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-purple-900/20 border border-purple-500/30 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                         </div>
                         <div className="flex items-center gap-1 h-8 px-2 bg-zinc-900/50 rounded-full border border-zinc-800">
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                         </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 backdrop-blur-sm">
            {/* Quick Prompts */}
            <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {getQuickPrompts().map((suggestion) => (
                    <button 
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="whitespace-nowrap px-3 py-1.5 bg-zinc-800/50 hover:bg-purple-900/20 text-[10px] text-zinc-400 hover:text-purple-300 rounded-full border border-zinc-700 hover:border-purple-500/30 transition-all flex items-center gap-1.5"
                    >
                        <Lightbulb className="w-3 h-3 opacity-70" /> {suggestion}
                    </button>
                ))}
            </div>

            <div className="relative group">
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={`Ask AI Coach (${viewMode} context active)...`}
                    className="w-full bg-[#1a1a1a] border border-zinc-700 text-zinc-200 text-sm rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none h-[50px] max-h-[120px] scrollbar-none placeholder-zinc-600 shadow-inner"
                />
                <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isThinking}
                    className="absolute right-2 top-2 p-1.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );
};