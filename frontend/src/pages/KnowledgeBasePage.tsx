import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { api } from "../lib/api";
import { PageHeader } from "../components/AgentLayout";
import {
  Button,
  Card,
  EmptyPanel,
  Field,
  PageShell,
  Pill,
  SelectInput,
  TextArea,
  TextInput,
} from "../components/ui";

interface KBCategory {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  position: number;
}

interface KBArticleSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category_id: string | null;
  locale: string;
  featured: boolean;
  status: string;
  published_at: string | null;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

interface KBArticle extends KBArticleSummary {
  body: string;
  body_format: string;
  internal_only: boolean;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  tags: string[];
  related_article_ids: { items: string[] };
  scheduled_publish_at: string | null;
  archived_at: string | null;
  author_user_id: string | null;
  translation_group_id: string;
  organization_id: string;
}

interface KBRevision {
  id: string;
  revision_number: number;
  title: string;
  body: string;
  change_summary: string | null;
  created_at: string;
}

interface KBAnalytics {
  total_articles: number;
  published_articles: number;
  draft_articles: number;
  archived_articles: number;
  total_views_30d: number;
  total_feedback_30d: number;
  helpful_ratio: number;
  top_viewed: Array<{ id: string; title: string; view_count: number }>;
  top_helpful: Array<{ id: string; title: string; helpful_count: number }>;
  top_unhelpful: Array<{ id: string; title: string; not_helpful_count: number }>;
}

const STATUS_OPTIONS = ["draft", "review", "scheduled", "published", "archived"] as const;

export function KnowledgeBasePage(): JSX.Element {
  const queryClient = useQueryClient();
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["kb-categories"],
    queryFn: async () => (await api.get<KBCategory[]>("/kb/categories")).data,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["kb-articles", { categoryFilter, statusFilter, searchTerm }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (categoryFilter) params.category_id = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.q = searchTerm;
      return (await api.get<KBArticleSummary[]>("/kb/articles", { params })).data;
    },
  });

  const { data: article } = useQuery({
    queryKey: ["kb-article", activeArticleId],
    enabled: !!activeArticleId,
    queryFn: async () => (await api.get<KBArticle>(`/kb/articles/${activeArticleId}`)).data,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ["kb-article-revisions", activeArticleId],
    enabled: !!activeArticleId,
    queryFn: async () => (await api.get<KBRevision[]>(`/kb/articles/${activeArticleId}/revisions`)).data,
  });

  const { data: analytics } = useQuery({
    queryKey: ["kb-analytics"],
    queryFn: async () => (await api.get<KBAnalytics>("/kb/analytics")).data,
  });

  const newArticle = useMutation({
    mutationFn: async () => api.post<KBArticle>("/kb/articles", { title: "Untitled article" }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      setActiveArticleId(res.data.id);
    },
  });

  const saveArticle = useMutation({
    mutationFn: async (patch: Partial<KBArticle> & { change_summary?: string }) => {
      if (!activeArticleId) return;
      await api.patch(`/kb/articles/${activeArticleId}`, patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kb-article", activeArticleId] });
      await queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      await queryClient.invalidateQueries({ queryKey: ["kb-article-revisions", activeArticleId] });
    },
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => api.delete(`/kb/articles/${id}`),
    onSuccess: async () => {
      setActiveArticleId(null);
      await queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
    },
  });

  const restoreRevision = useMutation({
    mutationFn: async (revisionId: string) =>
      api.post(`/kb/articles/${activeArticleId}/revisions/${revisionId}/restore`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kb-article", activeArticleId] });
      await queryClient.invalidateQueries({ queryKey: ["kb-article-revisions", activeArticleId] });
    },
  });

  const filtered = useMemo(() => articles, [articles]);

  return (
    <PageShell>
      <PageHeader
        title="Knowledge Base"
        action={
          <Button onClick={() => newArticle.mutate()} variant="primary">
            New article
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_360px] lg:gap-6 lg:p-6">
        <div className="space-y-4">
          <Card className="p-3">
            <Field label="Search">
              <TextInput
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Title or body"
              />
            </Field>
            <Field label="Category">
              <SelectInput value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </Card>
          <CategoryManager categories={categories} />
        </div>

        <Card className="p-0">
          {filtered.length === 0 ? (
            <EmptyPanel title="No articles" description="Create your first article to start your knowledge base." />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((row) => (
                <li
                  key={row.id}
                  onClick={() => setActiveArticleId(row.id)}
                  className={`cursor-pointer p-4 hover:bg-slate-50 dark:hover:bg-slate-900 ${
                    activeArticleId === row.id ? "bg-slate-50 dark:bg-slate-900" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{row.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">/{row.slug}</p>
                    </div>
                    <Pill tone={row.status === "published" ? "green" : row.status === "archived" ? "slate" : "yellow"}>
                      {row.status}
                    </Pill>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{row.view_count} views</span>
                    <span>
                      {row.helpful_count} 👍 / {row.not_helpful_count} 👎
                    </span>
                    {row.featured && <Pill tone="blue">featured</Pill>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          {analytics && (
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">KB analytics (30d)</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Articles</p>
                  <p className="font-semibold">
                    {analytics.published_articles} / {analytics.total_articles}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Views (30d)</p>
                  <p className="font-semibold">{analytics.total_views_30d}</p>
                </div>
                <div>
                  <p className="text-slate-500">Feedback</p>
                  <p className="font-semibold">{analytics.total_feedback_30d}</p>
                </div>
                <div>
                  <p className="text-slate-500">Helpful ratio</p>
                  <p className="font-semibold">{Math.round(analytics.helpful_ratio * 100)}%</p>
                </div>
              </div>
              {analytics.top_viewed.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Top viewed</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {analytics.top_viewed.slice(0, 5).map((row) => (
                      <li key={row.id} className="flex justify-between">
                        <span className="truncate">{row.title}</span>
                        <span>{row.view_count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
          {article && (
            <ArticleEditor
              key={article.id}
              article={article}
              categories={categories}
              onSave={(patch) => saveArticle.mutate(patch)}
              onDelete={() => deleteArticle.mutate(article.id)}
              revisions={revisions}
              onRestore={(id) => restoreRevision.mutate(id)}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}

function ArticleEditor(props: {
  article: KBArticle;
  categories: KBCategory[];
  onSave: (patch: Partial<KBArticle> & { change_summary?: string }) => void;
  onDelete: () => void;
  revisions: KBRevision[];
  onRestore: (id: string) => void;
}): JSX.Element {
  const { article, categories, onSave, onDelete, revisions, onRestore } = props;
  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug);
  const [summary, setSummary] = useState(article.summary ?? "");
  const [body, setBody] = useState(article.body);
  const [statusValue, setStatusValue] = useState(article.status);
  const [locale, setLocale] = useState(article.locale);
  const [categoryId, setCategoryId] = useState(article.category_id ?? "");
  const [featured, setFeatured] = useState(article.featured);
  const [internalOnly, setInternalOnly] = useState(article.internal_only);
  const [seoTitle, setSeoTitle] = useState(article.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(article.seo_description ?? "");
  const [ogImage, setOgImage] = useState(article.og_image ?? "");
  const [tagsText, setTagsText] = useState(article.tags.join(", "));
  const [scheduledPublishAt, setScheduledPublishAt] = useState(article.scheduled_publish_at ?? "");
  const [changeSummary, setChangeSummary] = useState("");

  return (
    <Card className="p-4 space-y-4">
      <Field label="Title">
        <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field label="Slug" hint="Auto-generated from title if blank">
        <TextInput value={slug} onChange={(event) => setSlug(event.target.value)} />
      </Field>
      <Field label="Summary">
        <TextArea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} />
      </Field>
      <Field label="Body (markdown)">
        <TextArea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={10}
          className="font-mono text-xs"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <SelectInput value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Locale">
          <TextInput value={locale} onChange={(event) => setLocale(event.target.value)} />
        </Field>
      </div>
      <Field label="Category">
        <SelectInput value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
          Featured
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={internalOnly}
            onChange={(event) => setInternalOnly(event.target.checked)}
          />
          Internal only
        </label>
      </div>
      <Field label="Tags (comma separated)">
        <TextInput value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
      </Field>
      <Field label="Scheduled publish at (ISO)">
        <TextInput
          value={scheduledPublishAt}
          onChange={(event) => setScheduledPublishAt(event.target.value)}
          placeholder="2026-05-20T09:00:00Z"
        />
      </Field>
      <details className="rounded border border-slate-200 dark:border-slate-800 p-2 text-sm">
        <summary className="cursor-pointer text-xs font-semibold uppercase text-slate-500">SEO</summary>
        <div className="mt-2 space-y-2">
          <Field label="SEO title">
            <TextInput value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
          </Field>
          <Field label="SEO description">
            <TextArea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} rows={2} />
          </Field>
          <Field label="OG image URL">
            <TextInput value={ogImage} onChange={(event) => setOgImage(event.target.value)} />
          </Field>
        </div>
      </details>
      <Field label="Change summary (for revision history)">
        <TextInput value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() =>
            onSave({
              title,
              slug: slug || undefined,
              summary,
              body,
              status: statusValue,
              locale,
              category_id: categoryId || null,
              featured,
              internal_only: internalOnly,
              seo_title: seoTitle || null,
              seo_description: seoDescription || null,
              og_image: ogImage || null,
              tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
              scheduled_publish_at: scheduledPublishAt || null,
              change_summary: changeSummary || undefined,
            } as Partial<KBArticle> & { change_summary?: string })
          }
        >
          Save
        </Button>
        <Button variant="ghost" onClick={onDelete}>
          Delete
        </Button>
      </div>
      {revisions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Revision history</p>
          <ul className="mt-2 space-y-1 text-xs">
            {revisions.slice(0, 10).map((rev) => (
              <li key={rev.id} className="flex items-center justify-between gap-2">
                <span>
                  r{rev.revision_number} — {rev.change_summary || "(no summary)"}
                </span>
                <button
                  className="text-xs text-indigo-600 hover:underline"
                  onClick={() => onRestore(rev.id)}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function CategoryManager({ categories }: { categories: KBCategory[] }): JSX.Element {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: async () => api.post("/kb/categories", { name }),
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["kb-categories"] });
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/kb/categories/${id}`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["kb-categories"] }),
  });
  return (
    <Card className="p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">Categories</p>
      <div className="mt-2 flex gap-2">
        <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="New category" />
        <Button onClick={() => name.trim() && create.mutate()} variant="secondary">
          Add
        </Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between">
            <span>{c.name}</span>
            <button
              className="text-xs text-rose-500 hover:underline"
              onClick={() => remove.mutate(c.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
