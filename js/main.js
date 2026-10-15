// SOZO Loveland — core site behavior (nav, reveals, year)
// Dependency-free. Loaded on every page before magic.js / cinema.js.
(function(){
  "use strict";

  function onReady(fn){
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  onReady(function(){

    /* mobile nav */
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (toggle && links){
      toggle.addEventListener("click", function(){
        var open = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      links.addEventListener("click", function(e){
        if (e.target.closest("a")){ links.classList.remove("open"); toggle.setAttribute("aria-expanded","false"); }
      });
    }

    /* footer year */
    document.querySelectorAll("[data-year]").forEach(function(el){
      el.textContent = new Date().getFullYear();
    });

    /* scroll reveals */
    var revealEls = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && revealEls.length){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (en.isIntersecting){
            en.target.classList.add("visible");
            io.unobserve(en.target);
          }
        });
      }, {threshold: 0.12, rootMargin: "0px 0px -6% 0px"});
      revealEls.forEach(function(el){ io.observe(el); });
    } else {
      // no observer support: show everything
      revealEls.forEach(function(el){ el.classList.add("visible"); });
    }

    /* smooth anchors (respects reduced motion) */
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce){
      document.querySelectorAll('a[href^="#"]').forEach(function(a){
        a.addEventListener("click", function(e){
          var id = a.getAttribute("href");
          if (id.length < 2) return;
          var t = document.querySelector(id);
          if (t){ e.preventDefault(); t.scrollIntoView({behavior:"smooth"}); }
        });
      });
    }
  });
})();
