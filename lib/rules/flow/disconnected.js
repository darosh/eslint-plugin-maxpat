export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Check for disconnected objects in Max/MSP patches',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [
      {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
      },
    ],
    messages: {
      disconnectedObject: 'Object "{{objectType}}" appears to be disconnected (not referenced in any patch cables)',
      disconnectedObjectWithText: 'Object "{{objectType}}" with text "{{text}}" appears to be disconnected (not referenced in any patch cables)',
    },
  },

  create (context) {
    const skipObjects = context.options[0] || ['comment', 'panel', 'bpatcher']

    return {
      // Look for the patcher object to collect both boxes and lines
      JSONProperty (node) {
        if (node.key.value !== 'patcher' || node.value.type !== 'JSONObjectExpression') {
          return
        }

        const patcherProperties = node.value.properties

        // Find boxes array
        const boxesProperty = patcherProperties.find(p => p.key.value === 'boxes')
        if (!boxesProperty || !boxesProperty.value.elements) {
          return
        }

        // Find lines array (patch cables)
        const linesProperty = patcherProperties.find(p => p.key.value === 'lines')
        const lines = linesProperty?.value?.elements || []

        // Collect all connected object IDs from patch lines
        const connectedIds = new Set()

        lines.forEach(lineNode => {
          if (lineNode.type !== 'JSONObjectExpression') return

          const patchlineProperty = lineNode.properties.find(p => p.key.value === 'patchline')
          if (!patchlineProperty || patchlineProperty.value.type !== 'JSONObjectExpression') return

          const patchlineProps = patchlineProperty.value.properties

          // Get source connection [objectId, outletIndex]
          const sourceProperty = patchlineProps.find(p => p.key.value === 'source')
          if (sourceProperty?.value?.type === 'JSONArrayExpression' && sourceProperty.value.elements.length >= 1) {
            const sourceId = sourceProperty.value.elements[0]?.value
            if (typeof sourceId === 'string') {
              connectedIds.add(sourceId)
            }
          }

          // Get destination connection [objectId, inletIndex]  
          const destinationProperty = patchlineProps.find(p => p.key.value === 'destination')
          if (destinationProperty?.value?.type === 'JSONArrayExpression' && destinationProperty.value.elements.length >= 1) {
            const destId = destinationProperty.value.elements[0]?.value
            if (typeof destId === 'string') {
              connectedIds.add(destId)
            }
          }
        })

        // Check each box for disconnection
        boxesProperty.value.elements.forEach(boxNode => {
          if (boxNode.type !== 'JSONObjectExpression') return

          const boxObjectProperty = boxNode.properties.find(p => p.key.value === 'box')
          if (!boxObjectProperty || boxObjectProperty.value.type !== 'JSONObjectExpression') return

          const boxProps = boxObjectProperty.value.properties

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

          let checkClass = maxclass
          
          if (maxclass === 'newobj') {
            const textProperty = boxProps.find(p => p.key.value === 'text')
            const text = textProperty?.value?.value?.split(' ')?.[0]
            
            if (text) {
              checkClass = text
            }
          }
          
          // Skip objects that don't need connections
          if (skipObjects.includes(checkClass)) {
            return
          }
          
          // Check if this object is connected
          if (!connectedIds.has(objectId)) {
            // Get text for more descriptive message
            const textProperty = boxProps.find(p => p.key.value === 'text')
            const text = textProperty?.value?.value

            if (text && typeof text === 'string' && text.trim()) {
              context.report({
                node: boxObjectProperty.value,
                messageId: 'disconnectedObjectWithText',
                data: {
                  objectType: maxclass,
                  text: text.trim()
                }
              })
            } else {
              context.report({
                node: boxObjectProperty.value,
                messageId: 'disconnectedObject',
                data: {
                  objectType: maxclass
                }
              })
            }
          }
        })
      }
    }
  }
}
