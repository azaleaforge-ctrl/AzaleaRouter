import type {
  CatalogFacets,
  CatalogListResult,
  CatalogQuery,
  CatalogSearchResult,
  CatalogService,
  ModelCategory,
  ModelCapability,
  ModelDetail,
  ModelSummary,
} from "@/lib/api-client/contracts/catalog";
import type { Page } from "@/lib/api-client/types";
import type { MockContext } from "../context";
import {
  DEMO_CATALOG_TOTAL,
  DEMO_MODELS,
  DEMO_MODEL_SUMMARIES,
} from "../fixtures/catalog";
import { paginate } from "../pagination";
import { fail, respond } from "../scenarios";

function priceValue(value: number | null): number {
  return value ?? Number.POSITIVE_INFINITY;
}

function filterModels(query: CatalogQuery): ModelSummary[] {
  const search = query.search?.trim().toLowerCase();

  return DEMO_MODEL_SUMMARIES.filter((model) => {
    if (
      search &&
      ![model.name, model.id, model.slug, model.developer.name].some((value) =>
        value.toLowerCase().includes(search),
      )
    ) {
      return false;
    }
    if (query.category && model.category !== query.category) {
      return false;
    }
    if (query.developerId && model.developer.id !== query.developerId) {
      return false;
    }
    if (query.capability && !model.capabilities.includes(query.capability)) {
      return false;
    }
    if (
      query.maxInputPrice !== undefined &&
      (model.pricing.inputPerMillion === null ||
        model.pricing.inputPerMillion > query.maxInputPrice)
    ) {
      return false;
    }
    if (
      query.maxOutputPrice !== undefined &&
      (model.pricing.outputPerMillion === null ||
        model.pricing.outputPerMillion > query.maxOutputPrice)
    ) {
      return false;
    }
    if (
      query.minContextWindow !== undefined &&
      (model.contextWindow === null ||
        model.contextWindow < query.minContextWindow)
    ) {
      return false;
    }
    if (query.status && model.status !== query.status) {
      return false;
    }
    if (query.onlyAvailable && model.status !== "available") {
      return false;
    }
    return true;
  });
}

function sortModels(
  items: ModelSummary[],
  sort: CatalogQuery["sort"] = "relevance",
): ModelSummary[] {
  const copy = [...items];

  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "id"));
    case "input-price":
      return copy.sort(
        (a, b) =>
          priceValue(a.pricing.inputPerMillion) -
          priceValue(b.pricing.inputPerMillion),
      );
    case "output-price":
      return copy.sort(
        (a, b) =>
          priceValue(a.pricing.outputPerMillion) -
          priceValue(b.pricing.outputPerMillion),
      );
    case "context-window":
      return copy.sort(
        (a, b) => (b.contextWindow ?? 0) - (a.contextWindow ?? 0),
      );
    case "popularity":
    case "relevance":
    default:
      return copy.sort((a, b) => a.popularityRank - b.popularityRank);
  }
}

function buildFacets(): CatalogFacets {
  const categories = new Map<ModelCategory, number>();
  const developers = new Map<string, { name: string; count: number }>();
  const capabilities = new Map<ModelCapability, number>();

  for (const model of DEMO_MODEL_SUMMARIES) {
    categories.set(model.category, (categories.get(model.category) ?? 0) + 1);
    const developer = developers.get(model.developer.id);
    developers.set(model.developer.id, {
      name: model.developer.name,
      count: (developer?.count ?? 0) + 1,
    });
    for (const capability of model.capabilities) {
      capabilities.set(capability, (capabilities.get(capability) ?? 0) + 1);
    }
  }

  return {
    categories: [...categories.entries()].map(([value, count]) => ({
      value,
      count,
    })),
    developers: [...developers.entries()].map(([id, value]) => ({
      id,
      name: value.name,
      count: value.count,
    })),
    capabilities: [...capabilities.entries()].map(([value, count]) => ({
      value,
      count,
    })),
  };
}

function emptyCatalog(query: CatalogQuery): CatalogListResult {
  const page: Page<ModelSummary> = paginate([], query);
  return {
    page,
    facets: { categories: [], developers: [], capabilities: [] },
    totalCatalogSize: 0,
    launchReady: false,
  };
}

function findModel(provider: string, model: string): ModelDetail | undefined {
  return DEMO_MODELS.find(
    (item) =>
      item.developer.id === provider &&
      (item.slug === model || item.id === `${provider}/${model}`),
  );
}

export function createCatalogService(ctx: MockContext): CatalogService {
  return {
    async list(query = {}, options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return emptyCatalog(query);
        }
        const filtered = sortModels(filterModels(query), query.sort);
        return {
          page: paginate(filtered, query),
          facets: buildFacets(),
          totalCatalogSize: DEMO_CATALOG_TOTAL,
          launchReady: false,
        };
      });
    },

    async featured(options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return [];
        }
        return sortModels([...DEMO_MODEL_SUMMARIES], "popularity").slice(0, 4);
      });
    },

    async getDetail(provider, model, options) {
      const scenario = options?.scenario ?? ctx.scenario;
      const found = findModel(provider, model);
      if (scenario === "empty" || !found) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, () => found);
    },

    async search(term, options) {
      return respond(ctx, options, (meta) => {
        const query = term.trim();
        if (meta.scenario === "empty" || !query) {
          return { query, items: [], total: 0 } satisfies CatalogSearchResult;
        }
        const matches = filterModels({ search: query });
        return {
          query,
          items: matches.slice(0, 8),
          total: matches.length,
        } satisfies CatalogSearchResult;
      });
    },
  };
}
