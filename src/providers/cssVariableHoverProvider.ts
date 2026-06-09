import * as vscode from 'vscode';
import { analyzeDocumentColors } from '../services/colorHighlightAnalyzer';
import type { ExtensionConfiguration } from '../services/configurationService';
import type { WorkspaceVariableIndex } from '../services/workspaceVariableIndex';
import type { ColorOccurrence } from '../types/colorHighlight';
import { isOffsetInRange } from '../utils/range';
import { formatSourceLocation, toVscodeRange } from '../utils/vscodeRange';

/**
 * @description 为普通颜色和 CSS 变量提供 hover 解析信息。
 * @description Provider 只读取当前文档和已有工作区索引，不在 hover 回调中触发全工作区扫描。
 */
export class CssVariableHoverProvider implements vscode.HoverProvider {
  /**
   * @description 创建 CSS 变量 hover provider。
   * @param configuration 插件运行配置，控制 hover 开关和语言过滤。
   * @param workspaceVariableIndex 工作区变量索引，用于提供跨文件变量定义快照。
   */
  public constructor(
    private configuration: ExtensionConfiguration,
    private readonly workspaceVariableIndex: WorkspaceVariableIndex,
  ) {}

  /**
   * @description 更新 hover provider 使用的配置。
   * @param configuration 最新插件配置；下一次 hover 时立即生效。
   */
  public updateConfiguration(configuration: ExtensionConfiguration): void {
    this.configuration = configuration;
  }

  /**
   * @description 在鼠标悬浮时提供颜色和变量解析信息。
   * @param document 当前文档。
   * @param position 鼠标位置。
   * @returns VS Code hover 内容；插件关闭、hover 关闭、语言不匹配或没有命中颜色/变量时返回 undefined。
   */
  public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    if (
      !this.configuration.enabled
      || !this.configuration.showHover
      || !this.configuration.languages.includes(document.languageId)
    ) {
      return undefined;
    }

    const text = document.getText();
    const offset = document.offsetAt(position);
    const analysis = analyzeDocumentColors(
      text,
      document.uri.toString(),
      this.workspaceVariableIndex.getDefinitions(),
      this.configuration.resolveFallback,
    );
    const occurrence = analysis.occurrences
      .filter((item) => isOffsetInRange(offset, item.range))
      .sort((a, b) => (a.range.end - a.range.start) - (b.range.end - b.range.start))[0];

    if (!occurrence) {
      return undefined;
    }

    return new vscode.Hover(this.createMarkdown(occurrence), toVscodeRange(occurrence.range));
  }

  /**
   * @description 创建 hover Markdown 内容。
   * @description 普通颜色展示原始色值，变量展示解析值、来源和无法解析状态。
   * @param occurrence 命中的颜色或变量出现位置。
   * @returns VS Code MarkdownString。
   */
  private createMarkdown(occurrence: ColorOccurrence): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString(undefined, true);

    if (occurrence.kind === 'color') {
      markdown.appendMarkdown('**CSS 颜色**\n\n');
      markdown.appendCodeblock(occurrence.text, 'css');
      return markdown;
    }

    const variableLabel = occurrence.kind === 'preprocessorVariable'
      ? `${occurrence.variableSyntax === 'sass' ? 'Sass' : 'Less'} 变量颜色`
      : 'CSS 变量颜色';

    markdown.appendMarkdown(`**${variableLabel}**\n\n`);

    if (occurrence.variableName) {
      markdown.appendMarkdown(`- 变量：\`${occurrence.variableName}\`\n`);
    }

    if (occurrence.colors.length > 0) {
      markdown.appendMarkdown(`- 解析值：\`${occurrence.colors.join('`, `')}\`\n`);
    }

    const sourceLocation = formatSourceLocation(
      occurrence.definition?.sourceUri,
      occurrence.definition?.range.startLine ?? 0,
    );
    if (sourceLocation) {
      markdown.appendMarkdown(`- 来源：\`${sourceLocation}\`\n`);
    }

    if (occurrence.error) {
      markdown.appendMarkdown(`- 状态：${occurrence.error}\n`);
    }

    return markdown;
  }
}
