import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import type { z } from "zod";
import { inArray } from "drizzle-orm";
import DataLoader from "dataloader";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema, logger: true });

// initialize
const init = async () => {
  console.log("---- initialize ----");
  await db.delete(schema.users);
  await db.insert(schema.users).values([
    {
      name: "John Due",
      age: 25,
      id: 1,
    },
    {
      name: "Jane Due",
      age: 30,
      id: 2,
    },
  ]);
  await db.delete(schema.posts);
  await db.insert(schema.posts).values([
    {
      content: "Post-1",
      userId: 1,
      id: 1,
    },
    {
      content: "Post-2",
      userId: 1,
      id: 2,
    },
    {
      content: "Post-3",
      userId: 2,
      id: 3,
    },
  ]);
  console.log("---- initialize end ----");
};

const postBatch = async (
  keys: readonly z.infer<typeof schema.selectPostsSchema>["id"][],
) => {
  const results = await db.query.posts.findMany({
    where: inArray(schema.posts.userId, [...keys]),
  });
  return keys.map((id) => results.filter((v) => v.userId === id));
};

const postLoader = new DataLoader(postBatch);

init().then(() => {
  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
      type Query {
        hello: String
        users: [User]
      }

      type User {
        id: ID
        name: String
        age: Int
        posts: [Post]
      }

      type Post {
        id: ID
        content: String
      }
    `,
      resolvers: {
        Query: {
          hello: () => "Hello from Yoga!",
          users: () => db.query.users.findMany(),
        },
        User: {
          posts: async (parent: z.infer<typeof schema.selectUserSchema>) => {
            const result = await postLoader.load(parent.id);
            return result;
          },
        },
      },
    }),
  });

  const server = createServer(yoga);

  server.listen(4000, () => {
    console.info("Server is running on http://localhost:4000/graphql");
  });
});
