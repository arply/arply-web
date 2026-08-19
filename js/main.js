(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------------------------------------------
     Broadcast rings — ambient hero visual
     Rings expand and fade outward from a source dot, like
     Apple's own AirDrop / wireless-handoff ripple language.
  ------------------------------------------------------- */
  var canvas = document.getElementById("broadcast");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var cssWidth, cssHeight, dpr;
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4a54e1";

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = rect.width;
      cssHeight = rect.height;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    var RING_COUNT = 3;
    var DURATION = 3200; // ms per ring cycle

    function drawSourceAndRings(time) {
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      var cx = cssWidth / 2;
      var cy = cssHeight * 0.28;
      var maxRadius = Math.min(cssWidth, cssHeight * 2.6) * 0.42;

      for (var i = 0; i < RING_COUNT; i++) {
        var phase = ((time / DURATION) + i / RING_COUNT) % 1;
        var eased = 1 - Math.pow(1 - phase, 2); // ease-out
        var radius = eased * maxRadius;
        var opacity = (1 - phase) * 0.5;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // source dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();

      // minimal speaker glyph, bottom center
      var sw = 46, sh = 30;
      var sx = cx - sw / 2, sy = cssHeight * 0.74;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink-faint").trim() || "#8688a0";
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.4;
      roundRect(sx, sy, sw, sh, 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, sy + sh / 2, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    resize();

    if (reduceMotion) {
      drawSourceAndRings(DURATION * 0.4);
    } else {
      // Only animate while the hero is actually on screen and the tab is
      // visible — an infinite RAF loop otherwise burns CPU/battery forever.
      var raf = null;
      var running = false;

      function frame(t) {
        drawSourceAndRings(t);
        raf = requestAnimationFrame(frame);
      }
      function start() {
        if (!running) {
          running = true;
          raf = requestAnimationFrame(frame);
        }
      }
      function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      }

      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && document.visibilityState === "visible") start();
            else stop();
          });
        });
        io.observe(canvas);
      } else {
        start();
      }

      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") stop();
      });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        if (reduceMotion) drawSourceAndRings(DURATION * 0.4);
      }, 120);
    });
  }

  /* -------------------------------------------------------
     Waitlist forms
     No backend exists yet — this only validates the email
     and shows an inline confirmation. Wire this up to a
     real endpoint (Formspree, your own API, etc.) before
     going live.
  ------------------------------------------------------- */
  var forms = document.querySelectorAll(".waitlist-form");
  forms.forEach(function (form) {
    var input = form.querySelector("input[type='email']");
    var note = form.nextElementSibling && form.nextElementSibling.classList.contains("form-note")
      ? form.nextElementSibling
      : null;

    // Clear the error state as soon as the user starts correcting it,
    // rather than waiting for another submit attempt.
    input && input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") {
        input.removeAttribute("aria-invalid");
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = input && input.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);

      if (!valid) {
        input && input.setAttribute("aria-invalid", "true");
        if (note) {
          note.textContent = "That doesn't look like a valid email address.";
          note.setAttribute("data-state", "error");
        }
        input && input.focus();
        return;
      }

      input && input.removeAttribute("aria-invalid");
      // TODO: replace with a real submission to your waitlist backend.
      form.classList.add("is-success");
      if (note) {
        note.textContent = "You're on the list — we'll email you when early builds are ready.";
        note.setAttribute("data-state", "success");
      }
    });
  });

  /* -------------------------------------------------------
     Mobile nav toggle
  ------------------------------------------------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var siteNav = document.getElementById("site-nav");
  if (navToggle && siteNav) {
    function closeNav() {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
    function openNav() {
      siteNav.classList.add("is-open");
      navToggle.setAttribute("aria-expanded", "true");
    }

    navToggle.addEventListener("click", function () {
      if (siteNav.classList.contains("is-open")) closeNav();
      else openNav();
    });

    siteNav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeNav();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    document.addEventListener("click", function (e) {
      if (!siteNav.classList.contains("is-open")) return;
      if (siteNav.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });

    // A resize back to desktop width shouldn't leave the mobile
    // dropdown state stuck open underneath the now-visible inline nav.
    window.addEventListener("resize", function () {
      if (window.innerWidth > 640) closeNav();
    });
  }

  /* -------------------------------------------------------
     Pinout tooltip
     Hover/focus a pin to fill in the shared info box that
     floats in the open space of the diagram.
  ------------------------------------------------------- */
  var pinoutTooltip = document.getElementById("pinoutTooltip");
  if (pinoutTooltip) {
    var pins = document.querySelectorAll(".pin-col li[data-desc]");
    var showPin = function (pin) {
      pinoutTooltip.innerHTML = "<strong>" + pin.getAttribute("data-pin") + "</strong>" + pin.getAttribute("data-desc");
      pinoutTooltip.classList.add("is-visible");
      pinoutTooltip.removeAttribute("aria-hidden");
    };
    var hidePinoutTooltip = function () {
      pinoutTooltip.classList.remove("is-visible");
      pinoutTooltip.setAttribute("aria-hidden", "true");
    };
    pins.forEach(function (pin) {
      pin.addEventListener("mouseenter", function () { showPin(pin); });
      pin.addEventListener("mouseleave", hidePinoutTooltip);
      pin.addEventListener("focus", function () { showPin(pin); });
      pin.addEventListener("blur", hidePinoutTooltip);
    });
  }

  /* -------------------------------------------------------
     Scroll reveal
  ------------------------------------------------------- */
  var revealTargets = document.querySelectorAll("[data-reveal]");
  if (revealTargets.length && "IntersectionObserver" in window && !reduceMotion) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach(function (el) { observer.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }
})();
