export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Check for matching send/receive pairs with triple dash prefix',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [{
      type: 'object',
      properties: {
        exclude: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true,
          default: [],
          description: 'Enumerates exceptions'
        }
      },
      additionalProperties: false
    }],
    defaultOptions: [
      { exclude: [] }
    ],
    messages: {
      unmatchedSend: 'Send "{{sendName}}" with triple dash prefix has no corresponding receive "r {{sendName}}"',
      unmatchedReceive: 'Receive "{{receiveName}}" with triple dash prefix has no corresponding send "s {{receiveName}}"',
    },
  },

  create(context) {
    const exclude = context.options[0]?.exclude
    
    // Collect send and receive objects with triple dash prefixes globally
    const sendObjects = new Map() // sendName -> { node, text }
    const receiveObjects = new Map() // receiveName -> { node, text }

    function traversePatcher(patcherNode) {
      if (!patcherNode || patcherNode.type !== 'JSONObjectExpression') {
        return
      }

      const patcherProperties = patcherNode.properties

      // Find boxes array
      const boxesProperty = patcherProperties.find(p => p.key.value === 'boxes')
      if (!boxesProperty || !boxesProperty.value.elements) {
        return
      }

      boxesProperty.value.elements.forEach(boxNode => {
        if (boxNode.type !== 'JSONObjectExpression') return

        const boxObjectProperty = boxNode.properties.find(p => p.key.value === 'box')
        if (!boxObjectProperty || boxObjectProperty.value.type !== 'JSONObjectExpression') return

        const boxProps = boxObjectProperty.value.properties

        // Check if this box has a nested patcher (subpatch)
        const nestedPatcherProperty = boxProps.find(p => p.key.value === 'patcher')
        if (nestedPatcherProperty && nestedPatcherProperty.value.type === 'JSONObjectExpression') {
          // Recursively traverse the subpatch
          traversePatcher(nestedPatcherProperty.value)
        }

        // Get maxclass to check if it's a newobj
        const maxclassProperty = boxProps.find(p => p.key.value === 'maxclass')
        if (!maxclassProperty || maxclassProperty.value.type !== 'JSONLiteral') return

        const maxclass = maxclassProperty.value.value
        if (maxclass !== 'newobj') return

        // Get text to check for send/receive with triple dash prefix
        const textProperty = boxProps.find(p => p.key.value === 'text')
        if (!textProperty || textProperty.value.type !== 'JSONLiteral') return

        const text = textProperty.value.value
        if (typeof text !== 'string') return

        const trimmedText = text.trim()
        const parts = trimmedText.split(/\s+/)

        if (parts.length < 2) return

        const command = parts[0]
        const name = parts[1]

        // Check for send objects with triple dash prefix
        if (command === 's' && name.startsWith('---')) {
          sendObjects.set(name, {
            node: boxObjectProperty.value,
            text: trimmedText
          })
        }

        // Check for receive objects with triple dash prefix
        else if (command === 'r' && name.startsWith('---')) {
          receiveObjects.set(name, {
            node: boxObjectProperty.value,
            text: trimmedText
          })
        }
      })
    }

    return {
      // Look for the main patcher object
      JSONProperty(node) {
        if (node.key.value !== 'patcher' || node.value.type !== 'JSONObjectExpression') {
          return
        }

        // Traverse this patcher and all its subpatches
        traversePatcher(node.value)
      },

      // Check for unmatched pairs after traversing the entire file
      'Program:exit'() {
        // Check for unmatched sends
        sendObjects.forEach((sendObj, sendName) => {
          if (exclude.includes(sendName)) {
            return
          }

          if (!receiveObjects.has(sendName)) {
            context.report({
              node: sendObj.node,
              messageId: 'unmatchedSend',
              data: {
                sendName: sendName
              }
            })
          }
        })

        // Check for unmatched receives
        receiveObjects.forEach((receiveObj, receiveName) => {
          if (exclude.includes(receiveName)) {
            return
          }

          if (!sendObjects.has(receiveName)) {
            context.report({
              node: receiveObj.node,
              messageId: 'unmatchedReceive',
              data: {
                receiveName: receiveName
              }
            })
          }
        })

        // Clear collections for next file
        sendObjects.clear()
        receiveObjects.clear()
      }
    }
  }
}
