"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export async function api<T>(
  path: string,
  userId?: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-demo-user-id": userId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  if (!response.ok || value.error)
    throw new Error(
      value.error?.message || "Something went wrong. Please try again.",
    );
  return value.data as T;
}
export function useResource<T>(path: string, userId?: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const value = await api<T>(path, userId);
      if (current === generation.current) setData(value);
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : "Unable to load.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [path, userId]);
  useEffect(() => {
    setData(undefined);
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return { data, error, loading, reload };
}
export function readable(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (v) => v.toUpperCase());
}
