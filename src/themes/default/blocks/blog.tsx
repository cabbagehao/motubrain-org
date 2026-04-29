'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Tabs } from '@/shared/blocks/common/tabs';
import { cn } from '@/shared/lib/utils';
import {
  Blog as BlogType,
  Category as CategoryType,
} from '@/shared/types/blocks/blog';
import { Tab } from '@/shared/types/blocks/common';

export function Blog({
  blog,
  className,
}: {
  blog: BlogType;
  className?: string;
}) {
  const t = useTranslations('pages.blog.messages');
  const tabs: Tab[] = [];
  blog.categories?.map((category: CategoryType) => {
    tabs.push({
      name: category.slug,
      title: category.title,
      url:
        !category.slug || category.slug === 'all'
          ? '/blog'
          : `/blog/category/${category.slug}`,
      is_active: blog.currentCategory?.slug == category.slug,
    });
  });

  return (
    <section
      id={blog.id}
      className={cn('py-24 md:py-36', blog.className, className)}
    >
      <div className="mx-auto mb-12 text-center">
        {blog.sr_only_title && (
          <h1 className="sr-only">{blog.sr_only_title}</h1>
        )}
        <h2 className="mb-6 text-3xl font-bold text-pretty lg:text-4xl">
          {blog.title}
        </h2>
        <p className="text-muted-foreground mb-4 max-w-xl lg:max-w-none lg:text-lg">
          {blog.description}
        </p>
      </div>

      <div className="container flex flex-col items-center gap-8 lg:px-16">
        {blog.categories && blog.categories.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-4">
            <Tabs tabs={tabs} />
          </div>
        )}

        {blog.posts && blog.posts.length > 0 ? (
          <div className="flex w-full flex-wrap items-start">
            {blog.posts?.map((item, idx) => (
              <Link
                key={idx}
                href={item.url || ''}
                className="group w-full p-4 md:w-1/2 lg:w-1/3"
              >
                <div className="bg-muted h-full overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={item.image || '/imgs/blog/1.jpeg'}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-primary text-xs font-semibold uppercase tracking-wider">
                        {item.categories?.[0]?.title}
                      </span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-muted-foreground text-xs">
                        {item.date}
                      </span>
                    </div>
                    <h3 className="mb-3 text-xl font-bold transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">{t('no_content')}</p>
          </div>
        )}
      </div>
    </section>
  );
}
