const CURRENT_STORE_ID_KEY = "tablehub_current_store_id";

function normalizeStoreId(value?: string | null) {
  const next = value?.trim();
  return next || null;
}

export function getCurrentStoreId() {
  if (typeof window === "undefined") return null;
  return normalizeStoreId(window.localStorage.getItem(CURRENT_STORE_ID_KEY));
}

export function setCurrentStoreId(storeId?: string | null) {
  if (typeof window === "undefined") return;
  const next = normalizeStoreId(storeId);
  if (next) {
    window.localStorage.setItem(CURRENT_STORE_ID_KEY, next);
  } else {
    window.localStorage.removeItem(CURRENT_STORE_ID_KEY);
  }
}

export function initCurrentStoreIdFromUrl(search: string) {
  const params = new URLSearchParams(search);
  const storeId = normalizeStoreId(params.get("storeId"));
  if (storeId) setCurrentStoreId(storeId);
  return storeId ?? getCurrentStoreId();
}

export function appendCurrentStoreId(path: string) {
  const storeId = getCurrentStoreId();
  if (!storeId) return path;
  if (path.includes("storeId=")) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}storeId=${encodeURIComponent(storeId)}`;
}
