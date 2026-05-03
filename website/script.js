/**
 * Story Studio World — Editorial Dark Luxury
 * Rich interactions and scroll animations
 */

(function () {
  'use strict'

  // ============================================
  // Custom Cursor
  // ============================================
  const cursor = document.getElementById('cursor')
  const cursorFollower = document.getElementById('cursorFollower')
  let mouseX = 0, mouseY = 0
  let cursorX = 0, cursorY = 0
  let followerX = 0, followerY = 0

  if (cursor && cursorFollower && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX
      mouseY = e.clientY
    })

    function animateCursor() {
      cursorX += (mouseX - cursorX) * 0.2
      cursorY += (mouseY - cursorY) * 0.2
      followerX += (mouseX - followerX) * 0.1
      followerY += (mouseY - followerY) * 0.1

      cursor.style.transform = 'translate(' + (cursorX - 4) + 'px, ' + (cursorY - 4) + 'px)'
      cursorFollower.style.transform = 'translate(' + (followerX - 16) + 'px, ' + (followerY - 16) + 'px)'

      requestAnimationFrame(animateCursor)
    }
    animateCursor()

    // Hover effects
    const hoverTargets = document.querySelectorAll('a, button, .export-card, .download-btn')
    hoverTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cursor.classList.add('hover')
        cursorFollower.classList.add('hover')
      })
      el.addEventListener('mouseleave', function () {
        cursor.classList.remove('hover')
        cursorFollower.classList.remove('hover')
      })
    })
  }

  // ============================================
  // Navigation
  // ============================================
  const nav = document.getElementById('nav')
  let lastScroll = 0

  window.addEventListener('scroll', function () {
    const currentScroll = window.scrollY
    if (currentScroll > 100) {
      nav.classList.add('scrolled')
    } else {
      nav.classList.remove('scrolled')
    }
    lastScroll = currentScroll
  })

  // Mobile toggle
  const navToggle = document.getElementById('navToggle')
  const mobileMenu = document.getElementById('mobileMenu')

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      this.classList.toggle('active')
      mobileMenu.classList.toggle('active')
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : ''
    })

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.classList.remove('active')
        mobileMenu.classList.remove('active')
        document.body.style.overflow = ''
      })
    })
  }

  // ============================================
  // Hero Title Animation — Split into spans
  // ============================================
  const heroLines = document.querySelectorAll('.hero-title .line')
  heroLines.forEach(function (line) {
    const text = line.textContent
    line.innerHTML = '<span>' + text + '</span>'
  })

  // ============================================
  // Scroll Reveal with Intersection Observer
  // ============================================
  const revealElements = document.querySelectorAll('[data-reveal]')

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const el = entry.target
        const delay = parseFloat(el.dataset.revealDelay) || 0
        setTimeout(function () {
          el.classList.add('revealed')
        }, delay * 1000)
        revealObserver.unobserve(el)
      }
    })
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  })

  revealElements.forEach(function (el, i) {
    el.dataset.revealDelay = (i % 3) * 0.15
    revealObserver.observe(el)
  })

  // ============================================
  // Parallax Orbs
  // ============================================
  const orbs = document.querySelectorAll('.hero-orb')

  window.addEventListener('scroll', function () {
    const scrollY = window.scrollY
    orbs.forEach(function (orb, i) {
      const speed = 0.1 + (i * 0.05)
      orb.style.transform = 'translateY(' + (scrollY * speed) + 'px)'
    })
  })

  // ============================================
  // Smooth Scroll for Anchors
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href')
      if (href === '#') return
      const target = document.querySelector(href)
      if (target) {
        e.preventDefault()
        const offset = target.offsetTop - 72
        window.scrollTo({ top: offset, behavior: 'smooth' })
      }
    })
  })

  // ============================================
  // Image Tilt Effect on Hover
  // ============================================
  const tiltFrames = document.querySelectorAll('.editor-img-frame, .world-img-frame, .plugin-img-frame')

  tiltFrames.forEach(function (frame) {
    frame.addEventListener('mousemove', function (e) {
      const rect = this.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5

      this.style.transform = 'perspective(1000px) rotateY(' + (x * 4) + 'deg) rotateX(' + (-y * 4) + 'deg) scale(1.02)'
      this.style.transition = 'transform 0.1s ease-out'
    })

    frame.addEventListener('mouseleave', function () {
      this.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)'
      this.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    })
  })

  // ============================================
  // Export Cards Stagger Reveal
  // ============================================
  const exportCards = document.querySelectorAll('.export-card')
  exportCards.forEach(function (card, i) {
    card.style.transitionDelay = (i * 0.1) + 's'
  })

  // ============================================
  // Section Background Text Parallax
  // ============================================
  const bgTexts = document.querySelectorAll('.section-bg-text')

  window.addEventListener('scroll', function () {
    bgTexts.forEach(function (text) {
      const rect = text.getBoundingClientRect()
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
      text.style.transform = 'translateY(' + (scrollProgress * 100) + 'px)'
    })
  })

  // ============================================
  // Detail Items Stagger
  // ============================================
  const detailItems = document.querySelectorAll('.detail-item')
  detailItems.forEach(function (item, i) {
    item.style.transitionDelay = (i * 0.2) + 's'
  })

  // ============================================
  // Download Buttons Stagger
  // ============================================
  const downloadBtns = document.querySelectorAll('.download-btn')
  downloadBtns.forEach(function (btn, i) {
    btn.style.transitionDelay = (i * 0.1) + 's'
  })

  // ============================================
  // Prefers Reduced Motion
  // ============================================
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealElements.forEach(function (el) {
      el.classList.add('revealed')
    })
    orbs.forEach(function (orb) {
      orb.style.animation = 'none'
    })
  }

  // ============================================
  // Console Art
  // ============================================
  console.log('%c Story Studio World ', 'background: #30cfd0; color: #0a0a14; font-size: 18px; font-weight: bold; padding: 8px 16px; border-radius: 4px; font-family: serif;')
  console.log('%c创作即自由', 'color: #30cfd0; font-size: 14px; font-family: serif;')
})()
