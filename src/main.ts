import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import DataLoader from "dataloader";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createSchema, createYoga } from "graphql-yoga";
import { init } from "./init";
import * as schema from "./schema";
import {
  type Resolvers,
  type UserNotFoundError,
  ErrorCode,
  type UpdateUserSuccess,
  type DeleteUserSuccess,
  type PostNotFoundError,
  type UpdatePostSuccess,
  type DeletePostSuccess,
  type User,
} from "./generated/graphql-types";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema, logger: true });

// post batch
const postBatch = async (keys: readonly User["id"][]) => {
  const results = await db.query.posts.findMany({
    where: inArray(schema.posts.userId, [...keys]),
  });
  return keys.map((id) => results.filter((v) => v.userId === id));
};

const postLoader = new DataLoader(postBatch);

// initialize
init(db).then(() => {
  const resolvers: Resolvers = {
    Query: {
      hello: () => "Hello from Yoga!",
      users: async () => {
        const result = await db.query.users.findMany();
        return result.map((r) => ({ ...r, posts: [] }));
      },
    },
    User: {
      posts: async (parent) => {
        const result = await postLoader.load(parent.id);
        return result;
      },
    },
    Mutation: {
      createUser: async (_, { data }) => {
        const result = await db.transaction(async (tx) => {
          const result = await tx.insert(schema.users).values(data).returning();
          return result[0];
        });
        return { __typename: "CreateUserSuccess", ...result };
      },
      updateUser: async (_, { data, id }) => {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, id),
        });
        if (!user) {
          return {
            __typename: "UserNotFoundError",
            code: ErrorCode.UserNotFound,
            message: "USER_NOT_FOUND",
            requestUserId: id,
          } satisfies UserNotFoundError;
        }
        const result = await db.transaction(async (tx) => {
          const result = await tx
            .update(schema.users)
            .set(data)
            .where(eq(schema.users.id, id))
            .returning();
          return result[0];
        });
        return {
          __typename: "UpdateUserSuccess",
          ...result,
        } satisfies UpdateUserSuccess;
      },
      deleteUser: async (_, { id }) => {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, id),
        });
        if (!user) {
          return {
            __typename: "UserNotFoundError",
            code: ErrorCode.UserNotFound,
            message: "USER_NOT_FOUND",
            requestUserId: id,
          } satisfies UserNotFoundError;
        }
        await db.transaction(async (tx) => {
          const result = await tx
            .delete(schema.users)
            .where(eq(schema.users.id, id));
          return result.changes;
        });
        return {
          __typename: "DeleteUserSuccess",
          id,
        } satisfies DeleteUserSuccess;
      },
      createPost: async (_, { data }) => {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, data.userId),
        });
        if (!user) {
          return {
            __typename: "UserNotFoundError",
            code: ErrorCode.UserNotFound,
            message: "USER_NOT_FOUND",
            requestUserId: data.userId,
          } satisfies UserNotFoundError;
        }
        const result = await db.transaction(async (tx) => {
          const result = await tx.insert(schema.posts).values(data).returning();
          return result[0];
        });
        return { __typename: "CreatePostSuccess", ...result };
      },
      updatePost: async (_, { id, data }) => {
        const post = await db.query.posts.findFirst({
          where: eq(schema.posts.id, id),
        });
        if (!post) {
          return {
            __typename: "PostNotFoundError",
            code: ErrorCode.PostNotFound,
            message: "POST_NOT_FOUND",
            requestPostId: id,
          } satisfies PostNotFoundError;
        }
        const result = await db.transaction(async (tx) => {
          const result = await tx
            .update(schema.posts)
            .set(data)
            .where(eq(schema.posts.id, id))
            .returning();
          return result[0];
        });
        return {
          __typename: "UpdatePostSuccess",
          ...result,
        } satisfies UpdatePostSuccess;
      },
      deletePost: async (_, { id }) => {
        const post = await db.query.posts.findFirst({
          where: eq(schema.posts.id, id),
        });
        if (!post) {
          return {
            __typename: "PostNotFoundError",
            code: ErrorCode.PostNotFound,
            message: "POST_NOT_FOUND",
            requestPostId: id,
          } satisfies PostNotFoundError;
        }
        await db.transaction(async (tx) => {
          const result = await tx
            .delete(schema.posts)
            .where(eq(schema.posts.id, id));
          return result.changes;
        });
        return {
          __typename: "DeletePostSuccess",
          id,
        } satisfies DeletePostSuccess;
      },
    },
  };

  const yoga = createYoga({
    schema: createSchema({
      typeDefs: readFileSync(join(__dirname, "schema.graphql"), "utf8"),
      resolvers,
    }),
  });

  const server = createServer(yoga);

  server.listen(4000, () => {
    console.info("Server is running on http://localhost:4000/graphql");
  });
});
