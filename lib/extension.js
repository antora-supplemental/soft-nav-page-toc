'use strict'

const fs = require('node:fs')
const ospath = require('node:path')
const registryMeta = require('./registry-meta.js')
const { injectNavMetaForPages } = require('./inject-nav-meta.js')
const { buildRegistry, pageRelPath } = require('./navtree-registry.js')

const PKG = '@antora-supplemental/soft-nav-page-toc'
const SCRIPT_OUT = '_/js/soft-nav-page-toc.js'
const SCRIPT_TAG = 'soft-nav-page-toc.js'

/**
 * Publishes soft-nav-page-toc.js, injects nav-hidden meta + breadcrumb fixes,
 * and resolves :navtree-parent: from navtree-registry.json / nav.adoc comments.
 *
 * Config:
 * - skip: boolean
 * - injectScript: boolean (default true)
 * - navtreeRegistryPaths: string[] extra registry JSON paths (relative to playbook dir)
 */
function register ({ config = {} } = {}) {
  const context = this
  if (config.skip) return

  const injectScript = config.injectScript !== false

  context.on('pagesComposed', ({ playbook, siteCatalog, contentCatalog }) => {
    const logger = typeof context.getLogger === 'function'
      ? context.getLogger(PKG)
      : { info: (...a) => console.log('[' + PKG + ']', ...a) }

    const playbookDir = playbook.dir || process.cwd()
    const navtreeRegistry = buildRegistry({
      playbook,
      playbookDir,
      contentCatalog,
      configPaths: config.navtreeRegistryPaths || [],
    })

    const uiJs = ospath.join(__dirname, '..', 'ui', 'js')
    const runtime = fs.readFileSync(ospath.join(uiJs, 'page-toc-runtime.js'))
    const hook = fs.readFileSync(ospath.join(uiJs, 'soft-nav-page-toc.js'))
    const js = Buffer.concat([runtime, Buffer.from('\n'), hook])
    if (siteCatalog && typeof siteCatalog.addFile === 'function') {
      addSiteFile(siteCatalog, SCRIPT_OUT, js)
    }

    const pages =
      contentCatalog && typeof contentCatalog.findBy === 'function'
        ? contentCatalog.findBy({ family: 'page' }) || []
        : []

    const metaCount = injectNavMetaForPages(pages, navtreeRegistry, pageRelPath)

    let injected = 0
    if (injectScript) {
      for (const page of pages) {
        if (!page.contents) continue
        const html = Buffer.isBuffer(page.contents) ? page.contents.toString('utf8') : String(page.contents)
        const next = injectAfterSiteJs(html)
        if (next !== html) {
          page.contents = Buffer.from(next)
          injected += 1
        }
      }
    }

    try {
      if (playbook && playbook.site) {
        playbook.site.keys = playbook.site.keys || {}
        playbook.site.keys.softNavPageToc = registryMeta
      }
    } catch (_) {}

    logger.info?.(
      'nav-hidden meta on %d page(s); registry pages=%d prefixes=%d; injected %s on %d/%d page(s)',
      metaCount,
      Object.keys(navtreeRegistry.pages || {}).length,
      Object.keys(navtreeRegistry.parentByPrefix || {}).length,
      SCRIPT_TAG,
      injected,
      pages.length
    )
  })
}

function scriptSrcFromHtml (html) {
  const m = html.match(/<script[^>]+src="([^"]*)\/js\/site\.js"/)
  if (!m) return null
  // Default UI uses ui/js/site.js; supplemental bundles use _/js/site.js.
  const prefix = m[1].replace(/\/(?:ui|_)$/, '')
  return prefix + '/_/js/soft-nav-page-toc.js'
}

function injectAfterSiteJs (html) {
  if (html.includes(SCRIPT_TAG)) return html
  const src = scriptSrcFromHtml(html)
  if (!src) return html
  const tag = `<script src="${src}" defer></script>`
  const siteJs = /<script[^>]+src="[^"]*\/js\/site\.js"[^>]*><\/script>/
  if (!siteJs.test(html)) return html
  return html.replace(siteJs, (match) => match + tag)
}

function addSiteFile (siteCatalog, pathOut, contents) {
  siteCatalog.addFile({
    contents: Buffer.isBuffer(contents) ? contents : Buffer.from(contents),
    out: { path: pathOut },
    pub: { url: '/' + pathOut.replace(/\\/g, '/'), absolute: false },
  })
}

module.exports = register
module.exports.register = register
module.exports.registryMeta = registryMeta
module.exports.injectAfterSiteJs = injectAfterSiteJs
