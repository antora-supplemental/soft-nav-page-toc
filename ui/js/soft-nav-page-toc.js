/**
 * Rebuild aside page TOC after SoftNav swaps the article.
 * Prefer window.ValentusPageToc.rebuild from Valentus site-page-toc.js (data-page-toc-root contract).
 * Fallback implements the same contract when the theme script is absent.
 */
;(function () {
  'use strict'

  function rebuildPageToc () {
    if (window.ValentusPageToc && typeof window.ValentusPageToc.rebuild === 'function') {
      window.ValentusPageToc.rebuild()
      return
    }
    if (typeof rebuildPageTocFallback === 'function') rebuildPageTocFallback()
  }

  function onSoftNavLoaded (detail) {
    rebuildPageToc()
    void detail
  }

  function bindLifecycle () {
    if (typeof bindSoftNavContext === 'function') {
      bindSoftNavContext({
        onBoot: rebuildPageToc,
        onLoaded: onSoftNavLoaded,
      })
      return
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', rebuildPageToc)
    } else {
      rebuildPageToc()
    }

    document.addEventListener('soft-nav:loaded', function (e) {
      onSoftNavLoaded(e.detail || {})
    })
    document.addEventListener('doc-nav:loaded', rebuildPageToc)
  }

  bindLifecycle()
})()
