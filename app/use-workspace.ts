"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ItemKind, WorkspaceItem } from "../lib/workspace";

type CreateInput = Pick<WorkspaceItem, "kind" | "title"> & { data?: Record<string, unknown> };

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "操作失败，请稍后重试");
  return body;
}

function ensureVisitorCookie() {
  if (typeof document === "undefined") return;
  if (document.cookie.split(";").some((part) => part.trim().startsWith("careeros_visitor="))) return;
  const visitorId = crypto.randomUUID();
  document.cookie = `careeros_visitor=${visitorId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
}

export function useWorkspace() {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const body = await readJson<{ items: WorkspaceItem[] }>(await fetch("/api/items", { cache: "no-store" }));
      setItems(body.items);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法读取工作台数据");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureVisitorCookie();
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void refresh();
    });
    return () => controller.abort();
  }, [refresh]);

  const createItem = useCallback(async (input: CreateInput) => {
    const body = await readJson<{ item: WorkspaceItem }>(await fetch("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }));
    setItems((current) => [body.item, ...current]);
    return body.item;
  }, []);

  const updateItem = useCallback(async (id: string, patch: { title?: string; data?: Record<string, unknown> }) => {
    const body = await readJson<{ item: WorkspaceItem }>(await fetch(`/api/items/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
    setItems((current) => current.map((item) => item.id === id ? body.item : item));
    return body.item;
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json() as { error?: string };
      throw new Error(body.error || "删除失败");
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const form = new FormData();
    form.set("file", file);
    return readJson<{ key: string; name: string; size: number; type: string }>(await fetch("/api/files", { method: "POST", body: form }));
  }, []);

  const byKind = useMemo(() => {
    const groups = new Map<ItemKind, WorkspaceItem[]>();
    for (const item of items) groups.set(item.kind, [...(groups.get(item.kind) || []), item]);
    return groups;
  }, [items]);

  return { items, byKind, loading, error, refresh, createItem, updateItem, removeItem, uploadFile };
}
