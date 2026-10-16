'use strict'

const { resolveNavtreeParent } = require('./navtree-registry.js')

const HIDE_RE = /^:hide-from-navtree:\s*(.*)$/gm
const LEGACY_HIDE_RE = /^:page-nav-hidden:\s*(.*)$/gm
const PARENT_RE = /^:navtree-parent:\s*(.+)$/gm
const LEGACY_PARENT_RE = /^:page-nav-parent:\s*(.+)$/gm
const FALSE_VALUES = new Set(['false', 'no', '0', 'off', 'disabled'])

function directiveActive (text, re) {
  const r = new RegExp(re.source, 'gm')
  let m
  while ((m = r.exec(text))) {
    const raw = (m[1] || '').trim().toLowerCase()
    if (FALSE_VALUES.has(raw)) continue
    return true
  }
  return false
}

function readAdocNavMeta (text) {
  if (!text || typeof text !== 'string') return null
  const hidden = directiveActive(text, HIDE_RE) || directiveActive(text, LEGACY_HIDE_RE)
  if (!hidden) return null
  let parent = null
  for (const re of [PARENT_RE, LEGACY_PARENT_RE]) {
    const r = new RegExp(re.source, 'gm')
    const m = r.exec(text)
    if (m && m[1]) {
      parent = m[1].trim()
      break
    }
  }
  return { parent }
}

function pageAdocText (page) {
  if (page.file && page.file.contents) {
    return Buffer.isBuffer(page.file.contents)
      ? page.file.contents.toString('utf8')
      : String(page.file.contents)
  }
  const a = page.asciidoc && page.asciidoc.attributes
  if (!a) return ''
  const hidden =
    a['hide-from-navtree'] !== undefined ||
    a['nav-hidden'] !== undefined ||
    a['page-nav-hidden'] !== undefined
  if (!hidden) return ''
  return (
    ':hide-from-navtree:\n' +
    (a['navtree-parent'] || a['nav-parent'] || a['page-nav-parent']
      ? ':navtree-parent: ' + (a['navtree-parent'] || a['nav-parent'] || a['page-nav-parent']) + '\n'
      : '')
  )
}

function navMetaFromPage (page, registry, pageRelPathFn) {
  const rel = typeof pageRelPathFn === 'function' ? pageRelPathFn(page) : null
  const fromAdoc = readAdocNavMeta(pageAdocText(page))
  let hidden = !!fromAdoc
  let parent = fromAdoc ? fromAdoc.parent : null
  const a = page.asciidoc && page.asciidoc.attributes
  if (!hidden && a) {
    hidden =
      a['hide-from-navtree'] !== undefined ||
      a['nav-hidden'] !== undefined ||
      a['page-nav-hidden'] !== undefined
    if (hidden) {
      parent = a['navtree-parent'] || a['nav-parent'] || a['page-nav-parent'] || null
    }
  }
  if (!hidden) return null
  if (registry && rel) {
    parent = resolveNavtreeParent(rel, { parent }, registry) || parent
  }
  return { parent }
}

function escapeAttr (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function escapeHtml (value) {
  return escapeAttr(value)
}

function injectNavMetaTags (html, meta) {
  if (!meta) return html
  if (html.includes('antora-supplemental:hide-from-navtree')) return html
  const tags = [
    '<meta name="antora-supplemental:hide-from-navtree" content="">',
    meta.parent
      ? '<meta name="antora-supplemental:navtree-parent" content="' + escapeAttr(meta.parent) + '">'
      : '',
  ].filter(Boolean).join('\n')
  if (html.includes('</head>')) return html.replace('</head>', tags + '\n</head>')
  return html
}

function slugFromParentRef (parentRef) {
  if (!parentRef) return null
  let s = parentRef.trim().replace(/\.adoc$/i, '').replace(/^\.\//, '')
  const parts = s.split('/')
  return parts[parts.length - 1] || s
}

function parentHrefRelative (pageUrl, parentSlug) {
  if (!pageUrl || !parentSlug) return null
  if (/-details\//.test(pageUrl)) return '../../' + parentSlug + '/'
  return '../' + parentSlug + '/'
}

function labelFromSlug (slug) {
  if (!slug) return 'Parent'
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
}

function injectParentBreadcrumb (html, meta, page) {
  if (!meta || !html.includes('adt-breadcrumb-trail--current')) return html
  if (html.includes('data-navtree-parent="1"')) return html
  const parentSlug = slugFromParentRef(meta.parent) || inferParentSlugFromPub(page && page.pub && page.pub.url)
  if (!parentSlug) return html
  const parentHref = parentHrefRelative(page && page.pub && page.pub.url, parentSlug)
  if (!parentHref) return html
  const parentLabel = labelFromSlug(parentSlug)
  const insert =
    '<li class="adt-breadcrumb-sep" aria-hidden="true">/</li>' +
    '<li class="adt-breadcrumb-trail" data-navtree-parent="1">' +
    '<a class="adt-breadcrumb-trail-link" href="' + escapeAttr(parentHref) + '">' + escapeHtml(parentLabel) + '</a></li>' +
    '<li class="adt-breadcrumb-sep" aria-hidden="true">/</li>'
  return html.replace(
    /(<li class="adt-breadcrumb-trail adt-breadcrumb-trail--current")/,
    insert + '$1'
  )
}

function inferParentSlugFromPub (url) {
  if (!url || typeof url !== 'string') return null
  const m = url.match(/\/([^/]+)-details\//)
  return m ? m[1] : null
}

function injectNavMetaForPages (pages, registry, pageRelPathFn) {
  let n = 0
  for (const page of pages) {
    if (!page.contents) continue
    const meta = navMetaFromPage(page, registry, pageRelPathFn)
    if (!meta) continue
    let html = Buffer.isBuffer(page.contents) ? page.contents.toString('utf8') : String(page.contents)
    html = injectNavMetaTags(html, meta)
    html = injectParentBreadcrumb(html, meta, page)
    page.contents = Buffer.from(html)
    n += 1
  }
  return n
}

module.exports = {
  readAdocNavMeta,
  injectNavMetaTags,
  injectParentBreadcrumb,
  injectNavMetaForPages,
  slugFromParentRef,
  labelFromSlug,
}
