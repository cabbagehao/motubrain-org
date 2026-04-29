import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import { getShowcases, getShowcasesCount, type Showcase } from '@/shared/models/showcase';
import { Button, Crumb } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function ShowcasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.CATEGORIES_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.showcases');

  const { page: pageNum, pageSize } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 15;

  const crumbs: Crumb[] = [
    { title: 'Admin', url: '/admin' },
    { title: 'Showcases', is_active: true },
  ];

  const total = await getShowcasesCount();
  const data = await getShowcases({ page, limit });

  const table: Table = {
    columns: [
      {
        name: 'image',
        title: t('form.image'),
        type: 'image',
        metadata: {
          width: 50,
          height: 50,
        },
      },
      { name: 'title', title: t('form.title') },
      { 
        name: 'description', 
        title: t('form.description'),
        callback: (item: Showcase) => {
          const text = item.description || '';
          return text.length > 50 ? text.substring(0, 50) + '...' : text;
        },
      },
      { 
        name: 'prompt', 
        title: t('form.prompt'),
        callback: (item: Showcase) => {
          const text = item.prompt || '';
          return text.length > 50 ? text.substring(0, 50) + '...' : text;
        },
      },
      { name: 'tags', title: t('form.tags') },
      { name: 'createdAt', title: t('form.createdAt'), type: 'time' },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: Showcase) => {
          return [
            {
              id: 'edit',
              title: t('edit'),
              icon: 'RiEditLine',
              url: `/admin/showcases/${item.id}/edit`,
            },
            {
              id: 'delete',
              title: t('delete'),
              icon: 'RiDeleteBinLine',
              url: `/admin/showcases/${item.id}/delete`,
            },
          ];
        },
      },
    ],
    actions: [
      {
        id: 'edit',
        title: t('edit'),
        icon: 'RiEditLine',
        url: '/admin/showcases/[id]/edit',
      },
    ],
    data,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const actions: Button[] = [
    {
      id: 'add',
      title: t('add'),
      icon: 'RiAddLine',
      url: '/admin/showcases/add',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} actions={actions} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
