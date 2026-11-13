"use client";

import Link from "next/link";
import { useState } from "react";
import type { ContentArticleSummary } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { TableWrap, Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/formatters";

type TabId = "blog" | "help" | "docs";

export function AdminContentClient() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("blog");
  const blog = useApiData(() => api.content.listBlog(), []);
  const help = useApiData(() => api.content.listHelp(), []);
  const docs = useApiData(() => api.content.listDocs(), []);

  const items: ContentArticleSummary[] =
    tab === "blog" ? (blog.data ?? []) : tab === "help" ? (help.data ?? []) : (docs.data ?? []).flatMap((s) => s.articles);
  const loading = tab === "blog" ? blog.loading : tab === "help" ? help.loading : docs.loading;
  const error = tab === "blog" ? blog.error : tab === "help" ? help.error : docs.error;
  const reload = tab === "blog" ? blog.reload : tab === "help" ? help.reload : docs.reload;

  function hrefFor(item: ContentArticleSummary): string {
    if (tab === "blog") return `/blog/${item.slug}`;
    if (tab === "help") return `/help/${item.slug}`;
    return "/docs";
  }

  return (
    <div>
      <PageHeader
        title="Content"
        description="Daftar konten publik demo. Manajemen konten admin memerlukan kontrak CMS — aksi edit hanya simulasi."
        actions={<DemoBadge label="Simulasi" />}
      >
        <Tabs
          ariaLabel="Jenis konten"
          tabs={[
            { id: "blog", label: "Blog" },
            { id: "help", label: "Help Center" },
            { id: "docs", label: "Docs" },
          ]}
          active={tab}
          onChange={(id) => setTab(id as TabId)}
          className="w-fit"
        />
      </PageHeader>

      <Card>
        {loading && items.length === 0 ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <CardContent>
            <ErrorState description={error} onRetry={reload} />
          </CardContent>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Belum ada konten demo.</p>
        ) : (
          <TableWrap>
            <Table caption="Konten publik demo">
              <THead>
                <TH>Judul</TH>
                <TH>Kategori</TH>
                <TH>Diperbarui</TH>
                <TH className="text-right">Aksi</TH>
              </THead>
              <TBody>
                {items.map((item) => (
                  <TR key={`${tab}-${item.slug}`}>
                    <TD className="max-w-72 truncate font-medium">{item.title}</TD>
                    <TD className="text-muted">{item.category}</TD>
                    <TD className="text-xs text-muted">{formatRelativeTime(item.updatedAt)}</TD>
                    <TD>
                      <div className="flex justify-end gap-1.5">
                        <Link
                          href={hrefFor(item)}
                          className="rounded-control px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Lihat
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toast({
                              title: "Simulasi",
                              description: "Manajemen konten admin memerlukan kontrak CMS (gap tercatat).",
                              tone: "primary",
                            })
                          }
                        >
                          Edit (simulasi)
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <DemoNote className="mt-6">
        Konten yang tampil di halaman publik berasal dari content service demo — tidak ada CMS
        nyata di belakangnya.
      </DemoNote>
    </div>
  );
}
