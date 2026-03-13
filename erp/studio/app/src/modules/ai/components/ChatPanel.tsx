import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  TerminalSquare,
  Activity,
  Shield,
  Server,
  Code2,
  Copy,
  Check,
  History,
} from 'lucide-react';
import { cn } from '@shared/utils';
import { apiClient } from '@core/api/client';
import {
  sendMessage,
  checkHealth,
  generateId,
  createSession,
  generateTitle,
  loadSessions,
  saveSessions,
  type ChatMessage,
  type ChatSession,
  type HealthStatus,
} from '../services/chat';

// ─────────────────────────────────────────────────────────────────────────────
// Global keyframes (injected once at module level via a <style> tag in render)
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes sg-bounce {
    0%, 80%, 100% { transform: translateY(0);   opacity: 0.35; }
    40%           { transform: translateY(-5px); opacity: 1;    }
  }
  @keyframes sg-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes sg-glow-pulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.9; }
  }
  @keyframes sg-slide-in {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0);    }
  }
  @keyframes sg-slide-out {
    from { opacity: 1; transform: translateX(0);    }
    to   { opacity: 0; transform: translateX(16px); }
  }
  .sg-msg-appear   { animation: sg-fade-up  0.22s ease-out both; }
  .sg-panel-appear { animation: sg-slide-in 0.28s cubic-bezier(.25,.8,.25,1) both; }

  /* Thin custom scrollbar for the chat history panel */
  .sg-scrollbar::-webkit-scrollbar       { width: 4px; }
  .sg-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .sg-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
  .sg-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }

  /* Message textarea auto-grow */
  .sg-input { field-sizing: content; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// CopyButton
// ─────────────────────────────────────────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium',
        'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20',
        'text-slate-400 hover:text-slate-200 transition-all duration-150',
        className,
      )}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// renderContent — parses ``` code fences and plain text
// ─────────────────────────────────────────────────────────────────────────────
function renderContent(content: string) {
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} className="whitespace-pre-wrap break-words">
          {content.slice(lastIndex, match.index)}
        </span>,
      );
    }
    const lang = match[1] || 'code';
    const code = match[2].trimEnd();
    parts.push(
      <div key={key++} className="my-3 rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-white/5 to-white/3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-1">
              {lang}
            </span>
          </div>
          <CopyButton text={code} />
        </div>
        <pre className="overflow-x-auto px-4 py-3.5 text-xs leading-relaxed font-mono text-slate-200 bg-slate-950/70">
          <code>{code}</code>
        </pre>
      </div>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={key++} className="whitespace-pre-wrap break-words">
        {content.slice(lastIndex)}
      </span>,
    );
  }

  return parts.length > 0
    ? parts
    : <span className="whitespace-pre-wrap break-words">{content}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TypingIndicator
// ─────────────────────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 items-end sg-msg-appear">
      {/* Avatar */}
      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/30 via-primary/20 to-transparent border border-primary/25 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/10">
        <Sparkles className="h-4 w-4 text-primary" style={{ animation: 'sg-glow-pulse 2s ease-in-out infinite' }} />
      </div>
      {/* Bubble */}
      <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-white/5 border border-white/10 backdrop-blur-sm shadow-lg shadow-black/20">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/70"
              style={{ animation: `sg-bounce 1.3s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground/70 font-medium tracking-wide">
            Processing…
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'assistant' && msg.content.startsWith('⚠️');

  return (
    <div className={cn('flex gap-3 group', isUser ? 'justify-end' : 'justify-start')}>
      {/* Assistant avatar */}
      {!isUser && (
        <div
          className={cn(
            'h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg transition-transform duration-200 group-hover:scale-105',
            isError
              ? 'bg-red-500/10 border border-red-500/20 shadow-red-500/10'
              : 'bg-gradient-to-br from-primary/30 via-primary/20 to-transparent border border-primary/25 shadow-primary/10',
          )}
        >
          {isError
            ? <AlertCircle className="h-4 w-4 text-red-400" />
            : <Sparkles className="h-4 w-4 text-primary" />}
        </div>
      )}

      <div className="max-w-[82%] min-w-0 space-y-1">
        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all duration-200',
            isUser
              ? 'bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-br-sm shadow-lg shadow-primary/25 group-hover:shadow-primary/35'
              : isError
              ? 'bg-red-500/5 border border-red-500/20 text-foreground rounded-bl-sm backdrop-blur-sm'
              : 'bg-white/[0.04] border border-white/[0.08] text-foreground rounded-bl-sm backdrop-blur-sm shadow-lg shadow-black/20 group-hover:bg-white/[0.06] group-hover:border-white/[0.12]',
          )}
        >
          {renderContent(msg.content)}
        </div>

        {/* Meta row */}
        <div
          className={cn(
            'flex items-center gap-2 px-1 text-[11px] text-muted-foreground/50',
            isUser ? 'justify-end' : 'justify-start',
          )}
        >
          <span>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.durationMs != null && (
            <span className="opacity-60">
              · {msg.durationMs > 1000 ? `${(msg.durationMs / 1000).toFixed(1)}s` : `${msg.durationMs}ms`}
            </span>
          )}
          {!isUser && !isError && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1">
              <CopyButton text={msg.content} />
            </span>
          )}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/40 to-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-primary/10 transition-transform duration-200 group-hover:scale-105">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggestion Cards — welcome state
// ─────────────────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: Activity,       label: 'System health',    prompt: 'Run a system health check' },
  { icon: Shield,         label: 'POA status',        prompt: 'Show active POA status' },
  { icon: Code2,          label: 'Code review',       prompt: 'Dispatch CTO for code review' },
  { icon: Server,         label: 'Running services',  prompt: 'What services are running?' },
  { icon: TerminalSquare, label: 'NEXUS audit',       prompt: 'Run a NEXUS self-audit' },
  { icon: Zap,            label: 'Full system audit', prompt: 'Dispatch all executives for a total system audit' },
];

// ─────────────────────────────────────────────────────────────────────────────
// WelcomeState
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeState({
  onSuggest,
  inputRef,
}: {
  onSuggest: (prompt: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      <div className="max-w-xl w-full space-y-8 sg-msg-appear">
        {/* Hero mark */}
        <div className="text-center space-y-5">
          <div className="relative mx-auto w-fit">
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-2xl scale-[2] -z-10 pointer-events-none" />
            <div className="absolute inset-0 rounded-3xl bg-primary/5  blur-3xl scale-[3] -z-10 pointer-events-none" />
            {/* Icon */}
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent border border-primary/25 flex items-center justify-center shadow-2xl shadow-primary/20">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            {/* Pulsing corner accent */}
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background shadow-sm shadow-emerald-500/60"
              style={{ animation: 'sg-glow-pulse 2.5s ease-in-out infinite' }} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Singularity AI
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Autonomous runtime for Artifact Virtual ERP. Ask about system status,
              dispatches, audits, code, or operations.
            </p>
          </div>
        </div>

        {/* Divider with label */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[11px] text-muted-foreground/50 tracking-widest uppercase font-medium">
            Quick actions
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Suggestion grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={s.prompt}
              onClick={() => {
                onSuggest(s.prompt);
                inputRef.current?.focus();
              }}
              className={cn(
                'group flex items-start gap-2.5 text-left p-3.5 rounded-xl transition-all duration-200',
                'bg-white/[0.03] hover:bg-primary/[0.07] border border-white/[0.07] hover:border-primary/30',
                'text-muted-foreground hover:text-foreground',
                'shadow-sm hover:shadow-md hover:shadow-primary/5',
                'hover:-translate-y-0.5 active:translate-y-0',
              )}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              <s.icon className="h-3.5 w-3.5 flex-shrink-0 text-primary/50 group-hover:text-primary mt-0.5 transition-colors duration-150" />
              <span className="text-xs font-medium leading-snug">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HistorySidebar — right panel
// ─────────────────────────────────────────────────────────────────────────────
interface HistorySidebarProps {
  sessions:        ChatSession[];
  activeSessionId: string;
  health:          HealthStatus | null;
  onSelect:        (id: string)  => void;
  onDelete:        (id: string)  => void;
  onRetryHealth:   () => void;
}

function HistorySidebar({
  sessions,
  activeSessionId,
  health,
  onSelect,
  onDelete,
  onRetryHealth,
}: HistorySidebarProps) {
  const isConnected = health?.status === 'connected';

  return (
    <div className="flex flex-col h-full w-full sg-panel-appear">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-primary/60" />
          <span className="text-sm font-semibold text-foreground tracking-tight">Chat History</span>
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
          'bg-primary/10 border-primary/20 text-primary/80',
        )}>
          {sessions.length}
        </span>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 sg-scrollbar">
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/40 text-xs gap-2">
            <MessageSquare className="h-6 w-6 opacity-30" />
            <span>No sessions yet</span>
          </div>
        )}
        {sessions.map((session) => {
          const msgCount = session.messages.length;
          const lastMsg  = session.messages[session.messages.length - 1];
          const isActive = session.id === activeSessionId;

          return (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={cn(
                'group relative rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150',
                isActive
                  ? 'bg-primary/[0.10] border border-primary/25 shadow-sm shadow-primary/5'
                  : 'border border-transparent hover:bg-white/[0.04] hover:border-white/[0.08]',
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary/70" />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0 transition-colors duration-150',
                      isActive ? 'text-primary' : 'text-muted-foreground/50',
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs truncate font-medium leading-snug',
                      isActive ? 'text-foreground' : 'text-foreground/70',
                    )}
                  >
                    {session.title}
                  </span>
                </div>

                {/* Delete button — visible on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all duration-150 flex-shrink-0',
                    'text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10',
                  )}
                  title="Delete session"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {lastMsg && (
                <p className="text-[11px] text-muted-foreground/50 truncate mt-1 pl-[1.375rem] leading-snug">
                  {lastMsg.content.slice(0, 58)}
                </p>
              )}

              <div className="flex items-center gap-1.5 mt-1.5 pl-[1.375rem]">
                <span className="text-[10px] text-muted-foreground/35 font-medium">
                  {msgCount} msg{msgCount !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] text-muted-foreground/25">·</span>
                <span className="text-[10px] text-muted-foreground/35">
                  {new Date(session.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status footer */}
      <div className="px-4 py-3.5 border-t border-white/[0.06] space-y-1">
        <div className={cn(
          'flex items-center gap-2 text-xs font-medium',
          isConnected ? 'text-emerald-400' : 'text-red-400/80',
        )}>
          {isConnected
            ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            : <AlertCircle  className="h-3.5 w-3.5 flex-shrink-0" />}
          <span>{isConnected ? 'Runtime Connected' : 'Runtime Disconnected'}</span>
          {!isConnected && (
            <button
              onClick={onRetryHealth}
              className="ml-auto text-[10px] text-muted-foreground/60 underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Retry
            </button>
          )}
        </div>
        {health?.singularity?.uptime != null && (
          <p className="text-[10px] text-muted-foreground/30 pl-5">
            Uptime: {Math.floor(health.singularity.uptime / 3600)}h{' '}
            {Math.floor((health.singularity.uptime % 3600) / 60)}m
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatPanel — main export
// ─────────────────────────────────────────────────────────────────────────────
export function ChatPanel() {
  const [sessions, setSessions]               = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput]                     = useState('');
  const [isLoading, setIsLoading]             = useState(false);
  const [health, setHealth]                   = useState<HealthStatus | null>(null);
  const [historyOpen, setHistoryOpen]         = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const loaded = loadSessions();
    if (loaded.length > 0) {
      setSessions(loaded);
      setActiveSessionId(loaded[0].id);
    } else {
      const first = createSession();
      setSessions([first]);
      setActiveSessionId(first.id);
    }
  }, []);

  useEffect(() => {
    checkHealth().then(setHealth);
    const interval = setInterval(() => checkHealth().then(setHealth), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (sessions.length > 0) saveSessions(sessions);
  }, [sessions]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages      = activeSession?.messages ?? [];
  const isConnected   = health?.status === 'connected';

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fresh = createSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (id === activeSessionId) setActiveSessionId(filtered[0].id);
      return filtered;
    });
  }, [activeSessionId]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const authToken = apiClient.getToken();
    if (!authToken) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        const updated = { ...s, messages: [...s.messages, userMsg] };
        if (s.messages.length === 0) updated.title = generateTitle(trimmed);
        return updated;
      }),
    );
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const result = await sendMessage(trimmed, activeSessionId, authToken);
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: result.response,
        timestamp: Date.now(),
        durationMs: result.durationMs,
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s,
        ),
      );
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ ${err instanceof Error ? err.message : 'Failed to reach Singularity'}`,
        timestamp: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s,
        ),
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [input, isLoading, activeSessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = e.target as HTMLTextAreaElement;
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, 144)}px`;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/*
        Root container: flex-row, full viewport height minus the app top-bar (4rem).
        Chat column on the LEFT, collapsible history panel on the RIGHT.
      */}
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">

        {/* ══════════════════════════════════════════════════════════════════
            MAIN CHAT COLUMN
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-1 flex-col min-w-0 relative">

          {/* ── Top header bar ── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-card/70 backdrop-blur-xl z-10 flex-shrink-0">
            {/* Left: brand */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/35 via-primary/15 to-transparent border border-primary/25 flex items-center justify-center shadow-lg shadow-primary/10">
                  <Sparkles className="h-4.5 w-4.5 text-primary" style={{ height: '1.125rem', width: '1.125rem' }} />
                </div>
                {/* Online dot */}
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-card',
                    isConnected
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/60'
                      : 'bg-red-500',
                  )}
                  style={isConnected ? { animation: 'sg-glow-pulse 3s ease-in-out infinite' } : undefined}
                />
              </div>

              <div>
                <h1 className="text-sm font-semibold text-foreground tracking-tight leading-tight">
                  Singularity
                </h1>
                <p className="text-[11px] text-muted-foreground/70 leading-tight">
                  {isConnected ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Online · Autonomous Runtime
                    </span>
                  ) : (
                    <span className="text-red-400/70">Disconnected</span>
                  )}
                </p>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5">
              {/* New chat */}
              <button
                onClick={handleNewSession}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
                  'border border-white/[0.08] hover:border-primary/35',
                  'bg-white/[0.03] hover:bg-primary/[0.08] text-foreground/80 hover:text-foreground',
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                New Chat
              </button>

              {/* History toggle button — chevron rotates with state */}
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-xs font-medium',
                  historyOpen
                    ? 'bg-primary/[0.10] border border-primary/25 text-primary'
                    : 'bg-white/[0.03] border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]',
                )}
                title={historyOpen ? 'Collapse history' : 'Show history'}
              >
                <History className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">History</span>
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-300',
                    historyOpen ? 'rotate-0' : 'rotate-180',
                  )}
                />
              </button>
            </div>
          </div>

          {/* ── Message thread / welcome ── */}
          <div className="flex-1 overflow-y-auto sg-scrollbar">
            {messages.length === 0 ? (
              <WelcomeState onSuggest={setInput} inputRef={inputRef} />
            ) : (
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                {messages.map((msg, i) => (
                  <div
                    key={msg.id}
                    className="sg-msg-appear"
                    style={{ animationDelay: `${Math.min(i * 0.03, 0.2)}s` }}
                  >
                    <MessageBubble msg={msg} />
                  </div>
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}
          </div>

          {/* ── Input area ── */}
          <div className="border-t border-white/[0.07] bg-card/70 backdrop-blur-xl px-4 py-3 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              {/* Composer box */}
              <div
                className={cn(
                  'relative flex items-end gap-2 rounded-2xl border p-2 transition-all duration-200',
                  'bg-white/[0.03] border-white/[0.08]',
                  'focus-within:border-primary/40 focus-within:bg-primary/[0.03]',
                  'focus-within:shadow-lg focus-within:shadow-primary/[0.08]',
                )}
              >
                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={handleTextareaInput}
                  placeholder="Message Singularity…"
                  rows={1}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground',
                    'focus:outline-none placeholder:text-muted-foreground/40',
                    'max-h-36 overflow-y-auto sg-scrollbar leading-relaxed',
                  )}
                  style={{ minHeight: '36px' }}
                />

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
                    input.trim() && !isLoading
                      ? [
                          'bg-primary text-primary-foreground',
                          'shadow-md shadow-primary/30',
                          'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5',
                          'active:translate-y-0 active:shadow-sm',
                        ].join(' ')
                      : 'bg-white/[0.04] text-muted-foreground/35 cursor-not-allowed',
                  )}
                  title="Send message (Enter)"
                >
                  {isLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send    className="h-4 w-4" />}
                </button>
              </div>

              {/* Hint */}
              <p className="text-[10px] text-muted-foreground/35 mt-1.5 text-center tracking-wide">
                Shift+Enter for new line · Singularity Runtime v1.0
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT HISTORY PANEL — collapsible via CSS transition
            Strategy: always render at w-72, clip to w-0 when closed.
            The inner div holds w-72 so content never reflows.
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            'flex-shrink-0 border-l border-white/[0.07]',
            'bg-gradient-to-b from-card/80 via-card/70 to-card/60 backdrop-blur-xl',
            'overflow-hidden transition-[width,opacity] duration-300 ease-in-out',
            historyOpen
              ? 'w-[17.5rem] opacity-100'
              : 'w-0 opacity-0 pointer-events-none',
          )}
          aria-hidden={!historyOpen}
        >
          {/* Fixed-width inner so content doesn't reflow during animation */}
          <div className="w-[17.5rem] h-full">
            <HistorySidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              health={health}
              onSelect={setActiveSessionId}
              onDelete={handleDeleteSession}
              onRetryHealth={() => checkHealth().then(setHealth)}
            />
          </div>
        </div>

      </div>
    </>
  );
}
