export type ItemKind = "task" | "job" | "knowledge" | "resource" | "thought";

export type WorkspaceItem = {
  id: string;
  kind: ItemKind;
  title: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
