import { it } from 'vitest'
import { RuleTester } from 'eslint'
import jsonc from 'jsonc-eslint-parser'
import rule from '../lib/rules/layout/snap-to-grid.js'

const ruleTester = new RuleTester({ languageOptions: { parser: jsonc } })

it('should work', () => {
  ruleTester.run('maxpat/layout/snap-to-grid', rule, {
    valid: [
      {
        code: JSON.stringify({ patcher: { gridsnaponopen: 2 } }),
      }
    ],
    invalid: [
      {
        code: JSON.stringify({ patcher: { gridsnaponopen: 0 } }),
        options: [{ snap: true, fix: false }],
        errors: [{ messageId: 'incorrectGridsnapOnOpen' }]
      },
      {
        code: JSON.stringify({ patcher: { gridsnaponopen: 0 } }),
        options: [{ snap: true, fix: true }],
        output: JSON.stringify({ patcher: { gridsnaponopen: 2 } }),
        errors: [{ messageId: 'incorrectGridsnapOnOpen' }]
      }
    ]
  })
})
