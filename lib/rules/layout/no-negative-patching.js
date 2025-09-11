export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Disallow negative patching coordinates in Max/MSP patches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        minimum: {
          type: 'number',
          default: 0,
          description: 'Minimum allowed coordinate value',
        },
        fix: {
          type: 'boolean',
          default: true,
          description: 'Apply fix to shift negative coordinates'
        },
      },
      additionalProperties: false,
    }],
    defaultOptions: [{ minimum: 0, fix: true }],
    messages: {
      negativeCoordinates: 'Negative patching coordinates found - minimum x: {{minX}}, minimum y: {{minY}}',
      negativeCoordinatesFixed: 'Shifted all elements by x: {{shiftX}}, y: {{shiftY}} to eliminate negative coordinates',
    },
  },
  create(context) {
    const options = context.options[0] || {}
    const minimum = options.minimum ?? 0
    const shouldFix = options.fix !== false

    // Track all coordinate data for fixing
    const coordinateNodes = []

    const processCoordinates = (patcherNode) => {
      let minX = Infinity
      let minY = Infinity
      const localCoordinateNodes = []

      // Find boxes array within this patcher
      const boxesProperty = patcherNode.properties.find(prop => prop.key.value === 'boxes')
      if (boxesProperty && boxesProperty.value.type === 'JSONArrayExpression') {
        console.log('Found boxes array with', boxesProperty.value.elements.length, 'elements')
        boxesProperty.value.elements.forEach((box, index) => {
          console.log('Processing box', index, 'type:', box.type)
          if (box.type === 'JSONObjectExpression') {
            const boxProperty = box.properties.find(prop => prop.key.value === 'box')
            console.log('Box property found:', !!boxProperty)
            if (boxProperty && boxProperty.value.type === 'JSONObjectExpression') {
              const patchingRectProperty = boxProperty.value.properties.find(prop => prop.key.value === 'patching_rect')
              console.log('Patching rect found:', !!patchingRectProperty)
              if (patchingRectProperty && patchingRectProperty.value.type === 'JSONArrayExpression') {
                const coords = patchingRectProperty.value.elements
                console.log('Coords:', coords.map(c => c.value))
                
                if (coords[1].value === undefined) {
                  console.log('ZZZZZ', coords[1])
                }
                
                
                if (coords.length >= 2 &&
                  coords[0].type === 'JSONLiteral' && typeof coords[0].value === 'number' &&
                  coords[1].type === 'JSONLiteral' && typeof coords[1].value === 'number') {

                  const x = coords[0].value
                  const y = coords[1].value
                  console.log('Found coordinates:', x, y)

                  minX = Math.min(minX, x)
                  minY = Math.min(minY, y)

                  localCoordinateNodes.push({
                    type: 'patching_rect',
                    xNode: coords[0],
                    yNode: coords[1],
                    x, y
                  })
                }
              }
            }
          }
        })
      }

      // Find lines array within this patcher
      const linesProperty = patcherNode.properties.find(prop => prop.key.value === 'lines')
      if (linesProperty && linesProperty.value.type === 'JSONArrayExpression') {
        linesProperty.value.elements.forEach(line => {
          if (line.type === 'JSONObjectExpression') {
            const patchlineProperty = line.properties.find(prop => prop.key.value === 'patchline')
            if (patchlineProperty && patchlineProperty.value.type === 'JSONObjectExpression') {
              const midpointsProperty = patchlineProperty.value.properties.find(prop => prop.key.value === 'midpoints')
              if (midpointsProperty && midpointsProperty.value.type === 'JSONArrayExpression') {
                const midpoints = midpointsProperty.value.elements
                const midpointCoords = []

                // Midpoints array contains [x1, y1, x2, y2, ...] pairs
                for (let i = 0; i < midpoints.length; i += 2) {
                  if (i + 1 < midpoints.length &&
                    midpoints[i].type === 'JSONLiteral' && typeof midpoints[i].value === 'number' &&
                    midpoints[i + 1].type === 'JSONLiteral' && typeof midpoints[i + 1].value === 'number') {

                    const x = midpoints[i].value
                    const y = midpoints[i + 1].value

                    minX = Math.min(minX, x)
                    minY = Math.min(minY, y)

                    midpointCoords.push({
                      xNode: midpoints[i],
                      yNode: midpoints[i + 1],
                      x, y
                    })
                  }
                }

                if (midpointCoords.length > 0) {
                  localCoordinateNodes.push({
                    type: 'midpoints',
                    coords: midpointCoords
                  })
                }
              }
            }
          }
        })
      }

      // Check for negative coordinates
      if (minX < minimum || minY < minimum) {
        const shiftX = minX < minimum ? minimum - minX : 0
        const shiftY = minY < minimum ? minimum - minY : 0

        context.report({
          node: patcherNode,
          messageId: 'negativeCoordinates',
          data: {
            minX: minX === Infinity ? 'none' : minX,
            minY: minY === Infinity ? 'none' : minY
          },
          fix: shouldFix ? (fixer) => {
            const fixes = []

            localCoordinateNodes.forEach(coordData => {
              if (coordData.type === 'patching_rect') {
                if (shiftX !== 0) {
                  const newX = coordData.x + shiftX
                  fixes.push(fixer.replaceText(coordData.xNode, newX.toString()))
                }
                if (shiftY !== 0) {
                  const newY = coordData.y + shiftY
                  fixes.push(fixer.replaceText(coordData.yNode, newY.toString()))
                }
              } else if (coordData.type === 'midpoints') {
                coordData.coords.forEach(coord => {
                  if (shiftX !== 0) {
                    const newX = coord.x + shiftX
                    fixes.push(fixer.replaceText(coord.xNode, newX.toString()))
                  }
                  if (shiftY !== 0) {
                    const newY = coord.y + shiftY
                    fixes.push(fixer.replaceText(coord.yNode, newY.toString()))
                  }
                })
              }
            })

            return fixes
          } : null
        })
      }

      // Recursively process sub-patchers
      const boxesProperty2 = patcherNode.properties.find(prop => prop.key.value === 'boxes')
      if (boxesProperty2 && boxesProperty2.value.type === 'JSONArrayExpression') {
        boxesProperty2.value.elements.forEach(box => {
          if (box.type === 'JSONObjectExpression') {
            const boxProperty = box.properties.find(prop => prop.key.value === 'box')
            if (boxProperty && boxProperty.value.type === 'JSONObjectExpression') {
              // Look for patcher property (sub-patcher)
              const subPatcherProperty = boxProperty.value.properties.find(prop => prop.key.value === 'patcher')
              if (subPatcherProperty && subPatcherProperty.value.type === 'JSONObjectExpression') {
                processCoordinates(subPatcherProperty.value)
              }
            }
          }
        })
      }
    }

    return {
      // Look for the main patcher object
      JSONProperty(node) {
        if (node.key.value === 'patcher' && node.value.type === 'JSONObjectExpression') {
          processCoordinates(node.value)
        }
      }
    }
  }
}