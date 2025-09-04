// lib/rules/require-snap-to-pixel.js
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require snap to pixel to be enabled in Max/MSP patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [], // No options needed for this rule
    messages: {
      missingIntegerCoordinates: 'Missing `integercoordinates` property - snap to pixel setting not defined',
      incorrectIntegerCoordinates: 'Snap to pixel should be enabled - `integercoordinates` is {{actual}}, should be 1',
      invalidIntegerCoordinates: 'Invalid `integercoordinates` value - expected number 1, got {{type}}',
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

        // Find the integercoordinates property within the patcher object
        const integerCoordinatesProperty = node.value.properties.find(
          prop => prop.key.value === 'integercoordinates'
        )

        if (!integerCoordinatesProperty) {
          // Property is missing entirely
          context.report({
            node: node.value,
            messageId: 'missingIntegerCoordinates',
            fix (fixer) {
              // Add integercoordinates: 1 to the patcher object
              const lastProperty = node.value.properties[node.value.properties.length - 1]
              if (lastProperty) {
                return fixer.insertTextAfter(
                  lastProperty,
                  ',\n\t\t"integercoordinates" : 1'
                )
              } else {
                // Empty patcher object
                return fixer.replaceText(
                  node.value,
                  '{\n\t\t"integercoordinates" : 1\n\t}'
                )
              }
            }
          })
          return
        }

        // Check if the value is correct
        const integerCoordinatesValue = integerCoordinatesProperty.value

        if (integerCoordinatesValue.type !== 'JSONLiteral' || typeof integerCoordinatesValue.value !== 'number') {
          context.report({
            node: integerCoordinatesValue,
            messageId: 'invalidIntegerCoordinates',
            data: {
              type: integerCoordinatesValue.type === 'JSONLiteral' ? typeof integerCoordinatesValue.value : integerCoordinatesValue.type
            },
            fix (fixer) {
              return fixer.replaceText(integerCoordinatesValue, '1')
            }
          })
          return
        }

        if (integerCoordinatesValue.value !== 1) {
          context.report({
            node: integerCoordinatesValue,
            messageId: 'incorrectIntegerCoordinates',
            data: {
              actual: integerCoordinatesValue.value
            },
            fix (fixer) {
              return fixer.replaceText(integerCoordinatesValue, '1')
            }
          })
        }
      }
    }
  }
}
