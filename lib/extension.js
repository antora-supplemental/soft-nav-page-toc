'use strict'

const fs = require('node:fs')
const ospath = require('node:path')
const registryMeta = require('./registry-meta.js')
const { injectNavMetaForPages } = require('./inject-nav-meta.js')

const PKG = '@antora-supplemental/soft-nav-page-toc'
const SCRIPT_OUT = '_/js/soft-nav-page-toc.js'
const SCRIPT_TAG = 'soft-nav-page-toc.js'

/**
 * Publishes soft-nav-page-toc.js and optionally injects a defer script on each page
 * (after ui bundle site.js) so hubs using SoftNav refresh the right-rail TOC.
 *
 * Config:
 * - skip: boolean
 * - injectScript: boolean (default true)
 */
function register ({ config = {} } = {}) {
  const context = this
  if (config.skip) return

  const injectScript = config.injectScript !== false

  context.on('pagesComposed', ({ playbook, siteCatalog, contentCatalog }) => {
    const logger = typeof context.getLogger === 'function'
      ? context.getLogger(PKG)
      : { info: (...a) => console.log('[' + PKG + ']', ...a) }

    const js = fs.readFileSync(ospath.join(__dirname, '..', 'ui', 'js', 'soft-nav-page-toc.js'))
    if (siteCatalog && typeof siteCatalog.addFile === 'function') {
      addSiteFile(siteCatalog, SCRIPT_OUT, js)
    }

    if (!injectScript || !contentCatalog || typeof contentCatalog.findBy !== 'function') {
      try {
        if (playbook && playbook.site) {
          playbook.site.keys = playbook.site.keys || {}
          playbook.site.keys.softNavPageToc = registryMeta
        }
      } catch (_) {}
      return
    }

    const pages = contentCatalog.findBy({ family: 'page' }) || []
    const metaCount = injectNavMetaForPages(pages)
    let injected = 0
    for (const page of pages) {
      if (!page.contents) continue
      const html = Buffer.isBuffer(page.contents) ? page.contents.toString('utf8') : String(page.contents)
      const next = injectAfterSiteJs(html)
      if (next !== html) {
        page.contents = Buffer.from(next)
        injected += 1
      }
    }

    try {
      if (playbook && playbook.site) {
        playbook.site.keys = playbook.site.keys || {}
        playbook.site.keys.softNavPageToc = registryMeta
      }
    } catch (_) {}

    logger.info?.(
      'nav-hidden meta on %d page(s); injected %s on %d/%d page(s)',
      metaCount,
      SCRIPT_TAG,
      injected,
      pages.length
    )
  })
}

function scriptSrcFromHtml (html) {
  const m = html.match(/<script[^>]+src="([^"]*\/)js\/site\.js"/)
  if (!m) return null
  return m[1].replace(/ui\/$/, '_/js/soft-nav-page-toc.js')
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
