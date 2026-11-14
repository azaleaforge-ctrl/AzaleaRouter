import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { validateDatabaseUrl } from "./database-url.js";

export type DatabaseClient = PrismaClient;

export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  const connectionString = validateDatabaseUrl(databaseUrl);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
