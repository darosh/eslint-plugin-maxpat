import path from 'path'
import chalk from 'chalk'
import Table from 'cli-table3'

export default function formatter (results = []) {
  const files = {}

  for (const r of results) {
    files[r.filePath] = files[r.filePath] || []
    files[r.filePath].push(...r.messages.filter(m => m.ruleId === 'maxpat/list-ui-elements' && m.messageId === 'uiElementInfoJson').map(m => JSON.parse(m.message)))
  }

  const filtered = Object.fromEntries(Object.entries(files).filter(([, a]) => a.length))

  printTables(filtered)
}

function printTables (data) {
  const cwd = process.cwd()

  // Detect terminal width, fallback if not available
  const totalWidth = process.stdout.columns || 100
  const borderAllowance = 10 // space for borders and padding
  const usableWidth = totalWidth - borderAllowance

  // Proportions: [15%, 20%, 30%, 35%]
  const proportions = [0.15, 0.2, 0.25, 0.4]
  const colWidths = proportions.map((p) => Math.max(10, Math.floor(usableWidth * p)))

  for (const [file, entries] of Object.entries(data)) {
    const shortName = path.relative(cwd, file)

    console.log(`\n${chalk.gray('File:')} ${shortName}`)

    const table = new Table({
      head: ['Type', 'Varname', 'Annotation Name', 'Annotation'].map((h) =>
        chalk.gray(h)
      ),
      style: {
        head: [], // handled manually
        border: ['grey'],
      },
      colWidths,
      wordWrap: true,
    })

    entries.forEach((row) => {
      const formatCell = (val) => {
        if (!val) {
          return { content: chalk.red('?'), hAlign: 'center' }
        }
        return val
      }

      const formatted = [
        formatCell(row.type),
        formatCell(row.varname),
        formatCell(row.annotationName),
        formatCell(row.annotation),
      ]
      table.push(formatted)
    })

    console.log(table.toString())
  }
}
