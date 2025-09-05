export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'No disconnected outlets',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          exclude: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            default: [
              'jit.gl.node', 'dac~', 'print', 'post', 'error', 'jit.window',
              'jit.pwindow', 'live.gain~', 'ezdac~', 'ezadc~', 'scope~',
              'meter~', 'live.scope~', 's', 'send', 'forward', 'prepend',
              'sprintf', 'tosymbol', 'fromsymbol', 'jit.gl.render',
              'jit.gl.videoplane', 'live.dial', 'live.slider', 'live.numbox',
              'live.toggle', 'live.button', 'live.menu', 'plugout~',
              'thispatcher', 'live.object', 'live.text', 'jit.gl.texture',
              'jit.poke~', 'jit.gl.mesh', 'live.banks', '"jit.gl.shader',
              'live.meter~', 'jit.gl.layer', 'jit.gl.text'
            ],
            description: 'Excluded objects that commonly have disconnected outlets by design'
          }
        },
        additionalProperties: false
      }
    ],
    defaultOptions: [{
      exclude: [
        'jit.gl.node', 'dac~', 'print', 'post', 'error', 'jit.window',
        'jit.pwindow', 'live.gain~', 'ezdac~', 'ezadc~', 'scope~',
        'meter~', 'live.scope~', 's', 'send', 'forward', 'prepend',
        'sprintf', 'tosymbol', 'fromsymbol', 'jit.gl.render',
        'jit.gl.videoplane', 'live.dial', 'live.slider', 'live.numbox',
        'live.toggle', 'live.button', 'live.menu', 'plugout~',
        'thispatcher', 'live.object', 'live.text', 'jit.gl.texture',
        'jit.poke~', 'jit.gl.mesh', 'live.banks', '"jit.gl.shader',
        'live.meter~', 'jit.gl.layer', 'jit.gl.text'
      ]
    }],
    messages: {
      disconnectedOutlet: 'Object "{{objectType}}" has disconnected outlets (no outgoing patch cables)',
      disconnectedOutletWithText: 'Object "{{objectType}}" with text "{{text}}" has disconnected outlets (no outgoing patch cables)',
    },
  },

  create (context) {
    const skipObjects = context.options[0]?.exclude || []

    return {
      // Look for the patcher object to collect both boxes and lines
      JSONProperty (node) {
        if (node.key.value !== 'patcher' || node.value.type !== 'JSONObjectExpression') {
          return
        }

        const patcherProperties = node.value.properties

        // Find boxes array
        const boxesProperty = patcherProperties.find(p => p.key.value === 'boxes')
        if (!boxesProperty || !boxesProperty.value.elements) {
          return
        }

        // Find lines array (patch cables)
        const linesProperty = patcherProperties.find(p => p.key.value === 'lines')
        const lines = linesProperty?.value?.elements || []

        // Collect all object IDs that have outgoing connections (are sources)
        const objectsWithOutlets = new Set()

        lines.forEach(lineNode => {
          if (lineNode.type !== 'JSONObjectExpression') return

          const patchlineProperty = lineNode.properties.find(p => p.key.value === 'patchline')
          if (!patchlineProperty || patchlineProperty.value.type !== 'JSONObjectExpression') return

          const patchlineProps = patchlineProperty.value.properties

          // Get source connection [objectId, outletIndex]
          const sourceProperty = patchlineProps.find(p => p.key.value === 'source')
          if (sourceProperty?.value?.type === 'JSONArrayExpression' && sourceProperty.value.elements.length >= 1) {
            const sourceId = sourceProperty.value.elements[0]?.value
            if (typeof sourceId === 'string') {
              objectsWithOutlets.add(sourceId)
            }
          }
        })

        // Check each box for disconnected outlets
        boxesProperty.value.elements.forEach(boxNode => {
          if (boxNode.type !== 'JSONObjectExpression') return

          const boxObjectProperty = boxNode.properties.find(p => p.key.value === 'box')
          if (!boxObjectProperty || boxObjectProperty.value.type !== 'JSONObjectExpression') return

          const boxProps = boxObjectProperty.value.properties

          // Get object ID
          const idProperty = boxProps.find(p => p.key.value === 'id')
          if (!idProperty || idProperty.value.type !== 'JSONLiteral') return

          const objectId = idProperty.value.value
          if (typeof objectId !== 'string') return

          // Get maxclass to determine object type
          const maxclassProperty = boxProps.find(p => p.key.value === 'maxclass')
          if (!maxclassProperty || maxclassProperty.value.type !== 'JSONLiteral') return

          const maxclass = maxclassProperty.value.value
          if (typeof maxclass !== 'string') return

          let checkClass = maxclass

          if (maxclass === 'newobj') {
            const textProperty = boxProps.find(p => p.key.value === 'text')
            const text = textProperty?.value?.value?.split(' ')?.[0]

            if (text) {
              checkClass = text
            }
          }

          // Skip objects that are allowed to have disconnected outlets
          if (skipObjects.includes(checkClass)) {
            return
          }

          // Skip objects that typically don't have outlets or are input-only
          const inputOnlyObjects = ['loadbang', 'bang', 'button', 'toggle', 'number', 'slider', 'dial', 'tab', 'radiogroup', 'umenu', 'textedit', 'message', 'comment', 'panel', 'fpic', 'live.comment']
          if (inputOnlyObjects.includes(checkClass)) {
            return
          }

          // Check if this object has any outgoing connections
          if (!objectsWithOutlets.has(objectId)) {
            // Get numinlets and numoutlets to determine if object should have outlets
            const numletsProperty = boxProps.find(p => p.key.value === 'numoutlets')
            const numOutlets = numletsProperty?.value?.value

            // If we can determine the object has outlets and none are connected
            if (numOutlets > 0 || numOutlets === undefined) {
              // Get text for more descriptive message
              const textProperty = boxProps.find(p => p.key.value === 'text')
              const text = textProperty?.value?.value

              if (text && typeof text === 'string' && text.trim()) {
                context.report({
                  node: boxObjectProperty.value,
                  messageId: 'disconnectedOutletWithText',
                  data: {
                    objectType: maxclass,
                    text: text.trim()
                  }
                })
              } else {
                context.report({
                  node: boxObjectProperty.value,
                  messageId: 'disconnectedOutlet',
                  data: {
                    objectType: maxclass
                  }
                })
              }
            }
          }
        })
      }
    }
  }
}
