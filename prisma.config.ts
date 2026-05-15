// Loads env from .env.local first (matches Next.js), then falls back to .env.
// dotenv does not override values already in process.env, so .env.local wins.
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
