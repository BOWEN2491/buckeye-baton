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
  const key = JSON.stringify([path, userId]);
  const [state, setState] = useState<{key: string; data?: T; error: string; loading: boolean}>({key, error: "", loading: true});
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setState(previous => ({key, data: previous.key === key ? previous.data : undefined, error: "", loading: true}));
    try {
      const value = await api<T>(path, userId);
      if (current === generation.current) setState({key, data: value, error: "", loading: false});
    } catch (e) {
      if (current === generation.current)
        setState(previous => ({key, data: previous.key === key ? previous.data : undefined, error: e instanceof Error ? e.message : "Unable to load.", loading: false}));
    }
  }, [path, userId, key]);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  // Hide previous resource synchronously, before effects run. A tab switch can
  // change the response type (Lesson[] -> Project[]) within the same component.
  const current = state.key === key ? state : {data: undefined, error: "", loading: true};
  return { ...current, reload };
}
export function readable(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (v) => v.toUpperCase());
}
