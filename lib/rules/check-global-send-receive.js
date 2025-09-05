// lib/rules/check-global-send-receive.js
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Check for global send/receive names that are not in allowed exceptions list',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
      },
    ],
    messages: {
      unauthorizedGlobalSend: 'Global send "{{globalName}}" is not in allowed exceptions list. Use local naming with triple dash prefix (s ---{{globalName}}) or add to exceptions.',
      unauthorizedGlobalReceive: 'Global receive "{{globalName}}" is not in allowed exceptions list. Use local naming with triple dash prefix (r ---{{globalName}}) or add to exceptions.',
    },
  },

  create (context) {
    const allowedGlobals = context.options[0] || []

    function traversePatcher (patcherNode) {
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

        // Get text to check for send/receive
        const textProperty = boxProps.find(p => p.key.value === 'text')
        if (!textProperty || textProperty.value.type !== 'JSONLiteral') return

        const text = textProperty.value.value
        if (typeof text !== 'string') return

        const trimmedText = text.trim()
        const parts = trimmedText.split(/\s+/)

        if (parts.length < 2) return

        const command = parts[0]
        const name = parts[1]

        // Check for send/receive commands (both short and long forms)
        const isSend = (command === 's' || command === 'send')
        const isReceive = (command === 'r' || command === 'receive')

        if (!isSend && !isReceive) return

        // Skip if it has triple dash prefix (local naming)
        if (name.startsWith('---')) return

        // Skip if it's in the allowed exceptions list
        if (allowedGlobals.includes(name)) return

        // Report unauthorized global send/receive
        const messageId = isSend ? 'unauthorizedGlobalSend' : 'unauthorizedGlobalReceive'

        context.report({
          node: boxObjectProperty.value,
          messageId,
          data: {
            globalName: name
          }
        })
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
