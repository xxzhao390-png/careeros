import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const workspaceItems = sqliteTable(
  "workspace_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    data: text("data").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("workspace_items_user_kind_idx").on(table.userId, table.kind),
    index("workspace_items_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const uploadedFiles = sqliteTable(
  "uploaded_files",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    size: text("size").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("uploaded_files_object_key_unique").on(table.objectKey),
    index("uploaded_files_user_idx").on(table.userId),
  ],
);

export const aiRuns = sqliteTable(
  "ai_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull(),
    inputHash: text("input_hash").notNull(),
    result: text("result"),
    errorCode: text("error_code"),
    durationMs: text("duration_ms").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("ai_runs_user_created_idx").on(table.userId, table.createdAt)],
);
