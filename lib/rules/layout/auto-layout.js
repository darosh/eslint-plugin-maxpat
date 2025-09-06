export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Automatically organize patch layout using hierarchical grid algorithm. Experimental feature. Fix is turned off by default.',
      category: 'Best Practices',
      recommended: false, // This is a major change, so not recommended by default
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          fix: {
            type: 'boolean',
            default: false,
            description: 'Apply automatic layout'
          },
          gridSize: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            default: [8, 8],
            description: 'Grid alignment in pixels [x, y]'
          },
          layerSpacing: {
            type: 'number',
            default: 150,
            description: 'Horizontal spacing between layers'
          },
          objectSpacing: {
            type: 'number',
            default: 80,
            description: 'Vertical spacing between objects'
          },
          multiOutlet: {
            type: 'string',
            enum: ['extend-width', 'standard-width'],
            default: 'extend-width',
            description: 'How to handle objects with multiple outlets'
          },
          maxObjectWidth: {
            type: 'number',
            default: 200,
            description: 'Maximum width for extended objects'
          },
          outletSpacing: {
            type: 'number',
            default: 20,
            description: 'Spacing between outlets for extended objects'
          },
          preserveComments: {
            type: 'boolean',
            default: true,
            description: 'Keep comments near their associated objects'
          }
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{
      fix: false,
      gridSize: [8, 8],
      layerSpacing: 150,
      objectSpacing: 80,
      multiOutlet: 'extend-width',
      maxObjectWidth: 200,
      outletSpacing: 20,
      preserveComments: true
    }],
    messages: {
      layoutOptimizable: 'Patch layout can be optimized - {{objectCount}} objects in {{layerCount}} layers',
      layoutApplied: 'Auto-layout applied: reorganized {{moved}} objects',
    },
  },

  create (context) {
    const options = context.options[0] || {}

    class PatchGraph {
      constructor () {
        this.objects = new Map() // obj-id -> {node, data, position, outlets, inlets}
        this.connections = new Map() // source-id -> [{dest-id, outlet, inlet}]
        this.layers = [] // [Set(obj-ids), ...]
        this.comments = new Map() // comment-id -> associated obj-ids
      }

      addObject (objId, node, boxData) {
        const patchingRect = this.extractRect(boxData, 'patching_rect')
        const outlets = this.getOutletCount(boxData)
        const inlets = this.getInletCount(boxData)

        this.objects.set(objId, {
          id: objId,
          node,
          data: boxData,
          position: patchingRect ? [patchingRect[0], patchingRect[1]] : [0, 0],
          size: patchingRect ? [patchingRect[2], patchingRect[3]] : [60, 20],
          outlets: outlets,
          inlets: inlets,
          layer: -1,
          isComment: this.isComment(boxData)
        })
      }

      addConnection (sourceId, outlet, destId, inlet) {
        if (!this.connections.has(sourceId)) {
          this.connections.set(sourceId, [])
        }
        this.connections.get(sourceId).push({ destId, outlet, inlet })
      }

      extractRect (boxData, rectType) {
        const rectProp = boxData.properties?.find(p => p.key.value === rectType)
        if (!rectProp || rectProp.value.type !== 'JSONArrayExpression') return null
        return rectProp.value.elements.map(e => e.value).filter(v => typeof v === 'number')
      }

      getOutletCount (boxData) {
        const textProp = boxData.properties?.find(p => p.key.value === 'text')
        if (!textProp?.value?.value) return 1

        const text = textProp.value.value
        // Simple heuristics for common objects
        if (text.startsWith('*~') || text.startsWith('+~') || text.startsWith('-~')) return 1
        if (text === 'dac~') return 0
        if (text === 'adc~') return 2
        if (text.startsWith('unpack')) {
          const match = text.match(/unpack\s+(.+)/)
          return match ? match[1].split(/\s+/).length : 2
        }
        return 1 // Default
      }

      getInletCount (boxData) {
        const textProp = boxData.properties?.find(p => p.key.value === 'text')
        if (!textProp?.value?.value) return 1

        const text = textProp.value.value
        if (text === 'dac~') return 2
        if (text === 'adc~') return 0
        if (text.startsWith('pack')) {
          const match = text.match(/pack\s+(.+)/)
          return match ? match[1].split(/\s+/).length : 2
        }
        return 1 // Default
      }

      isComment (boxData) {
        const textProp = boxData.properties?.find(p => p.key.value === 'text')
        const text = textProp?.value?.value || ''
        return text.startsWith('comment') || text === ''
      }

      assignLayers () {
        // Kahn's algorithm for topological sorting
        const inDegree = new Map()
        const queue = []

        // Initialize in-degrees
        for (const objId of this.objects.keys()) {
          inDegree.set(objId, 0)
        }

        // Count incoming connections (only for existing objects)
        for (const connections of this.connections.values()) {
          for (const conn of connections) {
            if (this.objects.has(conn.destId)) { // Only count if destination exists
              inDegree.set(conn.destId, (inDegree.get(conn.destId) || 0) + 1)
            }
          }
        }

        // Find sources (no inputs)
        for (const [objId, degree] of inDegree) {
          if (degree === 0 && !this.objects.get(objId).isComment) {
            queue.push(objId)
          }
        }

        let layerIndex = 0
        this.layers = []

        while (queue.length > 0) {
          const layerSize = queue.length
          const currentLayer = new Set()

          for (let i = 0; i < layerSize; i++) {
            const objId = queue.shift()
            currentLayer.add(objId)
            this.objects.get(objId).layer = layerIndex

            // Process outgoing connections
            const outgoing = this.connections.get(objId) || []
            for (const conn of outgoing) {
              inDegree.set(conn.destId, inDegree.get(conn.destId) - 1)
              if (inDegree.get(conn.destId) === 0) {
                queue.push(conn.destId)
              }
            }
          }

          this.layers.push(currentLayer)
          layerIndex++
        }

        // Handle remaining objects (cycles or isolated)
        for (const [objId, obj] of this.objects) {
          if (obj.layer === -1 && !obj.isComment) {
            if (this.layers.length === 0) this.layers.push(new Set())
            this.layers[this.layers.length - 1].add(objId)
            obj.layer = this.layers.length - 1
          }
        }
      }

      calculateLayout () {
        this.assignLayers()
        const newPositions = new Map()

        for (let layerIdx = 0; layerIdx < this.layers.length; layerIdx++) {
          const layer = Array.from(this.layers[layerIdx])
          const x = layerIdx * options.layerSpacing

          layer.forEach((objId, index) => {
            const obj = this.objects.get(objId)
            const y = index * options.objectSpacing

            // Handle multi-outlet width extension
            let width = obj.size[1]
            if (options.multiOutlet === 'extend-width' && obj.outlets > 1) {
              const extraWidth = (obj.outlets - 1) * options.outletSpacing
              width = Math.min(obj.size[1] + extraWidth, options.maxObjectWidth)
            }

            // Snap to grid
            const gridX = Math.round(x / options.gridSize[0]) * options.gridSize[0]
            const gridY = Math.round(y / options.gridSize[1]) * options.gridSize[1]

            newPositions.set(objId, {
              position: [gridX, gridY],
              size: [width, obj.size[1]]
            })
          })
        }

        // Position comments near their associated objects
        if (options.preserveComments) {
          for (const [objId, obj] of this.objects) {
            if (obj.isComment) {
              // Find nearest non-comment object
              let nearestId = null
              let minDistance = Infinity

              for (const [otherId, otherObj] of this.objects) {
                if (!otherObj.isComment && newPositions.has(otherId)) {
                  const dist = Math.abs(obj.position[0] - otherObj.position[0]) +
                    Math.abs(obj.position[1] - otherObj.position[1])
                  if (dist < minDistance) {
                    minDistance = dist
                    nearestId = otherId
                  }
                }
              }

              if (nearestId) {
                const nearestPos = newPositions.get(nearestId)
                newPositions.set(objId, {
                  position: [nearestPos.position[0], nearestPos.position[1] - 40],
                  size: obj.size
                })
              }
            }
          }
        }

        return newPositions
      }
    }

    return {
      JSONProperty (node) {
        if (node.key.value !== 'boxes' || !node.value.elements) {
          return
        }

        const graph = new PatchGraph()
        const objectNodes = new Map() // Track AST nodes for fixes

        // First pass: collect all objects
        node.value.elements.forEach((boxNode, index) => {
          if (boxNode.type !== 'JSONObjectExpression') return

          const boxProperty = boxNode.properties.find(p => p.key.value === 'box')
          if (!boxProperty?.value?.properties) return

          const objId = `obj-${index}`
          graph.addObject(objId, boxNode, boxProperty.value)
          objectNodes.set(objId, boxProperty.value)
        })

        // Second pass: collect connections from lines
        const patcherNode = node.parent
        if (patcherNode?.properties) {
          const linesProperty = patcherNode.properties.find(p => p.key.value === 'lines')
          if (linesProperty?.value?.elements) {
            linesProperty.value.elements.forEach(lineNode => {
              const patchline = lineNode.properties?.find(p => p.key.value === 'patchline')?.value
              if (patchline?.properties) {
                const source = patchline.properties.find(p => p.key.value === 'source')?.value
                const dest = patchline.properties.find(p => p.key.value === 'destination')?.value

                if (source?.elements?.length >= 2 && dest?.elements?.length >= 2) {
                  const sourceId = source.elements[0].value
                  const sourceOutlet = source.elements[1].value
                  const destId = dest.elements[0].value
                  const destInlet = dest.elements[1].value

                  graph.addConnection(sourceId, sourceOutlet, destId, destInlet)
                }
              }
            })
          }
        }

        // Calculate if layout would improve the patch
        if (graph.objects.size > 2) { // Only analyze non-trivial patches
          const newPositions = graph.calculateLayout()
          let movedCount = 0

          // Count how many objects would move significantly
          for (const [objId, obj] of graph.objects) {
            if (newPositions.has(objId)) {
              const newPos = newPositions.get(objId)
              const oldPos = obj.position
              const distance = Math.sqrt(
                Math.pow(newPos.position[0] - oldPos[0], 2) +
                Math.pow(newPos.position[1] - oldPos[1], 2)
              )
              if (distance > 20) { // Significant movement threshold
                movedCount++
              }
            }
          }

          if (movedCount > 0) {
            context.report({
              node: node,
              messageId: 'layoutOptimizable',
              data: {
                objectCount: graph.objects.size,
                layerCount: graph.layers.length
              },
              fix: options.fix ? (fixer) => {
                const fixes = []

                // Apply position changes
                for (const [objId, obj] of graph.objects) {
                  if (newPositions.has(objId)) {
                    const newLayout = newPositions.get(objId)
                    const objNode = objectNodes.get(objId)

                    // Validate we have all required data
                    if (!newLayout || !objNode || !newLayout.position || !newLayout.size) {
                      continue
                    }

                    // Find patching_rect property
                    const rectProp = objNode.properties?.find(p => p.key?.value === 'patching_rect')
                    if (rectProp?.value?.elements?.length === 4) {
                      const [xNode, yNode, wNode, hNode] = rectProp.value.elements

                      // Validate all nodes exist and have valid positions/sizes
                      if (xNode && yNode && wNode && hNode &&
                        typeof newLayout.position[0] === 'number' &&
                        typeof newLayout.position[1] === 'number' &&
                        typeof newLayout.size[0] === 'number' &&
                        typeof newLayout.size[1] === 'number') {

                        fixes.push(fixer.replaceText(xNode, newLayout.position[0].toString()))
                        fixes.push(fixer.replaceText(yNode, newLayout.position[1].toString()))
                        fixes.push(fixer.replaceText(wNode, newLayout.size[0].toString()))
                        fixes.push(fixer.replaceText(hNode, newLayout.size[1].toString()))
                      }
                    }
                  }
                }

                return fixes
              } : null
            })
          }
        }
      }
    }
  }
}
