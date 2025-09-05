import { getOverlapsCreate } from '../../utils/overlaps.js'

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
            description: 'Ignored objects'
          },
          threshold: {
            type: 'number',
            minimum: 0,
            description: 'Allowed overlap in pixels'
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [
      {
        exceptions: ['panel', 'bpatcher', 'live.comment', 'comment'],
        threshold: 1, // Precise for UI
      }
    ],
    messages: {
      overlappingObjects: 'Objects "{{obj1Type}}" and "{{obj2Type}}" are overlapping in {{mode}} mode ({{overlap}}px)',
      overlappingObjectsWithText: 'Objects "{{obj1Type}}" ({{obj1Text}}) and "{{obj2Type}}" ({{obj2Text}}) are overlapping in {{mode}} mode ({{overlap}}px)',
    },
  },
  create: getOverlapsCreate('presentation_rect', 1)
}
