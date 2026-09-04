import { apiFetch, apiFetchEnvelope } from "@/lib/api/client";

export type RagEvaluationStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type RagEvaluationJob = {
  id: string;
  storeId?: string | null;
  chatSessionId?: string | null;
  userId?: string | null;
  guestId?: string | null;
  traceId?: string | null;
  threadId?: string | null;
  scene: string;
  intent?: string | null;
  documentId?: string | null;
  documentName?: string | null;
  question: string;
  rewrittenQuery?: string | null;
  answer: string;
  contexts: Record<string, unknown>[];
  citations: Record<string, unknown>[];
  metrics: Record<string, unknown>;
  overallScore?: number | null;
  needsReview: boolean;
  judgeReason?: string | null;
  status: RagEvaluationStatus;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type RagEvaluationSummary = {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  needsReview: number;
  averageScore?: number | null;
};

export type RagEvaluationListResult = {
  items: RagEvaluationJob[];
  meta: { total: number; page: number; pageSize: number };
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function listRagEvaluations(params: {
  status?: RagEvaluationStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<RagEvaluationListResult> {
  const envelope = await apiFetchEnvelope<RagEvaluationJob[]>(
    `/api/v1/analytics/rag-evaluations${buildQuery(params)}`,
  );
  return {
    items: envelope.data,
    meta: {
      total: Number(envelope.meta?.total ?? 0),
      page: Number(envelope.meta?.page ?? params.page ?? 1),
      pageSize: Number(envelope.meta?.pageSize ?? params.pageSize ?? 20),
    },
  };
}

export function getRagEvaluationSummary() {
  return apiFetch<RagEvaluationSummary>("/api/v1/analytics/rag-evaluations/summary");
}

export function getRagEvaluation(id: string) {
  return apiFetch<RagEvaluationJob>(`/api/v1/analytics/rag-evaluations/${id}`);
}

export function runRagEvaluation(id: string) {
  return apiFetch<RagEvaluationJob>(`/api/v1/analytics/rag-evaluations/${id}/run`, { method: "POST" });
}
