
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getCoachChat } from '../services/gemini';
import { retrieveContext } from '../services/rag';
import { usePoker } from '../App';
import { BrainCircuit, Send, Sparkles, User, Bot, Loader2, Maximize2, Terminal, Lightbulb, Database, Command, ChevronRight } from 'lucide-react';
import { ChatMessage, ViewMode } from '../types';

interface ToolCallData {
    name: string;
    args: any;
}

export const StrategyCoach: React.FC = () => {
  const { selectedHand, hands, viewMode, setViewMode, activeVideoUrl, launchAnalysis } = usePoker();
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([{
      id: 'init',
      role: 'model',
      text: "I'm PokerVision Pro. I have access to your full hand database and GTO strategy engine. How can I help you improve today?",
      timestamp: Date.now()
  }]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [ragStatus, setRagStatus] = useState<'idle' | 'searching' | 'found' | 'none'>('idle');
  
  // Ref to the Gemini Chat Session
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }, [messages, isThinking, ragStatus]);

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
      if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
      setIsThinking(true);
      setRagStatus('searching');

      try {
          // 1. Perform Local RAG Retrieval
          await new Promise(r => setTimeout(r, 600));
          const ragResult = retrieveContext(text, hands);
          
          if (ragResult.relevantHands.length > 0) {
              setRagStatus('found');
          } else {
              setRagStatus('none');
          }

          const enhancedPrompt = `${text}\n${ragResult.systemMessage}`;

          // 2. Send to Gemini
          const response = await chatSessionRef.current.sendMessage({
              message: enhancedPrompt
          });
          
          // Check for Function Calls
          const functionCalls = response.functionCalls || [];
          
          if (functionCalls && functionCalls.length > 0) {
              // Handle Tools
              const toolCallsData: ToolCallData[] = [];
              
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
              
              const textContent = response.text;
              if (textContent) {
                   setMessages(prev => [...prev, {
                      id: crypto.randomUUID(),
                      role: 'model',
                      text: textContent,
                      timestamp: Date.now() + 100
                  }]);
              }

          } else {
              const responseText = response.text;
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
          setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'system',
              text: "I encountered an error connecting to the strategy engine.",
              timestamp: Date.now()
          }]);
      } finally {
          setIsThinking(false);
          // Keep rag status visible for a moment then clear if needed, or leave 'found' as a badge for the last message
          setTimeout(() => setRagStatus('idle'), 4000);
      }
  }, [input, isThinking, setViewMode, launchAnalysis, hands]);

  // Listener for events from other components
  useEffect(() => {
      const handleAnalyzeSpot = (e: any) => {
          const context = e.detail;
          if (context && context.trim().length > 0) {
              handleSend(context);
          }
      };
      window.addEventListener('analyze-spot', handleAnalyzeSpot);
      return () => window.removeEventListener('analyze-spot', handleAnalyzeSpot);
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

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-l border-zinc-900 shadow-2xl relative font-sans">
        
        {/* Header */}
        <div className="shrink-0 h-16 px-6 border-b border-zinc-900/80 flex items-center justify-between bg-[#09090b]/95 backdrop-blur z-20">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                        <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-poker-green border-2 border-[#09090b] rounded-full"></div>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">Coach AI</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-poker-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-poker-gold"></span>
                        </span>
                        <p className="text-[10px] text-zinc-400 font-medium">Online • RAG Active</p>
                    </div>
                </div>
            </div>
            <button className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg">
                <Maximize2 className="w-4 h-4" />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isSystem = msg.role === 'system';
                
                return (
                    <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300 group`}>
                        
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border shadow-sm mt-1 ${
                            isUser 
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-300' 
                                : isSystem 
                                    ? 'bg-red-900/20 border-red-900/30 text-red-400'
                                    : 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400'
                        }`}>
                            {isUser ? <User className="w-4 h-4" /> : 
                             isSystem ? <Terminal className="w-4 h-4" /> :
                             <Bot className="w-5 h-5" />}
                        </div>

                        {/* Bubble */}
                        <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                            <div className={`relative px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                isUser 
                                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm border border-zinc-700' 
                                    : isSystem
                                        ? 'bg-red-950/30 text-red-200 border border-red-900/30 rounded-tl-sm font-mono text-xs'
                                        : 'bg-zinc-900/80 text-zinc-300 border border-zinc-800 rounded-tl-sm'
                            }`}>
                                {msg.isToolCall ? (
                                    <div className="space-y-3 min-w-[280px]">
                                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider pb-2 border-b border-indigo-500/20">
                                            <Terminal className="w-3.5 h-3.5" /> Executing Action
                                        </div>
                                        {msg.toolCalls?.map((tool, idx) => (
                                            <div key={idx} className="bg-black/40 rounded-lg p-3 text-xs font-mono text-zinc-300 border border-zinc-800 flex flex-col gap-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-indigo-300 font-bold">{tool.name}</span>
                                                    <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                                                </div>
                                                <div className="text-zinc-500 break-all">{JSON.stringify(tool.args)}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap selection:bg-indigo-500/30 selection:text-white">{msg.text}</div>
                                )}
                            </div>
                            
                            <span className="text-[10px] text-zinc-600 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                );
            })}
            
            {/* RAG Status / Typing Indicator */}
            {(isThinking || ragStatus !== 'idle') && (
                <div className="flex flex-col gap-2 ml-14 animate-in fade-in duration-300">
                     {ragStatus === 'searching' && (
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 text-[10px] font-medium text-zinc-400 w-fit">
                             <Database className="w-3 h-3 animate-pulse text-poker-gold" /> 
                             Scanning hand database...
                         </div>
                     )}
                     {ragStatus === 'found' && (
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/30 border border-indigo-900/50 text-[10px] font-medium text-indigo-300 w-fit animate-in slide-in-from-left-2">
                             <Sparkles className="w-3 h-3 text-indigo-400" /> 
                             Relevant context retrieved
                         </div>
                     )}
                     
                     {isThinking && (
                        <div className="flex items-center gap-1 h-8 px-3 bg-zinc-900/50 rounded-full border border-zinc-800 w-fit mt-1">
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                        </div>
                     )}
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-5 bg-[#0c0c0c] border-t border-zinc-900 z-20">
            {/* Quick Prompts */}
            <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                {getQuickPrompts().map((suggestion) => (
                    <button 
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="whitespace-nowrap px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-white rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-2 group"
                    >
                        <Lightbulb className="w-3.5 h-3.5 opacity-50 group-hover:text-poker-gold group-hover:opacity-100 transition-all" /> 
                        {suggestion}
                    </button>
                ))}
            </div>

            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 group-focus-within:border-zinc-700 group-focus-within:bg-zinc-900/80 transition-all flex items-end overflow-hidden shadow-lg">
                    <div className="p-3 pl-4 pb-3.5 text-zinc-500">
                        <Command className="w-4 h-4" />
                    </div>
                    <textarea 
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputResize}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={`Ask Coach (${viewMode} context active)...`}
                        className="w-full bg-transparent text-sm text-zinc-200 px-2 py-3.5 focus:outline-none resize-none max-h-[150px] min-h-[50px] placeholder-zinc-600 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700"
                        rows={1}
                    />
                    <div className="p-2">
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isThinking}
                            className={`p-2.5 rounded-xl transition-all duration-300 ${
                                input.trim() && !isThinking
                                ? 'bg-white text-black hover:bg-zinc-200 shadow-md transform hover:scale-105 active:scale-95' 
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                        >
                            <Send className="w-4 h-4 fill-current" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="text-[10px] text-zinc-600 mt-2 text-center font-medium">
                AI can make mistakes. Verify critical GTO outputs.
            </div>
        </div>
    </div>
  );
};
