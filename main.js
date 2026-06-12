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

    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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

    revealEls.forEach(function (el) { revealObserver.observe(el); });
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
      copy: "Pool starters track funds, People Power and missing needs so their next update asks for the right action.",
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

    var platform = button.getAttribute("data-download") || "this platform";
    var status = document.querySelector("[data-download-status]");
    if (status) {
      if (platform === "Web") {
        status.textContent = "Poola for Web is being prepared. The web app will open from here when public access is ready.";
      } else {
        status.textContent = platform + " downloads are being prepared. Store links and installers will appear here when builds are ready.";
      }
    }
    document.querySelectorAll("[data-download]").forEach(function (item) {
      item.classList.toggle("is-selected", item === button);
    });
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

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
