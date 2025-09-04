// lib/rules/list-ui-elements.js
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'List all UI elements with their names and annotations for review',
      category: 'Documentation',
      recommended: false,
    },
    schema: [
      {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
      },
    ],
    messages: {
      uiElementInfoJson: '{{json}}',
      uiElementInfo: 'UI Element: {{objectType}} | VarName: "{{varname}}" | Long: "{{longName}}" | Short: "{{shortName}}" | Annotation: "{{annotation}}" | Title: "{{annotationName}}"',
      uiElementSummary: 'Found {{count}} UI elements in patch',
      missingVarname: 'UI Element {{objectType}} missing varname (scripting name)',
      missingAnnotation: 'UI Element {{objectType}} ("{{varname}}") missing annotation documentation',
      genericVarname: 'UI Element {{objectType}} has generic varname "{{varname}}" - consider more descriptive name',
    },
  },

  create (context) {
    const uiElements = context.options[0] || [
      'slider', 'dial', 'button', 'toggle', 'number',
      'live.dial', 'live.slider', 'live.button',
      'live.toggle', 'live.menu', 'live.tab'
    ]

    let uiElementCount = 0

    // Helper function to extract parameter info from saved_attribute_attributes
    function getParameterInfo (boxProps) {
      const savedAttrsProperty = boxProps.find(p => p.key.value === 'saved_attribute_attributes')
      if (!savedAttrsProperty || savedAttrsProperty.value.type !== 'JSONObjectExpression') {
        return {}
      }

      const valueofProperty = savedAttrsProperty.value.properties.find(p => p.key.value === 'valueof')
      if (!valueofProperty || valueofProperty.value.type !== 'JSONObjectExpression') {
        return {}
      }

      const valueofProps = valueofProperty.value.properties
      const parameterInfo = {}

      // Extract parameter names
      const longNameProp = valueofProps.find(p => p.key.value === 'parameter_longname')
      if (longNameProp && longNameProp.value.type === 'JSONLiteral') {
        parameterInfo.longName = longNameProp.value.value || ''
      }

      const shortNameProp = valueofProps.find(p => p.key.value === 'parameter_shortname')
      if (shortNameProp && shortNameProp.value.type === 'JSONLiteral') {
        parameterInfo.shortName = shortNameProp.value.value || ''
      }

      const infoProp = valueofProps.find(p => p.key.value === 'parameter_info')
      if (infoProp && infoProp.value.type === 'JSONLiteral') {
        parameterInfo.parameterInfo = infoProp.value.value || ''
      }

      const annotationNameProp = valueofProps.find(p => p.key.value === 'parameter_annotation_name')
      if (annotationNameProp && annotationNameProp.value.type === 'JSONLiteral') {
        parameterInfo.parameterAnnotationName = annotationNameProp.value.value || ''
      }

      return parameterInfo
    }

    // Helper function to check if varname is generic
    function isGenericVarname (varname, objectType) {
      if (!varname) return false

      const genericPatterns = [
        /^\w+\[\d+\]$/, // live.dial[1], button[2], etc.
        new RegExp(`^${objectType.replace('.', '\\.')}\\d*$`), // live.dial, live.dial1, etc.
        /^(slider|dial|button|toggle|number)\d*$/i, // generic names
      ]

      return genericPatterns.some(pattern => pattern.test(varname))
    }

    return {
      // Look for boxes array
      JSONProperty (node) {
        if (node.key.value !== 'boxes' || !node.value.elements) {
          return
        }

        // Process each box
        node.value.elements.forEach((boxNode, boxIndex) => {
          if (boxNode.type !== 'JSONObjectExpression') return

          const boxObjectProperty = boxNode.properties.find(p => p.key.value === 'box')
          if (!boxObjectProperty || boxObjectProperty.value.type !== 'JSONObjectExpression') return

          const boxProps = boxObjectProperty.value.properties

          // Get maxclass
          const maxclassProperty = boxProps.find(p => p.key.value === 'maxclass')
          if (!maxclassProperty || maxclassProperty.value.type !== 'JSONLiteral') return

          const maxclass = maxclassProperty.value.value
          if (!uiElements.includes(maxclass)) return

          uiElementCount++

          // Extract all the information
          const varnameProperty = boxProps.find(p => p.key.value === 'varname')
          const varname = varnameProperty?.value?.value || ''

          const annotationProperty = boxProps.find(p => p.key.value === 'annotation')
          const annotation = annotationProperty?.value?.value || ''

          const annotationNameProperty = boxProps.find(p => p.key.value === 'annotation_name')
          const annotationName = annotationNameProperty?.value?.value || ''

          // Get parameter info from saved attributes
          const parameterInfo = getParameterInfo(boxProps)

          // Report the UI element info
          context.report({
            node: boxObjectProperty.value,
            messageId: 'uiElementInfoJson',
            data: {
              json: JSON.stringify({
                type: maxclass,
                varname,
                long: parameterInfo.longName,
                short: parameterInfo.shortName,
                annotation: annotation,
                annotationName: annotationName
              }),
            }
          })

          // Report the UI element info
          context.report({
            node: boxObjectProperty.value,
            messageId: 'uiElementInfo',
            data: {
              objectType: maxclass,
              varname: varname || '(none)',
              longName: parameterInfo.longName || '(none)',
              shortName: parameterInfo.shortName || '(none)',
              annotation: annotation || '(none)',
              annotationName: annotationName || '(none)'
            }
          })

          // Additional checks for missing or problematic naming
          if (!varname) {
            context.report({
              node: boxObjectProperty.value,
              messageId: 'missingVarname',
              data: { objectType: maxclass }
            })
          } else if (isGenericVarname(varname, maxclass)) {
            context.report({
              node: varnameProperty.value,
              messageId: 'genericVarname',
              data: { objectType: maxclass, varname }
            })
          }

          // Check for missing annotation
          if (!annotation && !parameterInfo.parameterInfo) {
            context.report({
              node: boxObjectProperty.value,
              messageId: 'missingAnnotation',
              data: { objectType: maxclass, varname: varname || 'unnamed' }
            })
          }
        })
      },

      // Report summary at the end
      'Program:exit' () {
        if (uiElementCount > 0) {
          // We need to report on a node, so we'll use the first one we can find
          // This is a bit of a hack, but ESLint requires a node for reporting
          context.getSourceCode().ast.body.forEach(node => {
            if (node.type === 'JSONObjectExpression') {
              context.report({
                node: node,
                messageId: 'uiElementSummary',
                data: { count: uiElementCount }
              })
            }
          })
        }
      }
    }
  }
}
