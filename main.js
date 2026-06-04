/* =========================================================================
   Poola — site behaviour
   - mobile nav toggle
   - waitlist form submit (configurable endpoint + graceful success state)
   - scroll reveal
   - footer year
   ========================================================================= */
(function () {
  "use strict";

  /* ---- CONFIG -----------------------------------------------------------
     Waitlist endpoint. Set this to your Formspree form URL, e.g.
       "https://formspree.io/f/xxxxxxxx"
     Until it's set (left as REPLACE_ME), the form still works visually:
     it validates the email and shows the success state without sending.
     (Alternatively, wire it to Firestore — ask Claude to swap this out.)
  ----------------------------------------------------------------------- */
  var WAITLIST_ENDPOINT = "https://formspree.io/f/REPLACE_ME";

  /* ---- mobile nav -------------------------------------------------------*/
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close menu after tapping a link (mobile)
    nav.querySelectorAll(".nav__links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- waitlist forms ---------------------------------------------------*/
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  document.querySelectorAll("form[data-waitlist]").forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    // shared message element lives next to the form
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
        form.classList.add("is-done");
        form.innerHTML =
          '<span class="pill pill--teal"><i class="fa-solid fa-check"></i> You\'re on the list 🌊</span>';
        if (msg) { msg.textContent = "Thanks — we'll be in touch when Poola opens."; }
      }

      if (!configured) {
        // Endpoint not set yet: validate + confirm visually, don't send.
        success();
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = "Joining…"; }
      fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, source: location.pathname })
      })
        .then(function (r) {
          if (r.ok) { success(); }
          else { throw new Error("bad response"); }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = "Try again"; }
          if (msg) { msg.textContent = "Something went wrong — please try again."; msg.classList.add("is-error"); }
        });
    });
  });

  /* ---- scroll reveal ----------------------------------------------------*/
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- footer year ------------------------------------------------------*/
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
