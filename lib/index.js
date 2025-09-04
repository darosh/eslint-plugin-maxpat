import jsonc from 'jsonc-eslint-parser'

import validateStructure from './rules/validate-structure.js'
import checkDeprecatedObjects from './rules/check-deprecated-objects.js'
import requireSnapToGrid from './rules/require-snap-to-grid.js'
import requireSnapToPixel from './rules/require-snap-to-pixel.js'
import requireDefaultGridSize from './rules/require-default-grid-size.js'
import requirePositionRounding from './rules/require-position-rounding.js'
import checkDisconnectedObjects from './rules/check-disconnected-objects.js'
import listUiElements from './rules/list-ui-elements.js'

const plugin = {
  meta: {
    name: 'eslint-plugin-maxpat',
    version: '1.0.0',
  },
  rules: {
    'validate-structure': validateStructure,
    'check-deprecated-objects': checkDeprecatedObjects,
    'require-snap-to-grid': requireSnapToGrid,
    'require-snap-to-pixel': requireSnapToPixel,
    'require-default-grid-size': requireDefaultGridSize,
    'require-position-rounding': requirePositionRounding,
    'check-disconnected-objects': checkDisconnectedObjects,
    'list-ui-elements': listUiElements,
  },
  configs: {}
}

Object.assign(plugin.configs, {
  recommended: {
    files: ['*.maxpat'],
    plugins: { maxpat: plugin },
    languageOptions: { parser: jsonc, },
    rules: {
      'maxpat/validate-structure': 'error',
      'maxpat/check-deprecated-objects': ['warn', ['gate~', 'switch~', 'scope~', 'poly~', 'drunk']],
      'maxpat/require-snap-to-grid': ['warn'],
      'maxpat/require-snap-to-pixel': ['warn'],
      'maxpat/require-default-grid-size': ['warn', [8, 8]],
      'maxpat/require-position-rounding': ['warn', { 'patching-precision': [8, 8], 'presentation-precision': [1, 1], }],
      'maxpat/check-disconnected-objects': ['warn', ['comment', 'panel', 'fpic', 'bpatcher', 'live.comment', 'live.banks'],],
      'maxpat/list-ui-elements': ['warn', ['slider', 'dial', 'button', 'toggle', 'number', 'live.dial', 'live.slider', 'live.button', 'live.toggle', 'live.text', 'live.menu', 'live.tab',]],
      // 'require-fileversion': 'warn',
      // 'require-appversion': 'warn',
      // 'check-window-bounds': ['warn', { 'min-size': [100, 100], 'max-size': [2000, 1500], }],
      // 'require-show-grid': 'off',
      // 'require-snap-to-object-off': 'warn',
      // 'require-open-in-presentation': 'warn',
      // 'check-missing-objects': 'error',
      // 'check-duplicate-object-types': 'off',
      // 'check-negative-coordinates': 'warn',
      // 'validate-connections': 'error',
      // 'check-print-connections': 'warn',
      // 'check-local-sends': 'warn',
      // 'global-send-receive': ['warn', ['master-volume', 'tempo', 'transport', 'midi-in', 'midi-out']],
      // 'global-dict': ['warn', ['settings', 'presets', 'user-data', 'project-config']],
      // 'global-value': ['warn', ['project-tempo', 'master-gain', 'sample-rate', 'buffer-size']],
      // 'naming-send-receive': ['warn', '^[a-zA-Z][a-zA-Z0-9_-]*$'],
      // 'naming-patcher': ['warn', '^[a-zA-Z][a-zA-Z0-9_-]*$'],
      // 'naming-dict': ['warn', '^[a-zA-Z][a-zA-Z0-9_-]*$'],
      // 'naming-value': ['warn', '^[a-zA-Z][a-zA-Z0-9_-]*$'],
      // 'check-ui-sizing': ['warn', { 'min-width': 10, 'min-height': 10, }],
      // 'require-ui-annotation': ['warn', ['slider', 'dial', 'button', 'toggle', 'number', 'live.dial', 'live.slider', 'live.button', 'live.toggle', 'live.menu', 'live.tab',]],
      // 'check-ui-hint-usage': ['warn', ['slider', 'dial', 'button', 'toggle', 'number', 'live.dial', 'live.slider', 'live.button', 'live.toggle', 'live.menu', 'live.tab',]],
      // 'check-generic-names': ['warn', ['\\[\\d+\\]$', '^(live\\.)?\\w+$', '^untitled', '^(slider|dial|button)\\d*$',]],
      // 'check-annotation-consistency': 'warn',
      // 'check-performance-issues': ['warn', {
      //   'metro-min-interval': 10, 'performance-objects': ['metro', 'drunk', 'random', 'line~', 'curve~'],
      // }],
      // 'check-feedback-loops': 'warn',
    },
  },
})

export default plugin
