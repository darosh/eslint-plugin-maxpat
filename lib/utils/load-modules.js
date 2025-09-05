import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

/**
 * Recursively loads all default exports from ES modules in a folder and its subdirectories
 * @param {string} dirPath - Relative path to the folder from the calling file
 * @param {string} url - import.meta.url from the calling file
 * @param {string} [prefix=''] - Internal parameter for building nested rule names
 * @returns {Promise<Object>} An object where keys = rule names (with / for subdirs), values = default exports
 */
export async function loadModules (dirPath, url, prefix = '') {
  const __dirname = path.dirname(fileURLToPath(url))
  const dirPathFull = path.join(__dirname, dirPath)
  const files = await readdir(dirPathFull, { withFileTypes: true })

  const results = {}

  // Process files and directories
  await Promise.all(
    files.map(async (f) => {
      const fullPath = path.join(dirPathFull, f.name)

      if (f.isFile() && (f.name.endsWith('.js') || f.name.endsWith('.mjs'))) {
        // Handle files
        const name = path.basename(f.name, path.extname(f.name))
        const ruleName = prefix ? `${prefix}/${name}` : name

        const moduleUrl = pathToFileURL(fullPath).href
        const mod = await import(moduleUrl)
        results[ruleName] = mod.default

      } else if (f.isDirectory()) {
        // Handle subdirectories recursively
        const subPrefix = prefix ? `${prefix}/${f.name}` : f.name
        const subDirPath = path.join(dirPath, f.name)
        const subModules = await loadModules(subDirPath, url, subPrefix)

        // Merge subdirectory results
        Object.assign(results, subModules)
      }
    })
  )

  return results
}

/**
 * Alternative version that returns a flat structure but with metadata
 * @param {string} dirPath - Relative path to the folder from the calling file
 * @param {string} url - import.meta.url from the calling file
 * @returns {Promise<Object>} An object with rule metadata including category info
 */
export async function loadModulesWithMetadata (dirPath, url, prefix = '') {
  const __dirname = path.dirname(fileURLToPath(url))
  const dirPathFull = path.join(__dirname, dirPath)
  const files = await readdir(dirPathFull, { withFileTypes: true })

  const results = {}

  await Promise.all(
    files.map(async (f) => {
      const fullPath = path.join(dirPathFull, f.name)

      if (f.isFile() && (f.name.endsWith('.js') || f.name.endsWith('.mjs'))) {
        const name = path.basename(f.name, path.extname(f.name))
        const ruleName = prefix ? `${prefix}/${name}` : name

        const moduleUrl = pathToFileURL(fullPath).href
        const mod = await import(moduleUrl)

        results[ruleName] = {
          rule: mod.default,
          category: prefix || 'general',
          fileName: f.name,
          filePath: fullPath
        }

      } else if (f.isDirectory()) {
        const subPrefix = prefix ? `${prefix}/${f.name}` : f.name
        const subDirPath = path.join(dirPath, f.name)
        const subModules = await loadModulesWithMetadata(subDirPath, url, subPrefix)

        Object.assign(results, subModules)
      }
    })
  )

  return results
}
