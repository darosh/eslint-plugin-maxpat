// lib/rules/check-overlapping-objects-presentation.js
export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Check for overlapping objects in presentation mode',
      category: 'Best Practices',
      recommended: false, // More lenient by default
    },
    schema: [
      {
        type: 'object',
        properties: {
          exceptions: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          threshold: {
            type: 'number',
            minimum: 0,
          },
          allowIntentionalOverlays: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      overlappingPresentation: 'Objects "{{obj1Type}}" and "{{obj2Type}}" are overlapping in presentation mode ({{overlap}}px)',
      overlappingPresentationWithText: 'Objects "{{obj1Type}}" ({{obj1Text}}) and "{{obj2Type}}" ({{obj2Text}}) are overlapping in presentation mode ({{overlap}}px)',
    },
  },

  create (context) {
    const options = context.options[0] || {}
    const exceptions = options.exceptions || ['panel', 'bpatcher', 'live.text', 'live.comment']
    const threshold = options.threshold || 1
    const allowIntentionalOverlays = options.allowIntentionalOverlays || true

    // Similar implementation but checks presentation_rect instead of patching_rect
    function getObjectRect (boxProps) {
      const presentationProperty = boxProps.find(p => p.key.value === 'presentation')
      if (!presentationProperty || presentationProperty.value.value !== 1) {
        return null // Object not in presentation mode
      }

      const presentRectProperty = boxProps.find(p => p.key.value === 'presentation_rect')
      if (!presentRectProperty || presentRectProperty.value.type !== 'JSONArrayExpression') {
        return null
      }

      // Rest similar to patching version...
      const rect = presentRectProperty.value.elements
      if (rect.length < 4) return null

      const x = rect[0]?.value
      const y = rect[1]?.value
      const width = rect[2]?.value
      const height = rect[3]?.value

      if (typeof x !== 'number' || typeof y !== 'number' ||
        typeof width !== 'number' || typeof height !== 'number') {
        return null
      }

      return {
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
        width,
        height
      }
    }

    // Implementation follows same pattern as patching version
    // but with presentation-specific logic...

    return {
      JSONProperty (node) {
        if (node.key.value !== 'patcher' || node.value.type !== 'JSONObjectExpression') {
          return
        }
        // traversePatcher implementation here...
      }
    }
  }
}
