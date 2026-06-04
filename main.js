/* =========================================================================
   Poola — premium motion + behaviour
   nav (toggle + scroll states), scroll progress, staggered reveals,
   count-up numerals, magnetic buttons, hero/tile parallax-tilt,
   dual-meter fill, waitlist form. All gated by reduced-motion / pointer.
   ========================================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine   = window.matchMedia("(pointer: fine)").matches;

  /* ---- CONFIG: waitlist endpoint -----------------------------------------
     Set to your Formspree URL, e.g. "https://formspree.io/f/xxxxxxxx".
     Until it's set (REPLACE_ME), the form validates + shows the success
     state without sending. (Ask Claude to wire Firestore instead if preferred.)
  ----------------------------------------------------------------------- */
  var WAITLIST_ENDPOINT = "https://formspree.io/f/REPLACE_ME";

  /* ---- nav: mobile toggle + scroll state --------------------------------*/
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav__links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- scroll progress + nav solidify -----------------------------------*/
  var progress = document.getElementById("progress");
  function onScroll() {
    var st = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle("scrolled", st > 20);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- staggered scroll reveal -----------------------------------------*/
  var revealEls = document.querySelectorAll("[data-reveal], .reveal");
  if ("IntersectionObserver" in window && revealEls.length && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        // stagger siblings sharing a [data-reveal-group] parent
        io.unobserve(el);
        el.classList.add("in");
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    // assign incremental delays to grouped children
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      group.querySelectorAll("[data-reveal]").forEach(function (child, i) {
        child.style.setProperty("--d", (i * 90) + "ms");
      });
    });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- count-up numerals -----------------------------------------------*/
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = (el.getAttribute("data-dec") || "0") | 0;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = prefix + target.toFixed(dec) + suffix; return; }
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = (target * eased).toFixed(dec);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toFixed(dec) + suffix;
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---- dual meter fill on view ------------------------------------------*/
  var meters = document.querySelectorAll(".meterbar");
  if ("IntersectionObserver" in window && meters.length) {
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.querySelectorAll(".track b").forEach(function (b) {
          b.style.width = (b.getAttribute("data-w") || "50") + "%";
        });
        mio.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    meters.forEach(function (el) { mio.observe(el); });
  }

  /* ---- magnetic buttons (desktop) ---------------------------------------*/
  if (fine && !reduce) {
    document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
      var strength = 18;
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.transform = "translate(" + x * strength + "px," + y * strength + "px)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }

  /* ---- hero phone + tile 3D tilt (desktop) ------------------------------*/
  if (fine && !reduce) {
    var phone = document.querySelector(".hero__phone img");
    var stage = document.querySelector(".hero__stage");
    if (phone && stage) {
      stage.addEventListener("mousemove", function (e) {
        var r = stage.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        phone.style.setProperty("--rx", (x * 7) + "deg");
        phone.style.setProperty("--ry", (-y * 7) + "deg");
      });
      stage.addEventListener("mouseleave", function () {
        phone.style.setProperty("--rx", "0deg");
        phone.style.setProperty("--ry", "0deg");
      });
    }
  }

  /* ---- waitlist forms ---------------------------------------------------*/
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  document.querySelectorAll("form[data-waitlist]").forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var msg = form.parentElement.querySelector("[data-waitmsg]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (input.value || "").trim();
      if (!isEmail(email)) {
        if (msg) { msg.textContent = "Please enter a valid email address."; msg.classList.add("is-error"); }
        input.focus();
        return;
      }
      if (msg) { msg.classList.remove("is-error"); msg.textContent = ""; }

      var configured = WAITLIST_ENDPOINT.indexOf("REPLACE_ME") === -1;
      function success() {
        form.innerHTML = '<span class="pill pill--teal"><i class="fa-solid fa-check"></i> You\'re on the list 🌊</span>';
        if (msg) msg.textContent = "Thanks — we'll be in touch when Poola opens.";
      }
      if (!configured) { success(); return; }

      if (btn) { btn.disabled = true; btn.textContent = "Joining…"; }
      fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, source: location.pathname })
      })
        .then(function (r) { if (r.ok) success(); else throw new Error("bad"); })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = "Try again"; }
          if (msg) { msg.textContent = "Something went wrong — please try again."; msg.classList.add("is-error"); }
        });
    });
  });

  /* ---- footer year ------------------------------------------------------*/
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
