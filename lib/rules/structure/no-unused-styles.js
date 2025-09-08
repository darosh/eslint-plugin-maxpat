export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unused styles in Max/MSP patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        fix: {
          type: 'boolean',
          default: true,
          description: 'Apply fix to remove unused styles'
        },
      },
      additionalProperties: false,
    }],
    defaultOptions: [{ fix: true }],
    messages: {
      unusedStyle: 'Unused style "{{styleName}}" - defined but never referenced',
      // unusedStyles: 'Unused styles: {{styleNames}} - defined but never referenced',
    },
  },
  create (context) {
    const options = context.options[0] || {}

    const definedStyles = new Set()
    const usedStyles = new Set()
    let stylesArrayNode = null
    const unusedStyleNodes = []

    return {
      // Find defined styles in the styles array
      JSONProperty (node) {
        // Look for the styles array
        if (node.key.value === 'styles' && node.value.type === 'JSONArrayExpression') {
          stylesArrayNode = node.value

          // Collect all defined style names
          node.value.elements.forEach((styleElement, index) => {
            if (styleElement.type === 'JSONObjectExpression') {
              const nameProperty = styleElement.properties.find(prop => prop.key.value === 'name')
              if (nameProperty && nameProperty.value.type === 'JSONLiteral' && typeof nameProperty.value.value === 'string') {
                const styleName = nameProperty.value.value
                definedStyles.add(styleName)
                unusedStyleNodes.push({ node: styleElement, name: styleName, index })
              }
            }
          })
        }

        // Look for boxes array to find used styles
        if (node.key.value === 'boxes' && node.value.type === 'JSONArrayExpression') {
          node.value.elements.forEach(box => {
            if (box.type === 'JSONObjectExpression') {
              // Find the box property
              const boxProperty = box.properties.find(prop => prop.key.value === 'box')
              if (boxProperty && boxProperty.value.type === 'JSONObjectExpression') {
                // Look for the style property
                const styleProperty = boxProperty.value.properties.find(prop => prop.key.value === 'style')
                if (styleProperty && styleProperty.value.type === 'JSONLiteral' && typeof styleProperty.value.value === 'string') {
                  usedStyles.add(styleProperty.value.value)
                }
              }
            }
          })
        }
      },

      // At the end, check for unused styles
      'Program:exit' () {
        const unusedStyles = []
        const unusedNodes = []

        unusedStyleNodes.forEach(({ node, name, index }) => {
          if (!usedStyles.has(name)) {
            unusedStyles.push(name)
            unusedNodes.push({ node, index })
          }
        })

        if (unusedStyles.length > 0) {
          // Report each unused style individually for better targeting
          unusedNodes.forEach(({ node }) => {
            const styleName = unusedStyles.find(name => {
              const nameProperty = node.properties.find(prop => prop.key.value === 'name')
              return nameProperty && nameProperty.value.value === name
            })

            context.report({
              node: node,
              messageId: 'unusedStyle',
              data: { styleName },
              fix: options.fix ? (fixer) => {
                if (stylesArrayNode && stylesArrayNode.elements.length === 1) {
                  const sourceCode = context.getSourceCode()
                  const ast = sourceCode.ast

                  let stylesProperty = null

                  // Navigate through the AST to find the styles property
                  if (ast.body && ast.body[0] && ast.body[0].type === 'JSONExpressionStatement') {
                    const rootExpression = ast.body[0].expression
                    if (rootExpression.type === 'JSONObjectExpression') {
                      // Look for patcher property first
                      const patcherProperty = rootExpression.properties.find(prop => prop.key.value === 'patcher')
                      if (patcherProperty && patcherProperty.value.type === 'JSONObjectExpression') {
                        stylesProperty = patcherProperty.value.properties.find(prop => prop.key.value === 'styles')
                      }
                    }
                  }

                  if (stylesProperty) {
                    // Find if there's a comma before or after
                    const sourceCode = context.getSourceCode()
                    const text = sourceCode.getText()
                    const propertyStart = stylesProperty.range[0]
                    const propertyEnd = stylesProperty.range[1]

                    // Look for comma before
                    let removeStart = propertyStart
                    for (let i = propertyStart - 1; i >= 0; i--) {
                      if (text[i] === ',') {
                        removeStart = i
                        break
                      } else if (text[i] !== ' ' && text[i] !== '\t' && text[i] !== '\n' && text[i] !== '\r') {
                        break
                      }
                    }

                    // Look for comma after if we didn't find one before
                    let removeEnd = propertyEnd
                    if (removeStart === propertyStart) {
                      for (let i = propertyEnd; i < text.length; i++) {
                        if (text[i] === ',') {
                          removeEnd = i + 1
                          break
                        } else if (text[i] !== ' ' && text[i] !== '\t' && text[i] !== '\n' && text[i] !== '\r') {
                          break
                        }
                      }
                    }

                    return fixer.removeRange([removeStart, removeEnd])
                  }
                } else {
                  // Remove just this style element
                  const elementIndex = stylesArrayNode.elements.findIndex(el => el === node)
                  if (elementIndex !== -1) {
                    const sourceCode = context.getSourceCode()
                    const text = sourceCode.getText()
                    const elementStart = node.range[0]
                    const elementEnd = node.range[1]

                    // Handle comma removal
                    let removeStart = elementStart
                    let removeEnd = elementEnd

                    // If not the last element, include the comma after
                    if (elementIndex < stylesArrayNode.elements.length - 1) {
                      for (let i = elementEnd; i < text.length; i++) {
                        if (text[i] === ',') {
                          removeEnd = i + 1
                          break
                        } else if (text[i] !== ' ' && text[i] !== '\t' && text[i] !== '\n' && text[i] !== '\r') {
                          break
                        }
                      }
                    } else if (elementIndex > 0) {
                      // If this is the last element, remove the comma before
                      for (let i = elementStart - 1; i >= 0; i--) {
                        if (text[i] === ',') {
                          removeStart = i
                          break
                        } else if (text[i] !== ' ' && text[i] !== '\t' && text[i] !== '\n' && text[i] !== '\r') {
                          break
                        }
                      }
                    }

                    return fixer.removeRange([removeStart, removeEnd])
                  }
                }
                return null
              } : null
            })
          })
        }
      }
    }
  }
}
