'use strict'

/**
 * Page TOC heading discovery for Default UI aside TOC.
 * Contract: prose sections live under [data-page-toc-root] or [data-zone="body"];
 * page title h1 may live under [data-zone="header"] or [data-page-toc-title].
 */

const TOC_ROOT_SEL = '[data-page-toc-root], [data-zone="body"]'
const TOC_TITLE_SEL = '[data-zone="header"], [data-page-toc-title]'

function resolveTocRoot (article) {
  if (!article) return null
  return article.querySelector(TOC_ROOT_SEL) || article
}

/** Section levels 1..N (h2..); level 0 title is collected separately. */
function buildSectionLevelSelector (level) {
  if (level < 1) return null
  const segs = []
  for (let c = 1; c <= level; c++) {
    if (c === 1) {
      segs.push('.sect' + c)
    } else {
      segs.push('>' + (c === 2 ? '.sectionbody>' : '') + '.sect' + c)
    }
  }
  segs.push('>h' + (level + 1) + '[id]' + (level > 1 ? ':not(.discrete)' : ''))
  return segs.join('')
}

function collectTitleHeadings (article) {
  const found = []
  const seen = new Set()
  function add (h) {
    if (h && h.id && !seen.has(h)) {
      seen.add(h)
      found.push(h)
    }
  }
  const titleRoot = article.querySelector(TOC_TITLE_SEL)
  if (titleRoot) add(titleRoot.querySelector('h1[id]'))
  add(article.querySelector('h1[id].sect0'))
  if (typeof article.querySelector === 'function') {
    try {
      add(article.querySelector(':scope > h1[id]'))
    } catch (_) {
      /* :scope unsupported in older engines */
    }
  }
  return found
}

function mergeHeadingsInDocumentOrder (lists) {
  const all = []
  const seen = new Set()
  for (const list of lists) {
    for (const h of list) {
      if (!seen.has(h)) {
        seen.add(h)
        all.push(h)
      }
    }
  }
  all.sort((a, b) => {
    const pos = a.compareDocumentPosition(b)
    // DOCUMENT_POSITION_FOLLOWING = 4, PRECEDING = 2 (Node constants; avoid Node global in Node tests)
    if (pos & 4) return -1
    if (pos & 2) return 1
    return 0
  })
  return all
}

function collectHeadings (article, levels) {
  if (!article) return []
  const tocRoot = resolveTocRoot(article)
  const lists = [collectTitleHeadings(article)]
  for (let i = 1; i <= levels; i++) {
    const sel = buildSectionLevelSelector(i)
    if (sel) lists.push([].slice.call(tocRoot.querySelectorAll(sel)))
  }
  return mergeHeadingsInDocumentOrder(lists)
}

/** @deprecated Legacy article.doc chained selectors; use collectHeadings(article, levels). */
function buildLevelSelector (articleSel, level) {
  if (level === 0) {
    return [
      articleSel + ' h1[id].sect0',
      articleSel + ' .doc-zone--header h1[id]',
      articleSel + ' > h1[id]',
    ].join(', ')
  }
  const segs = [articleSel]
  for (let c = 1; c <= level; c++) {
    if (c === 1) segs.push(' .sect' + c)
    else segs.push('>' + (c === 2 ? '.sectionbody>' : '') + '.sect' + c)
  }
  segs.push('>h' + (level + 1) + '[id]' + (level > 1 ? ':not(.discrete)' : ''))
  return segs.join('')
}

function buildHeadingSelectorQuery (articleSel, levels) {
  const selectors = []
  for (let i = 0; i <= levels; i++) {
    selectors.push(buildLevelSelector(articleSel, i))
  }
  return selectors.join(', ')
}

module.exports = {
  TOC_ROOT_SEL,
  TOC_TITLE_SEL,
  resolveTocRoot,
  buildSectionLevelSelector,
  collectTitleHeadings,
  collectHeadings,
  buildLevelSelector,
  buildHeadingSelectorQuery,
}
