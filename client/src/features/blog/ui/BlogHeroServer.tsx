import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from '../lib/blog.types';

const shell: CSSProperties = {
  maxWidth: 1200,
  marginLeft: 'auto',
  marginRight: 'auto',
  marginTop: 24,
  paddingLeft: 16,
  paddingRight: 16,
};

const cardLink: CSSProperties = {
  display: 'block',
  position: 'relative',
  height: 320,
  borderRadius: 8,
  overflow: 'hidden',
  textDecoration: 'none',
  color: 'inherit',
};

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  padding: 24,
  pointerEvents: 'none',
};

const textBlock: CSSProperties = {
  maxWidth: 640,
  color: '#fff',
};

/**
 * Server-rendered hero so LCP image is in initial HTML with high fetch priority.
 */
export function BlogHeroServer(props: { post: BlogPost }) {
  const { post } = props;

  return (
    <section style={shell} aria-label="Featured article">
      <Link href={`/blog/${post.slug}`} style={cardLink} prefetch>
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          priority
          fetchPriority="high"
          sizes="(max-width: 1200px) 100vw, 1200px"
          style={{ objectFit: 'cover', filter: 'brightness(0.65)' }}
        />
        <div style={overlay}>
          <div style={textBlock}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              {post.title}
            </h1>
            <p style={{ fontSize: '1.125rem', opacity: 0.95, margin: '0 0 16px', lineHeight: 1.5 }}>{post.excerpt}</p>
            <span
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: '#1976d2',
                color: '#fff',
                borderRadius: 4,
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Continue reading…
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
