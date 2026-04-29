import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import { getPrompts, getPromptsCount, type Prompt } from '@/shared/models/prompt';
import { Button, Crumb } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function PromptsPage({
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

  const t = await getTranslations('admin.prompts');

  const { page: pageNum, pageSize } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 15;

  const crumbs: Crumb[] = [
    { title: 'Admin', url: '/admin' },
    { title: 'Prompts', is_active: true },
  ];

  const total = await getPromptsCount();
  const data = await getPrompts({ page, limit });

  const table: Table = {
    columns: [
      {
        name: 'image',
        title: 'Image',
        type: 'image',
        metadata: {
          width: 50,
          height: 50,
        },
      },
      { name: 'title', title: 'Title' },
      { 
        name: 'description', 
        title: 'Description',
        callback: (item: Prompt) => {
          const text = item.description || '';
          return text.length > 50 ? text.substring(0, 50) + '...' : text;
        },
      },
      { name: 'promptTitle', title: 'Prompt Title' },
      { 
        name: 'promptDescription', 
        title: 'Prompt Description',
        callback: (item: Prompt) => {
          const text = item.promptDescription || '';
          return text.length > 50 ? text.substring(0, 50) + '...' : text;
        },
      },
      {
        name: 'status',
        title: 'Status',
        type: 'label',
        metadata: { variant: 'outline' },
      },
      { name: 'createdAt', title: 'Created At', type: 'time' },
      { name: 'updatedAt', title: 'Updated At', type: 'time' },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: Prompt) => {
          return [
            {
              id: 'edit',
              title: 'Edit',
              icon: 'RiEditLine',
              url: `/admin/prompts/${item.id}/edit`,
            },
            {
              id: 'delete',
              title: 'Delete',
              icon: 'RiDeleteBinLine',
              url: `/admin/prompts/${item.id}/delete`,
            },
          ];
        },
      },
    ],
    actions: [
      {
        id: 'edit',
        title: 'Edit',
        icon: 'RiEditLine',
        url: '/admin/prompts/[id]/edit',
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
      title: 'Add Prompt',
      icon: 'RiAddLine',
      url: '/admin/prompts/add',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="Prompts" actions={actions} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
