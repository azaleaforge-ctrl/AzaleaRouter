import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Keep client generation possible without production credentials.
  // Migration commands fail closed when DATABASE_URL is absent or invalid.
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
