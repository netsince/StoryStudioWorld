import { defineConfig, globalIgnores } from 'eslint/config'
import eslintJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintReact from '@eslint-react/eslint-plugin'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import globals from 'globals'

export default defineConfig(
  globalIgnores([
    // 1. 基础依赖和常规打包产物
    '**/node_modules/**',
    '**/dist/**',
    '**/out/**',
    '**/build/**',
    
    // 2. 根目录下不需要 lint 的独立文件夹
    '**/website/**',
    '**/docs/**',
    '**/scripts/**',
    '**/resources/**',
    '**/参考/**',
    'testplugin/**',

    // 3. 排除 TS 的编译缓存文件
    '**/*.tsbuildinfo',

    // 4. 终极性能杀手：屏蔽 Monaco/VSCode 底层源码库
    // 46 万行的代码去跑类型推导会直接卡死 ESLint，全部忽略
    '**/src/vse/**'
  ]),
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintReact.configs['recommended-typescript'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    settings: {
      'eslint-react': {
        additionalHooks: {
          use: ['use']
        }
      }
    }
  },
  {
    rules: {
      '@eslint-react/no-nested-component-definitions': 'off',
      '@eslint-react/static-components': 'warn',
      '@eslint-react/unsupported-syntax': 'warn'
    }
  },
  eslintConfigPrettier
)
