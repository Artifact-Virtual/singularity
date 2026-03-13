/**
 * File System Service
 * Provides access to workspace files and directories via backend API
 */

export type FileInfo = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  extension?: string;
};

export type ProjectInfo = {
  name: string;
  path: string;
  type: 'node' | 'python' | 'unknown';
  packageJson?: Record<string, unknown>;
  gitInfo?: {
    branch: string;
    remote?: string;
    status: string;
  };
};

class FileSystemService {
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  // Subscribe to file changes
  subscribe(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  // Emit events to listeners
  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  async listDirectory(path: string): Promise<FileInfo[]> {
    try {
      const response = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  }

  async readFile(path: string): Promise<string> {
    try {
      const response = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
      if (!response.ok) return '';
      return response.text();
    } catch {
      return '';
    }
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    try {
      const response = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getProjects(): Promise<ProjectInfo[]> {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  }
}

export const fileSystem = new FileSystemService();
