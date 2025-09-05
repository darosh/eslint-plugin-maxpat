import jsonc from 'jsonc-eslint-parser'
import { loadModules } from './utils/load-modules.js'

const plugin = {
  meta: {
    name: 'eslint-plugin-maxpat',
    version: '1.0.0',
  },
  rules: await loadModules('./rules', import.meta.url),
  configs: {}
}

Object.assign(plugin.configs, {
  recommended: {
    files: ['*.maxpat'],
    plugins: { maxpat: plugin },
    languageOptions: { parser: jsonc, },
    rules: {
      // STRUCTURE
      'maxpat/structure/validate': 'error',

      // LAYOUT
      'maxpat/layout/snap-to-grid': ['warn', { snap: true, fix: true }],
      'maxpat/layout/snap-to-pixel': ['warn', { snap: true, fix: true }],
      'maxpat/layout/grid-size': ['warn', { grid: [8, 8], fix: true }],
      'maxpat/layout/position-rounding': ['warn', {
        'patching-precision': [8, 8],
        'presentation-precision': [1, 1],
        fix: true
      }],
      'maxpat/layout/patching-overlaps': ['warn', {
        exceptions: ['panel', 'comment', 'bpatcher', 'inlet', 'outlet'],
        threshold: 5 // More forgiving for patching mode
      }],
      'maxpat/layout/presentation-overlaps': ['warn', {
        exceptions: ['panel', 'bpatcher', 'live.comment', 'comment'],
        threshold: 1, // Precise for UI
      }],

      // UI
      'maxpat/ui/annotation-info': ['warn', {
        include: [
          'slider', 'dial', 'button', 'toggle', 'number', 'live.dial',
          'live.slider', 'live.button', 'live.toggle', 'live.text',
          'live.menu', 'live.tab',
        ]
      }],

      // FLOW
      'maxpat/flow/disconnected': ['warn', {
        exclude: [
          'comment', 'panel', 'fpic', 'bpatcher',
          'live.comment', 'live.banks'
        ]
      },],
      'maxpat/flow/local-send-receive': 'warn',
      'maxpat/flow/global-send-receive': ['warn', {
        exclude: [
          'master-volume', 'tempo', 'transport'
        ]
      }],

      // DEBUG
      'maxpat/debug/connected-print': ['warn', { fix: true }],

      // COMPATIBILITY
      'maxpat/compatibility/deprecated': ['warn', {
        deprecated: [
          'gate~', 'switch~', 'scope~', 'poly~', 'drunk'
        ]
      }],

      // PERFORMANCE
      'maxpat/performance/defer': ['warn', {
        include: [
          'live.dial', 'live.slider', 'live.button'
        ]
      }],
      'maxpat/performance/speed-limit': ['warn', {
        milliseconds: 1, include: [
          'slider', 'dial', 'button', 'toggle', 'number', 'live.dial',
          'live.slider', 'live.button', 'live.toggle', 'live.text',
          'live.menu', 'live.tab',
        ], fix: true
      }],

      // ========== BRAINSTORMING RULES =============

      // 'maxpat/check-many-send-receive': ['warn', 8] // Consider using pvar
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

      // ========== PERFORMANCE & CPU RULES ==========

      // Warn about CPU-heavy objects in performance patches
      // 'maxpat/check-expensive-objects': ['warn', [
      //   'spectroscope~', 'scope~', 'pfft~', 'fft~', 'freqshift~', 
      //   'pitchshift~', 'gizmo~', 'jit.gl.videoplane'
      // ]],

      // Find metro objects that might be running unnecessarily
      // 'maxpat/check-unnecessary-metro': ['warn', {
      //   requireStopCondition: true,
      //   maxInterval: 1000 // warn if interval < 1000ms without explicit need
      // }],

      // Check poly~ and other objects that force high sample rates
      // 'maxpat/check-high-sample-rate-objects': ['warn', {
      //   objects: ['poly~', 'pfft~'],
      //   warnAbove: 48000 // sample rate threshold
      // }],

      // ========== PROGRAMMING MISTAKE RULES ==========

      // Detect potential infinite loops and recursion risks
      // 'maxpat/check-stack-overflow-risks': ['error', {
      //   checkTriggerLoops: true,
      //   checkSendReceiveLoops: true,
      //   checkRecursiveBpatchers: true
      // }],

      // Find variables that might not be initialized
      // 'maxpat/check-uninitialized-variables': ['warn', {
      //   checkVariables: ['v', 'value'], // [v varname], [value name]
      //   requireInitialization: true
      // }],

      // Objects that need initialization but lack loadbang
      // 'maxpat/check-missing-loadbang': ['warn', {
      //   requireLoadbang: [
      //     'table', 'coll', 'preset', 'pattrstorage', 'dict',
      //     'buffer~', 'sfplay~', 'groove~', 'sfrecord~',
      //     'counter', 'itable', 'function', 'multislider'
      //   ],
      //   checkForMessages: ['read', 'load', 'reset', 'recall'],
      //   ignoreWithObjects: ['autopattr', 'pattr'] // Managed by pattr system
      // }],

      // ========== AUDIO/MSP RULES ==========

      // Objects that commonly cause audio dropouts
      // 'maxpat/check-audio-dropouts': ['warn', {
      //   objects: ['print~', 'scope~', 'meter~'],
      //   autofix: true, // Remove or replace with safer alternatives
      //   alternatives: {
      //     'print~': 'snapshot~',
      //     'scope~': 'meter~'
      //   }
      // }],

      // Check for inconsistent sample rates in signal chain
      // 'maxpat/check-mismatched-sample-rates': ['error', {
      //   enforceConsistency: true,
      //   allowedRates: [44100, 48000, 96000]
      // }],

      // Detect redundant MSP conversions (sig~ -> snapshot~ -> sig~)
      // 'maxpat/check-unnecessary-conversions': ['warn', {
      //   detectRedundant: ['sig~', 'snapshot~', 'number~'],
      //   autofix: true
      // }],

      // Check for proper audio object connections
      // 'maxpat/check-audio-connections': ['warn', {
      //   requireSignalConnections: ['*~', '+~', 'dac~', 'adc~'],
      //   warnMixedTypes: true // signal vs message connections
      // }],

      // ========== INTERFACE & USABILITY RULES ==========

      // Complex patches without documentation
      // 'maxpat/check-missing-comments': ['warn', {
      //   minObjects: 20, // Patches with 20+ objects should have comments
      //   requireDescriptiveNames: true,
      //   checkBpatcherNames: true
      // }],

      // Patch cords that are too short to see clearly
      // 'maxpat/check-tiny-patch-cords': ['warn', {
      //   minDistance: 30, // pixels
      //   suggestBetterPlacement: true
      // }],

      // Check for consistent object naming conventions
      // 'maxpat/check-naming-conventions': ['warn', {
      //   bpatchers: 'kebab-case', // my-synth.maxpat
      //   sendReceive: 'camelCase', // myVariable
      //   comments: 'sentence-case' // Descriptive comments
      // }],

      // ========== MEMORY & RESOURCE RULES ==========

      // Unnecessarily large buffer~/table objects
      // 'maxpat/check-large-buffers': ['warn', {
      //   maxSize: 44100, // 1 second at 44.1kHz
      //   objects: ['buffer~', 'table'],
      //   suggestAlternatives: true
      // }],

      // Objects that can cause memory leaks
      // 'maxpat/check-memory-leaks': ['warn', {
      //   objects: ['jit.matrix', 'buffer~', 'coll', 'dict'],
      //   checkProperCleanup: true,
      //   requireClearMessages: ['clear', 'dispose']
      // }],

      // Check for excessive polyphony
      // 'maxpat/check-excessive-polyphony': ['warn', {
      //   maxVoices: 32,
      //   objects: ['poly~', 'thispoly~'],
      //   considerCPU: true
      // }],

      // ========== MAX FOR LIVE RULES ==========

      // Max for Live specific performance optimizations

      // Live API usage best practices
      // 'maxpat/check-live-api-usage': ['warn', {
      //   checkObservers: true, // Proper observer cleanup
      //   limitApiCalls: 10, // Max API calls per patch
      //   requireErrorHandling: true
      // }],

      // Check for proper Live parameter mapping
      // 'maxpat/check-live-parameters': ['warn', {
      //   maxParameters: 128,
      //   requireDescriptiveNames: true,
      //   checkRanges: true
      // }],

      // ========== SECURITY & BEST PRACTICES ==========

      // Check for potentially unsafe object usage
      // 'maxpat/check-unsafe-objects': ['error', {
      //   objects: ['shell', 'terminal', 'js'], // Objects that can execute code
      //   requireJustification: true
      // }],

      // Detect hardcoded file paths that won't work cross-platform
      // 'maxpat/check-hardcoded-paths': ['warn', {
      //   detectAbsolutePaths: true,
      //   suggestRelativePaths: true,
      //   checkFileObjects: ['sfplay~', 'buffer~', 'playlist~']
      // }],

      // Check for deprecated objects and suggest alternatives
      // 'maxpat/check-deprecated-objects': ['warn', {
      //   deprecated: {
      //     'uzi': 'urn',
      //     'borax': 'zl',
      //     'mousestate': 'mouse'
      //   },
      //   autofix: false // Suggest but don't auto-replace
      // }],

      // ========== COLLABORATION & VERSION CONTROL ==========

      // Check for merge conflict markers in patches
      // 'maxpat/check-merge-conflicts': ['error', {
      //   detectConflictMarkers: true,
      //   checkDuplicateIDs: true
      // }],

      // Ensure consistent formatting for version control
      // 'maxpat/check-version-control-format': ['warn', {
      //   sortProperties: true,
      //   consistentIndentation: true,
      //   removeTemporaryData: ['selections', 'openrect']
      // }],

      // ========== JITTER/VIDEO RULES ==========

      // Check for Jitter performance issues
      // 'maxpat/check-jitter-performance': ['warn', {
      //   objects: ['jit.gl.render', 'jit.gl.videoplane'],
      //   checkMatrixSizes: true,
      //   maxTextureSize: 1024
      // }],

      // Check for proper Jitter matrix dimensions
      // 'maxpat/check-jitter-dimensions': ['warn', {
      //   powerOfTwo: true, // Textures should be power of 2
      //   maxDimensions: [1920, 1080],
      //   checkDataTypes: true
      // }],

      // ========== TIMING & SYNCHRONIZATION ==========

      // Check for timing precision issues
      // 'maxpat/check-timing-precision': ['warn', {
      //   preferClockSync: true,
      //   checkMetroAccuracy: true,
      //   objects: ['metro', 'clocker', 'transport']
      // }],

      // Check for proper MIDI timing
      // 'maxpat/check-midi-timing': ['warn', {
      //   checkMidiClock: true,
      //   synchronizeObjects: ['seq', 'transport'],
      //   requireClockSource: true
      // }],

      // ========== EDUCATIONAL/LEARNING RULES ==========

      // Suggest more efficient alternatives to common patterns
      // 'maxpat/suggest-alternatives': ['info', {
      //   patterns: {
      //     'bang -> delay -> bang': 'Use metro instead',
      //     'multiple gates': 'Consider using router',
      //     'many send/receive': 'Consider using pvar system'
      //   }
      // }],

      // Check patch complexity and suggest refactoring
      // 'maxpat/check-complexity': ['warn', {
      //   maxObjects: 100,
      //   maxDepth: 5, // levels of bpatcher nesting
      //   suggestModularization: true
      // }]
    },
  },
})

export default plugin
