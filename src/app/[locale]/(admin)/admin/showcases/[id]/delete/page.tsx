import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { deleteShowcase, getShowcase } from '@/shared/models/showcase';
import { getUserInfo } from '@/shared/models/user';

export default async function ShowcaseDeletePage({
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

  const user = await getUserInfo();
  if (!user) {
    redirect('/sign-in');
  }

  const showcase = await getShowcase(id);
  // Allow admin to delete any showcase, check valid showcase first
  if (!showcase) {
    redirect('/admin/showcases');
  }

  await deleteShowcase(id);
  redirect('/admin/showcases');
}
