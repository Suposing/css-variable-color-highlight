import { defineConfig } from 'vitest/config';

/**
 * @description Vitest 单元测试配置，只运行源码目录下的测试文件，并排除依赖和构建产物。
 */
export default defineConfig({
  test: {
    include: [
      'src/test/**/*.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'out/**',
      'dist/**',
    ],
  },
});
