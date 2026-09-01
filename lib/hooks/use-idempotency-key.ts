"use client";

import { useCallback, useEffect, useRef } from "react";
import type { DependencyList } from "react";
import { createClientId } from "@/lib/utils/create-client-id";

function createIdempotencyKey() {
  return createClientId();
}

/**
 * 一次业务意图复用同一个幂等 key；关键输入变化时生成新 key。
 */
export function useIdempotencyKey(deps: DependencyList = []) {
  const keyRef = useRef<string>(createIdempotencyKey());

  const reset = useCallback(() => {
    keyRef.current = createIdempotencyKey();
    return keyRef.current;
  }, []);

  const getKey = useCallback(() => keyRef.current, []);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { getKey, reset };
}

export function createIdempotencyHeaders(key: string): HeadersInit {
  return { "Idempotency-Key": key };
}
