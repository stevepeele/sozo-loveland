// SOZO Loveland — cinematic layer + live Sunday mode (PLX-494)
// Progressive enhancement: everything here is additive. If GSAP fails to load, the page is untouched.
(function(){
  "use strict";

  /* ---------- live Sunday mode ---------- */
  // Sundays 10:00 AM – 12:00 PM America/New_York. The hero becomes a gathering state.
  // Stream player wiring: set LIVE_STREAM_CHANNEL_ID to the church's YouTube channel ID
  // (e.g. "UCxxxx…") and the live player appears automatically during service hours.
  var LIVE_STREAM_CHANNEL_ID = null;

  function etNow(){
    return new Date(new Date().toLocaleString("en-US",{timeZone:"America/New_York"}));
  }
  function isServiceTime(){
    var n = etNow();
    return n.getDay() === 0 && (n.getHours() === 10 || (n.getHours() === 11));
  }
  function bootLiveMode(){
    var inner = document.querySelector(".porch-hero-inner");
    if (!inner || !isServiceTime()) return;
    var eyebrow = inner.querySelector(".eyebrow");
    var h1 = inner.querySelector("h1");
    var lede = inner.querySelector(".lede");
    var btns = inner.querySelector(".btn-row");
    if (eyebrow) eyebrow.innerHTML = '<span class="tick-live"><span class="tick-dot"></span>LIVE</span>&nbsp;&nbsp;We&rsquo;re gathering right now';
    if (h1) h1.textContent = "Come on in \u2014 we\u2019re live.";
    if (lede) lede.textContent = "Service is happening right now in Loveland. Walk through the door, or light a candle with us from wherever you are.";
    if (LIVE_STREAM_CHANNEL_ID && btns){
      var wrap = document.createElement("div");
      wrap.className = "live-player";
      wrap.innerHTML = '<iframe src="https://www.youtube.com/embed/live_stream?channel='+LIVE_STREAM_CHANNEL_ID+'&autoplay=1&rel=0" title="SOZO Loveland live" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      btns.parentNode.insertBefore(wrap, btns);
    }
    if (btns) btns.innerHTML = '<a class="btn btn-primary" href="https://maps.google.com/?q=9781+Fields+Ertel+Rd+Loveland+OH+45140" target="_blank" rel="noopener">Get Directions</a><a class="btn btn-ghost" href="prayer.html">Light a candle \u2192</a>';
    var note = inner.querySelector(".porch-hero-note");
    if (note) note.textContent = "Sundays 10AM\u201312PM \u00B7 9781 Fields Ertel Rd, Loveland, OH";
  }

  /* ---------- cinematic scroll ---------- */
  function bootCinema(){
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero: slow Ken Burns on load, parallax on scroll
    var bg = document.querySelector(".porch-hero-bg img");
    if (bg){
      gsap.fromTo(bg, {scale:1.12}, {scale:1, duration:2.4, ease:"power2.out"});
      gsap.to(bg, {yPercent:16, ease:"none",
        scrollTrigger:{trigger:".porch-hero", start:"top top", end:"bottom top", scrub:true}});
      gsap.to(".porch-hero-inner", {yPercent:-8, opacity:0.25, ease:"none",
        scrollTrigger:{trigger:".porch-hero", start:"top top", end:"bottom top", scrub:true}});
    }

    // Cinematic reveals: any [data-cine] fades up with a soft blur lift
    gsap.utils.toArray("[data-cine]").forEach(function(node){
      gsap.fromTo(node, {y:44, opacity:0, filter:"blur(6px)"},
        {y:0, opacity:1, filter:"blur(0px)", duration:1.1, ease:"power3.out",
         scrollTrigger:{trigger:node, start:"top 88%"}});
    });

    // Parallax images
    gsap.utils.toArray("[data-parallax]").forEach(function(img){
      gsap.fromTo(img, {yPercent:-8}, {yPercent:8, ease:"none",
        scrollTrigger:{trigger:img.closest("section")||img, start:"top bottom", end:"bottom top", scrub:true}});
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ bootLiveMode(); bootCinema(); });
  else { bootLiveMode(); bootCinema(); }
})();
