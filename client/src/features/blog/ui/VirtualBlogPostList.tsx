'use client';

import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { BlogPost } from '../lib/blog.types';
import { BlogPostCard } from './BlogPostCard';

type Props = {
  posts: BlogPost[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

export function VirtualBlogPostList(props: Props) {
  const { posts, hasNextPage, isFetchingNextPage, fetchNextPage } = props;

  // 📌 REF на DOM-елемент контейнера зі скролом.
  // Танстак повинен знати, де "вікно перегляду" — звідси він розраховує,
  // які елементи зараз видимі, а які ні.
  const parentRef = useRef<HTMLDivElement | null>(null);

  // 📌 Якщо ще є сторінки — додаємо фіктивний "рядок-лоадер" в кінець списку.
  // Він стане тригером для підвантаження наступної сторінки.
  const itemCount = hasNextPage ? posts.length + 1 : posts.length;

  const rowVirtualizer = useVirtualizer({
    count: itemCount,
    // Звідки брати scroll position — наш контейнер
    getScrollElement: () => parentRef.current,
    // Початкова оцінка висоти одного рядка.
    // Танстак потім уточнить реальну висоту через measureElement.
    estimateSize: () => 260,
    // Кількість елементів поза viewport, які все одно рендеряться.
    // Потрібно, щоб скрол виглядав плавно — елементи вже є в DOM
    // коли доскролюєш до них.
    overscan: 3,
    // Дозволяємо танстаку вимірювати реальну висоту кожної картки.
    // getBoundingClientRect().height — точний розмір з урахуванням padding/border.
    measureElement:
      typeof window !== 'undefined'
        ? (el) => el.getBoundingClientRect().height
        : undefined,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // ✅ ВИПРАВЛЕННЯ 1: useMemo прибрано, логіка перенесена прямо в useEffect.
  //
  // Чому useMemo було неправильно?
  // useMemo — це кеш для обчислень. React може скинути кеш коли захоче.
  // Він не є гарантованим способом відстежувати "коли щось змінилось".
  // Для сайд-ефектів (fetchNextPage — виклик функції, не обчислення) —
  // завжди використовуй useEffect.
  //
  // ✅ ВИПРАВЛЕННЯ 2: умова змінена з posts.length - 1 на posts.length.
  //
  // Чому posts.length - 1 було неправильно?
  // posts.length - 1 — це індекс ОСТАННЬОГО поста.
  // Тобто fetch запускався, коли в viewport попадав останній пост —
  // ще ДО того, як з'явився loader-рядок.
  // posts.length — це індекс самого loader-рядка, і саме тоді
  // треба підвантажувати наступну сторінку.
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const last = virtualItems[virtualItems.length - 1];

    // last.index >= posts.length означає:
    // "loader-рядок (індекс posts.length) став видимим у viewport"
    if (last && last.index >= posts.length) {
      fetchNextPage();
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, posts.length, fetchNextPage]);

  return (
    <Box
      ref={parentRef}
      sx={{
        // ⚠️ Критично: контейнер повинен мати фіксовану висоту і overflow: auto.
        // Без цього танстак не може розрахувати viewport — він не буде знати,
        // де починається і де закінчується "вікно перегляду".
        //
        // Краща практика: замість calc(100vh - N) краще використовувати flex layout
        // на батьківських елементах і задавати height: '100%' тут.
        // Але якщо структура сторінки проста — calc теж підходить.
        height: { xs: 'calc(100vh - 260px)', md: 'calc(100vh - 220px)' },
        overflow: 'auto',
        pr: 1,
      }}
    >
      {/*
        Цей Box — "фантомний простір" всього списку.
        getTotalSize() повертає суму висот ВСІХ елементів (навіть тих, яких нема в DOM).
        Завдяки цьому скролбар виглядає правильно — він відображає весь список,
        а не тільки ті кілька карток, що зараз відрендерені.
      */}
      <Box sx={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {virtualItems.map((vItem) => {
          const isLoaderRow = hasNextPage && vItem.index === posts.length;

          return (
            <Box
              key={vItem.key}
              // ✅ ВИПРАВЛЕННЯ 3: доданий data-index.
              //
              // measureElement під капотом шукає data-index на елементі,
              // щоб знати, до якого virtual item прив'язати виміряну висоту.
              // Без нього висоти можуть застосуватись до неправильних рядків —
              // картки "стрибатимуть" під час скролу.
              data-index={vItem.index}
              ref={rowVirtualizer.measureElement}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                // translateY замість top: N — це важливо для продуктивності.
                // transform не викликає reflow (перерахунок розмітки),
                // на відміну від зміни top/left. Анімації і скрол будуть плавнішими.
                transform: `translateY(${vItem.start}px)`,
                pb: 2,
              }}
            >
              {isLoaderRow ? (
                <Stack sx={{ py: 2 }} spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {isFetchingNextPage ? 'Loading more posts…' : 'Scroll to load more'}
                  </Typography>
                </Stack>
              ) : (
                <BlogPostCard post={posts[vItem.index]!} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}