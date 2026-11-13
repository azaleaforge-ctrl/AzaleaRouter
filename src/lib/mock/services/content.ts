import type { ContentService } from "@/lib/api-client/contracts/content";
import type { MockContext } from "../context";
import {
  DEMO_BLOG_POSTS,
  DEMO_CHANGELOG,
  DEMO_DOC_ARTICLES,
  DEMO_DOC_SECTIONS,
  DEMO_HELP_ARTICLES,
  DEMO_STATUS,
  toArticleSummary,
} from "../fixtures/content";
import { fail, respond } from "../scenarios";

export function createContentService(ctx: MockContext): ContentService {
  return {
    async listDocs(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty" ? [] : [...DEMO_DOC_SECTIONS],
      );
    },

    async getDoc(slug, options) {
      const scenario = options?.scenario ?? ctx.scenario;
      const article = DEMO_DOC_ARTICLES.find((item) => item.slug === slug);
      if (scenario === "empty" || !article) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, () => article);
    },

    async listHelp(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty"
          ? []
          : DEMO_HELP_ARTICLES.map(toArticleSummary),
      );
    },

    async getHelpArticle(slug, options) {
      const scenario = options?.scenario ?? ctx.scenario;
      const article = DEMO_HELP_ARTICLES.find((item) => item.slug === slug);
      if (scenario === "empty" || !article) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, () => article);
    },

    async listBlog(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty"
          ? []
          : DEMO_BLOG_POSTS.map(toArticleSummary),
      );
    },

    async getBlogPost(slug, options) {
      const scenario = options?.scenario ?? ctx.scenario;
      const article = DEMO_BLOG_POSTS.find((item) => item.slug === slug);
      if (scenario === "empty" || !article) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, () => article);
    },

    async getStatus(options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return {
            overall: "unknown" as const,
            components: [],
            incidents: [],
            updatedAt: meta.generatedAt,
            simulated: true as const,
          };
        }
        return { ...DEMO_STATUS, updatedAt: meta.generatedAt };
      });
    },

    async listChangelog(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty" ? [] : [...DEMO_CHANGELOG],
      );
    },
  };
}
