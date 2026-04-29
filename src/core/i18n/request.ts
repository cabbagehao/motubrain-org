import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

import {
  defaultLocale,
  localeMessagesPaths,
  localeMessagesRootPath,
} from '@/config/locale';
import {
  loadPackPreviewMessageNamespaces,
  loadPackPreviewMessages,
  parsePreviewRequestPath,
} from '@/core/page-pack/preview';

import { routing } from './config';

export async function loadMessages(
  path: string,
  locale: string = defaultLocale
) {
  const pathname = (await headers()).get('x-pathname');
  const previewRequest = pathname ? parsePreviewRequestPath(pathname) : null;

  if (previewRequest) {
    const previewMessages = await loadPackPreviewMessages({
      repoRoot: process.cwd(),
      packName: previewRequest.packName,
      locale,
      defaultLocale,
      namespace: path,
    });

    if (previewMessages) {
      return previewMessages;
    }
  }

  try {
    // try to load locale messages
    const messages = await import(
      `@/config/locale/messages/${locale}/${path}.json`
    );
    return messages.default;
  } catch (e) {
    try {
      // try to load default locale messages
      const messages = await import(
        `@/config/locale/messages/${defaultLocale}/${path}.json`
      );
      return messages.default;
    } catch (err) {
      // if default locale is not found, return empty object
      return {};
    }
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as string)) {
    locale = routing.defaultLocale;
  }

  try {
    const pathname = (await headers()).get('x-pathname');
    const previewRequest = pathname ? parsePreviewRequestPath(pathname) : null;
    const previewMessageNamespaces = previewRequest
      ? await loadPackPreviewMessageNamespaces({
          repoRoot: process.cwd(),
          packName: previewRequest.packName,
        })
      : [];
    const messagePaths = Array.from(
      new Set([...localeMessagesPaths, ...previewMessageNamespaces])
    );

    // load all local messages
    const allMessages = await Promise.all(
      messagePaths.map((path) => loadMessages(path, locale))
    );

    // merge all local messages
    const messages: any = {};

    messagePaths.forEach((path, index) => {
      const localMessages = allMessages[index];

      const keys = path.split('/');
      let current = messages;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = localMessages;
    });

    return {
      locale,
      messages,
    };
  } catch (e) {
    return {
      locale: defaultLocale,
      messages: await loadMessages(localeMessagesRootPath, defaultLocale),
    };
  }
});
