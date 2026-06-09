# 仓库指南

## 项目定位
- 本项目是一个 VS Code 插件，用于在编辑器中直观展示颜色值。
- 核心目标：实现类似 `color-highlight` 的颜色预览体验，并重点支持 CSS 变量，例如 `var(--dd-gradient-primary-deep)`、`var(--dd-shadow-primary-24)`。
- 用户在代码中看到颜色、渐变、阴影等样式值时，应能直接看到对应色块；鼠标悬浮时，应展示变量名、解析后的具体颜色值、变量定义来源和 fallback 信息。
- 优先服务真实前端工程中的 CSS 变量场景，包括设计系统变量、主题变量、全局样式变量和组件内变量。

## 核心功能范围
- 识别普通颜色值：`#fff`、`#ffffff`、`rgb()`、`rgba()`、`hsl()`、`hsla()`、CSS 颜色关键字等。
- 识别 CSS 变量调用：`var(--color-primary)`、`var(--color-primary, #1677ff)`。
- 解析 CSS 变量定义：`:root { --color-primary: #1677ff; }`、选择器内变量、预处理器文件中的变量定义。
- 支持复合样式中的变量：`linear-gradient()`、`box-shadow`、`border`、`background`、`color` 等属性中嵌套的 `var()`。
- 支持 hover 展示：变量名、最终颜色值、原始表达式、fallback、定义文件路径与行号。
- 支持编辑器装饰：在变量或颜色值附近渲染色块，不影响用户代码文本本身。
- 支持配置开关：启用语言、扫描范围、是否显示内联色块、是否显示 hover、最大扫描文件数等。

## 非目标与边界
- 不做浏览器运行时级别的完整 CSS 级联计算；优先做静态解析和可解释的近似解析。
- 不强行解析依赖 DOM 状态、媒体查询命中结果、运行时主题切换后的最终值，除非后续有明确需求。
- 不修改用户代码，不自动替换变量名或颜色值。
- 不把无法确定的变量伪装成已解析；无法解析时 hover 中明确说明原因，并优先展示 fallback。

## 项目结构与模块组织
- `src/extension.ts` 作为插件入口，只负责激活、注册 provider、初始化服务和清理 disposables。
- `src/providers/` 存放 VS Code Provider：
  - `colorDecorationProvider.ts`：负责编辑器装饰和色块展示。
  - `cssVariableHoverProvider.ts`：负责 hover 内容。
  - `documentColorProvider.ts`：如接入 VS Code 原生颜色能力，放置相关实现。
- `src/services/` 存放核心业务服务：
  - `cssVariableResolver.ts`：解析变量引用、变量定义、fallback 和最终颜色。
  - `workspaceVariableIndex.ts`：维护工作区变量索引和缓存。
  - `documentScanner.ts`：扫描单个文档中的颜色、变量调用和变量定义。
  - `configurationService.ts`：读取并规范化插件配置。
- `src/utils/` 存放纯工具函数，如颜色格式解析、范围转换、正则辅助、路径格式化等。
- `src/types/` 存放共享类型声明，避免 provider 与 service 之间互相依赖具体实现。
- `src/test/` 或 `test/` 存放插件单元测试与集成测试。
- `assets/` 存放插件图标、README 配图等资源。
- 构建输出目录如 `out/`、`dist/` 不跟踪到 Git。

## 技术栈与实现约定
- 默认使用 TypeScript 编写 VS Code Extension。
- 使用 VS Code Extension API 注册 `HoverProvider`、编辑器装饰、文件监听和配置监听。
- 优先保持 provider 薄、service 厚：provider 负责和 VS Code 交互，解析逻辑放入 service 或 utils。
- 核心解析逻辑尽量设计为纯函数，便于单元测试。
- 对 CSS 语法解析优先使用成熟解析器或清晰的 tokenizer；只有在范围可控时才使用正则。
- 文件扫描应考虑性能：防抖处理文档变化，缓存变量索引，避免每次光标移动都全量扫描工作区。
- 对大型工作区设置扫描上限，并允许用户通过配置缩小 include/exclude 范围。

## CSS 变量解析策略
- 先解析当前文档内的变量定义，再查询工作区索引中的全局定义。
- 同名变量存在多个定义时，优先展示最接近当前文档或当前作用域的候选，并在 hover 中列出可能来源。
- 支持嵌套变量：`--a: var(--b); --b: #fff;` 应递归解析，并设置递归深度上限避免循环引用。
- 支持 fallback：`var(--missing-color, #f00)` 在变量缺失时解析为 `#f00`。
- 支持复合值拆解：对于 `linear-gradient(180deg, var(--a) 0%, var(--b) 100%)`，需要分别解析出多个颜色停止点。
- 对无法解析为颜色的变量值，如尺寸、字体、透明度等，不显示颜色色块，但 hover 可说明该变量不是颜色值。
- 对循环引用、缺失定义、语法不完整等情况，应返回结构化错误，不抛出未捕获异常。

## 支持文件类型
- 默认支持：`css`、`scss`、`sass`、`less`、`postcss`、`vue`、`html`、`svelte`、`astro`、`javascript`、`typescript`、`javascriptreact`、`typescriptreact`。
- 在 Vue、React、Svelte、Astro 等文件中，优先扫描 `<style>`、模板内 style 属性、字符串中的样式片段。
- 对 JS/TS 字符串中的样式解析保持保守，避免大量误报。
- 新增语言支持时，需要同步更新配置默认值、README 说明和测试样例。

## 装饰与交互规范
- 色块应小而清晰，放在变量或颜色值附近，不能遮挡代码文本。
- 对透明色、渐变和多颜色值应有可区分的展示方式。
- hover 内容应简洁，优先显示最有用的信息：
  - `变量：--color-primary`
  - `解析值：#1677ff`
  - `原始值：var(--color-primary, #409eff)`
  - `来源：src/styles/theme.css:12`
  - `Fallback：#409eff`
- hover 中的文件路径和行号应尽量可点击或便于用户定位。
- 用户关闭某项能力后，应立即响应配置变化，无需重启 VS Code。

## 配置建议
- 配置项统一使用插件名前缀，例如 `cssVariableColorHighlight.enabled`。
- 推荐配置项：
  - `cssVariableColorHighlight.enabled`
  - `cssVariableColorHighlight.languages`
  - `cssVariableColorHighlight.include`
  - `cssVariableColorHighlight.exclude`
  - `cssVariableColorHighlight.showDecorations`
  - `cssVariableColorHighlight.showHover`
  - `cssVariableColorHighlight.maxWorkspaceFiles`
  - `cssVariableColorHighlight.resolveFallback`
- 新增配置时同步更新 `package.json` 的 `contributes.configuration`、README 和默认配置服务。

## 构建、测试与开发命令
- `pnpm install` 安装依赖。
- `pnpm compile` 编译 TypeScript。
- `pnpm watch` 开发时监听编译。
- `pnpm lint` 运行代码检查。
- `pnpm test` 运行测试。
- `pnpm package` 如项目接入 `vsce`，用于打包 `.vsix`。
- 若实际脚本名称与以上不同，以 `package.json` 为准；修改脚本时同步更新本文件和 README。

## 调试方式
- 使用 VS Code 的 Extension Development Host 调试插件。
- 修改激活逻辑、provider 注册或配置贡献点后，需要重新启动 Extension Development Host 验证。
- 调试样例建议放在 `fixtures/` 或 `samples/`，覆盖普通颜色、CSS 变量、嵌套变量、fallback、渐变和阴影。
- 验证时至少打开一个包含 `var(--xxx)` 的样式文件，确认色块与 hover 都能正常工作。

## 代码风格与命名规范
- 默认使用 TypeScript，开启严格类型检查。
- 文件名使用 `camelCase.ts`；类名、接口名、类型名使用 `PascalCase`。
- Provider 类以 `Provider` 结尾，服务类以 `Service` 或明确领域名结尾。
- 纯函数命名使用动词开头，如 `parseCssVariables`、`resolveColorValue`。
- 常量使用 `UPPER_SNAKE_CASE` 或项目已有风格，避免魔法字符串散落在多个文件。
- 避免把复杂正则直接内联到业务逻辑中；需要命名并补充说明。

## JSDoc 注释规范要求
- 所有新增或修改的 TypeScript/JavaScript 模块中的关键函数、核心类、对外导出方法、复杂解析逻辑都必须编写 JSDoc 注释。
- 注释语言统一使用中文，标签优先使用：`@description`、`@property`、`@param`、`@returns`、`@event`。
- 对 provider、resolver、scanner、workspace index、配置读取等核心模块，必须说明输入、输出、边界行为和异常处理策略。
- 简单中间变量可不写注释，但复杂正则、缓存策略、递归解析和性能保护逻辑必须说明原因。
- 若根目录存在 `JSDOC_STYLE.md`，优先遵守该文件中的示例风格。

## 测试与验收策略
- 默认只对本次改动点做自查，不主动改动无关文件。
- 核心解析函数必须优先补单元测试，尤其是：
  - 普通颜色识别。
  - CSS 变量定义识别。
  - `var()` 调用解析。
  - fallback 解析。
  - 嵌套变量解析。
  - 循环引用保护。
  - 渐变和阴影中的多颜色解析。
- VS Code API 相关能力应通过集成测试或手动调试验证。
- 验收插件功能时至少确认：
  - 普通颜色能显示色块。
  - `var(--color)` 能显示解析后的色块。
  - 鼠标悬浮能展示变量名和具体值。
  - 变量定义变更后，色块和 hover 能刷新。
  - 变量无法解析时不崩溃，并给出可理解提示。

## 性能与稳定性要求
- 文档变更监听必须防抖，避免输入时频繁全量解析。
- 工作区扫描必须尊重 include/exclude、文件数量上限和 VS Code 的忽略规则。
- 缓存需要在文件保存、删除、重命名、配置变化时正确失效。
- 解析失败不能影响编辑器输入体验；错误应记录到输出通道或调试日志中。
- 避免在 hover 回调中执行昂贵的全工作区扫描。

## 文档与发布
- README 应包含插件能力截图或动图、支持语法、配置项和已知限制。
- CHANGELOG 记录用户可感知的功能变化、修复和破坏性变更。
- 发布前确认 `package.json` 中的 `activationEvents`、`contributes.configuration`、`contributes.commands`、插件图标和 README 都已更新。
- 插件命名、展示名和配置前缀需保持一致，避免用户搜索与配置时混淆。

## AI 智能代理手册
- 在新增功能前，先阅读现有 `package.json`、`src/extension.ts`、provider、service 和测试结构，按当前项目风格实现。
- 当需求涉及 CSS 变量解析时，优先完善解析服务和测试，再接入装饰或 hover。
- 不要为了快速实现把所有逻辑堆进 `extension.ts`；入口文件只保留注册和生命周期管理。
- 若需要参考 `color-highlight` 的体验，只参考交互形态和用户期望，不直接复制其代码。
- 涉及 VS Code API 的最新用法时，优先查阅官方 VS Code Extension API 文档。
- 修改 `package.json` 的插件贡献点时，需要同时确认类型、默认值、README 说明和实际读取逻辑。
- 对用户已有未提交改动保持谨慎，只处理本次任务相关文件。

## 变更确认机制（User Approval）
1. 当我向你提问以澄清需求/范围后，在你明确回复“确认/同意/按这个做”之前，我只能做：代码阅读、定位、分析、提出修改方案与影响面说明；不得直接修改任何代码或配置。
2. 在准备修改代码前，我必须先说明：准备改哪些文件/哪些函数、预期效果、可能影响（含是否涉及插件激活、配置项、命令、装饰、hover、扫描范围、性能等）。你确认后我才执行实际修改。
3. 删除任何代码、文件或目录（含移除配置、命令、资源、测试、文档）必须单独征得你的明确同意；未获得同意不得执行删除操作。
4. **禁止丢弃未提交改动**：除非你明确说“可以丢弃/恢复/撤销某文件改动”，否则我不得执行任何会丢弃工作区改动的 Git 操作，包括但不限于：`git checkout -- <file>`、`git restore`、`git reset --hard`、`git clean`、`git stash pop/drop`，以及 IDE 中等价的 Discard/Undo 变更操作。
5. **清理无关文件需二次确认**：若我发现本次需求之外的文件也被改动，我只能先列出“将被恢复/撤销”的文件清单与原因；得到你明确同意后，才允许对这些文件做还原操作（建议优先 `git stash` 备份再处理）。
6. **临时文件删除例外**：允许我直接删除“由我在当前会话中生成、且未被 Git 跟踪的临时文件”（如 `_tmp_*`、临时日志、临时脚本产物）；该例外不适用于任何业务代码、配置、资源文件或用户手动创建的文件。

## 分支命名规范
- `main`：主分支。
- `dev`：开发集成分支。
- `feature/<简述>`：新功能。
- `fix/<简述>`：修复 bug。
- `hotfix/<简述>`：紧急修复。
- `docs/<简述>`：文档更新。
- `chore/<简述>`：构建、工具或杂项。

命名建议：
- 全小写，使用 `-` 连接单词。
- 描述尽量短且清晰。
- 可选任务号前缀：`feature/123-css-variable-hover`。
