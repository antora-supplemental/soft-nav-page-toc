'use strict'

const fs = require('node:fs')
const ospath = require('node:path')

const NAV_COMMENT_RE = /^;;\s*navtree-parent(?:-association)?:\s*(.+?)\s*->\s*(.+?\S)\s*$/

function emptyRegistry () {
  return { pages: Object.create(null), parentByPrefix: Object.create(null) }
}

function mergeRegistry (into, part) {
  if (!part) return into
  if (part.pages) Object.assign(into.pages, part.pages)
  if (part.parentByPrefix) Object.assign(into.parentByPrefix, part.parentByPrefix)
  return into
}

function parseRegistryJson (text) {
  const data = JSON.parse(text)
  const out = emptyRegistry()
  if (data.pages && typeof data.pages === 'object') mergeRegistry(out, { pages: data.pages })
  if (data.parentByPrefix && typeof data.parentByPrefix === 'object') {
    mergeRegistry(out, { parentByPrefix: data.parentByPrefix })
  }
  return out
}

function parseNavAdocComments (text) {
  const out = emptyRegistry()
  if (!text) return out
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(NAV_COMMENT_RE)
    if (!m) continue
    const left = m[1].trim()
    const parent = m[2].trim()
    if (left.endsWith('/') || left.endsWith('/*') || left.endsWith('/**')) {
      const prefix = left.replace(/\*+$/, '')
      out.parentByPrefix[prefix] = parent
    } else {
      out.pages[left.replace(/^\.\//, '')] = parent
    }
  }
  return out
}

function pageRelPath (page) {
  const raw = (page.src && (page.src.path || page.src.relative)) || ''
  const s = String(raw).replace(/\\/g, '/')
  const m = s.match(/modules\/[^/]+\/pages\/(.+\.adoc)$/)
  if (m) return m[1]
  if (s.endsWith('.adoc')) return s.replace(/^\.\//, '')
  return s
}

function resolveNavtreeParent (pageRel, meta, registry) {
  if (meta && meta.parent) return meta.parent
  if (!registry) return null
  if (registry.pages && registry.pages[pageRel]) return registry.pages[pageRel]
  const prefixes = Object.keys(registry.parentByPrefix || {}).sort((a, b) => b.length - a.length)
  for (const prefix of prefixes) {
    if (pageRel.startsWith(prefix)) return registry.parentByPrefix[prefix]
  }
  return null
}

function loadRegistryFiles (paths) {
  const merged = emptyRegistry()
  for (const file of paths) {
    if (!file || !fs.existsSync(file)) continue
    try {
      mergeRegistry(merged, parseRegistryJson(fs.readFileSync(file, 'utf8')))
    } catch (e) {
      /* skip invalid file */
    }
  }
  return merged
}

function discoverRegistryPaths (playbook, playbookDir) {
  const paths = []
  const sources = (playbook && playbook.content && playbook.content.sources) || []
  for (const source of sources) {
    if (!source || source.start_path === undefined) continue
    const root = ospath.resolve(playbookDir, source.start_path || '.')
    paths.push(
      ospath.join(root, 'modules', 'ROOT', 'navtree-registry.json'),
      ospath.join(root, 'navtree-registry.json')
    )
  }
  return paths
}

function buildRegistry ({ playbook, playbookDir, contentCatalog, configPaths = [] }) {
  const merged = loadRegistryFiles([
    ...discoverRegistryPaths(playbook, playbookDir),
    ...configPaths.map((p) => ospath.resolve(playbookDir, p)),
  ])
  if (contentCatalog && typeof contentCatalog.findBy === 'function') {
    const navFiles = contentCatalog.findBy({ family: 'nav' }) || []
    for (const nav of navFiles) {
      if (!nav.contents) continue
      const text = Buffer.isBuffer(nav.contents) ? nav.contents.toString('utf8') : String(nav.contents)
      mergeRegistry(merged, parseNavAdocComments(text))
    }
  }
  return merged
}

module.exports = {
  buildRegistry,
  parseNavAdocComments,
  parseRegistryJson,
  pageRelPath,
  resolveNavtreeParent,
  emptyRegistry,
  mergeRegistry,
}
