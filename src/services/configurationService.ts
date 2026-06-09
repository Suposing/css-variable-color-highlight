import * as vscode from 'vscode';

/**
 * @description VS Code 配置命名空间，必须与 `package.json` 中的 `contributes.configuration` 保持一致。
 */
export const CONFIGURATION_SECTION = 'cssVariableColorHighlight';

/**
 * @description 插件运行配置，由 `cssVariableColorHighlight.*` 配置项规范化得到。
 */
export interface ExtensionConfiguration {
  /**
   * @description 是否启用插件主能力；关闭后不扫描、不装饰、不提供 hover。
   */
  enabled: boolean;
  /**
   * @description 允许扫描和提供编辑器能力的 VS Code languageId 列表。
   */
  languages: string[];
  /**
   * @description 工作区变量索引包含的 glob 列表。
   */
  include: string[];
  /**
   * @description 工作区变量索引排除的 glob 列表。
   */
  exclude: string[];
  /**
   * @description 是否在编辑器中显示颜色色块或背景装饰。
   */
  showDecorations: boolean;
  /**
   * @description 已解析颜色的编辑器展示样式。
   */
  decorationStyle: DecorationStyle;
  /**
   * @description 是否给无法解析为颜色的 CSS 变量显示提示装饰。
   */
  showUnresolvedVariableDecorations: boolean;
  /**
   * @description 无法解析 CSS 变量时的编辑器标记样式。
   */
  unresolvedVariableDecorationStyle: UnresolvedVariableDecorationStyle;
  /**
   * @description 是否在鼠标悬浮时展示颜色或变量解析信息。
   */
  showHover: boolean;
  /**
   * @description 工作区变量索引最多扫描的文件数量。
   */
  maxWorkspaceFiles: number;
  /**
   * @description 变量定义缺失时是否尝试解析 `var()` fallback。
   */
  resolveFallback: boolean;
}

/**
 * @description 已解析颜色的展示方式：`background` 表示文本背景；`swatch` 表示后置色块；`both` 表示两者同时显示。
 */
export type DecorationStyle = 'background' | 'swatch' | 'both';

/**
 * @description 无法解析变量的展示方式：`border` 表示边框；`underline` 表示波浪下划线；`both` 表示两者同时显示。
 */
export type UnresolvedVariableDecorationStyle = 'border' | 'underline' | 'both';

/**
 * @description 读取并规范化 VS Code 配置；缺失配置会回退到插件默认值。
 * @returns 当前插件运行配置快照，调用方应在配置变更事件中重新读取。
 */
export function getExtensionConfiguration(): ExtensionConfiguration {
  const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);

  return {
    enabled: configuration.get('enabled', true),
    languages: configuration.get('languages', defaultLanguages),
    include: configuration.get('include', defaultInclude),
    exclude: configuration.get('exclude', defaultExclude),
    showDecorations: configuration.get('showDecorations', true),
    decorationStyle: configuration.get<DecorationStyle>('decorationStyle', 'background'),
    showUnresolvedVariableDecorations: configuration.get('showUnresolvedVariableDecorations', true),
    unresolvedVariableDecorationStyle: configuration.get<UnresolvedVariableDecorationStyle>('unresolvedVariableDecorationStyle', 'both'),
    showHover: configuration.get('showHover', true),
    maxWorkspaceFiles: configuration.get('maxWorkspaceFiles', 3000),
    resolveFallback: configuration.get('resolveFallback', true),
  };
}

/**
 * @description 默认支持扫描的 VS Code languageId 列表，需要与 `package.json` 默认配置和 README 保持同步。
 */
export const defaultLanguages = [
  'css',
  'scss',
  'sass',
  'less',
  'postcss',
  'vue',
  'html',
  'svelte',
  'astro',
  'javascript',
  'typescript',
  'javascriptreact',
  'typescriptreact',
];

/**
 * @description 默认工作区扫描范围，覆盖样式文件和常见前端组件/脚本文件。
 */
const defaultInclude = [
  '**/*.{css,scss,sass,less,postcss,vue,html,svelte,astro,js,jsx,ts,tsx}',
];

/**
 * @description 默认忽略的高噪音或构建产物目录，避免工作区索引扫描过慢。
 */
const defaultExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/out/**',
  '**/.git/**',
];
