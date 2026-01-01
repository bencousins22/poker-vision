
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getCoachChat } from '../services/gemini';
import { retrieveContext } from '../services/rag';
import { usePoker } from '../App';
import { BrainCircuit, Send, Sparkles, Loader2, Maximize2, Terminal, Lightbulb, Database, Command, X } from 'lucide-react';
import { ChatMessage, ViewMode } from '../types';

interface ToolCallData {
    name: string;
    args: any;
}

export const StrategyCoach: React.FC = () => {
  const { selectedHand, hands, viewMode, setViewMode, activeVideoUrl, launchAnalysis, user } = usePoker();
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([{
      id: 'init',
      role: 'model',
      text: "I'm connected to your hand database. Select a hand or ask a strategy question to begin.",
      timestamp: Date.now()
  }]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [ragStatus, setRagStatus] = useState<'idle' | 'searching' | 'found' | 'none'>('idle');
  
  // Ref to the Chat Service Interface
  const chatServiceRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Chat Service with Current Context
  useEffect(() => {
    const contextString = `
      User is currently on view: ${viewMode}.
      ${selectedHand ? `Selected Hand ID: ${selectedHand.id}. Hero: ${selectedHand.hero}. Pot: ${selectedHand.potSize}.` : 'No hand currently selected.'}
      ${activeVideoUrl ? `Active Video URL: ${activeVideoUrl}` : ''}
    `;
    
    try {
        // We pass user.settings.ai to configure the provider
        chatServiceRef.current = getCoachChat(contextString, user?.settings?.ai);
    } catch (e) {
        console.error("Failed to initialize chat session", e);
    }
  }, [viewMode, selectedHand, activeVideoUrl, user?.settings?.ai]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, ragStatus]);

  // Handle Send with strict validation
  const handleSend = useCallback(async (textOverride?: string) => {
      const text = (textOverride || input).trim();
      
      if (!text || isThinking || !chatServiceRef.current) return;

      // Add User Message
      const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          text: text,
          timestamp: Date.now()
      };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      
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

          // 2. Send to AI Service
          // Important: Pass history for stateless providers (OpenRouter)
          const response = await chatServiceRef.current.sendMessage({
              message: enhancedPrompt,
              history: updatedMessages 
          });
          
          // Check for Function Calls (Only supported natively by Google currently, OpenRouter support varies)
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
              text: "Connection interrupted. Please try again.",
              timestamp: Date.now()
          }]);
      } finally {
          setIsThinking(false);
          setTimeout(() => setRagStatus('idle'), 4000);
      }
  }, [input, isThinking, setViewMode, launchAnalysis, hands, messages]);

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
          return ["Analyze my leaks", "How do I play pocket pairs?", "Find my biggest pots"];
      } else {
          return ["Show me high stakes hands", "Go to Tracker", "Explain Bankroll Management"];
      }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] border-l border-zinc-800 shadow-2xl relative font-sans tracking-tight">
        
        {/* Header */}
        <div className="shrink-0 h-14 px-5 border-b border-zinc-800/80 flex items-center justify-between bg-[#050505]/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-2.5">
                <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-1.5 rounded-lg border border-white/5">
                    <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-white tracking-wide uppercase leading-none">Vision<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">AI</span></h2>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="relative flex h-1 w-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                        </span>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Online</p>
                    </div>
                </div>
            </div>
            <button className="text-zinc-600 hover:text-white transition-colors p-2 hover:bg-zinc-900 rounded-lg" title="Clear Chat" onClick={() => setMessages(messages.slice(0,1))}>
                <X className="w-4 h-4" />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent bg-gradient-to-b from-[#050505] to-[#080808]">
            {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isSystem = msg.role === 'system';
                
                return (
                    <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300 group`}>
                        
                        {/* Bot Name Label */}
                        {!isUser && !isSystem && (
                            <div className="mb-1.5 ml-1 flex items-center gap-2 select-none opacity-90">
                                <span className="text-[10px] font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                                    VISION
                                </span>
                                {msg.isToolCall && (
                                    <span className="text-[9px] text-zinc-600 font-mono flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                        <Terminal className="w-2.5 h-2.5" /> SYSTEM
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Bubble */}
                        <div className={`relative px-4 py-3 text-sm leading-relaxed shadow-lg max-w-[95%] ${
                            isUser 
                                ? 'bg-zinc-800 text-white rounded-2xl rounded-tr-sm border border-zinc-700/50' 
                                : isSystem
                                    ? 'bg-red-950/10 text-red-400 border border-red-900/20 rounded-xl w-full text-center text-xs font-mono py-2'
                                    : 'bg-[#0f0f11] text-zinc-300 border border-zinc-800 rounded-2xl rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                        }`}>
                            {msg.isToolCall ? (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5 pb-1">Executed Action</div>
                                    {msg.toolCalls?.map((tool, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs font-mono text-poker-gold">
                                            <span className="w-1.5 h-1.5 bg-poker-gold rounded-full"></span>
                                            {tool.name}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap selection:bg-emerald-500/20 selection:text-white">{msg.text}</div>
                            )}
                        </div>
                        
                        {/* Timestamp */}
                        <span className="text-[9px] text-zinc-700 mt-1 px-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                );
            })}
            
            {/* Thinking / Status Indicator */}
            {(isThinking || ragStatus !== 'idle') && (
                <div className="flex flex-col gap-2 ml-1 animate-in fade-in duration-300">
                     {ragStatus === 'searching' && (
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 text-[9px] font-bold text-zinc-500 uppercase tracking-wider w-fit">
                             <Database className="w-3 h-3 animate-pulse text-poker-gold" /> 
                             Database Query
                         </div>
                     )}
                     {ragStatus === 'found' && (
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/20 border border-emerald-900/40 text-[9px] font-bold text-emerald-500 uppercase tracking-wider w-fit animate-in slide-in-from-left-2">
                             <Sparkles className="w-3 h-3" /> 
                             Context Found
                         </div>
                     )}
                     
                     {isThinking && (
                        <div className="flex items-center gap-1 h-6 px-2 w-fit mt-1 opacity-50">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></div>
                        </div>
                     )}
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-4 bg-[#08080a] border-t border-zinc-800/80 z-20">
            {/* Quick Prompts */}
            <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                {getQuickPrompts().map((suggestion) => (
                    <button 
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="whitespace-nowrap px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all flex items-center gap-1.5 group"
                    >
                        <Lightbulb className="w-3 h-3 opacity-50 group-hover:text-poker-gold group-hover:opacity-100 transition-all" /> 
                        {suggestion}
                    </button>
                ))}
            </div>

            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-zinc-900 rounded-xl border border-zinc-800 group-focus-within:border-zinc-700 group-focus-within:bg-zinc-900/80 transition-all flex items-end overflow-hidden shadow-lg">
                    <div className="p-3 pl-3 pb-3 text-zinc-600">
                        <Command className="w-4 h-4" />
                    </div>
                    <textarea 
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputResize}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Ask anything..."
                        className="w-full bg-transparent text-sm text-zinc-200 px-2 py-3 focus:outline-none resize-none max-h-[150px] min-h-[44px] placeholder-zinc-600 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700"
                        rows={1}
                    />
                    <div className="p-1.5">
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isThinking}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                                input.trim() && !isThinking
                                ? 'bg-white text-black hover:bg-zinc-200 shadow-md transform hover:scale-105 active:scale-95' 
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            }`}
                        >
                            <Send className="w-3.5 h-3.5 fill-current" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="text-[9px] text-zinc-600 mt-2 text-center font-medium opacity-50">
                AI Agent active ({user?.settings?.ai?.provider || 'Google'}).
            </div>
        </div>
    </div>
  );
};
