/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  ruleListSplit (rules) {
    return [
      {
        title: 'Layout',
        rules: rules.filter(([, rule]) => rule.meta.type === 'layout'),
      },
      {
        title: 'Misc',
        rules: rules.filter(([, rule]) => rule.meta.type !== 'layout'),
      }
    ]
  },
}

export default config
