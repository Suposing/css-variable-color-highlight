import * as vscode from 'vscode';
import { analyzeDocumentColors } from '../services/colorHighlightAnalyzer';
import type { ExtensionConfiguration } from '../services/configurationService';
import type { WorkspaceVariableIndex } from '../services/workspaceVariableIndex';
import { getReadableTextColor, toDisplayColor } from '../utils/color';
import { shouldDisplayOccurrenceForHighlightMode } from '../utils/highlightMode';
import { toVscodeRange } from '../utils/vscodeRange';

/**
 * @description 管理编辑器中的颜色色块装饰。
 * @description Provider 只负责 VS Code 装饰生命周期，颜色扫描和变量解析委托给分析服务。
 */
export class ColorDecorationProvider implements vscode.Disposable {
  /**
   * @description 按展示样式和颜色值缓存的装饰类型，避免每次刷新都创建 VS Code 资源。
   */
  private decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
  /**
   * @description 无法解析 CSS 变量时使用的提示装饰类型，配置变更时会重建。
   */
  private unresolvedVariableDecorationType: vscode.TextEditorDecorationType;
  /**
   * @description 编辑器和文档监听器，随 provider dispose 一起释放。
   */
  private disposables: vscode.Disposable[] = [];
  /**
   * @description 单编辑器刷新防抖定时器，避免输入过程中频繁重算装饰。
   */
  private updateTimer: NodeJS.Timeout | undefined;
  /**
   * @description 当前插件配置快照，配置变更时通过 `updateConfiguration` 替换。
   */
  private configuration: ExtensionConfiguration;

  /**
   * @description 创建颜色装饰 provider，并监听活动编辑器和文档变更。
   * @param configuration 插件运行配置，控制语言、装饰开关和展示样式。
   * @param workspaceVariableIndex 工作区变量索引，用于解析跨文件 CSS 变量。
   */
  public constructor(
    configuration: ExtensionConfiguration,
    private readonly workspaceVariableIndex: WorkspaceVariableIndex,
  ) {
    this.configuration = configuration;
    this.unresolvedVariableDecorationType = this.createUnresolvedVariableDecorationType();
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.scheduleUpdate(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.visibleTextEditors.find((item) => item.document === event.document);
        if (editor) {
          this.scheduleUpdate(editor);
        }
      }),
    );
  }

  /**
   * @description 更新插件配置并刷新全部可见编辑器。
   * @description 未解析变量装饰依赖配置项，更新时需要释放旧类型并重新创建。
   * @param configuration 最新插件配置。
   */
  public updateConfiguration(configuration: ExtensionConfiguration): void {
    this.unresolvedVariableDecorationType.dispose();
    this.configuration = configuration;
    this.unresolvedVariableDecorationType = this.createUnresolvedVariableDecorationType();
    this.updateVisibleEditors();
  }

  /**
   * @description 刷新全部可见编辑器的颜色装饰。
   */
  public updateVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateEditor(editor);
    }
  }

  /**
   * @description 释放装饰类型、监听器和防抖定时器。
   */
  public dispose(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    for (const decorationType of this.decorationTypes.values()) {
      decorationType.dispose();
    }
    this.unresolvedVariableDecorationType.dispose();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  /**
   * @description 防抖刷新单个编辑器装饰。
   * @param editor 需要刷新的编辑器；定时器触发时会重新读取当前文档文本。
   */
  private scheduleUpdate(editor: vscode.TextEditor): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => this.updateEditor(editor), 120);
  }

  /**
   * @description 根据文档分析结果设置颜色色块装饰和未解析变量提示。
   * @description 不支持或已关闭装饰的文档会清理本插件已有装饰，避免残留色块。
   * @param editor 需要刷新的编辑器。
   */
  private updateEditor(editor: vscode.TextEditor): void {
    if (!this.shouldDecorate(editor.document)) {
      this.clearEditorDecorations(editor);
      return;
    }

    const analysis = analyzeDocumentColors(
      editor.document.getText(),
      editor.document.uri.toString(),
      this.workspaceVariableIndex.getDefinitions(),
      this.configuration.resolveFallback,
    );
    const groupedOptions = new Map<string, vscode.DecorationOptions[]>();
    const unresolvedVariableOptions: vscode.DecorationOptions[] = [];

    for (const occurrence of analysis.occurrences) {
      if (!shouldDisplayOccurrenceForHighlightMode(occurrence.kind, this.configuration.highlightMode)) {
        continue;
      }

      const color = occurrence.colors[0];
      if (!color) {
        if (
          this.configuration.showUnresolvedVariableDecorations
          && occurrence.kind === 'variable'
          && occurrence.error
        ) {
          unresolvedVariableOptions.push({
            range: toVscodeRange(occurrence.range),
            hoverMessage: occurrence.error,
          });
        }

        continue;
      }

      const displayColor = toDisplayColor(color);
      const options = groupedOptions.get(displayColor) ?? [];
      options.push({
        range: toVscodeRange(occurrence.range),
      });
      groupedOptions.set(displayColor, options);
    }

    for (const [color, options] of groupedOptions) {
      editor.setDecorations(this.getDecorationType(color), options);
    }
    editor.setDecorations(this.unresolvedVariableDecorationType, unresolvedVariableOptions);

    const activeDecorationKeys = new Set(
      Array.from(groupedOptions.keys()).map((color) => this.getDecorationKey(color)),
    );

    for (const [key, decorationType] of this.decorationTypes) {
      if (!activeDecorationKeys.has(key)) {
        editor.setDecorations(decorationType, []);
      }
    }
  }

  /**
   * @description 判断文档是否应该显示颜色装饰。
   * @param document 文本文档。
   * @returns 插件启用、装饰启用且语言在配置列表内时返回 true。
   */
  private shouldDecorate(document: vscode.TextDocument): boolean {
    return (
      this.configuration.enabled
      && this.configuration.showDecorations
      && this.configuration.languages.includes(document.languageId)
    );
  }

  /**
   * @description 清理单个编辑器上由插件创建的装饰。
   * @param editor 需要清理的编辑器。
   */
  private clearEditorDecorations(editor: vscode.TextEditor): void {
    for (const decorationType of this.decorationTypes.values()) {
      editor.setDecorations(decorationType, []);
    }
    editor.setDecorations(this.unresolvedVariableDecorationType, []);
  }

  /**
   * @description 获取指定颜色对应的 VS Code 装饰类型。
   * @description 装饰类型按颜色和当前展示样式缓存，避免重复创建 VS Code 资源。
   * @param color CSS 颜色。
   * @returns 可复用的装饰类型。
   */
  private getDecorationType(color: string): vscode.TextEditorDecorationType {
    const key = this.getDecorationKey(color);
    const existing = this.decorationTypes.get(key);
    if (existing) {
      return existing;
    }

    const decorationType = vscode.window.createTextEditorDecorationType(this.createDecorationOptions(color));

    this.decorationTypes.set(key, decorationType);
    return decorationType;
  }

  /**
   * @description 生成装饰缓存 key，确保设置和清理装饰时使用同一套标识。
   * @param color CSS 颜色。
   * @returns 当前显示样式和颜色组合后的缓存 key。
   */
  private getDecorationKey(color: string): string {
    return `${this.configuration.decorationStyle}:${color}`;
  }

  /**
   * @description 根据配置生成颜色装饰样式。
   * @description `background` 会改变命中文本背景和前景色，`swatch` 会在文本后追加小色块。
   * @param color CSS 颜色。
   * @returns VS Code 装饰样式。
   */
  private createDecorationOptions(color: string): vscode.DecorationRenderOptions {
    const showBackground = this.configuration.decorationStyle === 'background' || this.configuration.decorationStyle === 'both';
    const showSwatch = this.configuration.decorationStyle === 'swatch' || this.configuration.decorationStyle === 'both';
    const readableTextColor = getReadableTextColor(color);

    return {
      backgroundColor: showBackground ? color : undefined,
      color: showBackground ? readableTextColor : undefined,
      border: showBackground ? '1px solid rgba(127, 127, 127, 0.65)' : undefined,
      borderRadius: showBackground ? '2px' : undefined,
      overviewRulerColor: color,
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      after: showSwatch
        ? {
        contentText: ' ',
        margin: '0 0 0 0.35em',
        width: '0.8em',
        height: '0.8em',
        border: '1px solid rgba(127, 127, 127, 0.65)',
        backgroundColor: color,
        }
        : undefined,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    };
  }

  /**
   * @description 根据配置创建无法解析变量的提示装饰。
   * @description 该装饰只用于变量未解析为颜色的情况，不影响普通颜色或已解析变量。
   * @returns VS Code 装饰类型。
   */
  private createUnresolvedVariableDecorationType(): vscode.TextEditorDecorationType {
    const showBorder = this.configuration.unresolvedVariableDecorationStyle === 'border'
      || this.configuration.unresolvedVariableDecorationStyle === 'both';
    const showUnderline = this.configuration.unresolvedVariableDecorationStyle === 'underline'
      || this.configuration.unresolvedVariableDecorationStyle === 'both';

    return vscode.window.createTextEditorDecorationType({
      border: showBorder ? '1px solid rgba(244, 63, 94, 0.95)' : undefined,
      borderRadius: showBorder ? '2px' : undefined,
      textDecoration: showUnderline ? 'underline wavy rgba(244, 63, 94, 0.95)' : undefined,
      overviewRulerColor: 'rgba(244, 63, 94, 0.95)',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
  }
}
