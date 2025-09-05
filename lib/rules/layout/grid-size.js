export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Require specific grid size in Max/MSP patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        fix: {
          type: 'bool',
          default: true,
          description: 'Apply fix'
        },
        grid: {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
          default: [8, 8],
          description: 'Specifies grid'
        }
      },
      additionalProperties: false,
    },
    ],
    defaultOptions: [{ grid: [8, 8], fix: true }],
    messages: {
      missingGridSize: 'Missing `gridsize` property - grid size not defined, should be [{{expectedX}}, {{expectedY}}]',
      invalidGridSizeType: 'Invalid `gridsize` type - expected array [{{expectedX}}, {{expectedY}}], got {{type}}',
      invalidGridSizeLength: 'Invalid `gridsize` length - expected array of 2 elements [{{expectedX}}, {{expectedY}}], got {{length}} elements',
      incorrectGridSizeX: 'Grid X size mismatch - `gridsize[0]` is {{actualX}}, should be {{expectedX}}',
      incorrectGridSizeY: 'Grid Y size mismatch - `gridsize[1]` is {{actualY}}, should be {{expectedY}}',
      incorrectGridSizeBoth: 'Grid size mismatch - `gridsize` is [{{actualX}}, {{actualY}}], should be [{{expectedX}}, {{expectedY}}]',
      invalidGridSizeElement: 'Invalid `gridsize` element - expected numbers, got {{elementTypes}}',
    },
  },

  create (context) {
    const expectedGridSize = context.options[0]?.grid || [8, 8] // Default to [8, 8]
    const [expectedX, expectedY] = expectedGridSize

    return {
      // Look for the patcher object
      JSONProperty (node) {
        // We're looking for the "patcher" object at the top level
        if (node.key.value !== 'patcher' || node.value.type !== 'JSONObjectExpression') {
          return
        }

        // Find the gridsize property within the patcher object
        const gridsizeProperty = node.value.properties.find(
          prop => prop.key.value === 'gridsize'
        )

        if (!gridsizeProperty) {
          // Property is missing entirely
          context.report({
            node: node.value,
            messageId: 'missingGridSize',
            data: { expectedX, expectedY },
            fix (fixer) {
              // Add gridsize: [expectedX, expectedY] to the patcher object
              const lastProperty = node.value.properties[node.value.properties.length - 1]
              if (lastProperty) {
                return fixer.insertTextAfter(
                  lastProperty,
                  `,\n\t\t"gridsize" : [ ${expectedX}.0, ${expectedY}.0 ]`
                )
              } else {
                // Empty patcher object
                return fixer.replaceText(
                  node.value,
                  `{\n\t\t"gridsize" : [ ${expectedX}.0, ${expectedY}.0 ]\n\t}`
                )
              }
            }
          })
          return
        }

        // Check if the value is an array
        const gridsizeValue = gridsizeProperty.value

        if (gridsizeValue.type !== 'JSONArrayExpression') {
          context.report({
            node: gridsizeValue,
            messageId: 'invalidGridSizeType',
            data: {
              expectedX,
              expectedY,
              type: gridsizeValue.type === 'JSONLiteral' ? typeof gridsizeValue.value : gridsizeValue.type
            },
            fix (fixer) {
              return fixer.replaceText(gridsizeValue, `[ ${expectedX}.0, ${expectedY}.0 ]`)
            }
          })
          return
        }

        // Check array length
        if (gridsizeValue.elements.length !== 2) {
          context.report({
            node: gridsizeValue,
            messageId: 'invalidGridSizeLength',
            data: {
              expectedX,
              expectedY,
              length: gridsizeValue.elements.length
            },
            fix (fixer) {
              return fixer.replaceText(gridsizeValue, `[ ${expectedX}.0, ${expectedY}.0 ]`)
            }
          })
          return
        }

        // Check if elements are numbers
        const [xElement, yElement] = gridsizeValue.elements
        const elementTypes = gridsizeValue.elements.map(el =>
          el.type === 'JSONLiteral' ? typeof el.value : el.type
        )

        if (!gridsizeValue.elements.every(el => el.type === 'JSONLiteral' && typeof el.value === 'number')) {
          context.report({
            node: gridsizeValue,
            messageId: 'invalidGridSizeElement',
            data: {
              elementTypes: elementTypes.join(', ')
            },
            fix (fixer) {
              return fixer.replaceText(gridsizeValue, `[ ${expectedX}.0, ${expectedY}.0 ]`)
            }
          })
          return
        }

        // Check actual values
        const actualX = xElement.value
        const actualY = yElement.value

        const xMismatch = actualX !== expectedX
        const yMismatch = actualY !== expectedY

        if (xMismatch && yMismatch) {
          context.report({
            node: gridsizeValue,
            messageId: 'incorrectGridSizeBoth',
            data: {
              actualX,
              actualY,
              expectedX,
              expectedY
            },
            fix (fixer) {
              return fixer.replaceText(gridsizeValue, `[ ${expectedX}.0, ${expectedY}.0 ]`)
            }
          })
        } else if (xMismatch) {
          context.report({
            node: xElement,
            messageId: 'incorrectGridSizeX',
            data: {
              actualX,
              expectedX
            },
            fix (fixer) {
              return fixer.replaceText(xElement, `${expectedX}.0`)
            }
          })
        } else if (yMismatch) {
          context.report({
            node: yElement,
            messageId: 'incorrectGridSizeY',
            data: {
              actualY,
              expectedY
            },
            fix (fixer) {
              return fixer.replaceText(yElement, `${expectedY}.0`)
            }
          })
        }
      }
    }
  }
}
