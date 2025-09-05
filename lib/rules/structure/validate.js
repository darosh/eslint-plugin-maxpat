export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure the .maxpat file has a valid root patcher object',
      category: 'Structure',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      missingPatcher: 'File must contain a top-level "patcher" object.'
    }
  },
  create (context) {
    return {
      // Visitor for the top-level object in the JSON file
      JSONObjectExpression (node) {
        // We only care about the root object
        if (node.parent.type !== 'JSONExpressionStatement') {
          return
        }

        const patcherProperty = node.properties.find(
          (p) => p.key.value === 'patcher'
        )

        if (!patcherProperty) {
          context.report({
            node: node,
            messageId: 'missingPatcher',
          })
        }
      },
    }
  },
}