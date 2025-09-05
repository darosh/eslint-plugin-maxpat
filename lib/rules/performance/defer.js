export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Check for UI objects that should use defer for thread-safe operation',
      category: 'Performance',
      recommended: true,
    },
    // fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        include:
          {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            default: ['live.dial', 'live.slider', 'live.button'],
            description: 'Elements to check'
          }
      },
      additionalProperties: false
    }],
    defaultOptions: [
      { include: ['live.dial', 'live.slider', 'live.button'] }
    ],
    messages: {
      missingDefer: 'UI object "{{objectType}}" should use defer for thread-safe operation to prevent priority inversion',
      missingDeferWithText: 'UI object "{{objectType}}" with text "{{text}}" should use defer for thread-safe operation to prevent priority inversion',
    },
  },

  create (context) {
    const uiObjectsNeedingDefer = context.options[0]?.include || []

    if (uiObjectsNeedingDefer.length === 0) {
      return {} // No objects specified, rule is disabled
    }

    function traversePatcher (patcherNode) {
      if (!patcherNode || patcherNode.type !== 'JSONObjectExpression') {
        return
      }

      const patcherProperties = patcherNode.properties

      // Find boxes and lines arrays
      const boxesProperty = patcherProperties.find(p => p.key.value === 'boxes')
      const linesProperty = patcherProperties.find(p => p.key.value === 'lines')

      if (!boxesProperty || !boxesProperty.value.elements) {
        return
      }

      const lines = linesProperty?.value?.elements || []

      // Map object IDs to their details
      const objectMap = new Map() // objectId -> { boxNode, objectType, objectText, maxclass }
      const deferObjects = new Set() // Track defer object IDs

      // First pass: collect all objects and identify defer objects
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

        // Get object ID
        const idProperty = boxProps.find(p => p.key.value === 'id')
        if (!idProperty || idProperty.value.type !== 'JSONLiteral') return

        const objectId = idProperty.value.value
        if (typeof objectId !== 'string') return

        // Get maxclass to determine object type
        const maxclassProperty = boxProps.find(p => p.key.value === 'maxclass')
        if (!maxclassProperty || maxclassProperty.value.type !== 'JSONLiteral') return

        const maxclass = maxclassProperty.value.value
        if (typeof maxclass !== 'string') return

        let objectType = maxclass
        let objectText = null

        // For newobj, get the actual object type from text
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
          // For non-newobj, get text for more descriptive messages
          const textProperty = boxProps.find(p => p.key.value === 'text')
          if (textProperty && textProperty.value.type === 'JSONLiteral') {
            const text = textProperty.value.value
            if (typeof text === 'string' && text.trim()) {
              objectText = text.trim()
            }
          }
        }

        // Store object info
        objectMap.set(objectId, {
          boxNode: boxObjectProperty.value,
          objectType,
          objectText,
          maxclass
        })

        // Track defer objects
        if (objectType === 'defer') {
          deferObjects.add(objectId)
        }
      })

      // Second pass: check UI objects for defer connections
      objectMap.forEach((objInfo, objectId) => {
        const { boxNode, objectType, objectText, maxclass } = objInfo

        // Skip if this object type doesn't need defer
        if (!uiObjectsNeedingDefer.includes(objectType)) {
          return
        }

        // Check if this UI object has defer in its output connections
        let hasDefer = false

        lines.forEach(lineNode => {
          if (lineNode.type !== 'JSONObjectExpression') return

          const patchlineProperty = lineNode.properties.find(p => p.key.value === 'patchline')
          if (!patchlineProperty || patchlineProperty.value.type !== 'JSONObjectExpression') return

          const patchlineProps = patchlineProperty.value.properties

          // Get source connection [objectId, outletIndex]
          const sourceProperty = patchlineProps.find(p => p.key.value === 'source')
          if (!sourceProperty?.value?.type === 'JSONArrayExpression' || sourceProperty.value.elements.length < 1) return

          const sourceId = sourceProperty.value.elements[0]?.value
          if (sourceId !== objectId) return // Not from our UI object

          // Get destination connection [objectId, inletIndex]  
          const destinationProperty = patchlineProps.find(p => p.key.value === 'destination')
          if (!destinationProperty?.value?.type === 'JSONArrayExpression' || destinationProperty.value.elements.length < 1) return

          const destId = destinationProperty.value.elements[0]?.value
          if (typeof destId !== 'string') return

          // Check if destination is a defer object
          if (deferObjects.has(destId)) {
            hasDefer = true
          }
        })

        // Report if UI object lacks defer
        if (!hasDefer) {
          const messageId = objectText ? 'missingDeferWithText' : 'missingDefer'
          const data = {
            objectType: maxclass,
          }

          if (objectText) {
            data.text = objectText
          }

          context.report({
            node: boxNode,
            messageId,
            data,
            // fix (fixer) {
            // Auto-fix: This is complex because we need to:
            // 1. Add a defer object to the patch
            // 2. Reroute connections through the defer
            // For now, we'll return null (no autofix) as this requires
            // adding new objects and rewiring connections
            // return null
            // }
          })
        }
      })
    }

    return {
      // Look for the main patcher object
      JSONProperty (node) {
        if (node.key.value !== 'patcher' || node.value.type !== 'JSONObjectExpression') {
          return
        }

        // Traverse this patcher and all its subpatches
        traversePatcher(node.value)
      }
    }
  }
}
