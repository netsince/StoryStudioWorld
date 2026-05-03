import { defineConfig, globalIgnores } from 'eslint/config'
import eslintJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintReact from '@eslint-react/eslint-plugin'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import globals from 'globals'

export default defineConfig(
  globalIgnores([
    '**/node_modules',
    '**/dist',
    '**/out',
    '**/build',
    '**/参考/**',
    'testplugin/**'
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
