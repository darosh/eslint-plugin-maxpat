export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Check for overlapping objects in patching mode',
      category: 'Best Practices',
      recommended: true,
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
        },
        additionalProperties: false,
      },
    ],
    messages: {
      overlappingObjects: 'Objects "{{obj1Type}}" and "{{obj2Type}}" are overlapping in patching mode ({{overlap}}px)',
      overlappingObjectsWithText: 'Objects "{{obj1Type}}" ({{obj1Text}}) and "{{obj2Type}}" ({{obj2Text}}) are overlapping in patching mode ({{overlap}}px)',
    },
  },

  create (context) {
    const options = context.options[0] || {}
    const exceptions = options.exceptions || ['panel', 'comment', 'bpatcher', 'inlet', 'outlet']
    const threshold = options.threshold || 5

    function calculateOverlap (rect1, rect2) {
      const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left))
      const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top))
      return xOverlap * yOverlap
    }

    function getObjectRect (boxProps) {
      const patchrectProperty = boxProps.find(p => p.key.value === 'patching_rect')
      if (!patchrectProperty || patchrectProperty.value.type !== 'JSONArrayExpression') {
        return null
      }

      const rect = patchrectProperty.value.elements
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

    function traversePatcher (patcherNode) {
      if (!patcherNode || patcherNode.type !== 'JSONObjectExpression') {
        return
      }

      const patcherProperties = patcherNode.properties
      const boxesProperty = patcherProperties.find(p => p.key.value === 'boxes')
      if (!boxesProperty || !boxesProperty.value.elements) {
        return
      }

      // Collect all objects with their positions
      const objects = []

      boxesProperty.value.elements.forEach(boxNode => {
        if (boxNode.type !== 'JSONObjectExpression') return

        const boxObjectProperty = boxNode.properties.find(p => p.key.value === 'box')
        if (!boxObjectProperty || boxObjectProperty.value.type !== 'JSONObjectExpression') return

        const boxProps = boxObjectProperty.value.properties

        // Check for nested patchers
        const nestedPatcherProperty = boxProps.find(p => p.key.value === 'patcher')
        if (nestedPatcherProperty && nestedPatcherProperty.value.type === 'JSONObjectExpression') {
          traversePatcher(nestedPatcherProperty.value)
        }

        // Get object type and text
        const maxclassProperty = boxProps.find(p => p.key.value === 'maxclass')
        if (!maxclassProperty || maxclassProperty.value.type !== 'JSONLiteral') return

        const maxclass = maxclassProperty.value.value
        if (typeof maxclass !== 'string') return

        let objectType = maxclass
        let objectText = null

        if (maxclass === 'newobj') {
          const textProperty = boxProps.find(p => p.key.value === 'text')
          if (textProperty && textProperty.value.type === 'JSONLiteral') {
            const text = textProperty.value.value
            if (typeof text === 'string') {
              objectText = text.trim()
              const parts = text.trim().split(/\s+/)
              if (parts.length > 0) {
                objectType = parts[0]
              }
            }
          }
        } else {
          const textProperty = boxProps.find(p => p.key.value === 'text')
          if (textProperty && textProperty.value.type === 'JSONLiteral') {
            const text = textProperty.value.value
            if (typeof text === 'string' && text.trim()) {
              objectText = text.trim()
            }
          }
        }

        // Skip exceptions
        if (exceptions.includes(objectType)) {
          return
        }

        // Get position
        const rect = getObjectRect(boxProps)
        if (!rect) return

        objects.push({
          node: boxObjectProperty.value,
          maxclass,
          objectType,
          objectText,
          rect
        })
      })

      // Check for overlaps
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const obj1 = objects[i]
          const obj2 = objects[j]

          const overlapArea = calculateOverlap(obj1.rect, obj2.rect)

          if (overlapArea > threshold) {
            const messageId = (obj1.objectText && obj2.objectText)
              ? 'overlappingObjectsWithText'
              : 'overlappingObjects'

            const data = {
              obj1Type: obj1.maxclass,
              obj2Type: obj2.maxclass,
              overlap: Math.round(Math.sqrt(overlapArea)) // Approximate linear dimension
            }

            if (messageId === 'overlappingObjectsWithText') {
              data.obj1Text = obj1.objectText
              data.obj2Text = obj2.objectText
            }

            context.report({
              node: obj1.node,
              messageId,
              data
            })
          }
        }
      }
    }

    return {
      JSONProperty (node) {
        if (node.key.value !== 'patcher' || node.value.type !== 'JSONObjectExpression') {
          return
        }
        traversePatcher(node.value)
      }
    }
  }
}
