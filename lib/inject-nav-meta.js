'use strict'

const NAV_HIDDEN = /^:page-nav-hidden:\s*(.*)$/gm
const NAV_PARENT = /^:page-nav-parent:\s*(.+)$/gm
const FALSE_VALUES = new Set(['false', 'no', '0', 'off', 'disabled'])

function readAdocNavMeta (text) {
  if (!text || typeof text !== 'string') return null
  let hidden = false
  let parent = null
  const hRe = new RegExp(NAV_HIDDEN.source, 'gm')
  let m
  while ((m = hRe.exec(text))) {
    const raw = (m[1] || '').trim().toLowerCase()
    if (FALSE_VALUES.has(raw)) continue
    hidden = true
    break
  }
  const pRe = new RegExp(NAV_PARENT.source, 'gm')
  while ((m = pRe.exec(text))) {
    parent = (m[1] || '').trim()
    break
  }
  if (!hidden) return null
  return { parent }
}

function pageAdocText (page) {
  if (page.file && page.file.contents) {
    return Buffer.isBuffer(page.file.contents)
      ? page.file.contents.toString('utf8')
      : String(page.file.contents)
  }
  const attrs = page.asciidoc && page.asciidoc.attributes
  if (attrs && (attrs['nav-hidden'] !== undefined || attrs['page-nav-hidden'] !== undefined)) {
    return (
      ':page-nav-hidden:\n' +
      (attrs['nav-parent'] || attrs['page-nav-parent']
        ? ':page-nav-parent: ' + (attrs['nav-parent'] || attrs['page-nav-parent']) + '\n'
        : '')
    )
  }
  return ''
}

function injectNavMetaTags (html, meta) {
  if (!meta) return html
  if (html.includes('antora-supplemental:nav-hidden')) return html
  const tags = [
    '<meta name="antora-supplemental:nav-hidden" content="">',
    meta.parent
      ? '<meta name="antora-supplemental:nav-parent" content="' + escapeAttr(meta.parent) + '">'
      : '',
  ].filter(Boolean).join('\n')
  if (html.includes('</head>')) return html.replace('</head>', tags + '\n</head>')
  return html
}

function escapeAttr (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function navMetaFromPage (page) {
  const fromAdoc = readAdocNavMeta(pageAdocText(page))
  if (fromAdoc) return fromAdoc
  const a = page.asciidoc && page.asciidoc.attributes
  if (!a) return null
  const hidden =
    a['nav-hidden'] !== undefined ||
    a['page-nav-hidden'] !== undefined
  if (!hidden) return null
  return {
    parent: a['nav-parent'] || a['page-nav-parent'] || null,
  }
}

function injectNavMetaForPages (pages) {
  let n = 0
  for (const page of pages) {
    if (!page.contents) continue
    const meta = navMetaFromPage(page)
    if (!meta) continue
    const html = Buffer.isBuffer(page.contents) ? page.contents.toString('utf8') : String(page.contents)
    const next = injectNavMetaTags(html, meta)
    if (next !== html) {
      page.contents = Buffer.from(next)
      n += 1
    }
  }
  return n
}

module.exports = {
  readAdocNavMeta,
  injectNavMetaTags,
  injectNavMetaForPages,
}
