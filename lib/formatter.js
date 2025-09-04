import path from 'path'
import chalk from 'chalk'
import Table from 'cli-table3'

export default function formatter (results = [], data) {
  const files = {}

  for (const r of results) {
    files[r.filePath] = files[r.filePath] || []
    files[r.filePath].push(...r.messages.filter(m => m.ruleId === 'maxpat/list-ui-elements' && m.messageId === 'uiElementInfoJson').map(m => JSON.parse(m.message)))
  }

  const filtered = Object.fromEntries(Object.entries(files).filter(([k, a]) => a.length))

  printTables(filtered)
}

function printTables (data) {
  const cwd = process.cwd()

  for (const [file, entries] of Object.entries(data)) {
    const shortName = path.relative(cwd, file)

    console.log(`\n${chalk.gray('File:')} ${shortName}`)

    const table = new Table({
      head: ['Type', 'Varname', 'Annotation', 'Annotation Name'].map((h) =>
        chalk.gray(h)
      ),
      style: {
        head: [], // handled manually
        border: ['grey'],
      },
      wordWrap: true,
    })

    entries.forEach((row) => {
      const formatted = [
        row.type || chalk.red('?'),
        row.varname || chalk.red('?'),
        row.annotation || chalk.red('?'),
        row.annotationName || chalk.red('?'),
      ]
      table.push(formatted)
    })

    console.log(table.toString())
  }
}
