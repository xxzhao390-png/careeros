import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaceItems = sqliteTable(
  "workspace_items",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    data: text("data").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("workspace_items_kind_idx").on(table.kind),
    index("workspace_items_updated_idx").on(table.updatedAt),
  ],
);
