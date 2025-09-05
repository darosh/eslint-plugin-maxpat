import { defineConfig } from 'eslint/config'
import pluginJs from '@eslint/js'
import eslintPlugin from 'eslint-plugin-eslint-plugin'
import n from 'eslint-plugin-n'

export default defineConfig([
  {
    name: 'eslint/js',
    plugins: {
      js: pluginJs,
    },
    extends: ['js/recommended'],
  },
  {
    name: 'eslint-plugin-n',
    plugins: {
      'n': n,
    },
    extends: ['n/recommended'],
  },
  {
    name: 'eslint/eslint-plugin',
    plugins: {
      'eslint-plugin': eslintPlugin,
    },
    extends: ['eslint-plugin/recommended'],
    rules: {
      'n/no-unpublished-import': 'off',
      'eslint-plugin/no-meta-schema-default': 'off'
    }
  }
])
