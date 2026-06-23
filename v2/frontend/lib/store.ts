/**
 * Global app state via Zustand.
 * WorkflowStore + EventStore for real-time dashboard.
 */
import { create } from "zustand";

export type WorkflowStatus = "pending" | "running" | "completed" | "failed";

export interface WorkflowStep {
  index: number;
  agent_type: string;
  description: string;
  status: WorkflowStatus;
  result?: string;
  error?: string;
  duration_ms?: number;
}

export interface Workflow {
  id: string;
  goal: string;
  status: WorkflowStatus;
  result?: string;
  error?: string;
  duration_ms?: number;
  tokens_used: number;
  created_at: string;
  steps: WorkflowStep[];
}

export interface LiveEvent {
  id: string;
  type: string;
  tenant_id: string;
  workflow_id?: string;
  agent_id?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface AgentStatus {
  agent_type: string;
  status: "idle" | "running" | "completed" | "failed";
  workflow_id?: string;
  duration_ms?: number;
}

interface AppState {
  // Auth
  tenantId: string | null;
  accessToken: string | null;
  setAuth: (tenantId: string, token: string) => void;
  clearAuth: () => void;

  // Workflows
  workflows: Workflow[];
  activeWorkflow: Workflow | null;
  addWorkflow: (wf: Workflow) => void;
  updateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  setActiveWorkflow: (wf: Workflow | null) => void;

  // Live events
  events: LiveEvent[];
  addEvent: (ev: LiveEvent) => void;
  clearEvents: () => void;

  // Agent statuses
  agents: Record<string, AgentStatus>;
  updateAgent: (agentType: string, patch: Partial<AgentStatus>) => void;

  // Browser screenshots
  latestScreenshot: string | null;
  screenshotUrl: string | null;
  setScreenshot: (b64: string, url: string) => void;

  // WS connection
  wsStatus: "connecting" | "connected" | "disconnected";
  setWsStatus: (s: "connecting" | "connected" | "disconnected") => void;
}

export const useStore = create<AppState>((set, get) => ({
  tenantId: null,
  accessToken: null,
  setAuth: (tenantId, accessToken) => set({ tenantId, accessToken }),
  clearAuth: () => set({ tenantId: null, accessToken: null }),

  workflows: [],
  activeWorkflow: null,
  addWorkflow: (wf) => set((s) => ({ workflows: [wf, ...s.workflows].slice(0, 100) })),
  updateWorkflow: (id, patch) =>
    set((s) => ({
      workflows: s.workflows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      activeWorkflow:
        s.activeWorkflow?.id === id ? { ...s.activeWorkflow, ...patch } : s.activeWorkflow,
    })),
  setActiveWorkflow: (wf) => set({ activeWorkflow: wf }),

  events: [],
  addEvent: (ev) => set((s) => ({ events: [ev, ...s.events].slice(0, 500) })),
  clearEvents: () => set({ events: [] }),

  agents: {},
  updateAgent: (agentType, patch) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentType]: { ...s.agents[agentType], agent_type: agentType, ...patch },
      },
    })),

  latestScreenshot: null,
  screenshotUrl: null,
  setScreenshot: (b64, url) => set({ latestScreenshot: b64, screenshotUrl: url }),

  wsStatus: "disconnected",
  setWsStatus: (wsStatus) => set({ wsStatus }),
}));
