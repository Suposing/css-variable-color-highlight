# CSS 变量颜色高亮

在 VS Code 中展示普通 CSS 颜色和 CSS 变量解析后的颜色，体验接近 `color-highlight`，并额外支持 `var(--xxx)`。

## 功能

- 高亮 `#fff`、`rgb()`、`rgba()`、`hsl()`、`hsla()` 和常见 CSS 颜色关键字。
- 解析 `var(--color-primary)`，并在变量调用处展示最终颜色色块。
- 支持 `var(--missing, #1677ff)` 备用值。
- 支持变量嵌套和循环引用保护。
- 支持在 `linear-gradient()`、`box-shadow`、`background` 等复合值里解析多个颜色。
- 鼠标悬浮时展示变量名、解析值、备用值和定义来源。

## 开发

```bash
pnpm install
pnpm compile
pnpm test
```

按 F5 启动扩展开发宿主，默认会打开 `samples/` 目录用于手动验收。

## 配置

所有配置项都使用 `cssVariableColorHighlight` 前缀，可在 VS Code 设置界面中搜索“CSS 变量颜色高亮”进行配置：

- `cssVariableColorHighlight.enabled`：启用 CSS 颜色和 CSS 变量颜色高亮。
- `cssVariableColorHighlight.languages`：插件扫描颜色的 VS Code 语言 ID 列表。
- `cssVariableColorHighlight.include`：用于建立 CSS 变量定义索引的工作区文件匹配规则。
- `cssVariableColorHighlight.exclude`：建立 CSS 变量定义索引时排除的工作区文件匹配规则。
- `cssVariableColorHighlight.showDecorations`：在颜色值和已解析的 CSS 变量旁显示颜色装饰。
- `cssVariableColorHighlight.decorationStyle`：已解析颜色的展示方式，可选 `background`、`swatch`、`both`，默认 `background`。
- `cssVariableColorHighlight.showUnresolvedVariableDecorations`：为无法解析为颜色的 CSS 变量显示轻量提示装饰，默认开启。
- `cssVariableColorHighlight.unresolvedVariableDecorationStyle`：无法解析变量的标记方式，可选 `border`、`underline`、`both`，默认 `both`。
- `cssVariableColorHighlight.showHover`：鼠标悬浮在颜色或 CSS 变量上时显示解析信息。
- `cssVariableColorHighlight.maxWorkspaceFiles`：为查找 CSS 变量定义最多扫描的工作区文件数量。
- `cssVariableColorHighlight.resolveFallback`：CSS 变量无法解析时，使用 `var()` 中的备用值。

## 已知限制

- 当前版本采用静态解析，不模拟浏览器完整 CSS 级联、媒体查询命中或运行时主题切换。
- 同名变量存在多个作用域定义时，会优先选择当前文档内较近定义，再使用工作区索引中的定义。
