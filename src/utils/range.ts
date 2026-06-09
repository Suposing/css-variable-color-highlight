import type { SourceRange } from '../types/colorHighlight';

/**
 * @description 根据文档内容和字符偏移量创建源码范围。
 * @description 输入偏移量会通过 `offsetToPosition` 转换为 VS Code 兼容的零基行列坐标。
 * @param text 文档完整文本。
 * @param start 范围起始偏移量，包含该位置。
 * @param end 范围结束偏移量，通常为命中文本后一位。
 * @returns 包含偏移量和行列坐标的源码范围。
 */
export function createSourceRange(text: string, start: number, end: number): SourceRange {
  const startPosition = offsetToPosition(text, start);
  const endPosition = offsetToPosition(text, end);

  return {
    start,
    end,
    startLine: startPosition.line,
    startCharacter: startPosition.character,
    endLine: endPosition.line,
    endCharacter: endPosition.character,
  };
}

/**
 * @description 将字符偏移量转换为零基行列坐标。
 * @description 超出文本范围的偏移量会被夹到 `0..text.length`，避免扫描边界导致异常。
 * @param text 文档完整文本。
 * @param offset 需要转换的字符偏移量。
 * @returns 零基行列坐标。
 */
export function offsetToPosition(text: string, offset: number): { line: number; character: number } {
  let line = 0;
  let lineStart = 0;
  const safeOffset = Math.max(0, Math.min(offset, text.length));

  for (let index = 0; index < safeOffset; index += 1) {
    if (text.charCodeAt(index) === 10) {
      line += 1;
      lineStart = index + 1;
    }
  }

  return {
    line,
    character: safeOffset - lineStart,
  };
}

/**
 * @description 判断字符偏移量是否落在指定范围内。
 * @param offset 字符偏移量。
 * @param range 源码范围。
 * @returns 如果偏移量位于范围内则返回 true；范围结束位置也视为命中，方便 hover 边界判断。
 */
export function isOffsetInRange(offset: number, range: SourceRange): boolean {
  return offset >= range.start && offset <= range.end;
}
