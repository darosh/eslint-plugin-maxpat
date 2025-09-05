// lib/rules/check-speed-limit.js
export default {
  meta: {
    type: 'performance',
    docs: {
      description: 'Check parameter_speedlim value for specified object types',
      category: 'Performance',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'number',
        minimum: 1,
      },
      {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
      },
    ],
    messages: {
      incorrectSpeedLimit: 'Object "{{objectType}}" has parameter_speedlim value {{currentValue}} but expected {{expectedValue}}',
      incorrectSpeedLimitWithText: 'Object "{{objectType}}" with text "{{text}}" has parameter_speedlim value {{currentValue}} but expected {{expectedValue}}',
      missingSpeedLimit: 'Object "{{objectType}}" is missing parameter_speedlim (defaults to 1) but expected {{expectedValue}}',
      missingSpeedLimitWithText: 'Object "{{objectType}}" with text "{{text}}" is missing parameter_speedlim (defaults to 1) but expected {{expectedValue}}',
    },
  },

  create(context) {
    const [expectedSpeedLimit = 10, objectTypes = []] = context.options

    if (objectTypes.length === 0) {
      return {} // No object types specified, rule is disabled
    }

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

        // Get maxclass to determine object type
        const maxclassProperty = boxProps.find(p => p.key.value === 'maxclass')
        if (!maxclassProperty || maxclassProperty.value.type !== 'JSONLiteral') return

        const maxclass = maxclassProperty.value.value
        if (typeof maxclass !== 'string') return

        let objectType = maxclass
        let objectText = null

        // For newobj, get the actual object type from text
        if (maxclass === 'newobj') {
          const textProperty = boxProps.find(p => p.key.value === 'text')
          if (textProperty && textProperty.value.type === 'JSONLiteral') {
            const text = textProperty.value.value
            if (typeof text === 'string') {
              objectText = text.trim()
              const parts = text.trim().split(/\s+/)
              if (parts.length > 0) {
                objectType = parts[0]
              }
            }
          }
        } else {
          // For non-newobj, get text for more descriptive messages
          const textProperty = boxProps.find(p => p.key.value === 'text')
          if (textProperty && textProperty.value.type === 'JSONLiteral') {
            const text = textProperty.value.value
            if (typeof text === 'string' && text.trim()) {
              objectText = text.trim()
            }
          }
        }

        // Check if this object type should be checked
        if (!objectTypes.includes(objectType)) {
          return
        }

        // Look for saved_attribute_attributes
        const savedAttrProperty = boxProps.find(p => p.key.value === 'saved_attribute_attributes')

        let currentSpeedLimit = 1 // Default value when unspecified
        let hasSpeedLimitProperty = false

        if (savedAttrProperty && savedAttrProperty.value.type === 'JSONObjectExpression') {
          const savedAttrProps = savedAttrProperty.value.properties

          // Look for parameter_speedlim
          const speedLimProperty = savedAttrProps.find(p => p.key.value === 'parameter_speedlim')
          if (speedLimProperty && speedLimProperty.value.type === 'JSONLiteral') {
            hasSpeedLimitProperty = true
            const speedLimValue = speedLimProperty.value.value
            if (typeof speedLimValue === 'number') {
              currentSpeedLimit = speedLimValue
            }
          }
        }

        // Check if speed limit matches expected value
        if (currentSpeedLimit !== expectedSpeedLimit) {
          const messageData = {
            objectType: maxclass,
            currentValue: currentSpeedLimit,
            expectedValue: expectedSpeedLimit,
          }

          let messageId
          if (hasSpeedLimitProperty) {
            // Has explicit value but it's wrong
            if (objectText) {
              messageId = 'incorrectSpeedLimitWithText'
              messageData.text = objectText
            } else {
              messageId = 'incorrectSpeedLimit'
            }
          } else {
            // Missing property (using default of 1)
            if (objectText) {
              messageId = 'missingSpeedLimitWithText'
              messageData.text = objectText
            } else {
              messageId = 'missingSpeedLimit'
            }
          }

          context.report({
            node: boxObjectProperty.value,
            messageId,
            data: messageData,
            fix(fixer) {
              const sourceCode = context.getSourceCode()

              if (hasSpeedLimitProperty) {
                // Update existing parameter_speedlim value
                const savedAttrProperty = boxProps.find(p => p.key.value === 'saved_attribute_attributes')
                const savedAttrProps = savedAttrProperty.value.properties
                const speedLimProperty = savedAttrProps.find(p => p.key.value === 'parameter_speedlim')

                return fixer.replaceText(speedLimProperty.value, expectedSpeedLimit.toString())
              } else {
                // Add parameter_speedlim property
                if (savedAttrProperty && savedAttrProperty.value.type === 'JSONObjectExpression') {
                  // Add to existing saved_attribute_attributes
                  const savedAttrObj = savedAttrProperty.value
                  const savedAttrProps = savedAttrObj.properties

                  if (savedAttrProps.length > 0) {
                    // Add after the last existing property
                    const lastProperty = savedAttrProps[savedAttrProps.length - 1]
                    const insertText = `,\n\t\t\t\t"parameter_speedlim" : ${expectedSpeedLimit}`
                    return fixer.insertTextAfter(lastProperty, insertText)
                  } else {
                    // No existing properties, add as first property
                    const openBrace = sourceCode.getFirstToken(savedAttrObj, token => token.value === '{')
                    if (openBrace) {
                      return fixer.insertTextAfter(openBrace, `\n\t\t\t\t"parameter_speedlim" : ${expectedSpeedLimit}\n\t\t\t`)
                    }
                  }
                } else {
                  // Create new saved_attribute_attributes object
                  const boxObj = boxObjectProperty.value
                  const boxObjProps = boxObj.properties

                  if (boxObjProps.length > 0) {
                    // Add after the last existing property in box
                    const lastProperty = boxObjProps[boxObjProps.length - 1]
                    const insertText = `,\n\t\t\t"saved_attribute_attributes" : {\n\t\t\t\t"parameter_speedlim" : ${expectedSpeedLimit}\n\t\t\t}`
                    return fixer.insertTextAfter(lastProperty, insertText)
                  } else {
                    // No existing properties in box, add as first property
                    const openBrace = sourceCode.getFirstToken(boxObj, token => token.value === '{')
                    if (openBrace) {
                      return fixer.insertTextAfter(openBrace, `\n\t\t\t"saved_attribute_attributes" : {\n\t\t\t\t"parameter_speedlim" : ${expectedSpeedLimit}\n\t\t\t}\n\t\t`)
                    }
                  }
                }
              }

              return null
            }
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
      }
    }
  }
}