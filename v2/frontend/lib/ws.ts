/**
 * WebSocket client with automatic reconnect + event routing.
 */
import { useStore } from "./store";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 1000;

export function connectWS(tenantId: string, apiKey?: string): void {
  const { setWsStatus, addEvent, updateWorkflow, updateAgent, setScreenshot } = useStore.getState();

  const url = buildUrl(tenantId, apiKey);
  setWsStatus("connecting");

  ws = new WebSocket(url);

  ws.onopen = () => {
    retryDelay = 1000;
    setWsStatus("connected");
    console.info("[WS] Connected");
  };

  ws.onmessage = (ev) => {
    try {
      const event = JSON.parse(ev.data);
      if (event.type === "ping") return;

      addEvent(event);
      routeEvent(event, { updateWorkflow, updateAgent, setScreenshot });
    } catch (e) {
      console.warn("[WS] Parse error", e);
    }
  };

  ws.onclose = () => {
    setWsStatus("disconnected");
    scheduleReconnect(tenantId, apiKey);
  };

  ws.onerror = (e) => {
    console.warn("[WS] Error", e);
    ws?.close();
  };
}

function routeEvent(
  event: Record<string, unknown>,
  actions: {
    updateWorkflow: (id: string, patch: Record<string, unknown>) => void;
    updateAgent: (agentType: string, patch: Record<string, unknown>) => void;
    setScreenshot: (b64: string, url: string) => void;
  }
) {
  const { type, workflow_id, agent_id, data } = event as Record<string, unknown>;
  const d = (data ?? {}) as Record<string, unknown>;

  switch (type as string) {
    case "workflow.started":
      if (workflow_id)
        actions.updateWorkflow(workflow_id as string, { status: "running" });
      break;
    case "workflow.completed":
      if (workflow_id)
        actions.updateWorkflow(workflow_id as string, {
          status: "completed",
          result: d.result as string,
          duration_ms: d.duration_ms as number,
        });
      break;
    case "workflow.failed":
      if (workflow_id)
        actions.updateWorkflow(workflow_id as string, {
          status: "failed",
          error: d.error as string,
        });
      break;
    case "workflow.step.started":
    case "workflow.step.completed":
      // step updates handled by polling or step-level events
      break;
    case "agent.started":
      actions.updateAgent(d.agent_type as string, {
        status: "running",
        workflow_id: workflow_id as string,
      });
      break;
    case "agent.completed":
      actions.updateAgent(d.agent_type as string, {
        status: "completed",
        duration_ms: d.duration_ms as number,
      });
      break;
    case "agent.failed":
      actions.updateAgent(d.agent_type as string, { status: "failed" });
      break;
    case "browser.screenshot":
      if (d.image_b64)
        actions.setScreenshot(d.image_b64 as string, d.url as string);
      break;
    default:
      break;
  }
}

function buildUrl(tenantId: string, apiKey?: string): string {
  const host = process.env.NEXT_PUBLIC_API_HOST ?? "localhost:8000";
  const proto = host.startsWith("localhost") ? "ws" : "wss";
  const base = `${proto}://${host}/api/ws/${tenantId}`;
  return apiKey ? `${base}?api_key=${apiKey}` : base;
}

function scheduleReconnect(tenantId: string, apiKey?: string): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    retryDelay = Math.min(retryDelay * 2, 30000);
    connectWS(tenantId, apiKey);
  }, retryDelay);
}

export function sendMessage(payload: Record<string, unknown>): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function submitGoal(goal: string): void {
  sendMessage({ action: "submit", goal });
}

export function disconnectWS(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}
