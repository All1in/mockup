import type { BlogPost } from './blog.types';

export function formatBlogDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function clampText(text: string, max = 160): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function getPostMetaLine(post: BlogPost): string {
  const date = formatBlogDate(post.publishedAt);
  return `${date} • ${post.readingTime} min read`;
}

