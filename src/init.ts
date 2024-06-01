import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * initializer.
 *
 * This function initializes the database by deleting existing records
 * and inserting new predefined records for both users and posts tables.
 *
 * @param {BetterSQLite3Database<typeof schema>} db - The database connection instance.
 */
export const init = async (db: BetterSQLite3Database<typeof schema>) => {
  console.log("---- initialize ----");
  await db.delete(schema.users);
  await db.insert(schema.users).values([
    {
      name: "John Doe",
      age: 25,
      id: 1,
    },
    {
      name: "Jane Doe",
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
