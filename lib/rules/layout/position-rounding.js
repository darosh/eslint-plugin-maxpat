export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Require proper coordinate rounding for patching_rect and presentation_rect in Max/MSP patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          'patching-precision': {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            description: 'Rounding grid size'
          },
          'presentation-precision': {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            description: 'Rounding grid size'
          },
          fix: {
            type: 'bool',
            default: true,
            description: 'Apply fix'
          },
        },
        additionalProperties: false,
      },
    ], 
    defaultOptions: [{
      'patching-precision': [8, 8],
      'presentation-precision': [1, 1],
      fix: true
    }],
    messages: {
      invalidPatchingX: 'Patching X coordinate {{actual}} should be rounded to multiple of {{precision}} (nearest: {{fixed}})',
      invalidPatchingY: 'Patching Y coordinate {{actual}} should be rounded to multiple of {{precision}} (nearest: {{fixed}})',
      invalidPatchingWidth: 'Patching width {{actual}} should be rounded to multiple of {{precision}} (nearest: {{fixed}})',
      invalidPatchingHeight: 'Patching height {{actual}} should be rounded to multiple of {{precision}} (nearest: {{fixed}})',
      invalidPresentationX: 'Presentation X coordinate {{actual}} should be rounded to multiple of {{precision}} (nearest: {{fixed}})',
      invalidPresentationY: 'Presentation Y coordinate {{actual}} should be rounded to multiple of {{precision}} (nearest: {{fixed}})',
      invalidPresentationWidth: 'Presentation width {{actual}} should be rounded to whole pixels (nearest: {{fixed}})',
      invalidPresentationHeight: 'Presentation height {{actual}} should be rounded to whole pixels (nearest: {{fixed}})',
      invalidRectLength: 'Invalid {{rectType}} length - expected 4 elements [x, y, width, height], got {{length}}',
      invalidRectType: 'Invalid {{rectType}} type - expected array, got {{type}}',
    },
  },

  create (context) {
    const options = context.options[0] || {}
    const patchingPrecision = options['patching-precision'] || [8, 8]
    const presentationPrecision = options['presentation-precision'] || [1, 1]

    const [patchingX, patchingY] = patchingPrecision
    const [presentationX, presentationY] = presentationPrecision

    // Helper function to round to nearest multiple
    function roundToMultiple (value, multiple) {
      return Math.round(value / multiple) * multiple
    }

    // Helper function to check if value needs rounding
    function needsRounding (value, precision) {
      const rounded = roundToMultiple(value, precision)
      return Math.abs(value - rounded) > 0.0001 // Small tolerance for floating point
    }

    // Helper function to validate and fix rectangle coordinates
    function validateRect (rectNode, rectType, precisionX, precisionY) {
      if (rectNode.type !== 'JSONArrayExpression') {
        context.report({
          node: rectNode,
          messageId: 'invalidRectType',
          data: {
            rectType,
            type: rectNode.type
          }
        })
        return
      }

      if (rectNode.elements.length !== 4) {
        context.report({
          node: rectNode,
          messageId: 'invalidRectLength',
          data: {
            rectType,
            length: rectNode.elements.length
          }
        })
        return
      }

      const [xNode, yNode, widthNode, heightNode] = rectNode.elements
      const coordinates = [
        { node: xNode, value: xNode.value, precision: precisionX, coord: 'X' },
        { node: yNode, value: yNode.value, precision: precisionY, coord: 'Y' },
        { node: widthNode, value: widthNode.value, precision: 1, coord: 'Width' },
        { node: heightNode, value: heightNode.value, precision: 1, coord: 'Height' }
      ]

      coordinates.forEach(({ node, value, precision, coord }) => {
        if (node.type !== 'JSONLiteral' || typeof value !== 'number') {
          return // Skip non-numeric values
        }

        if (needsRounding(value, precision)) {
          const fixed = roundToMultiple(value, precision)
          const messageId = rectType === 'patching_rect'
            ? `invalidPatching${coord}`
            : `invalidPresentation${coord}`

          context.report({
            node: node,
            messageId,
            data: {
              actual: value,
              precision,
              fixed: fixed.toFixed(1)
            },
            fix (fixer) {
              return fixer.replaceText(node, fixed.toFixed(1))
            }
          })
        }
      })
    }

    return {
      // Look for boxes array in patcher
      JSONProperty (node) {
        if (node.key.value !== 'boxes' || !node.value.elements) {
          return
        }

        // Iterate through each box
        node.value.elements.forEach(boxNode => {
          if (boxNode.type !== 'JSONObjectExpression') return

          const boxObjectProperty = boxNode.properties.find(p => p.key.value === 'box')
          if (!boxObjectProperty || boxObjectProperty.value.type !== 'JSONObjectExpression') return

          const boxProperties = boxObjectProperty.value.properties

          // Check patching_rect
          const patchingRectProperty = boxProperties.find(p => p.key.value === 'patching_rect')
          if (patchingRectProperty) {
            validateRect(
              patchingRectProperty.value,
              'patching_rect',
              patchingX,
              patchingY,
              boxNode
            )
          }

          // Check presentation_rect (only if it exists - not all boxes have presentation)
          const presentationRectProperty = boxProperties.find(p => p.key.value === 'presentation_rect')
          if (presentationRectProperty) {
            validateRect(
              presentationRectProperty.value,
              'presentation_rect',
              presentationX,
              presentationY,
              boxNode
            )
          }
        })
      }
    }
  }
}
