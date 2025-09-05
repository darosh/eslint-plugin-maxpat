import { it } from 'vitest'
import { RuleTester } from 'eslint'
import jsonc from 'jsonc-eslint-parser'
import rule from '../lib/rules/layout/snap-to-pixel.js'

const ruleTester = new RuleTester({ languageOptions: { parser: jsonc } })

it('should work', () => {
  ruleTester.run('maxpat/layout/snap-to-pixel', rule, {
    valid: [
      {
        code: JSON.stringify({ patcher: { integercoordinates: 1 } }),
      }
    ],
    invalid: [
      {
        code: JSON.stringify({ patcher: { integercoordinates: 0 } }),
        options: [{ snap: true, fix: false }],
        errors: [{ messageId: 'incorrectIntegerCoordinatesEnabled' }]
      },
      {
        code: JSON.stringify({ patcher: { integercoordinates: 0 } }),
        options: [{ snap: true, fix: true }],
        output: JSON.stringify({ patcher: { integercoordinates: 1 } }),
        errors: [{ messageId: 'incorrectIntegerCoordinatesEnabled' }]
      }
    ]
  })
})
