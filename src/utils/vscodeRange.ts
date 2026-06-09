import * as vscode from 'vscode';
import type { SourceRange } from '../types/colorHighlight';

/**
 * @description 将源码范围转换为 VS Code Range。
 * @param range 使用零基行列坐标表示的源码范围。
 * @returns VS Code 编辑器范围。
 */
export function toVscodeRange(range: SourceRange): vscode.Range {
  return new vscode.Range(
    new vscode.Position(range.startLine, range.startCharacter),
    new vscode.Position(range.endLine, range.endCharacter),
  );
}

/**
 * @description 格式化变量定义来源，优先将 URI 转为本地文件路径。
 * @param definitionUri 变量定义所在 URI；为空时表示没有可展示来源。
 * @param line 零基行号。
 * @returns 便于 hover 展示的 `路径:行号` 文本；没有来源时返回 undefined。
 */
export function formatSourceLocation(definitionUri: string | undefined, line: number): string | undefined {
  if (!definitionUri) {
    return undefined;
  }

  try {
    const uri = vscode.Uri.parse(definitionUri);
    return `${uri.fsPath}:${line + 1}`;
  } catch {
    return `${definitionUri}:${line + 1}`;
  }
}
