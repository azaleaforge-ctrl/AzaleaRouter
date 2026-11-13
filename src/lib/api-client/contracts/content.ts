import type { ApiResult, ISODateString, RequestOptions } from "../types";

export interface ContentArticleSummary {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  updatedAt: ISODateString;
  readingMinutes: number;
  demo: true;
}

export interface ContentArticle extends ContentArticleSummary {
  /** Plain paragraphs. Rendering/markdown belongs to the UI layer. */
  body: string[];
  relatedSlugs: string[];
}

export interface DocSection {
  slug: string;
  title: string;
  description: string;
  articles: ContentArticleSummary[];
}

export type ServiceStatus =
  | "operational"
  | "degraded"
  | "partial-outage"
  | "major-outage"
  | "maintenance"
  | "unknown";

export interface StatusComponent {
  id: string;
  name: string;
  status: ServiceStatus;
  description: string;
  updatedAt: ISODateString;
}

export interface StatusIncident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  startedAt: ISODateString;
  resolvedAt: ISODateString | null;
  summary: string;
}

export interface StatusSnapshot {
  overall: ServiceStatus;
  components: StatusComponent[];
  incidents: StatusIncident[];
  updatedAt: ISODateString;
  simulated: true;
}

export interface ChangelogEntry {
  version: string;
  date: ISODateString;
  title: string;
  changes: Array<{
    type: "added" | "fixed" | "changed" | "security";
    text: string;
  }>;
  demo: true;
}

export interface ContentService {
  listDocs(options?: RequestOptions): Promise<ApiResult<DocSection[]>>;
  getDoc(
    slug: string,
    options?: RequestOptions,
  ): Promise<ApiResult<ContentArticle>>;
  listHelp(options?: RequestOptions): Promise<ApiResult<ContentArticleSummary[]>>;
  getHelpArticle(
    slug: string,
    options?: RequestOptions,
  ): Promise<ApiResult<ContentArticle>>;
  listBlog(options?: RequestOptions): Promise<ApiResult<ContentArticleSummary[]>>;
  getBlogPost(
    slug: string,
    options?: RequestOptions,
  ): Promise<ApiResult<ContentArticle>>;
  getStatus(options?: RequestOptions): Promise<ApiResult<StatusSnapshot>>;
  listChangelog(options?: RequestOptions): Promise<ApiResult<ChangelogEntry[]>>;
}
