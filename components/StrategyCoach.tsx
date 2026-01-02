import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getCoachChat } from '../services/gemini';
import { retrieveContext } from '../services/rag';
import { usePoker } from '../App';
import { BrainCircuit, Send, Sparkles, Loader2, Maximize2, Terminal, Lightbulb, Database, Command, X, Bot, User, CheckCircle2 } from 'lucide-react';
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
      text: "Vision System Online. I am ready to analyze hands and strategy.",
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
        chatServiceRef.current = getCoachChat(contextString, user?.settings?.ai);
    } catch (e) {
        console.error("Failed to initialize chat session", e);
    }
  }, [viewMode, selectedHand, activeVideoUrl, user?.settings?.ai]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, ragStatus]);

  // Handle Send
  const handleSend = useCallback(async (textOverride?: string) => {
      const text = (textOverride || input).trim();
      if (!text || isThinking || !chatServiceRef.current) return;

      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: text, timestamp: Date.now() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setIsThinking(true);
      setRagStatus('searching');

      try {
          await new Promise(r => setTimeout(r, 600)); // Sim delay
          const ragResult = retrieveContext(text, hands);
          setRagStatus(ragResult.relevantHands.length > 0 ? 'found' : 'none');

          const enhancedPrompt = `${text}\n${ragResult.systemMessage}`;
          const response = await chatServiceRef.current.sendMessage({ message: enhancedPrompt, history: updatedMessages });
          
          const functionCalls = response.functionCalls || [];
          if (functionCalls.length > 0) {
              const toolCallsData: ToolCallData[] = [];
              for (const call of functionCalls) {
                  toolCallsData.push({ name: call.name, args: call.args });
                  if (call.name === 'navigate_view') setViewMode(call.args.view as ViewMode);
                  else if (call.name === 'analyze_video_url') launchAnalysis(call.args.url as string);
              }
              setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', isToolCall: true, toolCalls: toolCallsData, timestamp: Date.now() }]);
              if (response.text) {
                   setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: response.text, timestamp: Date.now() + 100 }]);
              }
          } else if (response.text) {
              setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: response.text, timestamp: Date.now() }]);
          }

      } catch (error: any) {
          setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'system', text: "Connection interrupted.", timestamp: Date.now() }]);
      } finally {
          setIsThinking(false);
          setTimeout(() => setRagStatus('idle'), 4000);
      }
  }, [input, isThinking, setViewMode, launchAnalysis, hands, messages]);

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] relative font-sans tracking-tight">
        {/* Header */}
        <div className="shrink-0 h-16 px-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-white tracking-wide uppercase">Vision<span className="text-indigo-400">AI</span></h2>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Beta</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Systems Nominal</p>
                    </div>
                </div>
            </div>
            <button className="text-zinc-600 hover:text-white transition-colors p-2 hover:bg-zinc-900 rounded-lg" onClick={() => setMessages(messages.slice(0,1))}>
                <X className="w-4 h-4" />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                    <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`flex items-end gap-2 max-w-[90%] ${isUser ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${isUser ? 'bg-white text-black' : 'bg-zinc-800 text-indigo-400'}`}>
                                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                            </div>

                            <div className={`relative px-4 py-3 text-xs leading-relaxed shadow-xl ${
                                isUser
                                    ? 'bg-zinc-800 text-white rounded-2xl rounded-tr-sm border border-zinc-700'
                                    : 'bg-[#0f0f12] text-zinc-300 border border-zinc-800/80 rounded-2xl rounded-tl-sm'
                            }`}>
                                {msg.isToolCall ? (
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5 pb-1 mb-1">Action</div>
                                        {msg.toolCalls?.map((tool, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-[10px] font-mono text-poker-gold">
                                                <Terminal className="w-3 h-3" /> {tool.name}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                )}
                            </div>
                        </div>
                        <span className={`text-[9px] text-zinc-600 mt-1 font-medium ${isUser ? 'mr-9' : 'ml-9'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                );
            })}
            
            {(isThinking || ragStatus !== 'idle') && (
                <div className="flex flex-col gap-2 ml-9 animate-in fade-in duration-300">
                     {ragStatus === 'searching' && (
                         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-500 uppercase tracking-wider w-fit">
                             <Loader2 className="w-3 h-3 animate-spin text-poker-gold" /> Accessing Hand DB...
                         </div>
                     )}
                     {isThinking && (
                        <div className="flex items-center gap-1 h-4 px-1 opacity-50">
                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        </div>
                     )}
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-4 bg-[#050505] border-t border-white/5 z-20">
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-zinc-900/50 rounded-xl border border-zinc-800 group-focus-within:border-zinc-700 group-focus-within:bg-zinc-900 transition-all flex items-end overflow-hidden shadow-lg backdrop-blur-sm">
                    <textarea 
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputResize}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Ask VisionAI..."
                        className="w-full bg-transparent text-xs text-zinc-200 px-3 py-3 focus:outline-none resize-none max-h-[150px] min-h-[40px] placeholder-zinc-600 leading-relaxed font-mono"
                        rows={1}
                    />
                    <div className="p-1">
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isThinking}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                                input.trim() && !isThinking
                                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'
                                : 'bg-transparent text-zinc-700 cursor-not-allowed'
                            }`}
                        >
                            <Send className="w-3.5 h-3.5 fill-current" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
                <div className="flex gap-2">
                    <button className="text-[9px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <Command className="w-2.5 h-2.5" /> Cmd+K
                    </button>
                </div>
                <div className="text-[9px] text-zinc-700 font-mono">v2.4.0</div>
            </div>
        </div>
    </div>
  );
};
