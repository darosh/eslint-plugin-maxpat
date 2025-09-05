export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Require snap to grid to be enabled in Max/MSP patches',
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
      missingGridsnapOnOpen: 'Missing `gridsnaponopen` property - snap to grid setting not defined',
      incorrectGridsnapOnOpen: 'Snap to grid should be enabled - `gridsnaponopen` is {{actual}}, should be 2',
      invalidGridsnapOnOpen: 'Invalid `gridsnaponopen` value - expected number 2, got {{type}}',
    },
  },
  create (context) {
    // Get the configuration option, default to true (enabled) for backward compatibility
    const requireEnabled = context.options[0]?.snap !== false
    const expectedValue = requireEnabled ? 2 : 0

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
            fix: context.options[0]?.fix === true ? (fixer) => {
              // Add gridsnaponopen: 2 to the patcher object
              const lastProperty = node.value.properties[node.value.properties.length - 1]
              if (lastProperty) {
                return fixer.insertTextAfter(
                  lastProperty,
                  `,\n\t\t"gridsnaponopen" : ${expectedValue}`
                )
              } else {
                // Empty patcher object
                return fixer.replaceText(
                  node.value,
                  `{\n\t\t"gridsnaponopen" : ${expectedValue}\n\t}`
                )
              }
            } : null
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
            fix: context.options[0]?.fix === true ? (fixer) => {
              return fixer.replaceText(gridsnapValue, expectedValue.toString())
            } : null
          })
          return
        }

        if (gridsnapValue.value !== expectedValue) {
          context.report({
            node: gridsnapValue,
            messageId: 'incorrectGridsnapOnOpen',
            data: {
              actual: gridsnapValue.value
            },
            fix: context.options[0]?.fix === true ? (fixer) => {
              return fixer.replaceText(gridsnapValue, expectedValue.toString())
            } : null
          })
        }
      }
    }
  }
}
