export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce snap to pixel setting in Max/MSP patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        snap: {
          type: 'boolean',
          default: true,
          description: 'Whether snap to pixel should be enabled (true) or disabled (false)',
        },
        fix: {
          type: 'boolean',
          default: true,
          description: 'Apply fix'
        },
      },
      additionalProperties: false,
    },],
    defaultOptions: [{ snap: true, fix: true }],
    messages: {
      missingIntegerCoordinates: 'Missing `integercoordinates` property - snap to pixel setting not defined',
      incorrectIntegerCoordinatesEnabled: 'Snap to pixel should be enabled - `integercoordinates` is {{actual}}, should be 1',
      incorrectIntegerCoordinatesDisabled: 'Snap to pixel should be disabled - `integercoordinates` is {{actual}}, should be 0',
      invalidIntegerCoordinates: 'Invalid `integercoordinates` value - expected number (0 or 1), got {{type}}',
    },
  },
  create (context) {
    // Get the configuration option, default to true (enabled) for backward compatibility
    const requireEnabled = context.options[0]?.snap !== false
    const expectedValue = requireEnabled ? 1 : 0

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
            fix: context.options[0]?.snap === true ? (fixer) => {
              // Add integercoordinates with the expected value
              const lastProperty = node.value.properties[node.value.properties.length - 1]
              if (lastProperty) {
                return fixer.insertTextAfter(
                  lastProperty,
                  `,\n\t\t"integercoordinates" : ${expectedValue}`
                )
              } else {
                // Empty patcher object
                return fixer.replaceText(
                  node.value,
                  `{\n\t\t"integercoordinates" : ${expectedValue}\n\t}`
                )
              }
            } : null
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
              type: integerCoordinatesValue.type === 'JSONLiteral'
                ? typeof integerCoordinatesValue.value
                : integerCoordinatesValue.type
            },
            fix (fixer) {
              return fixer.replaceText(integerCoordinatesValue, expectedValue.toString())
            }
          })
          return
        }

        if (integerCoordinatesValue.value !== expectedValue) {
          const messageId = requireEnabled
            ? 'incorrectIntegerCoordinatesEnabled'
            : 'incorrectIntegerCoordinatesDisabled'

          context.report({
            node: integerCoordinatesValue,
            messageId,
            data: {
              actual: integerCoordinatesValue.value
            },
            fix (fixer) {
              return fixer.replaceText(integerCoordinatesValue, expectedValue.toString())
            }
          })
        }
      }
    }
  }
}
