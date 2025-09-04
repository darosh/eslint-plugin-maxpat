// lib/rules/check-connected-print.js
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Check for print objects with active connections that could pollute console in production',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowDisabled: {
            type: 'boolean',
            default: true
          },
          strictMode: {
            type: 'boolean',
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      activeConnectedPrint: 'Print object "{{text}}" has active connections that will output to console',
      connectedPrintNoDisabled: 'Print object "{{text}}" has connections but none are disabled - consider disabling for production',
      printWithActiveConnection: 'Print object has at least one active (non-disabled) connection'
    },
  },

  create (context) {
    const options = context.options[0] || {}
    const allowDisabled = options.allowDisabled !== false // default true
    const strictMode = options.strictMode === true // default false

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

        // Build map of object connections with their disabled status
        const objectConnections = new Map() // objectId -> { hasActive: boolean, hasDisabled: boolean }

        lines.forEach(lineNode => {
          if (lineNode.type !== 'JSONObjectExpression') return

          const patchlineProperty = lineNode.properties.find(p => p.key.value === 'patchline')
          if (!patchlineProperty || patchlineProperty.value.type !== 'JSONObjectExpression') return

          const patchlineProps = patchlineProperty.value.properties

          // Check if this patchline is disabled
          const disabledProperty = patchlineProps.find(p => p.key.value === 'disabled')
          const isDisabled = disabledProperty?.value?.value === 1

          // Get source connection [objectId, outletIndex]
          const sourceProperty = patchlineProps.find(p => p.key.value === 'source')
          if (sourceProperty?.value?.type === 'JSONArrayExpression' && sourceProperty.value.elements.length >= 1) {
            const sourceId = sourceProperty.value.elements[0]?.value
            if (typeof sourceId === 'string') {
              if (!objectConnections.has(sourceId)) {
                objectConnections.set(sourceId, { hasActive: false, hasDisabled: false })
              }
              const conn = objectConnections.get(sourceId)
              if (isDisabled) {
                conn.hasDisabled = true
              } else {
                conn.hasActive = true
              }
            }
          }

          // Get destination connection [objectId, inletIndex]  
          const destinationProperty = patchlineProps.find(p => p.key.value === 'destination')
          if (destinationProperty?.value?.type === 'JSONArrayExpression' && destinationProperty.value.elements.length >= 1) {
            const destId = destinationProperty.value.elements[0]?.value
            if (typeof destId === 'string') {
              if (!objectConnections.has(destId)) {
                objectConnections.set(destId, { hasActive: false, hasDisabled: false })
              }
              const conn = objectConnections.get(destId)
              if (isDisabled) {
                conn.hasDisabled = true
              } else {
                conn.hasActive = true
              }
            }
          }
        })

        // Check each box for print objects
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

          // Get maxclass to check if it's a newobj
          const maxclassProperty = boxProps.find(p => p.key.value === 'maxclass')
          if (!maxclassProperty || maxclassProperty.value.type !== 'JSONLiteral') return

          const maxclass = maxclassProperty.value.value
          if (maxclass !== 'newobj') return

          // Get text to check if it starts with 'print'
          const textProperty = boxProps.find(p => p.key.value === 'text')
          if (!textProperty || textProperty.value.type !== 'JSONLiteral') return

          const text = textProperty.value.value
          if (typeof text !== 'string' || !text.trim().startsWith('print')) return

          // Check connections for this print object
          const connections = objectConnections.get(objectId)
          if (!connections) return // No connections, no problem

          if (strictMode) {
            // In strict mode, any connection to print is flagged
            context.report({
              node: boxObjectProperty.value,
              messageId: 'activeConnectedPrint',
              data: {
                text: text.trim()
              }
            })
          } else if (connections.hasActive) {
            // Has active connections - this is the main problem
            if (allowDisabled && connections.hasDisabled) {
              // Has both active and disabled - warn about active ones
              context.report({
                node: boxObjectProperty.value,
                messageId: 'activeConnectedPrint',
                data: {
                  text: text.trim()
                }
              })
            } else if (allowDisabled && !connections.hasDisabled) {
              // Has only active connections - suggest disabling
              context.report({
                node: boxObjectProperty.value,
                messageId: 'connectedPrintNoDisabled',
                data: {
                  text: text.trim()
                }
              })
            } else {
              // allowDisabled is false - any active connection is a problem
              context.report({
                node: boxObjectProperty.value,
                messageId: 'printWithActiveConnection'
              })
            }
          }
        })
      }
    }
  }
}
