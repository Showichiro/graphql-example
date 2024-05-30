import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
});

export const selectUserSchema = createSelectSchema(users);

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey().notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull(),
});

export const selectPostsSchema = createSelectSchema(posts);

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));
