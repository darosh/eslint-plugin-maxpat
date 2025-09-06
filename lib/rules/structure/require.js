export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require essential Live objects in Max for Live device patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null, // No autofix for this rule
    schema: [{
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'File pattern regex to match (e.g., "Device .+\\.maxpat")',
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true,
          description: 'Required objects',
          default: [
            'live.banks', 'live.thisdevice'
          ]
        },
        additionalProperties: false,
      },
    }],
    defaultOptions: [{
      file: 'Device .+\\.maxpat',
      include: ['live.banks', 'live.thisdevice'],
    }],
    messages: {
      missingLiveObject: 'Missing required Live object: {{objectName}}',
      missingLiveObjects: 'Missing required Live objects: {{objectNames}}',
    },
  },
  create (context) {
    const options = context.options[0] || {}
    const filePattern = options.file ? new RegExp(options.file) : null
    const requiredObjects = options.include || []

    // Get filename to check if rule should apply
    const filename = context.getFilename()

    // If file pattern is specified and doesn't match, skip this file
    if (filePattern && !filePattern.test(filename)) {
      return {}
    }

    const foundObjects = new Set()
    const requiredObjectNames = requiredObjects

    return {
      // Look for box objects within the patcher
      JSONProperty (node) {
        // We're looking for boxes array within the patcher
        if (node.key.value === 'boxes' && node.value.type === 'JSONArrayExpression') {
          // Check each box in the boxes array
          node.value.elements.forEach(box => {
            if (box.type === 'JSONObjectExpression') {
              // Find the box property that contains the object definition
              const boxProperty = box.properties.find(prop => prop.key.value === 'box')
              if (boxProperty && boxProperty.value.type === 'JSONObjectExpression') {
                // Look for the text property which contains the object name
                const textProperty = boxProperty.value.properties.find(prop => prop.key.value === 'text')
                if (textProperty && textProperty.value.type === 'JSONLiteral') {
                  const objectText = textProperty.value.value
                  // Check if this is one of our required objects
                  requiredObjectNames.forEach(objName => {
                    if (typeof objectText === 'string' && objectText.includes(objName)) {
                      foundObjects.add(objName)
                    }
                  })
                }
              }
            }
          })
        }
      },

      // At the end of the program, check if all required objects were found
      'Program:exit' () {
        const missingObjects = requiredObjectNames.filter(obj => !foundObjects.has(obj))

        if (missingObjects.length > 0) {
          // Find the patcher node to report on
          const sourceCode = context.getSourceCode()
          const ast = sourceCode.ast

          // Find the patcher property in the root object
          let patcherNode = null
          if (ast.body[0] && ast.body[0].type === 'JSONExpressionStatement') {
            const root = ast.body[0].expression
            if (root.type === 'JSONObjectExpression') {
              const patcherProp = root.properties.find(prop => prop.key.value === 'patcher')
              if (patcherProp) {
                patcherNode = patcherProp.value
              }
            }
          }

          // Report the missing objects
          if (missingObjects.length === 1) {
            context.report({
              node: patcherNode || ast,
              messageId: 'missingLiveObject',
              data: {
                objectName: missingObjects[0]
              }
            })
          } else {
            context.report({
              node: patcherNode || ast,
              messageId: 'missingLiveObjects',
              data: {
                objectNames: missingObjects.join(', ')
              }
            })
          }
        }
      }
    }
  }
}
