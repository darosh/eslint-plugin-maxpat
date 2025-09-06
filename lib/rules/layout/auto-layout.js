export default {
  meta: {
    type: 'layout',
    docs: {
      description: 'Automatically organize patch layout using hierarchical grid algorithm. Experimental feature. Fix is turned off by default.',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          fix: {
            type: 'boolean',
            default: false,
            description: 'Apply iterative layout optimization'
          },
          maxIterations: {
            type: 'number',
            default: 10,
            description: 'Maximum optimization rounds'
          },
          moveDistance: {
            type: 'number',
            default: 20,
            description: 'Maximum pixels to move per iteration'
          },
          gridSize: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            default: [8, 8],
            description: 'Grid alignment in pixels [x, y]'
          },
          priorityBy: {
            type: 'string',
            enum: ['connections', 'centrality', 'random'],
            default: 'connections',
            description: 'Order for processing objects'
          },
          preserveStructure: {
            type: 'boolean',
            default: true,
            description: 'Maintain overall patch structure'
          },
          minImprovement: {
            type: 'number',
            default: 5.0,
            description: 'Minimum total improvement to report'
          }
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{
      fix: false,
      maxIterations: 10,
      moveDistance: 20,
      gridSize: [8, 8],
      priorityBy: 'connections',
      preserveStructure: true,
      minImprovement: 5.0
    }],
    messages: {
      layoutOptimizable: 'Layout can be optimized - potential improvement: {{improvement}}px average',
    },
  },

  create (context) {
    const options = context.options[0] || {}

    // Helper function to round to nearest multiple
    function roundToMultiple (value, multiple) {
      return Math.round(value / multiple) * multiple
    }

    // Calculate distance between two points
    function distance (p1, p2) {
      return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2))
    }

    // Calculate ideal position for an object based on its neighbors
    function calculateIdealPosition (objId, graph, currentPositions) {
      const obj = graph.objects.get(objId)
      if (!obj) return null

      const connected = new Set()
      const forces = []

      // Get all connected objects (inputs and outputs)
      const outgoing = graph.connections.get(objId) || []
      outgoing.forEach(conn => connected.add(conn.destId))

      // Find incoming connections
      for (const [sourceId, connections] of graph.connections) {
        connections.forEach(conn => {
          if (conn.destId === objId) {
            connected.add(sourceId)
          }
        })
      }

      if (connected.size === 0) return null

      // Calculate center of mass of connected objects
      let totalX = 0, totalY = 0, count = 0

      for (const connectedId of connected) {
        const connectedPos = currentPositions.get(connectedId)
        if (connectedPos) {
          totalX += connectedPos[0]
          totalY += connectedPos[1]
          count++
        }
      }

      if (count === 0) return null

      // Ideal position is center of mass of connections
      const idealX = totalX / count
      const idealY = totalY / count

      // Add some spacing to avoid overlaps
      const currentPos = currentPositions.get(objId) || obj.position

      // Don't move too far from current position (preserve structure)
      const maxMove = options.preserveStructure ? options.moveDistance : options.moveDistance * 2
      const dx = idealX - currentPos[0]
      const dy = idealY - currentPos[1]
      const currentDistance = Math.sqrt(dx * dx + dy * dy)

      if (currentDistance > maxMove) {
        const ratio = maxMove / currentDistance
        return [
          currentPos[0] + dx * ratio,
          currentPos[1] + dy * ratio
        ]
      }

      return [idealX, idealY]
    }

    class PatchGraph {
      constructor () {
        this.objects = new Map()
        this.connections = new Map()
      }

      addObject (objId, node, boxData) {
        const patchingRect = this.extractRect(boxData, 'patching_rect')

        this.objects.set(objId, {
          id: objId,
          node,
          data: boxData,
          position: patchingRect ? [patchingRect[0], patchingRect[1]] : [0, 0],
          size: patchingRect ? [patchingRect[2], patchingRect[3]] : [60, 20],
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

      isComment (boxData) {
        const textProp = boxData.properties?.find(p => p.key.value === 'text')
        const text = textProp?.value?.value || ''
        return text.startsWith('comment') || text === ''
      }

      // Calculate priority order for processing objects
      calculatePriority () {
        const priorities = new Map()

        for (const objId of this.objects.keys()) {
          let priority = 0

          if (options.priorityBy === 'connections') {
            // Count total connections (in + out)
            const outgoing = (this.connections.get(objId) || []).length
            let incoming = 0
            for (const connections of this.connections.values()) {
              incoming += connections.filter(c => c.destId === objId).length
            }
            priority = outgoing + incoming

          } else if (options.priorityBy === 'centrality') {
            // Simple betweenness centrality approximation
            const connected = new Set()
            const outgoing = this.connections.get(objId) || []
            outgoing.forEach(conn => connected.add(conn.destId))

            for (const [sourceId, connections] of this.connections) {
              connections.forEach(conn => {
                if (conn.destId === objId) connected.add(sourceId)
              })
            }
            priority = connected.size

          } else { // random
            priority = Math.random()
          }

          priorities.set(objId, priority)
        }

        // Return sorted list (highest priority first)
        return Array.from(priorities.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([objId]) => objId)
      }

      // Run iterative relaxation algorithm
      optimizeLayout () {
        const currentPositions = new Map()
        const originalPositions = new Map()

        // Initialize with current positions
        for (const [objId, obj] of this.objects) {
          if (!obj.isComment) {
            currentPositions.set(objId, [...obj.position])
            originalPositions.set(objId, [...obj.position])
          }
        }

        const priorityOrder = this.calculatePriority().filter(id => !this.objects.get(id)?.isComment)
        let totalImprovement = 0

        // Run optimization iterations
        for (let iteration = 0; iteration < options.maxIterations; iteration++) {
          let iterationImprovement = 0

          // Process each object in priority order
          for (const objId of priorityOrder) {
            const idealPos = calculateIdealPosition(objId, this, currentPositions)
            if (!idealPos) continue

            const currentPos = currentPositions.get(objId)
            const originalDistance = distance(currentPos, originalPositions.get(objId))

            // Snap to grid
            const snappedPos = [
              roundToMultiple(idealPos[0], options.gridSize[0]),
              roundToMultiple(idealPos[1], options.gridSize[1])
            ]

            // Check if this is an improvement
            const oldStress = this.calculateObjectStress(objId, currentPositions)
            currentPositions.set(objId, snappedPos)
            const newStress = this.calculateObjectStress(objId, currentPositions)

            if (newStress < oldStress) {
              // Keep the improvement
              iterationImprovement += (oldStress - newStress)
            } else {
              // Revert if no improvement
              currentPositions.set(objId, currentPos)
            }
          }

          totalImprovement += iterationImprovement

          // Early termination if no improvement
          if (iterationImprovement < 0.1) break
        }

        // Position comments near their associated objects
        this.positionComments(currentPositions)

        return { positions: currentPositions, improvement: totalImprovement }
      }

      // Calculate stress (total cord length) for a single object
      calculateObjectStress (objId, positions) {
        let stress = 0
        const pos = positions.get(objId)
        if (!pos) return 0

        // Outgoing connections
        const outgoing = this.connections.get(objId) || []
        for (const conn of outgoing) {
          const destPos = positions.get(conn.destId)
          if (destPos) {
            stress += distance(pos, destPos)
          }
        }

        // Incoming connections
        for (const [sourceId, connections] of this.connections) {
          const sourcePos = positions.get(sourceId)
          if (sourcePos) {
            for (const conn of connections) {
              if (conn.destId === objId) {
                stress += distance(sourcePos, pos)
              }
            }
          }
        }

        return stress
      }

      positionComments (positions) {
        for (const [objId, obj] of this.objects) {
          if (obj.isComment) {
            // Find nearest non-comment object
            let nearestId = null
            let minDistance = Infinity

            for (const [otherId, otherObj] of this.objects) {
              if (!otherObj.isComment && positions.has(otherId)) {
                const dist = distance(obj.position, otherObj.position)
                if (dist < minDistance) {
                  minDistance = dist
                  nearestId = otherId
                }
              }
            }

            if (nearestId) {
              const nearestPos = positions.get(nearestId)
              positions.set(objId, [
                roundToMultiple(nearestPos[0], options.gridSize[0]),
                roundToMultiple(nearestPos[1] - 40, options.gridSize[1])
              ])
            }
          }
        }
      }
    }

    return {
      JSONProperty (node) {
        if (node.key.value !== 'boxes' || !node.value.elements) {
          return
        }

        const graph = new PatchGraph()
        const objectNodes = new Map()

        // Collect all objects
        node.value.elements.forEach((boxNode, index) => {
          if (boxNode.type !== 'JSONObjectExpression') return

          const boxProperty = boxNode.properties.find(p => p.key.value === 'box')
          if (!boxProperty?.value?.properties) return

          const objId = `obj-${index}`
          graph.addObject(objId, boxNode, boxProperty.value)
          objectNodes.set(objId, boxProperty.value)
        })

        // Collect connections
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

        // Only process patches with enough objects and connections
        if (graph.objects.size > 3 && graph.connections.size > 2) {
          const result = graph.optimizeLayout()

          if (result.improvement >= options.minImprovement) {
            context.report({
              node: node,
              messageId: 'layoutOptimizable',
              data: {
                improvement: (result.improvement / graph.objects.size).toFixed(1)
              },
              fix: options.fix ? (fixer) => {
                const fixes = []

                for (const [objId, obj] of graph.objects) {
                  if (result.positions.has(objId)) {
                    const newPos = result.positions.get(objId)
                    const objNode = objectNodes.get(objId)

                    const rectProp = objNode.properties?.find(p => p.key?.value === 'patching_rect')
                    if (rectProp?.value?.elements?.length === 4) {
                      const [xNode, yNode] = rectProp.value.elements

                      if (xNode && yNode &&
                        typeof newPos[0] === 'number' && typeof newPos[1] === 'number') {

                        fixes.push(fixer.replaceText(xNode, parseFloat(newPos[0].toFixed(1)).toString()))
                        fixes.push(fixer.replaceText(yNode, parseFloat(newPos[1].toFixed(1)).toString()))
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
