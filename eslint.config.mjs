import { defineConfig } from 'eslint/config'
import pluginJs from '@eslint/js'
import eslintPlugin from 'eslint-plugin-eslint-plugin'

export default defineConfig([
  {
    name: 'eslint/js',
    plugins: {
      js: pluginJs,
    },
    extends: ['js/recommended'],
  },
  {
    name: 'eslint/eslint-plugin',
    plugins: {
      'eslint-plugin': eslintPlugin,
    },
    extends: ['eslint-plugin/recommended'],
  }
])
