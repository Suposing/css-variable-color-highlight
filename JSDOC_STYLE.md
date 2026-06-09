## JSDoc 注释规范

> 给 AI/开发助手使用的当前项目版；新增或修改 TypeScript / JavaScript 代码时遵守。

本项目是 VS Code 插件，核心逻辑围绕颜色识别、CSS 变量解析、工作区索引、编辑器装饰和 hover 展示。注释的目标不是解释每一行代码，而是让后续维护者能快速理解“输入是什么、输出是什么、边界行为是什么、失败时怎么处理”。

### 1. 基础格式

- 使用块级注释 `/** ... */`，紧贴被注释对象上一行。
- 注释统一使用中文。
- 优先使用 `@description`、`@param`、`@returns`、`@property`、`@event`、`@deprecated`。
- 推荐标签顺序：`@description` → `@property` → `@param` → `@returns` → `@event` / `@deprecated` → 其他。
- 类型按 TypeScript 写法表达，避免随意写 `any`；无法确定时优先用 `unknown` 并说明原因。
- 注释描述行为和约束，不重复代码字面含义；简单中间变量、显而易见的赋值不需要注释。

```ts
/**
 * @description 从 CSS 属性值中提取可展示颜色，并保留颜色在源码中的出现顺序。
 * @param value CSS 属性值、变量值或复合样式片段。
 * @returns 按源码顺序排列的颜色文本；没有颜色时返回空数组。
 */
export function extractColors(value: string): string[] {
  return [];
}
```

### 2. 必须写注释的位置

- `src/extension.ts` 中的 `activate`、`deactivate`、插件注册和生命周期辅助函数。
- `src/providers/` 中所有 Provider 类、构造函数、对外更新方法、VS Code 回调方法、复杂装饰/hover 生成逻辑。
- `src/services/` 中所有 resolver、scanner、workspace index、configuration service 的导出函数、核心类、核心方法和复杂私有方法。
- `src/utils/` 中所有导出的纯函数、复杂正则、颜色转换、范围转换、CSS 值解析工具。
- `src/types/` 中所有导出的 `interface`、`type` 及其字段。
- 测试文件中的复杂 fixture、回归场景或不直观的断言意图。

### 3. 可以不写注释的位置

- 简单局部变量、临时数组、直接调用链。
- 类型已经清晰且只在当前函数内部使用的中间对象。
- 与测试标题完全重复的单行断言。
- 仅用于格式化、排序、去重的短小私有函数，但如果涉及边界行为仍需补充。

### 4. TypeScript 类型字段

导出的类型必须让 IDE hover 能直接看懂字段含义。优先给字段逐个写块级注释，不只在类型上写总说明。

```ts
/**
 * @description 文档中识别出的普通颜色或 CSS 变量调用。
 */
export interface ColorOccurrence {
  /**
   * @description 出现位置类型：`color` 表示普通颜色；`variable` 表示 `var()` 调用。
   */
  kind: 'color' | 'variable';

  /**
   * @description 源码中的原始文本，例如 `#1677ff` 或 `var(--color-primary, #409eff)`。
   */
  text: string;

  /**
   * @description 已解析出的可展示颜色；无法解析或变量不是颜色值时为空数组。
   */
  colors: string[];
}
```

配置类型字段需要说明对应的 `package.json` 配置项、默认行为和关闭后的影响。

```ts
/**
 * @description 插件运行配置，由 `cssVariableColorHighlight.*` 配置项规范化得到。
 */
export interface ExtensionConfiguration {
  /**
   * @description 是否启用插件主能力；关闭后不扫描、不装饰、不提供 hover。
   */
  enabled: boolean;
}
```

### 5. VS Code 插件入口

入口文件只描述激活、注册和资源释放。注释应说明注册了哪些能力、配置变化时会刷新哪些服务、是否依赖 `context.subscriptions` 自动释放。

```ts
/**
 * @description VS Code 插件激活入口，负责初始化工作区变量索引、注册 hover provider、注册颜色装饰和监听配置变化。
 * @param context VS Code 扩展上下文；所有需要释放的资源应加入 `context.subscriptions`。
 * @returns 初始化完成后 resolve；索引刷新失败不应影响插件激活。
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {}
```

### 6. Provider 注释

Provider 注释要说明它和 VS Code API 的交互边界，不把解析细节堆在 provider 注释里。

- 类注释说明负责的 UI 能力，例如装饰、hover。
- 构造函数说明依赖的配置和服务。
- `provideHover`、刷新装饰、配置更新等方法必须说明触发时机、返回空值条件和性能边界。
- 装饰样式生成函数要说明对透明色、渐变、多颜色值、无法解析变量的处理策略。

```ts
/**
 * @description 为普通颜色和 CSS 变量提供 hover 信息；解析逻辑委托给分析服务，避免在 hover 中扫描整个工作区。
 */
export class CssVariableHoverProvider implements vscode.HoverProvider {
  /**
   * @description 鼠标悬浮时返回命中颜色或变量的 Markdown 内容。
   * @param document 当前文本文档。
   * @param position 鼠标悬浮位置。
   * @returns 命中受支持颜色或变量时返回 hover；未启用、语言不匹配或未命中时返回 undefined。
   */
  public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {}
}
```

### 7. Resolver 注释

CSS 变量解析相关注释必须写清楚边界行为，尤其是 fallback、嵌套变量、循环引用和最大递归深度。

- `resolveVarCall` 说明输入必须是完整 `var()` 文本。
- `resolveValueColors` 说明会合并直接颜色和变量解析颜色。
- 递归方法说明 `visited`、`depth` 的作用。
- 返回结构化错误时，说明不会抛出未捕获异常。

```ts
/**
 * @description 递归解析变量名对应的定义，优先使用当前文档定义，再回退到工作区索引。
 * @param variableName CSS 变量名，必须包含 `--` 前缀。
 * @param localDefinitions 当前文档扫描出的变量定义。
 * @param workspaceDefinitions 工作区索引缓存的变量定义。
 * @param state 当前递归状态，用于保留原始表达式、fallback、深度和循环引用检测集合。
 * @returns 变量解析结果；无法解析时通过 `error` 描述原因，不抛出异常。
 */
private resolveVariable(
  variableName: string,
  localDefinitions: CssVariableDefinition[],
  workspaceDefinitions: CssVariableDefinition[],
  state: ResolveState,
): VariableResolveResult {}
```

### 8. Scanner 注释

扫描器注释要说明扫描范围和误报控制策略。当前项目对 Vue、React、Svelte、Astro、JS/TS 字符串保持保守时，也应在注释或函数说明中写明。

- 文档扫描函数说明输入是完整文本，不依赖 VS Code 文档对象。
- 变量定义扫描说明支持的定义格式和不支持的边界。
- 复合值扫描说明会识别 `linear-gradient()`、`box-shadow`、`border`、`background` 等值中的颜色或 `var()`。
- 正则常量如果复杂，必须用注释说明意图和限制。

```ts
/**
 * @description 匹配简单 CSS 变量定义，例如 `--color-primary: #1677ff;`。
 * @description 当前实现不做完整 CSS 语法树解析，不跨越 `{}` 或缺失分号的定义。
 */
const CSS_VARIABLE_DEFINITION_PATTERN = /(--[\w-]+)\s*:\s*([^;{}]+);/g;
```

### 9. Workspace Index 注释

工作区索引涉及性能和缓存，注释必须说明刷新时机、扫描上限、include/exclude 和失败处理。

- `refresh` 说明会全量重建索引，并尊重启用状态和最大文件数。
- 文件监听回调说明是防抖刷新。
- 文件读取失败必须说明会被忽略，避免影响编辑器体验。
- `getDefinitions` 说明返回的是当前快照，调用者不应直接修改。

```ts
/**
 * @description 初始化或全量刷新工作区变量索引，按配置 include/exclude 查找文件，并受最大扫描文件数限制。
 * @returns 刷新完成后 resolve；单个文件读取失败会被忽略，不中断整个索引刷新。
 */
public async refresh(): Promise<void> {}
```

### 10. 配置服务注释

新增配置项时必须同步更新 `package.json`、配置类型、默认值、README 和配置读取逻辑。注释需要说明默认值、枚举含义和关闭后的影响。

```ts
/**
 * @description 无法解析 CSS 变量时的编辑器标记样式。
 * @description `border` 表示边框；`underline` 表示波浪下划线；`both` 表示同时显示。
 */
export type UnresolvedVariableDecorationStyle = 'border' | 'underline' | 'both';
```

### 11. 工具函数和正则注释

工具函数应说明纯函数特性、输入输出和失败返回值。复杂正则必须说明“匹配什么”和“不匹配什么”。

```ts
/**
 * @description 将 VS Code 不直接保证可读性的颜色背景估算为黑色或白色前景色。
 * @param color CSS 颜色文本，支持十六进制、RGB、HSL 和部分关键字。
 * @returns 可读前景色；无法解析颜色通道时返回 undefined，让调用方保留默认前景色。
 */
export function getReadableTextColor(color: string): string | undefined {}
```

### 12. 错误与边界行为

解析失败、循环引用、缺失定义、非颜色变量、语法不完整等情况，应通过结构化结果表达，不抛出未捕获异常。注释中应明确失败路径。

```ts
/**
 * @description 解析完整 `var()` 表达式，支持 fallback 和嵌套变量。
 * @param rawVarCall 完整 `var()` 文本。
 * @param localDefinitions 当前文档变量定义。
 * @param workspaceDefinitions 工作区变量定义快照。
 * @returns 解析成功时包含颜色和定义来源；解析失败时 `colors` 为空并通过 `error` 说明原因。
 */
public resolveVarCall(
  rawVarCall: string,
  localDefinitions: CssVariableDefinition[],
  workspaceDefinitions: CssVariableDefinition[],
): VariableResolveResult {}
```

### 13. 测试注释

测试文件默认不需要给每个 `it` 写 JSDoc。只有以下情况需要补充短注释：

- fixture 很长，且无法从测试标题看出关键点。
- 测试覆盖历史 bug 或回归场景。
- 断言的是性能保护、递归深度、循环引用、fallback 优先级等边界行为。

```ts
/**
 * @description 回归用例：变量互相引用时必须返回结构化错误，不能让递归继续增长。
 */
it('detects circular variable references', () => {});
```

### 14. 注释质量检查

提交前自查以下问题：

- Provider 是否说明了触发时机、返回空值条件和 VS Code 资源释放方式。
- Resolver 是否说明了 fallback、循环引用、递归深度和无法解析时的返回结构。
- Scanner 是否说明了匹配范围、正则限制和误报控制。
- Workspace index 是否说明了防抖、缓存、扫描上限和文件读取失败策略。
- 类型字段是否能在 IDE hover 中直接解释业务含义。
- 注释是否解释行为和边界，而不是重复代码表面意思。

### 15. 优先级

优先保证以下位置注释完整：Provider 类、resolver / scanner / workspace index 的核心方法、配置类型、共享类型字段、复杂正则、缓存策略、递归解析和性能保护逻辑。简单实现可以少写，但公共 API 和边界行为必须写清楚。
