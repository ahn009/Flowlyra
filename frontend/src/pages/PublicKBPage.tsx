import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, FolderOpen, Search as SearchIcon, ThumbsDown, ThumbsUp } from "lucide-react";
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
    <div className="min-h-screen premium-surface text-navy-700 dark:text-navy-100">
      <header className="border-b border-navy-100 bg-white/85 backdrop-blur dark:border-navy-800 dark:bg-navy-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to={`/kb/${orgSlug}`} className="inline-flex items-center gap-2 font-display text-lg font-semibold text-navy-800 dark:text-white">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-500 text-white shadow-glow">
              <BookOpen size={17} />
            </span>
            Help Center
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">FlowLyra knowledge base</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-navy-800 sm:text-5xl dark:text-white">How can we help?</h1>
          <label className="mt-7 flex items-center gap-3 rounded-lg border border-navy-100 bg-white px-4 py-3 text-left text-navy-400 shadow-soft focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-900">
            <SearchIcon size={20} />
            <input
              value={q}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                const v = event.target.value;
                if (v) next.set("q", v);
                else next.delete("q");
                setSearchParams(next);
              }}
              placeholder="Search articles"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-navy-700 outline-none placeholder:text-navy-300 focus:ring-0 dark:text-navy-100 dark:placeholder:text-navy-500"
            />
          </label>
        </section>

        {q ? (
          <section className="mx-auto mt-10 max-w-3xl">
            <h2 className="font-display text-xl font-semibold">Search results for "{q}"</h2>
            <ul className="mt-4 space-y-3">
              {(search.data ?? []).map((row) => (
                <li key={row.id} className="rounded-lg border border-navy-100 bg-white p-4 shadow-xs transition hover:border-brand-200 hover:shadow-soft dark:border-navy-800 dark:bg-navy-900">
                  <Link
                    to={`/kb/${orgSlug}/${row.slug}${locale ? `?locale=${locale}` : ""}`}
                    className="text-base font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {row.title}
                  </Link>
                  {row.snippet && <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">{row.snippet}</p>}
                </li>
              ))}
              {search.data?.length === 0 && <p className="text-sm text-navy-400">No results.</p>}
            </ul>
          </section>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-semibold text-navy-800 dark:text-white">Popular articles</h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {featured.map((row) => (
                    <li key={row.id} className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs transition hover:-translate-y-px hover:border-brand-200 hover:shadow-soft dark:border-navy-800 dark:bg-navy-900">
                      <Link
                        to={`/kb/${orgSlug}/${row.slug}`}
                        className="group inline-flex items-center gap-2 text-base font-semibold text-navy-800 dark:text-white"
                      >
                        {row.title}
                        <ChevronRight size={15} className="text-brand-500 transition group-hover:translate-x-0.5" />
                      </Link>
                      {row.summary && (
                        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">{row.summary}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-12">
              <h2 className="font-display text-2xl font-semibold text-navy-800 dark:text-white">Browse by category</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${categorySlug === "" ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/40" : "border-navy-200 text-navy-500 hover:border-brand-200 hover:text-brand-600 dark:border-navy-700 dark:text-navy-300"}`}
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
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${categorySlug === cat.slug ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/40" : "border-navy-200 text-navy-500 hover:border-brand-200 hover:text-brand-600 dark:border-navy-700 dark:text-navy-300"}`}
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
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((row) => (
                  <li key={row.id} className="rounded-lg border border-navy-100 bg-white p-4 shadow-xs transition hover:border-brand-200 hover:shadow-soft dark:border-navy-800 dark:bg-navy-900">
                    <Link
                      to={`/kb/${orgSlug}/${row.slug}`}
                      className="flex items-start gap-3 text-base font-semibold text-navy-800 dark:text-white"
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                        <FolderOpen size={16} />
                      </span>
                      <span>{row.title}</span>
                    </Link>
                    {row.summary && (
                      <p className="text-sm text-navy-500 dark:text-navy-300">{row.summary}</p>
                    )}
                  </li>
                ))}
                {!others.length && !featured.length && (
                  <p className="text-sm text-navy-400">No articles published yet.</p>
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
      <div className="grid min-h-screen place-items-center bg-white text-sm text-navy-400 dark:bg-navy-950">
        {article.isLoading ? "Loading..." : "Article not found"}
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
    <div className="min-h-screen premium-surface text-navy-700 dark:text-navy-100">
      <header className="border-b border-navy-100 bg-white/85 backdrop-blur dark:border-navy-800 dark:bg-navy-950/85">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to={`/kb/${orgSlug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">
            <ChevronRight size={16} className="rotate-180" />
            Help Center
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <article className="rounded-lg border border-navy-100 bg-white p-6 shadow-soft dark:border-navy-800 dark:bg-navy-900 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-navy-400">
            <Link to={`/kb/${orgSlug}`} className="hover:text-brand-600">Help Center</Link>
            <ChevronRight size={14} />
            <span>Article</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy-800 sm:text-4xl dark:text-white">{article.data.title}</h1>
          {article.data.summary && (
            <p className="mt-2 text-navy-500 dark:text-navy-300">{article.data.summary}</p>
          )}
          <div
            className="prose prose-slate mt-6 max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderBody(article.data.body, article.data.body_format) }}
          />
        </article>

        <section className="mt-6 rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-800 dark:bg-navy-900">
          {feedbackSent ? (
            <p className="text-sm text-navy-500 dark:text-navy-300">Thanks for your feedback!</p>
          ) : (
            <>
              <p className="text-sm font-semibold">Was this article helpful?</p>
              <textarea
                rows={2}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Optional comment"
                className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-950"
              />
              <div className="mt-2 flex gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-md bg-success-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-success-700"
                  onClick={() => submitFeedback(true)}
                >
                  <ThumbsUp size={14} /> Yes
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-md bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700"
                  onClick={() => submitFeedback(false)}
                >
                  <ThumbsDown size={14} /> No
                </button>
              </div>
            </>
          )}
        </section>

        {(related.data ?? []).length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase text-navy-400">Related articles</h2>
            <ul className="mt-3 space-y-2">
              {(related.data ?? []).map((row) => (
                <li key={row.id}>
                  <Link
                    to={`/kb/${orgSlug}/${row.slug}`}
                    className="text-base font-semibold text-brand-600 hover:text-brand-700"
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
