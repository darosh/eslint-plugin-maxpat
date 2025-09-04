// lib/rules/require-snap-to-grid.js
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require snap to grid to be enabled in Max/MSP patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [], // No options needed for this rule
    messages: {
      missingGridsnapOnOpen: 'Missing `gridsnaponopen` property - snap to grid setting not defined',
      incorrectGridsnapOnOpen: 'Snap to grid should be enabled - `gridsnaponopen` is {{actual}}, should be 2',
      invalidGridsnapOnOpen: 'Invalid `gridsnaponopen` value - expected number 2, got {{type}}',
    },
  },

  create (context) {
    return {
      // Look for the patcher object
      JSONProperty (node) {
        // We're looking for the "patcher" object at the top level
        if (node.key.value !== 'patcher' || node.value.type !== 'JSONObjectExpression') {
          return
        }

        // Find the gridsnaponopen property within the patcher object
        const gridsnapOnOpenProperty = node.value.properties.find(
          prop => prop.key.value === 'gridsnaponopen'
        )

        if (!gridsnapOnOpenProperty) {
          // Property is missing entirely
          context.report({
            node: node.value,
            messageId: 'missingGridsnapOnOpen',
            fix (fixer) {
              // Add gridsnaponopen: 2 to the patcher object
              const lastProperty = node.value.properties[node.value.properties.length - 1]
              if (lastProperty) {
                return fixer.insertTextAfter(
                  lastProperty,
                  ',\n\t\t"gridsnaponopen" : 2'
                )
              } else {
                // Empty patcher object
                return fixer.replaceText(
                  node.value,
                  '{\n\t\t"gridsnaponopen" : 2\n\t}'
                )
              }
            }
          })
          return
        }

        // Check if the value is correct
        const gridsnapValue = gridsnapOnOpenProperty.value

        if (gridsnapValue.type !== 'JSONLiteral' || typeof gridsnapValue.value !== 'number') {
          context.report({
            node: gridsnapValue,
            messageId: 'invalidGridsnapOnOpen',
            data: {
              type: gridsnapValue.type === 'JSONLiteral' ? typeof gridsnapValue.value : gridsnapValue.type
            },
            fix (fixer) {
              return fixer.replaceText(gridsnapValue, '2')
            }
          })
          return
        }

        if (gridsnapValue.value !== 2) {
          context.report({
            node: gridsnapValue,
            messageId: 'incorrectGridsnapOnOpen',
            data: {
              actual: gridsnapValue.value
            },
            fix (fixer) {
              return fixer.replaceText(gridsnapValue, '2')
            }
          })
        }
      }
    }
  }
}
