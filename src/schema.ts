import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
});

export const selectUserSchema = createSelectSchema(users);

export const insertUserSchema = createInsertSchema(users);

export const updateUserSchema = insertUserSchema.omit({
  id: true,
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey().notNull(),
  content: text("content").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const selectPostSchema = createSelectSchema(posts);

export const insertPostSchema = createInsertSchema(posts).omit({ id: true });

export const updatePostSchema = insertPostSchema;

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));
