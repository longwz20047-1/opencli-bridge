import { create } from 'zustand';
import { bridgeInvoke } from '../hooks/useBridge';

interface ServerState {
  id: string;
  name: string;
  wsUrl: string;
  status: 'connected' | 'disconnected' | 'connecting';
  paired: boolean;
  projects: Array<{ projectId: string; projectName: string }>;
}

interface ServerStore {
  servers: ServerState[];
  loading: boolean;
  fetchServers: () => Promise<void>;
  updateStatus: (serverId: string, status: ServerState['status']) => void;
}

export const useServerStore = create<ServerStore>((set) => ({
  servers: [],
  loading: true,
  fetchServers: async () => {
    set({ loading: true });
    try {
      const servers = await bridgeInvoke<ServerState[]>('servers:list');
      set({ servers, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  updateStatus: (serverId, status) => {
    set((state) => ({
      servers: state.servers.map(s => s.id === serverId ? { ...s, status } : s),
    }));
  },
}));
