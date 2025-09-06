export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Disallow segmented patch cords (midpoints) in Max/MSP patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          fix: {
            type: 'boolean',
            default: true,
            description: 'Remove midpoints to create direct connections'
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{
      fix: true
    }],
    messages: {
      segmentedCord: 'Patch cord should not be segmented - remove midpoints for direct connection',
    },
  },

  create (context) {
    return {
      // Look for lines array in patcher
      JSONProperty (node) {
        if (node.key.value !== 'lines' || !node.value.elements) {
          return
        }

        // Iterate through each line
        node.value.elements.forEach(lineNode => {
          if (lineNode.type !== 'JSONObjectExpression') return

          const patchlineProperty = lineNode.properties.find(p => p.key.value === 'patchline')
          if (!patchlineProperty || patchlineProperty.value.type !== 'JSONObjectExpression') return

          const patchlineProperties = patchlineProperty.value.properties

          // Check for midpoints property
          const midpointsProperty = patchlineProperties.find(p => p.key.value === 'midpoints')
          if (midpointsProperty) {
            context.report({
              node: midpointsProperty,
              messageId: 'segmentedCord',
              fix: context.options[0]?.fix === true ? (fixer) => {
                // Find the comma before or after the midpoints property
                const patchlineProps = patchlineProperty.value.properties
                const midpointsIndex = patchlineProps.indexOf(midpointsProperty)

                // Get the source text to find commas
                const sourceCode = context.getSourceCode()
                // const patchlineText = sourceCode.getText(patchlineProperty.value)

                // Find the range to remove (including comma)
                let removeStart = midpointsProperty.range[0]
                let removeEnd = midpointsProperty.range[1]

                // If there's a property after midpoints, remove the comma after
                if (midpointsIndex < patchlineProps.length - 1) {
                  // Look for comma after midpoints
                  const textAfter = sourceCode.getText().substring(removeEnd)
                  const commaMatch = textAfter.match(/^\s*,/)
                  if (commaMatch) {
                    removeEnd += commaMatch[0].length
                  }
                } else if (midpointsIndex > 0) {
                  // If midpoints is last property, remove comma before it
                  const textBefore = sourceCode.getText().substring(0, removeStart)
                  const commaMatch = textBefore.match(/,\s*$/)
                  if (commaMatch) {
                    removeStart -= commaMatch[0].length
                  }
                }

                return fixer.removeRange([removeStart, removeEnd])
              } : null
            })
          }
        })
      }
    }
  }
}
