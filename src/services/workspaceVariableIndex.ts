import * as vscode from 'vscode';
import type { CssVariableDefinition } from '../types/colorHighlight';
import { scanVariableDefinitions } from './documentScanner';
import type { ExtensionConfiguration } from './configurationService';

/**
 * @description 工作区 CSS 变量索引，负责跨文件缓存变量定义。
 * @description 索引按配置 include/exclude 和最大文件数构建，避免 provider 在 hover 或装饰刷新时扫描整个工作区。
 */
export class WorkspaceVariableIndex implements vscode.Disposable {
  /**
   * @description 当前工作区变量定义快照。
   */
  private definitions: CssVariableDefinition[] = [];
  /**
   * @description 文件监听等需要随索引一起释放的 VS Code 资源。
   */
  private disposables: vscode.Disposable[] = [];
  /**
   * @description 工作区刷新防抖定时器，避免保存、删除、重命名连续触发时重复扫描。
   */
  private refreshTimer: NodeJS.Timeout | undefined;

  /**
   * @description 创建工作区变量索引，并注册文件保存、删除和重命名监听。
   * @param configuration 插件运行配置，控制扫描范围和文件数量上限。
   */
  public constructor(private configuration: ExtensionConfiguration) {
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument(() => this.scheduleRefresh()),
      vscode.workspace.onDidDeleteFiles(() => this.scheduleRefresh()),
      vscode.workspace.onDidRenameFiles(() => this.scheduleRefresh()),
    );
  }

  /**
   * @description 更新索引用到的配置，并安排一次防抖刷新。
   * @param configuration 最新插件配置，可能改变启用状态、include/exclude 或扫描上限。
   */
  public updateConfiguration(configuration: ExtensionConfiguration): void {
    this.configuration = configuration;
    this.scheduleRefresh();
  }

  /**
   * @description 初始化或全量刷新工作区变量索引。
   * @description 单个文件读取失败会被忽略，避免索引失败影响编辑器输入和 hover 体验。
   * @returns 刷新完成后 resolve；插件禁用时会清空当前索引。
   */
  public async refresh(): Promise<void> {
    if (!this.configuration.enabled) {
      this.definitions = [];
      return;
    }

    const files = await this.findWorkspaceFiles();
    const nextDefinitions: CssVariableDefinition[] = [];

    for (const file of files) {
      try {
        const bytes = await vscode.workspace.fs.readFile(file);
        const text = Buffer.from(bytes).toString('utf8');
        nextDefinitions.push(...scanVariableDefinitions(text, file.toString()));
      } catch {
        // 忽略无法读取的文件，避免索引失败影响编辑器体验。
      }
    }

    this.definitions = nextDefinitions;
  }

  /**
   * @description 获取当前工作区中的变量定义。
   * @returns 工作区变量定义快照；调用方应只读使用，避免破坏索引缓存。
   */
  public getDefinitions(): CssVariableDefinition[] {
    return this.definitions;
  }

  /**
   * @description 释放文件监听和定时器。
   */
  public dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  /**
   * @description 防抖刷新工作区索引，合并短时间内的多次文件系统事件。
   */
  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      void this.refresh();
    }, 300);
  }

  /**
   * @description 根据 include/exclude 配置查找需要扫描的工作区文件。
   * @description 多个 include 命中同一文件时会去重，并在达到 maxWorkspaceFiles 后停止继续查找。
   * @returns 待扫描文件 URI，数量不超过配置的最大扫描文件数。
   */
  private async findWorkspaceFiles(): Promise<vscode.Uri[]> {
    const include = this.configuration.include.length > 0
      ? this.configuration.include
      : ['**/*.{css,scss,sass,less,postcss,vue,html,svelte,astro,js,jsx,ts,tsx}'];
    const exclude = this.configuration.exclude.length > 0
      ? `{${this.configuration.exclude.join(',')}}`
      : undefined;
    const files = new Map<string, vscode.Uri>();

    for (const pattern of include) {
      if (files.size >= this.configuration.maxWorkspaceFiles) {
        break;
      }

      const remaining = this.configuration.maxWorkspaceFiles - files.size;
      const matchedFiles = await vscode.workspace.findFiles(pattern, exclude, remaining);
      for (const file of matchedFiles) {
        files.set(file.toString(), file);
      }
    }

    return Array.from(files.values());
  }
}
