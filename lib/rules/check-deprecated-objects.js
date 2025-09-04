// lib/rules/check-deprecated-objects.js
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warns against the use of deprecated Max/MSP objects',
      // ...
    },
    schema: [ // Defines the rule's options
      {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
      },
    ],
  },
  create (context) {
    const deprecatedObjects = context.options[0] || [] // Get the list from config

    return {
      // Visitor for a JSON property (key-value pair)
      JSONProperty (node) {
        // We are looking for the "boxes" array inside the "patcher" object
        if (node.key.value !== 'boxes' || !node.value.elements) {
          return
        }
        
        // Iterate through each element in the "boxes" array
        node.value.elements.forEach(boxNode => {
          if (boxNode.type !== 'JSONObjectExpression') return

          const boxObjectProperty = boxNode.properties.find(p => p.key.value === 'box')
          if (!boxObjectProperty) return

          let maxclassProperty = boxObjectProperty.value.properties.find(p => p.key.value === 'maxclass')
          if (!maxclassProperty) return

          let maxclassName = maxclassProperty.value.value

          if (maxclassName === 'newobj') {
            maxclassProperty = boxObjectProperty.value.properties.find(p => p.key.value === 'text')
            
            if (maxclassProperty === undefined) {
              context.report({
                node: boxObjectProperty.value,
                message: `Missing text property.`,
              })
              
              return
            }
            
            maxclassName = maxclassProperty.value.value?.split(' ')?.[0]
          }
          
          if (deprecatedObjects.includes(maxclassName)) {
            context.report({
              node: maxclassProperty.value,
              message: `The object "${maxclassName}" is deprecated. Consider alternatives.`,
            })
          }
        })
      },
    }
  },
}
