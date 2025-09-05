import { it } from 'vitest'
import { RuleTester } from 'eslint'
import jsonc from 'jsonc-eslint-parser'
import rule from '../lib/rules/compatibility/deprecated.js'

const ruleTester = new RuleTester({ languageOptions: { parser: jsonc } })

it('should work', () => {
  ruleTester.run('maxpat/compatibility/deprecated', rule, {
    valid: [
      { 
        code: JSON.stringify({ patcher: { boxes: [{ box: { maxclass: 'sober' } }] } }),
      }
    ],
    invalid: [
      {
        code: JSON.stringify({ patcher: { boxes: [{ box: { maxclass: 'drunk' } }] } }),
        errors: [{ messageId: 'deprecatedObj' }]
      }
    ]
  })
})
