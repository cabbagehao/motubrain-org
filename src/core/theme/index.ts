import { envConfigs } from '@/config';
import { defaultTheme } from '@/config/theme';

import { getRegisteredThemeModuleLoader } from './registry';

/**
 * get active theme
 */
export function getActiveTheme(): string {
  const theme = envConfigs.theme as string;

  if (theme) {
    return theme;
  }

  return defaultTheme;
}

/**
 * load theme page
 */
export async function getThemePage(pageName: string, theme?: string) {
  const loadTheme = theme || getActiveTheme();

  const loader =
    getRegisteredThemeModuleLoader({
      theme: loadTheme,
      kind: 'pages',
      name: pageName,
    }) ||
    getRegisteredThemeModuleLoader({
      theme: defaultTheme,
      kind: 'pages',
      name: pageName,
    });

  if (!loader) {
    throw new Error(`Theme page "${pageName}" is not registered`);
  }

  const module = await loader();
  return module.default;
}

/**
 * load theme layout
 */
export async function getThemeLayout(layoutName: string, theme?: string) {
  const loadTheme = theme || getActiveTheme();

  const loader =
    getRegisteredThemeModuleLoader({
      theme: loadTheme,
      kind: 'layouts',
      name: layoutName,
    }) ||
    getRegisteredThemeModuleLoader({
      theme: defaultTheme,
      kind: 'layouts',
      name: layoutName,
    });

  if (!loader) {
    throw new Error(`Theme layout "${layoutName}" is not registered`);
  }

  const module = await loader();
  return module.default;
}

/**
 * convert kebab-case to PascalCase
 */
function kebabToPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * load theme block
 */
export async function getThemeBlock(blockName: string, theme?: string) {
  const loadTheme = theme || getActiveTheme();
  const pascalCaseName = kebabToPascalCase(blockName);
  const upperCaseName = blockName.toUpperCase();

  const loader =
    getRegisteredThemeModuleLoader({
      theme: loadTheme,
      kind: 'blocks',
      name: blockName,
    }) ||
    getRegisteredThemeModuleLoader({
      theme: defaultTheme,
      kind: 'blocks',
      name: blockName,
    });

  if (!loader) {
    throw new Error(`Theme block "${blockName}" is not registered`);
  }

  const module = await loader();
  const component =
    module[pascalCaseName] || module[blockName] || module[upperCaseName];

  if (!component) {
    throw new Error(`No valid export found in block "${blockName}"`);
  }

  return component;
}
