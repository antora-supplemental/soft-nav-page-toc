/**
 * Rebuild Default UI / Valentus aside page TOC after SoftNav swaps the article.
 * Load after soft-nav.js (listens to soft-nav:loaded and doc-nav:loaded).
 *
 * Heading selectors: keep in sync with lib/page-toc-selectors.js
 */
;(function () {
  'use strict'

  var scrollHandler = null

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

  function parsePx (el, prop) {
    return parseFloat(window.getComputedStyle(el)[prop])
  }

  function removeAside (aside) {
    if (aside && aside.parentNode) aside.parentNode.removeChild(aside)
  }

  function rebuildPageToc () {
    var aside = document.querySelector('aside.toc.sidebar')
    if (!aside) return
    if (document.querySelector('body.-toc')) {
      removeAside(aside)
      return
    }

    var levels = parseInt(aside.dataset.levels || '2', 10)
    if (levels < 0) return

    var articleSel = 'article.doc'
    var article = document.querySelector(articleSel)
    if (!article) return

    var query = buildHeadingSelectorQuery(articleSel, levels)
    var headings = [].slice.call(article.querySelectorAll(query))
    if (!headings.length) {
      removeAside(aside)
      return
    }

    var linkByHash = {}
    var list = headings.reduce(function (ul, heading) {
      var a = document.createElement('a')
      a.textContent = heading.textContent
      var href = '#' + heading.id
      a.setAttribute('href', href)
      linkByHash[href] = a
      var li = document.createElement('li')
      li.dataset.level = String(parseInt(heading.nodeName.slice(1), 10) - 1)
      li.appendChild(a)
      ul.appendChild(li)
      return ul
    }, document.createElement('ul'))

    var menu = aside.querySelector('.toc-menu')
    if (!menu) {
      menu = document.createElement('div')
      menu.className = 'toc-menu'
      aside.appendChild(menu)
    }
    menu.innerHTML = ''
    var title = document.createElement('h3')
    title.textContent = aside.dataset.title || 'Contents'
    menu.appendChild(title)
    menu.appendChild(list)

    bindScrollSpy(aside, menu, headings, linkByHash)
  }

  function bindScrollSpy (aside, menu, headings, linkByHash) {
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler)
      scrollHandler = null
    }

    var tocList = menu.querySelector('ul')
    if (!tocList) return

    var activeStack
    var article = document.querySelector('article.doc')
    var topOffset = article ? article.getBoundingClientRect().top + window.pageYOffset : 0
    var fontSize = parsePx(document.documentElement, 'fontSize') * 1.15

    scrollHandler = function () {
      var scrollY = window.pageYOffset
      var atBottom =
        scrollY &&
        window.innerHeight + scrollY + 2 >= document.documentElement.scrollHeight

      if (atBottom) {
        activeStack = Array.isArray(activeStack) ? activeStack : Array(activeStack || 0)
        var visible = []
        var last = headings.length - 1
        headings.forEach(function (h, idx) {
          var hash = '#' + h.id
          if (
            idx === last ||
            h.getBoundingClientRect().top + parsePx(h, 'paddingTop') > topOffset
          ) {
            visible.push(hash)
            if (activeStack.indexOf(hash) < 0) linkByHash[hash].classList.add('is-active')
          } else if (~activeStack.indexOf(hash)) {
            linkByHash[activeStack.shift()].classList.remove('is-active')
          }
        })
        activeStack = visible.length > 1 ? visible : visible[0]
        return
      }

      if (Array.isArray(activeStack)) {
        activeStack.forEach(function (hash) {
          linkByHash[hash].classList.remove('is-active')
        })
        activeStack = undefined
      }

      var current
      headings.some(function (h) {
        if (h.getBoundingClientRect().top + parsePx(h, 'paddingTop') - fontSize > topOffset) {
          return true
        }
        current = '#' + h.id
      })

      if (current) {
        if (current !== activeStack) {
          if (activeStack) linkByHash[activeStack].classList.remove('is-active')
          var link = linkByHash[current]
          link.classList.add('is-active')
          if (tocList.scrollHeight > tocList.offsetHeight) {
            tocList.scrollTop = Math.max(0, link.offsetTop + link.offsetHeight - tocList.offsetHeight)
          }
          activeStack = current
        }
      } else if (activeStack) {
        linkByHash[activeStack].classList.remove('is-active')
        activeStack = undefined
      }
    }

    window.addEventListener('scroll', scrollHandler, { passive: true })
    scrollHandler()
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
