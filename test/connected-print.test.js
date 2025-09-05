import { it } from 'vitest'
import { RuleTester } from 'eslint'
import jsonc from 'jsonc-eslint-parser'
import { readFile } from 'fs/promises'
import rule from '../lib/rules/debug/connected-print.js'

const ruleTester = new RuleTester({ languageOptions: { parser: jsonc } })

it('should work', async () => {
  ruleTester.run('maxpat/debug/connected-print', rule, {
    valid: [
      {
        code: await readFile('./test/fixtures/disconnected-print-valid.maxpat', 'utf8'),
      }
    ],
    invalid: [
      {
        code: await readFile('./test/fixtures/disconnected-print-invalid.maxpat', 'utf8'),
        options: [{ fix: false }],
        errors: [{ messageId: 'activePrintConnection' }]
      },
      {
        code: await readFile('./test/fixtures/disconnected-print-invalid.maxpat', 'utf8'),
        options: [{ fix: true }],
        errors: [{ messageId: 'activePrintConnection' }],
        output: await readFile('./test/fixtures/disconnected-print-invalid-fix.maxpat', 'utf8'),
      }
    ]
  })
})
