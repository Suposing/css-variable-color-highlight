# 更新日志

## 0.0.3

- 修复 `height: calc(... var(--window-bottom, 0px))` 等非颜色属性中的变量被误标记为未解析颜色变量的问题。
- 优化未解析变量提示：仅在颜色相关属性或带颜色语义的变量名中保留装饰和 hover，减少尺寸、间距等变量误报。
- 已验证 `pnpm test` 和 `pnpm lint` 通过。

## 0.0.2

- 修复 Vue 模板事件简写（如 `@create-order`）被误识别为 Less 变量的问题。
- 修复 `@update:model-value` 可能跨行误判为 Less 变量定义的问题。
- 已验证 `pnpm test` 和 `pnpm lint` 通过。

## 0.0.1

- 初始化 VS Code 插件工程。
- 支持普通颜色和 CSS 变量解析。
- 支持颜色色块装饰和 hover 信息。
