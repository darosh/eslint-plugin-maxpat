// utils/loadModules.js
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

/**
 * Dynamically loads all default exports from ES modules in a folder
 * @param {string} dirPath - Absolute path to the folder
 * @returns {Promise<Object>} An object where keys = filenames (without extension), values = default exports
 */
export async function loadModules (dirPath, url) {
  const __dirname = path.dirname(fileURLToPath(url))
  const dirPathFull = path.join(__dirname, dirPath)
  const files = await readdir(dirPathFull, { withFileTypes: true })

  const modules = await Promise.all(
    files
      .filter(
        (f) =>
          f.isFile() &&
          (f.name.endsWith('.js') || f.name.endsWith('.mjs'))
      )
      .map(async (f) => {
        const name = path.basename(f.name, path.extname(f.name))
        const filePath = path.join(dirPathFull, f.name)

        // convert to file:// URL for dynamic import
        const moduleUrl = pathToFileURL(filePath).href
        const mod = await import(moduleUrl)
        return [name, mod.default]
      })
  )

  return Object.fromEntries(modules)
}
