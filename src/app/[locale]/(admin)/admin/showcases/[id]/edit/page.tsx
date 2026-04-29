import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getShowcase, updateShowcase } from '@/shared/models/showcase';
import { getUserInfo } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function ShowcaseEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.CATEGORIES_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.showcases');
  const showcase = await getShowcase(id);

  if (!showcase) {
    notFound();
  }

  const crumbs: Crumb[] = [
    { title: 'Admin', url: '/admin' },
    { title: 'Showcases', url: '/admin/showcases' },
    { title: 'Edit', is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'title',
        type: 'text',
        title: t('form.title'),
        validation: { required: true },
        value: showcase.title,
      },
      {
        name: 'description',
        type: 'textarea',
        title: t('form.description'),
        value: showcase.description || '',
      },
      {
        name: 'prompt',
        type: 'textarea',
        title: t('form.prompt'),
        value: showcase.prompt,
      },
      {
        name: 'image',
        type: 'upload_image',
        title: t('form.image'),
        validation: { required: true },
        value: showcase.image,
      },
      {
        name: 'tags',
        type: 'text',
        title: t('form.tags'),
        placeholder: 'e.g. hairstyles',
        tip: 'Use comma to separate multiple tags',
        value: showcase.tags || '',
      },
    ],
    passby: { id },
    data: {},
    submit: {
      button: {
        title: 'Submit',
      },
      handler: async (data, passby) => {
        'use server';

        const user = await getUserInfo();
        if (!user) {
          throw new Error('no auth');
        }

        const title = data.get('title') as string;
        const description = data.get('description') as string;
        const prompt = data.get('prompt') as string;
        const image = data.get('image') as string;
        const tags = data.get('tags') as string;

        if (!title?.trim() || !image?.trim()) {
          throw new Error('title and image are required');
        }

        const result = await updateShowcase(passby.id, {
          title: title.trim(),
          description: description?.trim() || null,
          prompt: prompt?.trim() || null,
          image: image.trim(),
          tags: tags?.trim() || null,
        });

        if (!result) {
          throw new Error('update showcase failed');
        }

        return {
          status: 'success',
          message: 'showcase updated',
          redirect_url: '/admin/showcases',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
