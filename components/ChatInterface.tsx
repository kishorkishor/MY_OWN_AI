import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  input, 
  setInput, 
  onSend, 
  isLoading 
}) => {
  const { isDark } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div 
      className="flex flex-col h-full overflow-hidden neu-panel"
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      {/* Header - Neumorphic */}
      <div 
        className="p-4 flex items-center justify-between"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="neu-bubble relative"
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--bubble-text)' }} />
            <div 
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{
                backgroundColor: 'var(--text-secondary)',
                border: '2px solid var(--bg-elevated)',
              }}
            />
          </div>
          <div>
            <h2 
              className="font-semibold text-sm tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              Kompass AI
            </h2>
            <span 
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Online
            </span>
          </div>
        </div>
        <div 
          className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider"
          style={{
            background: 'var(--bg-base)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-neu-inset)',
            color: 'var(--text-tertiary)',
          }}
        >
          DeepSeek Chat
        </div>
      </div>

      {/* Messages - Neumorphic inset area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ background: 'var(--bg-base)' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div 
              className="neu-bubble p-5 mb-4"
              style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bot size={28} style={{ color: 'var(--bubble-text)' }} />
            </div>
            <h3 
              className="mb-2 text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome to Kompass
            </h3>
            <p 
              className="text-sm max-w-xs leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Describe your decision or dilemma. I'll help you map out options, 
              weigh trade-offs, and project outcomes.
            </p>
            
            {/* Suggested prompts - Neumorphic buttons */}
            <div className="mt-6 space-y-2 w-full max-w-xs">
              {[
                "Should I change careers?",
                "Help me decide on a major purchase",
                "I'm choosing between two offers"
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="w-full px-4 py-3 text-xs text-left transition-all duration-200 active:scale-98"
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-neu-button)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex w-full animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed transition-all duration-200 ${
                msg.role === 'user'
                  ? 'rounded-2xl rounded-tr-md'
                  : 'rounded-2xl rounded-tl-md'
              }`}
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                borderRadius: msg.role === 'user' 
                  ? 'var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)'
                  : 'var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)',
                boxShadow: msg.role === 'user' 
                  ? 'var(--shadow-neu-raised)' 
                  : 'var(--shadow-neu-inset)',
              }}
            >
              {msg.role === 'model' ? (
                 <ReactMarkdown 
                    components={{
                        ul: ({node, ...props}) => (
                          <ul 
                            className="list-disc ml-4 my-2" 
                            style={{ color: 'var(--text-secondary)' }} 
                            {...props} 
                          />
                        ),
                        ol: ({node, ...props}) => (
                          <ol 
                            className="list-decimal ml-4 my-2" 
                            style={{ color: 'var(--text-secondary)' }} 
                            {...props} 
                          />
                        ),
                        li: ({node, ...props}) => <li className="my-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => (
                          <span 
                            className="font-semibold" 
                            style={{ color: 'var(--text-primary)' }} 
                            {...props} 
                          />
                        ),
                        code: ({node, ...props}) => (
                          <code 
                            className="px-1.5 py-0.5 rounded text-xs font-mono"
                            style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-secondary)',
                            }}
                            {...props}
                          />
                        ),
                    }}
                 >
                     {msg.text}
                 </ReactMarkdown>
              ) : (
                <span className="font-medium">{msg.text}</span>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
            <div className="flex justify-start w-full animate-slide-up">
                <div 
                  className="rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-3"
                  style={{
                    background: 'var(--bg-surface)',
                    boxShadow: 'var(--shadow-neu-inset)',
                    borderRadius: 'var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)',
                  }}
                >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full animate-bounce"
                          style={{
                            backgroundColor: 'var(--text-tertiary)',
                            animationDelay: `${i * 150}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <span 
                      className="text-xs tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Thinking...
                    </span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Neumorphic */}
      <div 
        className="p-4"
        style={{
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border-subtle)',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
        }}
      >
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            className="neu-input w-full pr-14 resize-none h-14 scrollbar-hide text-sm"
            style={{ borderRadius: 'var(--radius-lg)' }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-2.5 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && !isLoading 
                ? 'var(--bg-surface)'
                : 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              boxShadow: input.trim() && !isLoading 
                ? 'var(--shadow-neu-button)' 
                : 'none',
              color: 'var(--text-primary)',
            }}
          >
            <Send size={16} strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Helper text */}
        <p 
          className="text-[10px] mt-2 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
