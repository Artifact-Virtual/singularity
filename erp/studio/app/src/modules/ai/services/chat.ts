/**
 * Singularity Chat Service
 * 
 * Handles communication between the ERP Studio frontend
 * and the Singularity runtime via the backend proxy.
 */

const API_BASE = '/api/ai';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  durationMs?: number;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  title: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  durationMs: number;
  error?: string;
}

export interface HealthStatus {
  status: 'connected' | 'unconfigured' | 'error' | 'unreachable';
  singularity?: {
    status: string;
    uptime: number;
    totalRequests: number;
  };
  message?: string;
}

/**
 * Send a message to Singularity and get a response.
 */
export async function sendMessage(
  message: string,
  sessionId: string,
  token: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Check Singularity API health.
 */
export async function checkHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) {
      return { status: 'error' };
    }
    return response.json();
  } catch {
    return { status: 'unreachable' };
  }
}

/**
 * Generate a unique message ID.
 */
export function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new chat session.
 */
export function createSession(): ChatSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    messages: [],
    createdAt: Date.now(),
    title: 'New Chat',
  };
}

/**
 * Generate a title from the first message.
 */
export function generateTitle(message: string): string {
  const clean = message.trim();
  if (clean.length <= 50) return clean;
  return clean.slice(0, 47) + '...';
}

/**
 * Load sessions from localStorage.
 */
export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem('singularity-sessions');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save sessions to localStorage.
 */
export function saveSessions(sessions: ChatSession[]): void {
  // Keep only last 50 sessions
  const trimmed = sessions.slice(0, 50);
  localStorage.setItem('singularity-sessions', JSON.stringify(trimmed));
}
