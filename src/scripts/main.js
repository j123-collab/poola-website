/* ==========================================================================
   Poola - premium interactions
   Navigation, reveal motion, hero Pool examples, meters, contribution engine,
   product tour, desktop tilt, magnetic CTAs, download states and shop previews.
   ========================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  var progress = document.getElementById("progress");
  var backToTop = document.querySelector("[data-back-to-top]");
  var navRail = nav ? nav.querySelector(".nav__links") : null;
  var navInner = nav ? nav.querySelector(".nav__inner") : null;
  var navBrand = nav ? nav.querySelector(".nav__brand") : null;
  var navItems = navRail ? Array.prototype.slice.call(navRail.querySelectorAll("a:not(.nav__cta)")) : [];
  var desktopNav = window.matchMedia("(min-width: 821px)");
  var poolFlowWidth = 1;
  var poolBrandWidth = 1;
  var poolBrandOffset = 0;
  var poolLogoWidth = 1;
  var poolFlowCurrentWidth = 1;
  var poolLogoPad = 12;
  var currentScrollProgress = 0;
  var poolScrollThreshold = 0.018;
  var poolScrollStorageTtl = 9000;
  var poolReturnTimer = 0;
  var pageExitTimer = 0;
  var openDownloadsTimer = 0;
  var openDownloadsRaf = 0;
  var openDownloadsPending = false;
  var openDownloadsLocked = false;
  var openDownloadsManualReady = false;
  var openDownloadsScrollY = 0;
  var nativePageTransitions = "startViewTransition" in document && "PageSwapEvent" in window && "PageRevealEvent" in window;

  document.documentElement.classList.toggle("has-native-page-transitions", nativePageTransitions);
  document.documentElement.classList.toggle("no-native-page-transitions", !nativePageTransitions);

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function ensurePoolProgress() {
    if (!navInner || !navBrand) return null;

    var brandText = navBrand.textContent.trim() || "Poola";
    if (navBrand.getAttribute("data-brand") !== brandText) {
      navBrand.setAttribute("data-brand", brandText);
    }

    var flow = navInner.querySelector(".nav__pool-flow");
    if (!flow) {
      flow = document.createElement("span");
      flow.className = "nav__pool-flow";
      flow.setAttribute("aria-hidden", "true");
      navInner.insertBefore(flow, navInner.firstChild);
    }

    return flow;
  }

  function measurePoolProgress() {
    if (!ensurePoolProgress()) return;

    var innerRect = navInner.getBoundingClientRect();
    var brandRect = navBrand.getBoundingClientRect();
    if (!innerRect.width || !brandRect.width) return;

    var railRect = navRail ? navRail.getBoundingClientRect() : innerRect;
    var flowX = Math.max(0, brandRect.left - innerRect.left - poolLogoPad);
    var flowEnd = Math.min(innerRect.right, railRect.right) - innerRect.left;
    var flowHeight = Math.min(46, Math.max(36, railRect.height || 42));
    poolFlowWidth = Math.max(1, flowEnd - flowX);
    poolBrandWidth = Math.max(1, brandRect.width);
    poolBrandOffset = Math.max(0, brandRect.left - innerRect.left - flowX);
    poolLogoWidth = Math.min(poolFlowWidth, poolBrandOffset + poolBrandWidth + poolLogoPad);

    navInner.style.setProperty("--pool-flow-x", flowX + "px");
    navInner.style.setProperty("--pool-flow-w", poolFlowWidth + "px");
    navInner.style.setProperty("--pool-flow-h", Math.round(flowHeight) + "px");
  }

  function poolWidthForProgress(value) {
    var scrollProgress = clamp01(value);
    var liquidRange = Math.max(0, poolFlowWidth - poolLogoWidth);
    return Math.max(poolLogoWidth, Math.min(poolFlowWidth, poolLogoWidth + (liquidRange * scrollProgress)));
  }

  function setPoolReturnRange(fromProgress, toProgress) {
    if (!navInner) return;

    navInner.style.setProperty("--pool-return-from-w", poolWidthForProgress(fromProgress).toFixed(2) + "px");
    navInner.style.setProperty("--pool-return-to-w", poolWidthForProgress(toProgress).toFixed(2) + "px");
  }

  function setScrollProgress(value) {
    var scrollProgress = clamp01(value);
    var scrollProgressPct = (scrollProgress * 100).toFixed(3) + "%";
    poolFlowCurrentWidth = poolWidthForProgress(scrollProgress);
    var poolFlowCurrentPx = poolFlowCurrentWidth.toFixed(2) + "px";
    var ctaCompleteFill = clamp01((scrollProgress - 0.94) / 0.055);

    document.documentElement.style.setProperty("--scroll-progress", scrollProgress);
    document.documentElement.style.setProperty("--scroll-progress-pct", scrollProgressPct);
    document.documentElement.style.setProperty("--pool-flow-current-w", poolFlowCurrentPx);
    document.documentElement.style.setProperty("--cta-complete-fill", ctaCompleteFill.toFixed(3));
    if (nav) nav.classList.toggle("is-pool-complete", scrollProgress >= 0.99);

    if (progress) {
      progress.style.setProperty("--scroll-progress", scrollProgress);
      progress.style.setProperty("--scroll-progress-pct", scrollProgressPct);
    }

    if (navInner) {
      navInner.style.setProperty("--scroll-progress", scrollProgress);
      navInner.style.setProperty("--scroll-progress-pct", scrollProgressPct);
      navInner.style.setProperty("--pool-flow-current-w", poolFlowCurrentPx);
      navInner.style.setProperty("--cta-complete-fill", ctaCompleteFill.toFixed(3));

      var poolFlow = navInner.querySelector(".nav__pool-flow");
      if (poolFlow) poolFlow.style.width = poolFlowCurrentPx;
    }
  }

  function isOpenDownloadsLink(link) {
    if (!link) return false;

    try {
      var url = new URL(link.getAttribute("href") || "", window.location.href);
      return url.origin === window.location.origin && url.hash === "#downloads";
    } catch (error) {
      return false;
    }
  }

  function markOpenDownloadsClick() {
    navStorageSet("poolaOpenDownloadsClick", String(Date.now()));
  }

  function consumeOpenDownloadsClick() {
    var raw = navStorageGet("poolaOpenDownloadsClick");
    navStorageRemove("poolaOpenDownloadsClick");
    if (!raw || window.location.hash !== "#downloads") return false;

    var timestamp = parseFloat(raw);
    return isFinite(timestamp) && Math.abs(Date.now() - timestamp) < 9000;
  }

  function downloadsTargetSettled() {
    var grid = document.querySelector("#downloads .download-grid");
    var target = grid || document.getElementById("downloads");
    if (!target) return false;

    var targetTop = target.getBoundingClientRect().top;
    return Math.abs(targetTop - openDownloadsFocusTop(target)) < 36;
  }

  function openDownloadsFocusTop(target) {
    var navRect = nav ? nav.getBoundingClientRect() : null;
    var topEdge = navRect ? Math.max(navRect.bottom + 26, 24) : 24;
    var bottomEdge = Math.max(topEdge + 120, window.innerHeight - 38);
    var available = Math.max(120, bottomEdge - topEdge);
    var targetHeight = target ? target.getBoundingClientRect().height : 0;
    return topEdge + Math.max(0, (available - targetHeight) / 2);
  }

  function scrollOpenDownloadsIntoFocus() {
    var grid = document.querySelector("#downloads .download-grid");
    var target = grid || document.getElementById("downloads");
    if (!target) return false;

    var targetTop = target.getBoundingClientRect().top;
    var destination = Math.max(0, (window.scrollY || document.documentElement.scrollTop) + targetTop - openDownloadsFocusTop(target));
    window.scrollTo({ top: destination, behavior: reduce ? "auto" : "smooth" });
    return true;
  }

  function clearOpenDownloadsState() {
    openDownloadsPending = false;
    openDownloadsLocked = false;
    openDownloadsManualReady = false;
    if (openDownloadsTimer) window.clearTimeout(openDownloadsTimer);
    if (openDownloadsRaf) window.cancelAnimationFrame(openDownloadsRaf);
    openDownloadsTimer = 0;
    openDownloadsRaf = 0;
    if (nav) nav.classList.remove("is-open-download-target");
  }

  function waitForOpenDownloadsArrival(startedAt) {
    if (!openDownloadsPending) return;

    if (syncOpenDownloadsArrival()) return;

    if (Date.now() - startedAt > 6500) {
      openDownloadsPending = false;
      return;
    }

    openDownloadsRaf = window.requestAnimationFrame(function () {
      waitForOpenDownloadsArrival(startedAt);
    });
  }

  function syncOpenDownloadsArrival() {
    if (!openDownloadsPending) return false;
    if (window.location.hash !== "#downloads" || !downloadsTargetSettled()) return false;

    openDownloadsPending = false;
    activateOpenDownloadsState();
    return true;
  }

  function requestOpenDownloadsState(focusDownloads) {
    if (openDownloadsTimer) window.clearTimeout(openDownloadsTimer);
    if (openDownloadsRaf) window.cancelAnimationFrame(openDownloadsRaf);
    openDownloadsTimer = 0;
    openDownloadsRaf = 0;
    openDownloadsPending = true;
    openDownloadsLocked = false;
    openDownloadsManualReady = false;
    if (nav) nav.classList.remove("is-open-download-target");

    openDownloadsRaf = window.requestAnimationFrame(function () {
      if (focusDownloads) scrollOpenDownloadsIntoFocus();
      waitForOpenDownloadsArrival(Date.now());
    });
  }

  function armOpenDownloadsManualReset(startedAt) {
    if (!openDownloadsLocked) return;

    if (downloadsTargetSettled() || reduce) {
      openDownloadsManualReady = true;
      openDownloadsScrollY = window.scrollY || document.documentElement.scrollTop;
      return;
    }

    if (Date.now() - startedAt > 5000) return;

    openDownloadsRaf = window.requestAnimationFrame(function () {
      armOpenDownloadsManualReset(startedAt);
    });
  }

  function activateOpenDownloadsState() {
    if (!nav) return;

    openDownloadsPending = false;
    openDownloadsLocked = true;
    openDownloadsManualReady = false;
    if (openDownloadsTimer) window.clearTimeout(openDownloadsTimer);
    if (openDownloadsRaf) window.cancelAnimationFrame(openDownloadsRaf);
    nav.classList.add("is-open-download-target");

    openDownloadsTimer = window.setTimeout(function () {
      armOpenDownloadsManualReset(Date.now());
    }, reduce ? 0 : 80);
  }

  function clearOpenDownloadsOnUserIntent(event) {
    if (!openDownloadsLocked && !openDownloadsPending) return;

    if (event && event.type === "keydown") {
      var scrollKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
      if (scrollKeys.indexOf(event.key) === -1) return;
    }

    clearOpenDownloadsState();
  }

  function syncBackToTop(scrollTop) {
    if (!backToTop) return;

    var visible = scrollTop > Math.min(520, window.innerHeight * 0.48);
    backToTop.classList.toggle("is-visible", visible);
    backToTop.setAttribute("aria-hidden", visible ? "false" : "true");
    backToTop.tabIndex = visible ? 0 : -1;
  }

  function refreshPoolProgress(instant) {
    if (nav && nav.classList.contains("is-pool-returning")) return;

    var st = window.scrollY || document.documentElement.scrollTop;
    currentScrollProgress = scrollProgressValue();
    if (nav) {
      nav.classList.toggle("scrolled", st > 18);
      if (instant) nav.classList.add("is-pool-measuring");
    }

    measurePoolProgress();
    setScrollProgress(currentScrollProgress);

    if (instant && nav) {
      window.requestAnimationFrame(function () {
        nav.classList.remove("is-pool-measuring");
      });
    }
  }

  ensurePoolProgress();
  measurePoolProgress();

  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      setMenu(open);
    });

    nav.querySelectorAll(".nav__links a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setMenu(false);
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target)) return;
      setMenu(false);
    });
  }

  function navStorageGet(key) {
    try {
      return window.sessionStorage ? window.sessionStorage.getItem(key) : "";
    } catch (error) {
      return "";
    }
  }

  function navStorageSet(key, value) {
    try {
      if (window.sessionStorage) window.sessionStorage.setItem(key, value);
    } catch (error) {}
  }

  function navStorageRemove(key) {
    try {
      if (window.sessionStorage) window.sessionStorage.removeItem(key);
    } catch (error) {}
  }

  function consumePreviousPoolScrollProgress() {
    var raw = navStorageGet("poolaNavScrollFrom");
    navStorageRemove("poolaNavScrollFrom");
    if (!raw) return 0;

    var progressValue = NaN;
    var timestamp = 0;
    try {
      var payload = JSON.parse(raw);
      if (payload && typeof payload === "object") {
        progressValue = parseFloat(payload.progress);
        timestamp = parseFloat(payload.at);
      } else {
        progressValue = parseFloat(payload);
      }
    } catch (error) {
      progressValue = parseFloat(raw);
    }

    if (!isFinite(progressValue)) return 0;
    if (timestamp && isFinite(timestamp) && Math.abs(Date.now() - timestamp) > poolScrollStorageTtl) return 0;
    return clamp01(progressValue);
  }

  function storePoolScrollForNavigation() {
    currentScrollProgress = scrollProgressValue();
    if (!desktopNav.matches || reduce || currentScrollProgress <= poolScrollThreshold) {
      navStorageRemove("poolaNavScrollFrom");
      return;
    }

    navStorageSet("poolaNavScrollFrom", JSON.stringify({
      progress: currentScrollProgress.toFixed(4),
      at: Date.now()
    }));
  }

  function isInternalPageLink(link) {
    if (!link) return false;
    var href = link.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return false;

    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (error) {
      return false;
    }
    var currentPath = window.location.pathname || "/";
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === currentPath && url.hash) return false;
    return /\.html$/.test(url.pathname) || url.pathname === "/" || url.pathname.slice(-1) === "/";
  }

  function fallbackPageExitUrl(link) {
    if (nativePageTransitions || reduce) return null;
    if (!isInternalPageLink(link)) return null;
    if (link.hasAttribute("download")) return null;

    var target = link.getAttribute("target");
    if (target && target !== "_self") return null;

    try {
      return new URL(link.getAttribute("href"), window.location.href);
    } catch (error) {
      return null;
    }
  }

  function animateFallbackPageExit(link) {
    var url = fallbackPageExitUrl(link);
    if (!url) return false;

    var shellExiting = document.documentElement.classList.contains("contributors-shell") && desktopNav.matches && url.pathname !== window.location.pathname;
    var exitDelay = shellExiting ? 440 : 210;

    document.documentElement.classList.add("is-page-leaving");
    document.documentElement.classList.toggle("is-shell-exiting", shellExiting);
    if (pageExitTimer) window.clearTimeout(pageExitTimer);
    pageExitTimer = window.setTimeout(function () {
      window.location.href = url.href;
    }, exitDelay);
    return true;
  }

  window.addEventListener("pageshow", function () {
    document.documentElement.classList.remove("is-page-leaving", "is-shell-exiting");
  });

  var previousPoolScrollProgress = consumePreviousPoolScrollProgress();

  function navDestinationKey(link) {
    if (!link) return "";
    var href = link.getAttribute("href") || "";
    var url = new URL(href, window.location.href);
    var file = url.pathname.split("/").pop();
    file = file || "index.html";
    return file;
  }

  function navPathKey(link) {
    return navDestinationKey(link);
  }

  function currentNavPathKey() {
    var file = window.location.pathname.split("/").pop();
    if (file === "about.html") return "index.html";
    if (file === "how-it-works.html") return "index.html";
    if (file === "shop.html") return "contributors.html";
    if (["security.html", "safety.html", "community-guidelines.html", "accessibility.html"].indexOf(file) !== -1) return "trust-status.html";
    return file || "index.html";
  }

  function syncPrimaryNavActive() {
    if (!navRail || !navItems.length) return;

    var currentKey = currentNavPathKey();
    var matched = false;
    navItems.forEach(function (link) {
      var active = navPathKey(link) === currentKey;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
        matched = true;
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (!matched) {
      navRail.querySelectorAll("a.is-active:not(.nav__cta)").forEach(function (link) {
        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
      });
    }
  }

  function activeNavItem() {
    if (!navRail) return null;
    return navRail.querySelector("a.is-active:not(.nav__cta)");
  }

  function liquidNavEnabled() {
    return navRail && navItems.length && !reduce && desktopNav.matches;
  }

  function ensureNavIndicator() {
    var indicator = navRail.querySelector(".nav__indicator");
    if (!indicator) {
      indicator = document.createElement("span");
      indicator.className = "nav__indicator";
      indicator.setAttribute("aria-hidden", "true");
      navRail.insertBefore(indicator, navRail.firstChild);
    }
    navRail.classList.add("has-liquid-indicator");
    return indicator;
  }

  function moveNavIndicator(link, instant) {
    if (!navRail) return;

    if (!liquidNavEnabled()) {
      navRail.classList.remove("has-liquid-indicator");
      navRail.style.removeProperty("--nav-indicator-opacity");
      return;
    }

    ensureNavIndicator();

    if (!link) {
      navRail.style.setProperty("--nav-indicator-opacity", "0");
      return;
    }

    var railRect = navRail.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    if (!railRect.width || !linkRect.width) return;

    if (instant) navRail.classList.add("is-measuring");
    navRail.style.setProperty("--nav-indicator-x", (linkRect.left - railRect.left - navRail.clientLeft) + "px");
    navRail.style.setProperty("--nav-indicator-w", linkRect.width + "px");
    navRail.style.setProperty("--nav-indicator-opacity", "1");

    if (instant) {
      window.requestAnimationFrame(function () {
        navRail.classList.remove("is-measuring");
      });
    }
  }

  function settleNavIndicator(instant) {
    moveNavIndicator(activeNavItem(), instant);
  }

  function refreshNavActiveState(instant) {
    syncPrimaryNavActive();
    settleNavIndicator(instant);
  }

  syncPrimaryNavActive();

  if (navRail && navItems.length && !reduce) {
    var previousKey = navStorageGet("poolaNavFrom");
    navStorageRemove("poolaNavFrom");

    navItems.forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        moveNavIndicator(link, false);
      });

      link.addEventListener("focus", function () {
        moveNavIndicator(link, false);
      });

      link.addEventListener("click", function () {
        var active = activeNavItem();
        navStorageSet("poolaNavFrom", navDestinationKey(active || link));
        storePoolScrollForNavigation();
      });
    });

    navRail.addEventListener("mouseleave", function () {
      settleNavIndicator(false);
    });

    navRail.addEventListener("focusout", function (event) {
      if (event.relatedTarget && navRail.contains(event.relatedTarget)) return;
      settleNavIndicator(false);
    });

    window.addEventListener("resize", function () {
      window.requestAnimationFrame(function () {
        refreshPoolProgress(true);
        settleNavIndicator(true);
      });
    });

    if (desktopNav.addEventListener) {
      desktopNav.addEventListener("change", function () {
        refreshPoolProgress(true);
        settleNavIndicator(true);
      });
    } else if (desktopNav.addListener) {
      desktopNav.addListener(function () {
        refreshPoolProgress(true);
        settleNavIndicator(true);
      });
    }

    var activeItem = activeNavItem();
    var previousItem = previousKey ? navItems.filter(function (link) {
      return navDestinationKey(link) === previousKey;
    })[0] : null;

    if (previousItem && activeItem && previousItem !== activeItem && liquidNavEnabled()) {
      moveNavIndicator(previousItem, true);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          moveNavIndicator(activeItem, false);
        });
      });
    } else {
      settleNavIndicator(true);
    }
  }

  window.addEventListener("hashchange", function () {
    if (window.location.hash !== "#downloads") clearOpenDownloadsState();
    window.requestAnimationFrame(function () {
      refreshNavActiveState(false);
      syncOpenDownloadsArrival();
    });
  });

  var openCtaLink = nav ? nav.querySelector(".nav__cta[href]") : null;
  if (openCtaLink) {
    openCtaLink.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!isOpenDownloadsLink(openCtaLink)) return;

      markOpenDownloadsClick();

      try {
        var url = new URL(openCtaLink.getAttribute("href"), window.location.href);
        var currentPath = window.location.pathname || "/";
        var samePath = url.pathname === currentPath || (url.pathname === "/index.html" && currentPath === "/") || (url.pathname === "/" && currentPath === "/index.html");
        if (samePath) {
          event.preventDefault();
          setMenu(false);
          navStorageRemove("poolaOpenDownloadsClick");
          requestOpenDownloadsState(true);
          if (window.history && window.history.pushState) {
            window.history.pushState(null, "", "#downloads");
          } else {
            window.location.hash = "downloads";
          }
        }
      } catch (error) {}
    });
  }

  document.querySelectorAll("a[href]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!isInternalPageLink(link)) return;
      storePoolScrollForNavigation();
      if (animateFallbackPageExit(link)) event.preventDefault();
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href === "#") return;

      var target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      setMenu(false);
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (window.history && window.history.pushState) {
        window.history.pushState(null, "", href);
      } else {
        window.location.hash = href;
      }
    });
  });

  function onScroll() {
    var st = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle("scrolled", st > 18);
    syncBackToTop(st);

    currentScrollProgress = scrollProgressValue();
    setScrollProgress(currentScrollProgress);
    syncOpenDownloadsArrival();

    if (openDownloadsLocked && openDownloadsManualReady && Math.abs(st - openDownloadsScrollY) > 2) {
      clearOpenDownloadsState();
    }
  }

  function scrollProgressValue() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var st = window.scrollY || document.documentElement.scrollTop;
    return h > 0 ? st / h : 0;
  }

  function primeScrollProgress() {
    var st = window.scrollY || document.documentElement.scrollTop;
    var targetProgress = scrollProgressValue();
    var shouldReturn = previousPoolScrollProgress > targetProgress + poolScrollThreshold && previousPoolScrollProgress > poolScrollThreshold && desktopNav.matches && !reduce;

    currentScrollProgress = targetProgress;
    if (poolReturnTimer) window.clearTimeout(poolReturnTimer);
    if (nav) {
      nav.classList.toggle("scrolled", st > 18);
      nav.classList.add("is-pool-measuring");
      nav.classList.remove("is-pool-ready", "is-pool-returning");
    }

    setScrollProgress(shouldReturn ? previousPoolScrollProgress : targetProgress);

    window.requestAnimationFrame(function () {
      if (nav) {
        nav.classList.remove("is-pool-measuring");
        nav.classList.add("is-pool-ready");
      }

      if (shouldReturn) {
        setPoolReturnRange(previousPoolScrollProgress, targetProgress);
        if (nav) {
          nav.classList.add("is-pool-returning");
          nav.offsetWidth;
        }
        window.requestAnimationFrame(function () {
          setScrollProgress(targetProgress);
          poolReturnTimer = window.setTimeout(function () {
            if (nav) nav.classList.remove("is-pool-returning");
          }, 680);
        });
      } else {
        setScrollProgress(targetProgress);
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", clearOpenDownloadsOnUserIntent, { passive: true });
  window.addEventListener("touchmove", clearOpenDownloadsOnUserIntent, { passive: true });
  window.addEventListener("keydown", clearOpenDownloadsOnUserIntent);
  window.addEventListener("resize", function () {
    window.requestAnimationFrame(function () {
      refreshPoolProgress(true);
    });
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      refreshPoolProgress(true);
    }).catch(function () {});
  }

  primeScrollProgress();
  if (consumeOpenDownloadsClick()) requestOpenDownloadsState(true);

  if (backToTop) {
    syncBackToTop(window.scrollY || document.documentElement.scrollTop);
    backToTop.addEventListener("click", function () {
      setMenu(false);
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  function isHeroReveal(el) {
    var section = el.closest && el.closest(".hero, .page-hero, .explore-hero, .contrib-hero");
    if (!section || !section.parentElement || section.parentElement.tagName.toLowerCase() !== "main") return false;
    return section === section.parentElement.firstElementChild;
  }

  var revealEls = document.querySelectorAll("[data-reveal], .reveal");
  if ("IntersectionObserver" in window && revealEls.length && !reduce) {
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      group.querySelectorAll("[data-reveal]").forEach(function (child, index) {
        child.style.setProperty("--d", (index * 75) + "ms");
      });
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.13, rootMargin: "0px 0px -7% 0px" });

    revealEls.forEach(function (el) {
      if (isHeroReveal(el)) {
        el.classList.add("in");
        return;
      }
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  function fillMeterbar(el) {
    el.querySelectorAll(".track b").forEach(function (bar) {
      bar.style.width = (bar.getAttribute("data-w") || "50") + "%";
    });
  }

  var meterbars = document.querySelectorAll(".meterbar");
  if ("IntersectionObserver" in window && meterbars.length && !reduce) {
    var meterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        fillMeterbar(entry.target);
        meterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.45 });
    meterbars.forEach(function (el) { meterObserver.observe(el); });
  } else {
    meterbars.forEach(fillMeterbar);
  }

  var heroPools = [
    {
      command: 'poola.create({ pool: "kitchen" })',
      title: "Community kitchen relaunch",
      funds: 62,
      power: 91,
      backers: "428",
      feed: [
        { icon: "fa-screwdriver-wrench", text: "12 people offered skills" },
        { icon: "fa-box-open", text: "8 resources pledged" },
        { icon: "fa-bullhorn", text: "240 signatures added" }
      ]
    },
    {
      command: 'poola.create({ pool: "playground" })',
      title: "Neighbourhood playground repair",
      funds: 48,
      power: 76,
      backers: "312",
      feed: [
        { icon: "fa-hammer", text: "18 weekend volunteers" },
        { icon: "fa-box-open", text: "12 toolkits pledged" },
        { icon: "fa-handshake", text: "3 local sponsors joined" }
      ]
    },
    {
      command: 'poola.create({ pool: "game" })',
      title: "Indie game launch fund",
      funds: 84,
      power: 67,
      backers: "1.2k",
      feed: [
        { icon: "fa-gamepad", text: "24 playtesters joined" },
        { icon: "fa-language", text: "11 translators offered help" },
        { icon: "fa-coins", text: "18.6k raised for production" }
      ]
    },
    {
      command: 'poola.create({ pool: "rescue" })',
      title: "Animal rescue transport van",
      funds: 71,
      power: 88,
      backers: "659",
      feed: [
        { icon: "fa-house", text: "34 foster homes offered" },
        { icon: "fa-box-open", text: "9 crates and carriers donated" },
        { icon: "fa-signature", text: "212 support signatures" }
      ]
    },
    {
      command: 'poola.create({ pool: "film" })',
      title: "Student climate film",
      funds: 53,
      power: 94,
      backers: "782",
      feed: [
        { icon: "fa-video", text: "16 editors and camera ops" },
        { icon: "fa-location-dot", text: "4 venues pledged space" },
        { icon: "fa-ticket", text: "1.8k launch RSVPs" }
      ]
    }
  ];

  var poolRotator = document.querySelector("[data-pool-rotator]");
  if (poolRotator && heroPools.length) {
    var poolIndex = 0;
    var poolTimer = null;
    var poolEls = {
      command: poolRotator.querySelector("[data-pool-command]"),
      title: poolRotator.querySelector("[data-pool-title]"),
      funds: poolRotator.querySelector("[data-pool-funds]"),
      power: poolRotator.querySelector("[data-pool-power]"),
      backers: poolRotator.querySelector("[data-pool-backers]"),
      fundsBar: poolRotator.querySelector("[data-pool-funds-bar]"),
      powerBar: poolRotator.querySelector("[data-pool-power-bar]"),
      feed: poolRotator.querySelectorAll("[data-pool-feed]"),
      feedIcons: poolRotator.querySelectorAll("[data-pool-feed-icon]")
    };

    function applyHeroPool(pool) {
      if (poolEls.command) poolEls.command.textContent = pool.command;
      if (poolEls.title) poolEls.title.textContent = pool.title;
      if (poolEls.funds) poolEls.funds.textContent = pool.funds + "%";
      if (poolEls.power) poolEls.power.textContent = pool.power + "%";
      if (poolEls.backers) poolEls.backers.textContent = pool.backers;
      if (poolEls.fundsBar) poolEls.fundsBar.style.width = pool.funds + "%";
      if (poolEls.powerBar) poolEls.powerBar.style.width = pool.power + "%";

      pool.feed.forEach(function (item, index) {
        if (poolEls.feed[index]) poolEls.feed[index].textContent = item.text;
        if (poolEls.feedIcons[index]) poolEls.feedIcons[index].className = "fa-solid " + item.icon;
      });
    }

    function showHeroPool(index, animate) {
      var pool = heroPools[index % heroPools.length];
      if (!animate || reduce) {
        applyHeroPool(pool);
        return;
      }

      poolRotator.classList.add("is-content-changing");
      window.setTimeout(function () {
        applyHeroPool(pool);
        poolRotator.classList.remove("is-content-changing");
      }, 210);
    }

    function startHeroPools() {
      if (reduce || poolTimer) return;
      poolTimer = window.setInterval(function () {
        poolIndex = (poolIndex + 1) % heroPools.length;
        showHeroPool(poolIndex, true);
      }, 5200);
    }

    function stopHeroPools() {
      if (!poolTimer) return;
      window.clearInterval(poolTimer);
      poolTimer = null;
    }

    showHeroPool(poolIndex, false);
    startHeroPools();
    poolRotator.addEventListener("focusin", stopHeroPools);
    poolRotator.addEventListener("focusout", startHeroPools);
  }

  var engine = {
    funds: {
      label: "Funds",
      score: "62%",
      copy: "Direct pledges give a Pool its financial base, with transparent progress and simple fees.",
      meterLabel: "Funding progress",
      funds: 62,
      power: 82
    },
    skills: {
      label: "Skills",
      score: "34 offers",
      copy: "People can pledge concrete expertise so a Pool can move forward even before every cost is covered.",
      meterLabel: "Skill coverage",
      funds: 46,
      power: 88
    },
    time: {
      label: "Time",
      score: "118 hours",
      copy: "Volunteer time becomes a visible part of the Pool instead of disappearing into scattered messages.",
      meterLabel: "Volunteer hours",
      funds: 39,
      power: 91
    },
    voice: {
      label: "Voice",
      score: "2.4k signals",
      copy: "Signatures, shares and public support show demand before, during and after the funding push.",
      meterLabel: "Community signal",
      funds: 54,
      power: 96
    }
  };

  function updateEngine(key) {
    var data = engine[key];
    if (!data) return;
    document.querySelectorAll(".engine-tab").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-engine") === key);
    });

    var label = document.querySelector("[data-engine-label]");
    var score = document.querySelector("[data-engine-score]");
    var copy = document.querySelector("[data-engine-copy]");
    var meterLabel = document.querySelector("[data-engine-meter-label]");
    var bars = document.querySelectorAll(".engine-card .track b");
    if (label) label.textContent = data.label;
    if (score) score.textContent = data.score;
    if (copy) copy.textContent = data.copy;
    if (meterLabel) meterLabel.textContent = data.meterLabel;
    if (bars[0]) { bars[0].setAttribute("data-w", data.funds); bars[0].style.width = data.funds + "%"; }
    if (bars[1]) { bars[1].setAttribute("data-w", data.power); bars[1].style.width = data.power + "%"; }
  }

  document.querySelectorAll(".engine-tab").forEach(function (button) {
    button.addEventListener("click", function () {
      updateEngine(button.getAttribute("data-engine"));
    });
  });

  var tour = {
    discover: {
      kicker: "01 / Discover",
      title: "Find Pools worth joining.",
      copy: "Supporters browse local and global Pools, see what each campaign needs and understand the story before they commit.",
      metricOne: "Nearby impact",
      metricTwo: "Explore feed",
      image: "assets/product/still-explore.webp",
      alt: "Poola Explore screen showing top Pools and recommended Pools"
    },
    contribute: {
      kicker: "02 / Contribute",
      title: "Help in the way you can.",
      copy: "A supporter can fund, volunteer, offer a skill, share a resource, sign, attend or amplify from the same Pool.",
      metricOne: "Funds + Power",
      metricTwo: "Contribution sheet",
      image: "assets/product/still-explore.webp",
      alt: "Poola Explore screen showing contribution options"
    },
    follow: {
      kicker: "03 / Follow",
      title: "See momentum after the pledge.",
      copy: "Saved Pools, updates and progress signals keep supporters connected to what happens next.",
      metricOne: "Live updates",
      metricTwo: "Saved Pools",
      image: "assets/product/still-updates.webp",
      alt: "Poola Updates screen showing saved Pools and campaign updates"
    },
    manage: {
      kicker: "04 / Manage",
      title: "Run the Pool with clarity.",
      copy: "Pool Starters track funds, People Power and missing needs so their next update asks for the right action.",
      metricOne: "Creator view",
      metricTwo: "Dashboard",
      image: "assets/product/still-dashboard.webp",
      alt: "Poola Dashboard screen showing progress and campaign analytics"
    }
  };

  function updateTour(key) {
    var data = tour[key];
    if (!data) return;
    document.querySelectorAll(".tour-step").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-tour") === key);
    });

    var kicker = document.querySelector("[data-tour-kicker]");
    var title = document.querySelector("[data-tour-title]");
    var copy = document.querySelector("[data-tour-copy]");
    var metricOne = document.querySelector("[data-tour-metric-one]");
    var metricTwo = document.querySelector("[data-tour-metric-two]");
    var image = document.querySelector("[data-tour-image]");
    if (kicker) kicker.textContent = data.kicker;
    if (title) title.textContent = data.title;
    if (copy) copy.textContent = data.copy;
    if (metricOne) metricOne.textContent = data.metricOne;
    if (metricTwo) metricTwo.textContent = data.metricTwo;
    if (image) {
      image.src = data.image;
      image.alt = data.alt;
    }
  }

  document.querySelectorAll(".tour-step").forEach(function (button) {
    button.addEventListener("click", function () {
      updateTour(button.getAttribute("data-tour"));
    });
  });

  if (fine && !reduce) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (event) {
        var rect = el.getBoundingClientRect();
        var x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        var y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        el.style.transform = "translate(" + (x * 12) + "px," + (y * 12) + "px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });

    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      el.addEventListener("mousemove", function (event) {
        var rect = el.getBoundingClientRect();
        var x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        var y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        el.style.setProperty("--rx", (-y * 4).toFixed(2) + "deg");
        el.style.setProperty("--ry", (x * 4).toFixed(2) + "deg");
      });
      el.addEventListener("mouseleave", function () {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });

  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest ? event.target.closest("[data-download]") : null;
    if (!button) return;

    document.querySelectorAll("[data-download]").forEach(function (item) {
      item.classList.toggle("is-selected", item === button);
    });
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest ? event.target.closest("[data-share-platform]") : null;
    if (!button) return;

    var platform = button.getAttribute("data-share-platform") || "Poola";
    var shareUrl = window.location.origin + window.location.pathname + "#downloads";
    var shareData = {
      title: "Poola for " + platform,
      text: "Poola is money plus action for every crowd.",
      url: shareUrl
    };

    function markShared() {
      document.querySelectorAll("[data-share-platform]").forEach(function (item) {
        item.classList.toggle("is-selected", item === button);
      });
    }

    if (navigator.share) {
      navigator.share(shareData).then(function () {
        markShared();
      }).catch(function () {
        markShared();
      });
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(function () {
        markShared();
      }).catch(function () {
        markShared();
      });
      return;
    }

    markShared();
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest ? event.target.closest("[data-shop-action]") : null;
    if (!button) return;

    var item = button.getAttribute("data-shop-action") || "This drop";
    var status = document.querySelector("[data-shop-status]");
    if (status) {
      status.textContent = item + " is part of the free maker library preview. Files will appear here when the drop is ready.";
    }
    document.querySelectorAll("[data-shop-action]").forEach(function (control) {
      control.classList.toggle("is-selected", control === button);
    });
  });

  var featureData = {
    commitments: {
      stage: "Launch candidate",
      title: "Commitment management",
      copy: "Track every promise after someone offers money, time, skills, resources or voice, so a Pool Starter can follow up without losing people in scattered messages.",
      owner: "Pool Starters",
      signal: "Fewer dropped offers"
    },
    crm: {
      stage: "Launch candidate",
      title: "Pool Starter CRM",
      copy: "Give Pool Starters a supporter workspace with segments, next actions, contribution history, trust notes and follow-up states.",
      owner: "Pool Starters",
      signal: "Higher completion"
    },
    updates: {
      stage: "Prototype",
      title: "Action-driven updates",
      copy: "Turn every progress post into a useful ask: fund this gap, fill these shifts, bring this resource, sign this target or attend this moment.",
      owner: "Pool Starters",
      signal: "More repeat action"
    },
    schedule: {
      stage: "Launch candidate",
      title: "Volunteer scheduling",
      copy: "Move volunteer offers into roles, shifts, confirmations and proof so People Power becomes operational, not just emotional.",
      owner: "Pool Starters",
      signal: "Confirmed hours"
    },
    targets: {
      stage: "Planned",
      title: "Decision-maker targets",
      copy: "Show who a civic or petition Pool is trying to reach, what signal is needed and how signatures or comments should be delivered.",
      owner: "Civic Pools",
      signal: "Delivered signal"
    },
    recurring: {
      stage: "Planned",
      title: "Recurring support",
      copy: "Let ongoing causes, creators and community efforts retain Poolers who want to keep helping after the first campaign.",
      owner: "Ongoing Pools",
      signal: "Repeat Poolers"
    },
    fees: {
      stage: "Prototype",
      title: "Fee clarity",
      copy: "Show the fee formula before contribution so Poolers and Pool Starters understand the money path: 2.9% + 6 SEK.",
      owner: "Poolers",
      signal: "Checkout trust"
    },
    late: {
      stage: "Planned",
      title: "Late contributions",
      copy: "Let successful or urgent Pools continue accepting help when the work remains active after the first deadline or target.",
      owner: "Active Pools",
      signal: "Post-target help"
    },
    widgets: {
      stage: "Partner pilot",
      title: "Widgets and embeds",
      copy: "Give publishers, partners and local organisations an embedded Pool surface that turns attention into contribution.",
      owner: "Partners",
      signal: "Partner referrals"
    },
    status: {
      stage: "Prototype",
      title: "Trust statuses",
      copy: "Make risk and progress readable with statuses like verified, funds pending, updates overdue, under review and closed with proof.",
      owner: "Poolers",
      signal: "Clearer decisions"
    }
  };

  function updateFeaturePanel(key) {
    var data = featureData[key];
    if (!data) return;

    document.querySelectorAll("[data-feature-key]").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-feature-key") === key);
    });

    var stage = document.querySelector("[data-feature-stage]");
    var title = document.querySelector("[data-feature-title]");
    var copy = document.querySelector("[data-feature-copy]");
    var owner = document.querySelector("[data-feature-owner]");
    var signal = document.querySelector("[data-feature-signal]");
    if (stage) stage.textContent = data.stage;
    if (title) title.textContent = data.title;
    if (copy) copy.textContent = data.copy;
    if (owner) owner.textContent = data.owner;
    if (signal) signal.textContent = data.signal;
  }

  document.querySelectorAll("[data-feature-key]").forEach(function (button) {
    button.addEventListener("click", function () {
      updateFeaturePanel(button.getAttribute("data-feature-key"));
    });
  });

  var exploreModes = {
    poolers: {
      title: "Explore as a",
      copy: "Find Pools worth joining, read the trust state, contribute in the way you can and keep seeing what happened next.",
      badge: "Join path",
      panelTitle: "From discovery to visible impact.",
      panelCopy: "Poolers need a simple way to decide whether a Pool is real, useful and worth helping. Poola keeps the reason, request, progress and proof in one place.",
      cta: "Security and trust",
      href: "trust-status.html",
      featureTitle: "Tools for people deciding whether to help.",
      featureCopy: "Poolers need clarity before contributing and a visible trail after they do.",
      exampleTitle: "Pools a Pooler can understand quickly.",
      exampleCopy: "Examples show how different causes ask for funds, skills, time, resources and voice without hiding the trust state.",
      finalTitle: "Find a Pool, choose your help, follow the proof.",
      finalCopy: "Poola is designed so the person helping does not have to guess what happened after they contributed.",
      finalPrimary: "Explore trust",
      finalPrimaryHref: "trust-status.html",
      finalSecondary: "Start a Pool",
      finalSecondaryHref: "pool-starters.html",
      steps: [
        { icon: "fa-magnifying-glass", kicker: "01", title: "Discover", copy: "Find active Pools by cause, place, creator, urgency or trust state." },
        { icon: "fa-shield-heart", kicker: "02", title: "Trust", copy: "Read what is verified, pending, funded, promised and still open." },
        { icon: "fa-hand-holding-heart", kicker: "03", title: "Contribute", copy: "Back with money, skills, resources, time, voice or useful connections." },
        { icon: "fa-bell", kicker: "04", title: "Follow", copy: "Stay close to updates, blockers, milestones and community asks." },
        { icon: "fa-circle-check", kicker: "05", title: "Verify", copy: "Check proof, completion notes and the next visible trust state." }
      ],
      cards: [
        { icon: "fa-compass", tag: "Discover", title: "Better browsing", copy: "Filter by topic, location, contribution type, urgency and trust status." },
        { icon: "fa-scale-balanced", tag: "Decide", title: "Clearer commitments", copy: "Compare what is needed, why it matters and who is accountable." },
        { icon: "fa-hand-holding-heart", tag: "Contribute", title: "More ways to help", copy: "Support with funds, skills, materials, volunteers, spaces or audience." },
        { icon: "fa-eye", tag: "Follow", title: "Visible follow-through", copy: "Watch updates, proof, changes and outcomes after the first contribution." }
      ],
      examples: [
        { tag: "Local action", title: "Neighbourhood playground repair", copy: "See the budget, volunteer roles, contractor quotes and proof milestones before helping.", pills: ["Funds", "Time", "Proof"] },
        { tag: "Creator", title: "Community film launch", copy: "Follow what the creator needs, who is joining and how backers will see progress.", pills: ["Skills", "Audience", "Updates"] },
        { tag: "Social good", title: "Community kitchen relaunch", copy: "Check partner roles, open shifts, delivery notes and the state of each promised resource.", pills: ["Resources", "Shifts", "Trust"] },
        { tag: "Start up", title: "Open pilot validation", copy: "Back a pilot with feedback, introductions, testing time or early support.", pills: ["Validate", "Feedback", "Follow"] }
      ]
    },
    starters: {
      title: "Explore as a",
      copy: "Start with intent, shape the Pool, then run the commitments, updates, people and proof that make support trustworthy.",
      badge: "Launch path",
      panelTitle: "From intent to operating loop.",
      panelCopy: "Pool Starters need a guided way to turn a rough idea into a visible ask, then keep contributions, people and proof organised as the Pool moves.",
      cta: "Pool Starter tools",
      href: "pool-starters.html",
      featureTitle: "Tools for people starting and running a Pool.",
      featureCopy: "Pool Starters need structure before launch and a clean operating loop once people begin helping.",
      exampleTitle: "Pools a Starter can build from intent.",
      exampleCopy: "Each example starts as a clear need, then becomes a Pool with contribution types, roles, updates and proof.",
      finalTitle: "Turn intent into a Pool people can trust.",
      finalCopy: "Poola helps Starters move from scattered conversations into one visible place for funds, people power, updates and outcomes.",
      finalPrimary: "Open Poola",
      finalPrimaryHref: "index.html#downloads",
      finalSecondary: "Contributor pathway",
      finalSecondaryHref: "contributors.html",
      steps: [
        { icon: "fa-comment-dots", kicker: "01", title: "Intent", copy: "Describe what should happen, who it helps and what kind of support is needed." },
        { icon: "fa-wand-magic-sparkles", kicker: "02", title: "Draft", copy: "Shape the story, goals, contribution asks and trust checklist for review." },
        { icon: "fa-bullhorn", kicker: "03", title: "Publish", copy: "Launch one page where funds, skills, time, resources and voice can gather." },
        { icon: "fa-list-check", kicker: "04", title: "Run", copy: "Track offers, follow-ups, schedules and updates without losing people in messages." },
        { icon: "fa-shield-heart", kicker: "05", title: "Prove", copy: "Show what changed, what is pending and what still needs help." }
      ],
      cards: [
        { icon: "fa-address-book", tag: "Launch candidate", title: "Starter CRM", copy: "See every Pooler by contribution type, next action, status and follow-up need." },
        { icon: "fa-clipboard-check", tag: "Launch candidate", title: "Commitment ledger", copy: "Turn promises into accepted, scheduled, completed, released or reviewed work." },
        { icon: "fa-pen-to-square", tag: "Prototype", title: "Action updates", copy: "Publish updates that end with the next useful ask, not vague momentum posts." },
        { icon: "fa-calendar-days", tag: "Launch candidate", title: "Scheduling", copy: "Move time and skill offers into roles, shifts, confirmations and completion proof." }
      ],
      examples: [
        { tag: "Local action", title: "Emergency street repair", copy: "Frame the cost, volunteer shifts, council contact and proof points in one Pool.", pills: ["Budget", "Shifts", "Proof"] },
        { tag: "Creator", title: "Creator launch fund", copy: "Ask for backing, audience reach, production help and update commitments without scattering the campaign.", pills: ["Audience", "Skills", "Updates"] },
        { tag: "Social good", title: "Community supplies drive", copy: "Coordinate partners, collection points, delivery milestones and proof of what reached people.", pills: ["Partners", "Supplies", "Reports"] },
        { tag: "Start up", title: "Pilot validation Pool", copy: "Recruit testers, mentors, first supporters and feedback loops before building too far.", pills: ["Validate", "Recruit", "Learn"] }
      ]
    }
  };

  function setText(selector, text, root) {
    if (typeof text !== "string") return;
    root.querySelectorAll(selector).forEach(function (el) {
      el.textContent = text;
    });
  }

  function setLink(selector, label, href, root) {
    root.querySelectorAll(selector).forEach(function (el) {
      if (typeof label === "string") el.textContent = label;
      if (typeof href === "string") el.setAttribute("href", href);
    });
  }

  function setIcon(selector, icon, root) {
    if (typeof icon !== "string") return;
    root.querySelectorAll(selector).forEach(function (el) {
      el.className = "fa-solid " + icon;
    });
  }

  function setPills(selector, pills, root) {
    root.querySelectorAll(selector).forEach(function (container) {
      container.innerHTML = "";
      (pills || []).forEach(function (pill) {
        var item = document.createElement("b");
        item.textContent = pill;
        container.appendChild(item);
      });
    });
  }

  function getExploreModeFromUrl() {
    var role = "";
    try {
      role = new URL(window.location.href).searchParams.get("role") || "";
    } catch (error) {
      role = "";
    }

    role = role.toLowerCase().replace(/\s+/g, "-");
    if (role === "pooler" || role === "poolers") return "poolers";
    if (role === "starter" || role === "starters" || role === "pool-starter" || role === "pool-starters") return "starters";
    return "";
  }

  function writeExploreModeToUrl(key) {
    if (!window.history || !window.history.pushState) return;

    try {
      var url = new URL(window.location.href);
      var role = key === "starters" ? "starter" : "pooler";
      if (url.searchParams.get("role") === role) return;
      url.searchParams.set("role", role);
      window.history.pushState({ exploreRole: key }, "", url);
    } catch (error) {
      return;
    }
  }

  function clearExploreMode(root) {
    if (!root) return;
    root.removeAttribute("data-explore-mode");
    root.querySelectorAll("[data-explore-mode-button]").forEach(function (button) {
      button.classList.remove("is-active");
      button.setAttribute("aria-checked", "false");
      button.removeAttribute("aria-selected");
      button.setAttribute("tabindex", "0");
    });
  }

  function updateExploreMode(root, key) {
    var data = exploreModes[key];
    if (!root || !data) return;

    root.setAttribute("data-explore-mode", key);
    root.querySelectorAll("[data-explore-mode-button]").forEach(function (button) {
      var active = button.getAttribute("data-explore-mode-button") === key;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-checked", active ? "true" : "false");
      button.removeAttribute("aria-selected");
      button.setAttribute("tabindex", active ? "0" : "-1");
    });

    setText("[data-explore-title]", data.title, root);
    setText("[data-explore-copy]", data.copy, root);
    setText("[data-explore-badge]", data.badge, root);
    setText("[data-explore-panel-title]", data.panelTitle, root);
    setText("[data-explore-panel-copy]", data.panelCopy, root);
    setText("[data-explore-feature-title]", data.featureTitle, root);
    setText("[data-explore-feature-copy]", data.featureCopy, root);
    setText("[data-explore-example-title]", data.exampleTitle, root);
    setText("[data-explore-example-copy]", data.exampleCopy, root);
    setText("[data-explore-final-title]", data.finalTitle, root);
    setText("[data-explore-final-copy]", data.finalCopy, root);
    setLink("[data-explore-cta]", data.cta, data.href, root);
    setLink("[data-explore-final-primary]", data.finalPrimary, data.finalPrimaryHref, root);
    setLink("[data-explore-final-secondary]", data.finalSecondary, data.finalSecondaryHref, root);

    data.steps.forEach(function (step, index) {
      setIcon('[data-explore-map-icon="' + index + '"], [data-explore-step-icon="' + index + '"]', step.icon, root);
      setText('[data-explore-map-title="' + index + '"]', step.title, root);
      setText('[data-explore-map-copy="' + index + '"]', step.copy, root);
      setText('[data-explore-step-kicker="' + index + '"]', step.kicker, root);
      setText('[data-explore-step-title="' + index + '"]', step.title, root);
      setText('[data-explore-step-copy="' + index + '"]', step.copy, root);
    });

    data.cards.forEach(function (card, index) {
      setIcon('[data-explore-card-icon="' + index + '"]', card.icon, root);
      setText('[data-explore-card-tag="' + index + '"]', card.tag, root);
      setText('[data-explore-card-title="' + index + '"]', card.title, root);
      setText('[data-explore-card-copy="' + index + '"]', card.copy, root);
    });

    data.examples.forEach(function (example, index) {
      setText('[data-explore-example-tag="' + index + '"]', example.tag, root);
      setText('[data-explore-example-title-item="' + index + '"]', example.title, root);
      setText('[data-explore-example-copy-item="' + index + '"]', example.copy, root);
      setPills('[data-explore-example-pills="' + index + '"]', example.pills, root);
    });
  }

  function commitExploreMode(root, nextMode, shouldWriteUrl) {
    updateExploreMode(root, nextMode);
    if (shouldWriteUrl) writeExploreModeToUrl(nextMode);
  }

  function transitionExploreMode(root, nextMode, shouldWriteUrl) {
    var hasMode = !!exploreModes[nextMode];
    var commit = function () {
      if (hasMode) {
        commitExploreMode(root, nextMode, shouldWriteUrl);
        return;
      }
      clearExploreMode(root);
    };

    if (!reduce && document.startViewTransition) {
      var transition = document.startViewTransition(commit);
      if (transition.ready) transition.ready.catch(function () {});
      if (transition.finished) transition.finished.catch(function () {});
      if (transition.updateCallbackDone) transition.updateCallbackDone.catch(function () {});
      return;
    }

    if (!reduce) {
      root.classList.add("is-changing");
      commit();
      window.setTimeout(function () {
        root.classList.remove("is-changing");
      }, 260);
      return;
    }

    commit();
  }

  document.querySelectorAll("[data-explore-switch]").forEach(function (root) {
    var initialMode = getExploreModeFromUrl() || root.getAttribute("data-explore-mode");
    if (exploreModes[initialMode]) {
      updateExploreMode(root, initialMode);
    } else {
      clearExploreMode(root);
    }

    var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-explore-mode-button]"));
    root.setAttribute("data-explore-ready", "true");
    root.setAttribute("data-explore-button-count", String(buttons.length));

    function activateExploreButton(button) {
      var nextMode = button && button.getAttribute("data-explore-mode-button") || "";
      if (!exploreModes[nextMode]) return;
      if (nextMode === root.getAttribute("data-explore-mode")) return;
      transitionExploreMode(root, nextMode, true);
    }

    function handleExplorePointer(event) {
      var button = event.target.closest ? event.target.closest("[data-explore-mode-button]") : null;
      if (!button || !root.contains(button)) return;
      activateExploreButton(button);
    }

    root.addEventListener("click", handleExplorePointer);
    root.addEventListener("pointerup", handleExplorePointer);

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        activateExploreButton(button);
      });

      button.addEventListener("keydown", function (event) {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          activateExploreButton(button);
          return;
        }

        var currentIndex = buttons.indexOf(button);
        var nextIndex = currentIndex;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % buttons.length;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = buttons.length - 1;
        if (nextIndex === currentIndex) return;

        event.preventDefault();
        buttons[nextIndex].focus();
        activateExploreButton(buttons[nextIndex]);
      });
    });

    window.addEventListener("popstate", function () {
      var urlMode = getExploreModeFromUrl();
      if (exploreModes[urlMode]) {
        transitionExploreMode(root, urlMode, false);
      } else {
        transitionExploreMode(root, "", false);
      }
    });
  });

  var feeCurrencyData = {
    SEK: { code: "SEK", fixed: 6, suffix: " SEK", min: 5, max: 5000, step: 5, defaultValue: 100 },
    GBP: { code: "GBP", fixed: 0.5, prefix: "£", min: 5, max: 1000, step: 5, defaultValue: 50 },
    USD: { code: "USD", fixed: 0.6, prefix: "$", min: 5, max: 1000, step: 5, defaultValue: 50 },
    EUR: { code: "EUR", fixed: 0.55, prefix: "€", min: 5, max: 1000, step: 5, defaultValue: 50 }
  };

  function getFeeCurrency(code) {
    return feeCurrencyData[code] || feeCurrencyData.SEK;
  }

  function formatFeeMoney(value, currency, decimals) {
    var digits = decimals == null ? 2 : decimals;
    var amount = value.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
    return currency.prefix ? currency.prefix + amount : amount + currency.suffix;
  }

  function roundFeeValue(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  document.querySelectorAll("[data-fee-calculator]").forEach(function (calculator) {
    var amount = calculator.querySelector("[data-fee-amount]");
    var currencySelect = calculator.querySelector("[data-fee-currency]");
    var currencyLabel = calculator.querySelector("[data-fee-currency-label]");
    var gross = calculator.querySelector("[data-fee-gross]");
    var total = calculator.querySelector("[data-fee-total]");
    var net = calculator.querySelector("[data-fee-net]");
    var percent = calculator.querySelector("[data-fee-percent]");
    var formula = calculator.querySelector("[data-fee-formula]");
    var minimum = calculator.querySelector("[data-fee-minimum]");
    if (!amount) return;

    function currentCurrency() {
      return getFeeCurrency(currencySelect ? currencySelect.value : "SEK");
    }

    function syncCurrencyControls(resetAmount) {
      var currency = currentCurrency();
      if (currencySelect) {
        amount.min = currency.min;
        amount.max = currency.max;
        amount.step = currency.step;
        if (resetAmount) amount.value = currency.defaultValue;
      }
      if (currencyLabel) currencyLabel.textContent = "Contribution amount in " + currency.code;
      if (formula) formula.textContent = "2.9% + " + formatFeeMoney(currency.fixed, currency, currency.code === "SEK" ? 0 : 2);
      if (minimum) minimum.textContent = formatFeeMoney(currency.min, currency, 0);
    }

    function updateFee() {
      var currency = currentCurrency();
      var value = Number(amount.value || 0);
      var fee = roundFeeValue((value * 0.029) + currency.fixed);
      var afterFee = Math.max(0, roundFeeValue(value - fee));
      var netPercent = value > 0 ? Math.max(0, (afterFee / value) * 100) : 0;
      if (gross) gross.textContent = formatFeeMoney(Math.round(value), currency, 0);
      if (total) total.textContent = formatFeeMoney(fee, currency);
      if (net) net.textContent = formatFeeMoney(afterFee, currency);
      if (percent) percent.textContent = netPercent.toFixed(1) + "%";
    }

    if (currencySelect) {
      currencySelect.addEventListener("change", function () {
        syncCurrencyControls(true);
        updateFee();
      });
    }

    amount.addEventListener("input", updateFee);
    syncCurrencyControls(false);
    updateFee();
  });

  var statusData = {
    verified: {
      label: "Verified",
      title: "Profile and Pool basics checked.",
      copy: "Poola has signals that the Pool Starter identity and key Pool details have passed the planned verification path.",
      action: "Good for normal contribution with usual caution."
    },
    funds: {
      label: "Funds pending",
      title: "Money movement is still being confirmed.",
      copy: "A contribution has been started or processed, but payout, provider handling or reconciliation still needs to finish.",
      action: "Wait for confirmation before treating the funds as available."
    },
    overdue: {
      label: "Updates overdue",
      title: "The Pool needs a progress update.",
      copy: "A milestone, timing promise or reasonable update window has passed without enough new information.",
      action: "Pool Starters should post a clear update or revise the timeline."
    },
    review: {
      label: "Under review",
      title: "A trust or policy question is being checked.",
      copy: "A report, anomaly, dispute or safety concern needs review before more contribution is encouraged.",
      action: "Show the status plainly and keep reporting paths visible."
    },
    fulfilled: {
      label: "Fulfilled",
      title: "The main outcome has been marked complete.",
      copy: "The Pool Starter has indicated that the core goal was delivered and should attach enough context for Poolers to understand the result.",
      action: "Ask for proof, final details and any remaining People Power needs."
    },
    refunded: {
      label: "Refunded",
      title: "Money was returned or reversed.",
      copy: "A contribution or payout path has been refunded, reversed or handled through payment-provider rules.",
      action: "Explain what changed and where Poolers can get support."
    },
    closed: {
      label: "Closed with proof",
      title: "The Pool has ended with a final trail.",
      copy: "The Pool is no longer actively collecting contributions and has a final update, outcome summary or proof trail.",
      action: "Keep the record readable for trust, learning and future Poolers."
    }
  };

  function updateStatusPanel(key) {
    var data = statusData[key];
    if (!data) return;

    document.querySelectorAll("[data-status-key]").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-status-key") === key);
    });

    var label = document.querySelector("[data-status-label]");
    var title = document.querySelector("[data-status-title]");
    var copy = document.querySelector("[data-status-copy]");
    var action = document.querySelector("[data-status-action]");
    if (label) label.textContent = data.label;
    if (title) title.textContent = data.title;
    if (copy) copy.textContent = data.copy;
    if (action) action.textContent = data.action;
  }

  document.querySelectorAll("[data-status-key]").forEach(function (button) {
    button.addEventListener("click", function () {
      updateStatusPanel(button.getAttribute("data-status-key"));
    });
  });

  var securityData = {
    accounts: {
      label: "Accounts",
      title: "Access should be narrow, intentional and recoverable.",
      copy: "Poola should protect account sessions, role changes and sensitive actions with clear ownership and support paths.",
      action: "Best next step: keep profile, account and support records easy to verify."
    },
    payments: {
      label: "Payments",
      title: "Money movement needs provider records and plain status.",
      copy: "Contribution, payout, refund and dispute states should be handled through trusted payment providers and reflected clearly in Poola support records.",
      action: "Best next step: show payment states without implying Poola guarantees every outcome."
    },
    integrity: {
      label: "Pool integrity",
      title: "Campaign trust depends on claims, context and proof.",
      copy: "Pool review should consider who is asking, what they promise, which signals look risky and whether Poolers can see enough context before joining.",
      action: "Best next step: connect reports, reviews and trust statuses in the Pool interface."
    },
    infrastructure: {
      label: "Infrastructure",
      title: "Operational systems should stay limited and auditable.",
      copy: "Sensitive tools, support workflows and moderation actions should use least-privilege access, monitored changes and recoverable records.",
      action: "Best next step: keep internal access small, logged and reviewed as Poola grows."
    }
  };

  function updateSecurityPanel(key) {
    var data = securityData[key];
    if (!data) return;

    document.querySelectorAll("[data-security-key]").forEach(function (button) {
      var active = button.getAttribute("data-security-key") === key;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    var label = document.querySelector("[data-security-label]");
    var title = document.querySelector("[data-security-title]");
    var copy = document.querySelector("[data-security-copy]");
    var action = document.querySelector("[data-security-action]");
    if (label) label.textContent = data.label;
    if (title) title.textContent = data.title;
    if (copy) copy.textContent = data.copy;
    if (action) action.textContent = data.action;
  }

  document.querySelectorAll("[data-security-key]").forEach(function (button) {
    if (button.classList.contains("is-active")) {
      button.setAttribute("aria-selected", "true");
    } else {
      button.setAttribute("aria-selected", "false");
    }

    button.addEventListener("click", function () {
      updateSecurityPanel(button.getAttribute("data-security-key"));
    });
  });

  document.querySelectorAll("[data-pool-proof-scroll]").forEach(function (section) {
    var frame = section.querySelector(".pool-page-frame");
    var image = section.querySelector("[data-pool-proof-image]");
    var steps = Array.prototype.slice.call(section.querySelectorAll("[data-pool-proof-step]"));
    if (!frame || !image || !steps.length) return;

    var activeStep = steps[0];

    function screenTravel() {
      return Math.max(0, image.offsetHeight - frame.clientHeight);
    }

    function setActiveStep(step) {
      if (!step) return;
      activeStep = step;
      steps.forEach(function (item) {
        item.classList.toggle("is-active", item === step);
      });

      var progressValue = Number(step.getAttribute("data-screen-progress") || 0);
      var y = screenTravel() * Math.max(0, Math.min(1, progressValue)) * -1;
      frame.style.setProperty("--pool-screen-y", y.toFixed(1) + "px");
      image.style.transform = "translate3d(0, " + y.toFixed(1) + "px, 0)";
    }

    function closestStepToCenter() {
      var center = window.innerHeight * 0.5;
      var closest = activeStep;
      var closestDistance = Infinity;

      steps.forEach(function (step) {
        var rect = step.getBoundingClientRect();
        var stepCenter = rect.top + (rect.height / 2);
        var distance = Math.abs(stepCenter - center);
        if (distance < closestDistance) {
          closest = step;
          closestDistance = distance;
        }
      });

      return closest;
    }

    function updateFromScroll() {
      setActiveStep(closestStepToCenter());
    }

    setActiveStep(activeStep);

    if ("IntersectionObserver" in window) {
      var proofObserver = new IntersectionObserver(function (entries) {
        var visible = entries.some(function (entry) { return entry.isIntersecting; });
        if (visible) updateFromScroll();
      }, {
        threshold: [0.25, 0.5, 0.72],
        rootMargin: "-28% 0px -28% 0px"
      });

      steps.forEach(function (step) { proofObserver.observe(step); });
    }

    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", function () {
      setActiveStep(activeStep);
    }, { passive: true });

    if (!image.complete) {
      image.addEventListener("load", function () {
        setActiveStep(activeStep);
      });
    }
  });

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
