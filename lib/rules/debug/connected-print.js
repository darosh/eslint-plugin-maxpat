export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Check for print objects with active connections that should be disabled in production',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      activePrintConnection: 'Print object "{{text}}" has active connection that should be disabled in production',
      activePrintConnectionGeneric: 'Print object has active connection that should be disabled in production',
    },
  },

  create(context) {
    return {
      // Look for the patcher object to collect both boxes and lines
      JSONProperty(node) {
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

        // Find print objects first
        const printObjects = new Map() // objectId -> { boxNode, text }

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

          printObjects.set(objectId, {
            boxNode: boxObjectProperty.value,
            text: text.trim()
          })
        })

        // Check each line to find connections to print objects
        lines.forEach(lineNode => {
          if (lineNode.type !== 'JSONObjectExpression') return

          const patchlineProperty = lineNode.properties.find(p => p.key.value === 'patchline')
          if (!patchlineProperty || patchlineProperty.value.type !== 'JSONObjectExpression') return

          const patchlineProps = patchlineProperty.value.properties

          // Check if this line is already disabled
          const disabledProperty = patchlineProps.find(p => p.key.value === 'disabled')
          const isDisabled = disabledProperty?.value?.value === 1

          if (isDisabled) return // Skip already disabled connections

          // Get destination connection [objectId, inletIndex]  
          const destinationProperty = patchlineProps.find(p => p.key.value === 'destination')
          if (!destinationProperty?.value?.type === 'JSONArrayExpression' || destinationProperty.value.elements.length < 1) return

          const destId = destinationProperty.value.elements[0]?.value
          if (typeof destId !== 'string') return

          // Check if destination is a print object
          const printObject = printObjects.get(destId)
          if (!printObject) return

          // Report the issue with auto-fix
          const messageId = printObject.text ? 'activePrintConnection' : 'activePrintConnectionGeneric'
          const data = printObject.text ? { text: printObject.text } : {}

          context.report({
            node: patchlineProperty.value,
            messageId,
            data,
            fix(fixer) {
              // Add disabled: 1 property to the patchline object
              const patchlineObj = patchlineProperty.value
              const lastProperty = patchlineProps[patchlineProps.length - 1]

              if (lastProperty) {
                // Add after the last existing property
                const sourceCode = context.getSourceCode()
                const lastPropertyText = sourceCode.getText(lastProperty)
                const insertText = ',\n\t\t\t\t\t"disabled" : 1'

                return fixer.insertTextAfter(lastProperty, insertText)
              } else {
                // No existing properties, add as first property
                const openBrace = patchlineObj.properties.length === 0
                  ? sourceCode.getFirstToken(patchlineObj, token => token.value === '{')
                  : null

                if (openBrace) {
                  return fixer.insertTextAfter(openBrace, '\n\t\t\t\t\t"disabled" : 1\n\t\t\t\t')
                }
              }

              return null
            }
          })
        })
      }
    }
  }
}