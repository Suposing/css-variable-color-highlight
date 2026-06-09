import type { ColorOccurrence, HighlightMode } from '../types/colorHighlight';

/**
 * @description 支持的高亮目标配置值；用于过滤用户手写的非法配置并保持默认行为稳定。
 */
const SUPPORTED_HIGHLIGHT_MODES: readonly HighlightMode[] = ['all', 'variables', 'colors'];

/**
 * @description 规范化高亮目标配置，非法值回退到 `all`，避免配置损坏后普通高亮能力意外失效。
 * @param value VS Code 配置中读取到的原始值。
 * @returns 可被 provider 使用的高亮目标配置。
 */
export function normalizeHighlightMode(value: unknown): HighlightMode {
  return SUPPORTED_HIGHLIGHT_MODES.includes(value as HighlightMode)
    ? value as HighlightMode
    : 'all';
}

/**
 * @description 判断某类扫描命中是否应该在当前高亮目标模式下显示。
 * @param occurrenceKind 扫描命中类型，普通颜色为 `color`，CSS 变量为 `variable`，Sass/Less 变量为 `preprocessorVariable`。
 * @param highlightMode 用户配置的高亮目标范围。
 * @returns 当前命中应该参与装饰或 hover 时返回 true。
 */
export function shouldDisplayOccurrenceForHighlightMode(
  occurrenceKind: ColorOccurrence['kind'],
  highlightMode: HighlightMode,
): boolean {
  if (highlightMode === 'all') {
    return true;
  }

  if (highlightMode === 'colors') {
    return occurrenceKind === 'color';
  }

  return occurrenceKind === 'variable' || occurrenceKind === 'preprocessorVariable';
}
