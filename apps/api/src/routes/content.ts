import { Router } from "express";
import { z } from "zod";
import type { DatabaseClient } from "@azalea-router/database";
import { HttpError } from "../lib/http-error.js";

const contentTypes = ["docs", "help", "blog", "status", "changelog"] as const;

export function createContentRouter(database: DatabaseClient): Router {
  const router = Router();

  router.get("/content/:type", async (req, res) => {
    const type = z.enum(contentTypes).parse(req.params.type);
    const query = z.object({
      locale: z.string().min(2).max(16).default("id-ID"),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }).strict().parse(req.query);
    const now = new Date();
    const rows = await database.contentEntry.findMany({
      where: {
        type: type.toUpperCase() as never,
        status: "PUBLISHED",
        locale: query.locale,
        publishedAt: { not: null, lte: now },
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true, type: true, slug: true, locale: true, title: true,
        summary: true, tags: true, publishedAt: true, updatedAt: true,
      },
    });
    const more = rows.length > query.limit;
    const page = more ? rows.slice(0, query.limit) : rows;
    res.status(200).json({
      data: page.map((entry) => ({
        id: entry.id,
        type: entry.type.toLowerCase(),
        slug: entry.slug,
        locale: entry.locale,
        title: entry.title,
        summary: entry.summary,
        tags: entry.tags,
        published_at: entry.publishedAt?.toISOString() ?? null,
        updated_at: entry.updatedAt.toISOString(),
      })),
      next_cursor: more ? page.at(-1)?.id ?? null : null,
    });
  });

  router.get("/content/:type/:slug", async (req, res) => {
    const type = z.enum(contentTypes).parse(req.params.type);
    const slug = z.string().min(1).max(180).parse(req.params.slug);
    const locale = z.string().min(2).max(16).default("id-ID").parse(req.query.locale);
    const now = new Date();
    const entry = await database.contentEntry.findFirst({
      where: {
        type: type.toUpperCase() as never,
        slug,
        locale,
        status: "PUBLISHED",
        publishedAt: { not: null, lte: now },
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      select: {
        id: true, type: true, slug: true, locale: true, title: true,
        summary: true, bodyMarkdown: true, tags: true, publishedAt: true,
        updatedAt: true,
      },
    });
    if (!entry) throw new HttpError(404, "CONTENT_NOT_FOUND", "Published content was not found.");
    res.status(200).json({
      entry: {
        id: entry.id,
        type: entry.type.toLowerCase(),
        slug: entry.slug,
        locale: entry.locale,
        title: entry.title,
        summary: entry.summary,
        body_markdown: entry.bodyMarkdown,
        tags: entry.tags,
        published_at: entry.publishedAt?.toISOString() ?? null,
        updated_at: entry.updatedAt.toISOString(),
      },
    });
  });

  return router;
}
