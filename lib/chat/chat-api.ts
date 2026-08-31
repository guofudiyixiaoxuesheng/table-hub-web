import { API_BASE_URL, apiFetch, refreshSession } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token-store";

export type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  messageType?: "text" | "image" | "file" | "action_card" | "system_event" | "tool_call" | "tool_result";
  content: string;
  metadata?: Record<string, unknown>;
};

export type ChatResponse = {
  threadId: string;
  scene: string;
  intent?: string;
  intentConfidence?: number;
  intentReason?: string;
  rawScene?: string;
  rawIntent?: string;
  answer: string;
  nextAction: string;
  citations: Record<string, unknown>[];
};

export type ChatStreamMode = "updates" | "values";

export type ChatStreamEvent =
  | { event: "session"; data: { threadId: string; streamMode: ChatStreamMode } }
  | { event: "delta"; data: { delta: string } }
  | { event: "custom"; data: Record<string, unknown> }
  | { event: "update" | "state"; data: Record<string, unknown> }
  | { event: "answer"; data: ChatResponse }
  | { event: "done"; data: { threadId: string } }
  | { event: "error"; data: { message: string } };

export type ChatSessionSummary = {
  id: string;
  threadId: string;
  title: string;
  scene?: string | null;
  updatedAt: string;
  createdAt: string;
};

export type ChatSessionMessages = {
  threadId: string;
  title: string;
  messages: Array<ChatMessage & { id: string; createdAt: string }>;
};

const GUEST_ID_KEY = "tablehub_guest_id";

export function getGuestId() {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const next = `guest-${crypto.randomUUID()}`;
  window.localStorage.setItem(GUEST_ID_KEY, next);
  return next;
}

function withGuestId(path: string, guestId?: string | null) {
  if (!guestId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}guestId=${encodeURIComponent(guestId)}`;
}

export function sendChatMessage(message: string, threadId?: string | null, guestId?: string | null) {
  return apiFetch<ChatResponse>("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, guestId, message }),
  });
}

function parseSseBlock(block: string): ChatStreamEvent | null {
  const lines = block.split("\n");
  const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!event || !data) return null;
  return { event, data: JSON.parse(data) } as ChatStreamEvent;
}

export async function streamChatMessage(
  message: string,
  options: {
    threadId?: string | null;
    guestId?: string | null;
    streamMode?: ChatStreamMode;
    onEvent?: (event: ChatStreamEvent) => void;
  } = {},
  retry = true,
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      threadId: options.threadId,
      guestId: options.guestId,
      message,
      streamMode: options.streamMode ?? "updates",
    }),
  });
  if (response.status === 401 && retry) {
    await refreshSession();
    return streamChatMessage(message, options, false);
  }
  if (!response.ok || !response.body) throw new Error(`流式对话请求失败：HTTP ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer: ChatResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const item = parseSseBlock(block.trim());
      if (!item) continue;
      if (item.event === "error") throw new Error(item.data.message || "流式对话失败");
      if (item.event === "answer") answer = item.data;
      options.onEvent?.(item);
    }
    if (done) break;
  }
  const tail = parseSseBlock(buffer.trim());
  if (tail) {
    if (tail.event === "error") throw new Error(tail.data.message || "流式对话失败");
    if (tail.event === "answer") answer = tail.data;
    options.onEvent?.(tail);
  }
  if (!answer) throw new Error("流式对话接口返回异常：缺少 answer");
  return answer;
}

export function listChatSessions(guestId?: string | null) {
  return apiFetch<ChatSessionSummary[]>(withGuestId("/api/v1/chat/sessions", guestId));
}

export function getChatSessionMessages(threadId: string, guestId?: string | null) {
  return apiFetch<ChatSessionMessages>(withGuestId(`/api/v1/chat/sessions/${threadId}/messages`, guestId));
}

export function deleteChatSession(threadId: string, guestId?: string | null) {
  return apiFetch<void>(withGuestId(`/api/v1/chat/sessions/${threadId}`, guestId), { method: "DELETE" });
}
