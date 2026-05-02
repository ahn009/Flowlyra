import { create } from "zustand";

export interface AgentPresence {
  userId: string;
  status: string;
}

interface AgentState {
  onlineAgents: Record<string, AgentPresence>;
  myStatus: string;
  setStatus: (status: string) => void;
  setPresence: (userId: string, status: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  onlineAgents: {},
  myStatus: "offline",
  setStatus: (status) => set({ myStatus: status }),
  setPresence: (userId, status) => set((state) => ({ onlineAgents: { ...state.onlineAgents, [userId]: { userId, status } } }))
}));
