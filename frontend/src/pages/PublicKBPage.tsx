import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

interface PublicArticleSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  featured: boolean;
  locale: string;
  published_at: string | null;
  category_id: string | null;
}

interface PublicArticle extends PublicArticleSummary {
  body: string;
  body_format: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

interface PublicSearchHit {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  snippet: string | null;
  score: number;
}

export function PublicKBIndexPage(): JSX.Element {
  const { orgSlug = "" } = useParams<{ orgSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const categorySlug = searchParams.get("category") ?? "";
  const locale = searchParams.get("locale") ?? "";

  const categories = useQuery({
    queryKey: ["pub-kb-categories", orgSlug],
    queryFn: async () =>
      (await axios.get<PublicCategory[]>(`${baseURL}/public/kb/${orgSlug}/categories`)).data,
    enabled: !!orgSlug,
  });

  const articles = useQuery({
    queryKey: ["pub-kb-articles", orgSlug, categorySlug, locale],
    queryFn: async () =>
      (
        await axios.get<PublicArticleSummary[]>(`${baseURL}/public/kb/${orgSlug}/articles`, {
          params: {
            ...(categorySlug ? { category_slug: categorySlug } : {}),
            ...(locale ? { locale } : {}),
          },
        })
      ).data,
    enabled: !!orgSlug,
  });

  const search = useQuery({
    queryKey: ["pub-kb-search", orgSlug, q, locale],
    queryFn: async () =>
      (
        await axios.get<PublicSearchHit[]>(`${baseURL}/public/kb/${orgSlug}/search`, {
          params: { q, ...(locale ? { locale } : {}) },
        })
      ).data,
    enabled: !!orgSlug && q.length > 0,
  });

  const featured = useMemo(() => (articles.data ?? []).filter((a) => a.featured), [articles.data]);
  const others = useMemo(() => (articles.data ?? []).filter((a) => !a.featured), [articles.data]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <Link to={`/kb/${orgSlug}`} className="text-lg font-semibold">
            Help Center
          </Link>
          <input
            value={q}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              const v = event.target.value;
              if (v) next.set("q", v);
              else next.delete("q");
              setSearchParams(next);
            }}
            placeholder="Search articles…"
            className="w-72 rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {q ? (
          <>
            <h2 className="text-xl font-semibold">Search results for "{q}"</h2>
            <ul className="mt-4 space-y-3">
              {(search.data ?? []).map((row) => (
                <li key={row.id} className="rounded border border-slate-200 p-4 dark:border-slate-800">
                  <Link
                    to={`/kb/${orgSlug}/${row.slug}${locale ? `?locale=${locale}` : ""}`}
                    className="text-base font-semibold text-indigo-600 hover:underline"
                  >
                    {row.title}
                  </Link>
                  {row.snippet && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.snippet}</p>}
                </li>
              ))}
              {search.data?.length === 0 && <p className="text-sm text-slate-500">No results.</p>}
            </ul>
          </>
        ) : (
          <>
            {featured.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase text-slate-500">Featured</h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {featured.map((row) => (
                    <li key={row.id} className="rounded border border-slate-200 p-4 dark:border-slate-800">
                      <Link
                        to={`/kb/${orgSlug}/${row.slug}`}
                        className="text-base font-semibold text-indigo-600 hover:underline"
                      >
                        {row.title}
                      </Link>
                      {row.summary && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.summary}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase text-slate-500">Browse</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={`rounded-full border px-3 py-1 text-xs ${categorySlug === "" ? "border-indigo-500 text-indigo-600" : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("category");
                    setSearchParams(next);
                  }}
                >
                  All
                </button>
                {(categories.data ?? []).map((cat) => (
                  <button
                    key={cat.id}
                    className={`rounded-full border px-3 py-1 text-xs ${categorySlug === cat.slug ? "border-indigo-500 text-indigo-600" : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.set("category", cat.slug);
                      setSearchParams(next);
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {others.map((row) => (
                  <li key={row.id}>
                    <Link
                      to={`/kb/${orgSlug}/${row.slug}`}
                      className="text-base font-semibold text-indigo-600 hover:underline"
                    >
                      {row.title}
                    </Link>
                    {row.summary && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">{row.summary}</p>
                    )}
                  </li>
                ))}
                {!others.length && !featured.length && (
                  <p className="text-sm text-slate-500">No articles published yet.</p>
                )}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export function PublicKBArticlePage(): JSX.Element {
  const { orgSlug = "", slug = "" } = useParams<{ orgSlug: string; slug: string }>();
  const [searchParams] = useSearchParams();
  const locale = searchParams.get("locale") ?? "en";
  const [feedbackSent, setFeedbackSent] = useState<"helpful" | "not_helpful" | null>(null);
  const [comment, setComment] = useState("");

  const article = useQuery({
    queryKey: ["pub-kb-article", orgSlug, slug, locale],
    queryFn: async () =>
      (
        await axios.get<PublicArticle>(`${baseURL}/public/kb/${orgSlug}/articles/${slug}`, {
          params: { locale, session_id: getOrCreateSession() },
        })
      ).data,
    enabled: !!orgSlug && !!slug,
  });

  const related = useQuery({
    queryKey: ["pub-kb-related", orgSlug, slug, locale],
    queryFn: async () =>
      (
        await axios.get<PublicArticleSummary[]>(
          `${baseURL}/public/kb/${orgSlug}/articles/${slug}/related`,
          { params: { locale } },
        )
      ).data,
    enabled: !!orgSlug && !!slug,
  });

  useEffect(() => {
    if (article.data?.seo_title) document.title = article.data.seo_title;
    else if (article.data?.title) document.title = article.data.title;
  }, [article.data?.seo_title, article.data?.title]);

  if (!article.data) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        {article.isLoading ? "Loading…" : "Article not found"}
      </div>
    );
  }

  async function submitFeedback(helpful: boolean): Promise<void> {
    if (!article.data) return;
    try {
      await axios.post(`${baseURL}/public/kb/${orgSlug}/articles/${article.data.id}/feedback`, {
        helpful,
        comment: comment || null,
        visitor_session_id: getOrCreateSession(),
      });
      setFeedbackSent(helpful ? "helpful" : "not_helpful");
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <Link to={`/kb/${orgSlug}`} className="text-sm font-semibold text-indigo-600 hover:underline">
            ← Help Center
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <article>
          <h1 className="text-3xl font-bold">{article.data.title}</h1>
          {article.data.summary && (
            <p className="mt-2 text-slate-600 dark:text-slate-300">{article.data.summary}</p>
          )}
          <div
            className="prose prose-slate mt-6 max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderBody(article.data.body, article.data.body_format) }}
          />
        </article>

        <section className="mt-10 rounded border border-slate-200 p-4 dark:border-slate-800">
          {feedbackSent ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Thanks for your feedback!</p>
          ) : (
            <>
              <p className="text-sm font-semibold">Was this article helpful?</p>
              <textarea
                rows={2}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Optional comment…"
                className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  onClick={() => submitFeedback(true)}
                >
                  👍 Yes
                </button>
                <button
                  className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  onClick={() => submitFeedback(false)}
                >
                  👎 No
                </button>
              </div>
            </>
          )}
        </section>

        {(related.data ?? []).length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase text-slate-500">Related articles</h2>
            <ul className="mt-3 space-y-2">
              {(related.data ?? []).map((row) => (
                <li key={row.id}>
                  <Link
                    to={`/kb/${orgSlug}/${row.slug}`}
                    className="text-base font-semibold text-indigo-600 hover:underline"
                  >
                    {row.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function getOrCreateSession(): string {
  const key = "flowlyra_kb_session";
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = `kb_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
    localStorage.setItem(key, sid);
  }
  return sid;
}

function renderBody(body: string, format: string): string {
  if (format === "html") return body;
  return escapeHtml(body)
    .split(/\n{2,}/)
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return "";
      if (/^#{1,6}\s/.test(trimmed)) {
        const level = trimmed.match(/^#+/)![0].length;
        const text = trimmed.replace(/^#+\s+/, "");
        return `<h${level}>${text}</h${level}>`;
      }
      if (/^[-*]\s/m.test(trimmed)) {
        const items = trimmed
          .split(/\n/)
          .filter((l) => /^[-*]\s/.test(l))
          .map((l) => `<li>${inlineMd(l.replace(/^[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineMd(trimmed.replace(/\n/g, "<br/>"))}</p>`;
    })
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMd(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
