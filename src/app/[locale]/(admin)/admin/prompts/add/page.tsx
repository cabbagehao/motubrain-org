import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getUuid } from '@/shared/lib/hash';
import { addPrompt, NewPrompt, PromptStatus } from '@/shared/models/prompt';
import { getUserInfo } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function PromptAddPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.CATEGORIES_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.prompts');

  const crumbs: Crumb[] = [
    { title: 'Admin', url: '/admin' },
    { title: 'Prompts', url: '/admin/prompts' },
    { title: 'Add', is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'title',
        type: 'text',
        title: 'Title',
        validation: { required: true },
      },
      {
        name: 'description',
        type: 'textarea',
        title: 'Description',
      },
      {
        name: 'image',
        type: 'upload_image',
        title: 'Image',
        tip: 'Upload showcase image',
      },
      {
        name: 'promptTitle',
        type: 'text',
        title: 'Prompt Title',
        validation: { required: true },
      },
      {
        name: 'promptDescription',
        type: 'textarea',
        title: 'Prompt Description',
      },
    ],
    passby: {},
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
        const image = data.get('image') as string;
        const promptTitle = data.get('promptTitle') as string;
        const promptDescription = data.get('promptDescription') as string;

        if (!title?.trim() || !promptTitle?.trim()) {
          throw new Error('title and prompt title are required');
        }

        const newPrompt: NewPrompt = {
          id: getUuid(),
          userId: user.id,
          title: title.trim(),
          description: description?.trim() || '',
          image: image?.trim() || '',
          promptTitle: promptTitle.trim(),
          promptDescription: promptDescription?.trim() || '',
          status: PromptStatus.PUBLISHED,
        };

        const result = await addPrompt(newPrompt);

        if (!result) {
          throw new Error('add prompt failed');
        }

        return {
          status: 'success',
          message: 'prompt added',
          redirect_url: '/admin/prompts',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="Add Prompt" />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
