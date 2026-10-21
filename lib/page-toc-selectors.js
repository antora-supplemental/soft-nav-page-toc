'use strict'

/**
 * Page TOC heading selectors aligned with Default UI site.js, with a descendant
 * gap after article.doc so Valentus / article-zones body wrappers still match.
 */

function buildLevelSelector (articleSel, level) {
  if (level === 0) {
    return [
      articleSel + ' h1[id].sect0',
      articleSel + ' .doc-zone--header h1[id]',
      articleSel + ' > h1[id]',
    ].join(', ')
  }

  var segs = [articleSel]
  for (var c = 1; c <= level; c++) {
    if (c === 1) {
      segs.push(' .sect' + c)
    } else {
      segs.push('>' + (c === 2 ? '.sectionbody>' : '') + '.sect' + c)
    }
  }
  segs.push('>h' + (level + 1) + '[id]' + (level > 1 ? ':not(.discrete)' : ''))
  return segs.join('')
}

function buildHeadingSelectorQuery (articleSel, levels) {
  var selectors = []
  for (var i = 0; i <= levels; i++) {
    selectors.push(buildLevelSelector(articleSel, i))
  }
  return selectors.join(', ')
}

function collectHeadings (article, levels, articleSel) {
  if (!article) return []
  var root = articleSel || 'article.doc'
  var query = buildHeadingSelectorQuery(root, levels)
  return [].slice.call(article.querySelectorAll(query))
}

module.exports = {
  buildLevelSelector,
  buildHeadingSelectorQuery,
  collectHeadings,
}
