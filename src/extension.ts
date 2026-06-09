import * as vscode from 'vscode';
import { ColorDecorationProvider } from './providers/colorDecorationProvider';
import { CssVariableHoverProvider } from './providers/cssVariableHoverProvider';
import {
  CONFIGURATION_SECTION,
  getExtensionConfiguration,
} from './services/configurationService';
import { WorkspaceVariableIndex } from './services/workspaceVariableIndex';

/**
 * @description VS Code 插件激活入口，负责初始化变量索引、注册 hover、注册装饰和监听配置变化。
 * @param context 插件上下文；需要释放的资源必须加入 `context.subscriptions`。
 * @returns 插件初始化完成后 resolve；初始工作区索引会在注册 provider 前完成刷新。
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  let configuration = getExtensionConfiguration();
  const workspaceVariableIndex = new WorkspaceVariableIndex(configuration);
  await workspaceVariableIndex.refresh();

  const decorationProvider = new ColorDecorationProvider(configuration, workspaceVariableIndex);
  const hoverProvider = new CssVariableHoverProvider(configuration, workspaceVariableIndex);

  context.subscriptions.push(
    workspaceVariableIndex,
    decorationProvider,
    vscode.languages.registerHoverProvider(
      createDocumentSelector(),
      hoverProvider,
    ),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (!event.affectsConfiguration(CONFIGURATION_SECTION)) {
        return;
      }

      configuration = getExtensionConfiguration();
      workspaceVariableIndex.updateConfiguration(configuration);
      await workspaceVariableIndex.refresh();
      hoverProvider.updateConfiguration(configuration);
      decorationProvider.updateConfiguration(configuration);
    }),
  );

  decorationProvider.updateVisibleEditors();
}

/**
 * @description VS Code 插件停用入口。
 * @description 当前没有额外手动清理逻辑，VS Code 会释放 `context.subscriptions` 中的资源。
 */
export function deactivate(): void {
  // VS Code 会自动释放 context.subscriptions 中注册的资源。
}

/**
 * @description 创建宽松的文件文档选择器，具体语言由 provider 按最新配置过滤。
 * @returns 只匹配本地文件的 VS Code 文档选择器。
 */
function createDocumentSelector(): vscode.DocumentSelector {
  return [
    {
      scheme: 'file',
    },
  ];
}
