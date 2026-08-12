import type { BlogCategoryAgg, BlogPost, BlogTagAgg } from './blog.types';

const iso = (d: string) => new Date(d).toISOString();

const BASE_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post_001',
    slug: 'building-a-resilient-react-query-layer',
    title: 'Building a resilient React Query data layer in production',
    excerpt:
      'Patterns for stable query keys, typed boundaries, and UX-first loading states that scale with your app.',
    coverImage:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1600&q=80',
    author: { name: 'Daria Koval', role: 'Frontend Engineer' },
    publishedAt: iso('2026-02-18T09:20:00Z'),
    readingTime: 8,
    category: 'Engineering',
    tags: ['react-query', 'typescript', 'frontend'],
    featured: true,
    content: [
      { type: 'heading', level: 2, text: 'Why resilience matters' },
      {
        type: 'paragraph',
        text:
          'In real products, networks fail, users switch tabs, and APIs evolve. A resilient data layer makes these failures predictable and recoverable without pushing complexity into every component.',
      },
      { type: 'heading', level: 2, text: 'Stable keys and typed boundaries' },
      {
        type: 'list',
        items: [
          'Use a single place to define query keys (arrays, not strings).',
          'Validate every API response at the boundary with zod.',
          'Prefer optimistic UX: skeletons, empty states, and retry messaging.',
        ],
      },
      {
        type: 'quote',
        text:
          'A data layer is successful when feature code stops caring about networking details.',
        by: 'A pragmatic engineer',
      },
      {
        type: 'paragraph',
        text:
          'Start small: one feature module, one api file, one set of hooks. Let conventions emerge, then codify them.',
      },
    ],
  },
  {
    id: 'post_002',
    slug: 'designing-api-contracts-with-zod',
    title: 'Designing API contracts with zod (and keeping them honest)',
    excerpt:
      'How to prevent silent breakages by parsing responses, not trusting them — without making the codebase messy.',
    coverImage:
      'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1600&q=80',
    author: { name: 'Oleksii Moroz', role: 'Fullstack Engineer' },
    publishedAt: iso('2026-01-30T14:05:00Z'),
    readingTime: 7,
    category: 'Architecture',
    tags: ['zod', 'api', 'typescript'],
    featured: false,
    content: [
      { type: 'heading', level: 2, text: 'The hidden cost of “any”' },
      {
        type: 'paragraph',
        text:
          'Unchecked API responses turn runtime problems into delayed incidents. Parsing with zod is a lightweight way to surface issues early and keep feature code clean.',
      },
      { type: 'heading', level: 2, text: 'Practical parsing strategy' },
      {
        type: 'list',
        items: [
          'Parse on both sides when you can (route handlers + client).',
          'Return consistent envelopes: { posts } or { post }.',
          'Use defaults for optional fields to keep UI predictable.',
        ],
      },
      {
        type: 'paragraph',
        text:
          'If you must change a response, do it intentionally and let schemas guide the refactor.',
      },
    ],
  },
  {
    id: 'post_003',
    slug: 'mui-layouts-that-feel-premium',
    title: 'MUI layouts that feel premium (without custom CSS chaos)',
    excerpt:
      'Spacing, typography, and composition tricks to match polished templates while keeping components maintainable.',
    coverImage:
      'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1600&q=80',
    author: { name: 'Iryna Shevchenko', role: 'UI Engineer' },
    publishedAt: iso('2026-03-04T10:00:00Z'),
    readingTime: 6,
    category: 'UI',
    tags: ['mui', 'design-systems', 'ux'],
    featured: false,
    content: [
      { type: 'heading', level: 2, text: 'Templates are about rhythm' },
      {
        type: 'paragraph',
        text:
          'Polished UIs usually follow consistent rhythm: predictable gutters, consistent line lengths, and a deliberate typographic scale. MUI already gives you most of that.',
      },
      { type: 'heading', level: 2, text: 'Use primitives, not hacks' },
      {
        type: 'list',
        items: [
          'Container + Grid for structure.',
          'Stack for vertical rhythm.',
          'Card + CardMedia for visual hierarchy.',
          'Chips for metadata (tags/categories).',
        ],
      },
      {
        type: 'paragraph',
        text:
          'When in doubt, remove custom CSS first. If the UI gets worse, add back only what’s necessary.',
      },
    ],
  },
  {
    id: 'post_004',
    slug: 'server-components-and-client-boundaries',
    title: 'Server Components: choosing the right boundary',
    excerpt:
      'How to keep pages server-first while still leveraging React Query for interactive fetching when it matters.',
    coverImage:
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1600&q=80',
    author: { name: 'Maksym Bondar', role: 'Tech Lead' },
    publishedAt: iso('2026-02-10T08:40:00Z'),
    readingTime: 9,
    category: 'Engineering',
    tags: ['nextjs', 'react', 'performance'],
    featured: true,
    content: [
      { type: 'heading', level: 2, text: 'A simple rule of thumb' },
      {
        type: 'paragraph',
        text:
          'Keep pages and layout composition as Server Components by default. Move only the interactive/data-fetching parts into small Client Components to avoid inflating the bundle.',
      },
      { type: 'heading', level: 2, text: 'Where React Query shines' },
      {
        type: 'list',
        items: [
          'Refetching and caching on navigation.',
          'Retries and error recovery UX.',
          'Background updates without manual state.',
        ],
      },
      {
        type: 'paragraph',
        text:
          'You can still keep a server-first architecture: render a thin server wrapper that mounts a client view.',
      },
    ],
  },
  {
    id: 'post_005',
    slug: 'writing-content-that-teaches',
    title: 'Writing content that teaches: structure beats length',
    excerpt:
      'A practical approach to crafting posts: start with a promise, show the constraints, then share a repeatable recipe.',
    coverImage:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1600&q=80',
    author: { name: 'Kateryna Hnatiuk', role: 'Product Writer' },
    publishedAt: iso('2026-01-12T16:30:00Z'),
    readingTime: 5,
    category: 'Product',
    tags: ['writing', 'product', 'communication'],
    featured: false,
    content: [
      { type: 'heading', level: 2, text: 'Start with a promise' },
      {
        type: 'paragraph',
        text:
          'The first paragraph should make a clear promise. Readers decide in seconds whether your post is worth their time.',
      },
      { type: 'heading', level: 2, text: 'Prefer recipes over opinions' },
      {
        type: 'list',
        items: [
          'State the goal and constraints.',
          'Show the smallest working example.',
          'Explain trade-offs and alternatives.',
          'End with a checklist that can be reused.',
        ],
      },
      {
        type: 'quote',
        text:
          'Good writing is not about saying more — it’s about making the next step obvious.',
      },
    ],
  },
  {
    id: 'post_006',
    slug: 'shipping-ui-with-accessibility-in-mind',
    title: 'Shipping UI with accessibility in mind',
    excerpt:
      'Contrast, focus states, and meaningful structure — the small details that make a big difference.',
    coverImage:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80',
    author: { name: 'Andrii Kovalchuk', role: 'Frontend Engineer' },
    publishedAt: iso('2026-03-16T11:15:00Z'),
    readingTime: 6,
    category: 'UI',
    tags: ['a11y', 'mui', 'frontend'],
    featured: false,
    content: [
      { type: 'heading', level: 2, text: 'Accessible by default' },
      {
        type: 'paragraph',
        text:
          'Accessibility is easier when it is the default. Use semantic typography, proper heading order, and interactive components that expose focus and hover states clearly.',
      },
      { type: 'heading', level: 2, text: 'A quick checklist' },
      {
        type: 'list',
        items: [
          'Headings in order (H1 → H2 → H3).',
          'Buttons are buttons, links are links.',
          'Images have useful alt text.',
          'Chips and tags are readable and keyboard reachable.',
        ],
      },
    ],
  },
  {
    id: 'post_007',
    slug: 'building-feature-modules-that-scale',
    title: 'Building feature modules that scale',
    excerpt:
      'A pragmatic module structure: api, hooks, schemas, ui, and states — clean separation without ceremony.',
    coverImage:
      'https://images.unsplash.com/photo-1522071901873-411886a10004?auto=format&fit=crop&w=1600&q=80',
    author: { name: 'Serhii Petrenko', role: 'Senior Engineer' },
    publishedAt: iso('2026-02-26T13:10:00Z'),
    readingTime: 7,
    category: 'Architecture',
    tags: ['architecture', 'maintainability', 'typescript'],
    featured: false,
    content: [
      { type: 'heading', level: 2, text: 'Keep it boring' },
      {
        type: 'paragraph',
        text:
          'The best module structure is the one you can predict. When every feature looks similar, onboarding and refactors become cheap.',
      },
      { type: 'heading', level: 2, text: 'Suggested shape' },
      {
        type: 'list',
        items: [
          'api/* for network calls',
          'hooks/* for query hooks',
          'lib/* for schemas/types/mock/mappers',
          'ui/* for presentational components',
          'states/* for loading/error/empty UI',
        ],
      },
      {
        type: 'paragraph',
        text:
          'This structure scales from mock data to a real DB without changing your UI contract.',
      },
    ],
  },
  {
    id: 'post_008',
    slug: 'from-mock-to-database-without-rewrite',
    title: 'From mock to database without a rewrite',
    excerpt:
      'How to start with realistic seed data today, and migrate to persistent storage tomorrow while keeping the API stable.',
    coverImage:
      'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1600&q=80',
    author: { name: 'Yuliia Tymoshenko', role: 'Backend Engineer' },
    publishedAt: iso('2026-01-22T09:00:00Z'),
    readingTime: 8,
    category: 'Engineering',
    tags: ['api', 'migration', 'backend'],
    featured: true,
    content: [
      { type: 'heading', level: 2, text: 'Seed data is a contract' },
      {
        type: 'paragraph',
        text:
          'Realistic mock data helps you test UI edge cases early: long titles, missing tags, image fallbacks, and category filtering.',
      },
      { type: 'heading', level: 2, text: 'Design for the next step' },
      {
        type: 'list',
        items: [
          'Keep a stable response envelope.',
          'Use slugs as public identifiers.',
          'Validate at the boundary so DB changes don’t leak into the UI.',
        ],
      },
      {
        type: 'paragraph',
        text:
          'When you later move to a database, the mock module becomes your seed script. The UI stays untouched.',
      },
    ],
  },
];

const TOTAL_MOCK_POSTS = 320;
const DAY_MS = 24 * 60 * 60 * 1000;
const baseStart = new Date('2026-03-20T10:00:00Z').getTime();

function buildGeneratedPost(index: number): BlogPost {
  const seed = BASE_BLOG_POSTS[index % BASE_BLOG_POSTS.length];
  const seq = index + 1;
  const isFeatured = seq <= 8 && seq % 4 === 0;
  const publishedAt = new Date(baseStart - index * DAY_MS).toISOString();

  return {
    ...seed,
    id: `post_${String(seq).padStart(4, '0')}`,
    slug: `${seed.slug}-${seq}`,
    title: `${seed.title} #${seq}`,
    excerpt: `${seed.excerpt} (Edition ${seq})`,
    publishedAt,
    featured: isFeatured,
  };
}

export const BLOG_POSTS: BlogPost[] = Array.from({ length: TOTAL_MOCK_POSTS }, (_, idx) =>
  buildGeneratedPost(idx)
).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}

export function getFeaturedPost(): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.featured) ?? BLOG_POSTS[0];
}

const _categoriesAggregated = (() => {
  const categoryCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  BLOG_POSTS.forEach(p => {
    categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
    p.tags.forEach(t => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
  });

  const categories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const tags = [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { categories, tags };
})();

export function getBlogCategoriesAggregated(): { categories: BlogCategoryAgg[]; tags: BlogTagAgg[] } {
  return _categoriesAggregated;
}

