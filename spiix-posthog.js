/*
 * SPIIX standard PostHog loader (SPIIX-1227, analytics pipeline build 2026-11-09).
 *
 * One loader for every property. PostHog project 613918 is the single pipe.
 * Segment is not in the path. GA is never loaded as a page tag by this loader.
 *
 * Usage (static / HTML properties):
 *   <script>
 *     window.__SPIIX_CFG__ = {
 *       key: "phc_...",              // PostHog project public key (never a placeholder)
 *       property_id: "product.vault", // from REGISTRY.md, do not invent
 *       brand: "product",             // stevepeeleii | panlabs | product | internal | community | prospect
 *       surface: "web",
 *       person_profiles: "always",    // or "identified_only" per registry
 *       autocapture: false            // true only for static marketing pages with no semantic events
 *     };
 *   </script>
 *   <script src="/spiix-posthog.js"></script>
 *
 * Behavior:
 *  - Env gating: never initializes on *.vercel.app, localhost, 127.0.0.1, or when
 *    cfg.env is set and not "production". Preview traffic cannot enter production data.
 *  - Registers super properties on every event: org, brand, property_id, surface,
 *    env, taxonomy_version, app_id, plus attribution_first / attribution_last
 *    snapshots (object form and flattened attr_first_* / attr_last_* keys).
 *  - Captures $pageview on load and on SPA route changes (history + popstate + hash).
 *  - First-touch attribution (utm_*, click ids, referrer, landing page) is stored in
 *    a first-party cookie scoped to the registrable domain (shared across that
 *    domain's subdomains) with a localStorage mirror; last-touch refreshes per session.
 *  - Cross-door stitching: inbound ?ph_did=<distinct_id> is adopted on load;
 *    outbound clicks to other estate hosts get ph_did appended automatically.
 *  - window.spiixIdentify(userId, traits): alias (anonymous -> userId) then
 *    identify with traits and $set_once initial attribution. Never pass raw email
 *    as userId; use an auth UUID or a SHA-256 hash of the lowercase email.
 *  - window.spiixTrack(name, props): capture with attribution snapshots attached.
 */
(function () {
  var cfg = window.__SPIIX_CFG__ || {};
  var TAXONOMY_VERSION = "1.1.0";
  var API_HOST = cfg.api_host || "https://us.i.posthog.com";
  var host = window.location.hostname || "";

  function noopApi() {
    return {
      disabled: true,
      track: function () {},
      identify: function () {},
      pageview: function () {},
      decorate: function (u) { return u; },
      distinctId: function () { return null; }
    };
  }

  function detectEnv() {
    if (cfg.env) return cfg.env;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "development";
    if (/\.vercel\.app$/.test(host)) return "preview";
    if (/preview|staging/.test(host)) return "preview";
    return "production";
  }

  var env = detectEnv();
  if (env !== "production" || !cfg.key || cfg.key.charAt(0) === "%") {
    window.spiix = noopApi();
    window.spiixIdentify = function () {};
    window.spiixTrack = function () {};
    return;
  }

  /* ---------- attribution storage ---------- */
  var CLICK_IDS = ["gclid", "fbclid", "msclkid", "ttclid", "li_fat_id"];
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  function cookieDomain() {
    if (/stevepeeleii\.com$/.test(host)) return ".stevepeeleii.com";
    if (/panlabs\.io$/.test(host)) return ".panlabs.io";
    return null; // host-only cookie
  }
  function setCookie(name, value, days) {
    var d = new Date(); d.setTime(d.getTime() + days * 864e5);
    var s = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
    var dom = cookieDomain(); if (dom) s += ";domain=" + dom;
    if (window.location.protocol === "https:") s += ";Secure";
    document.cookie = s;
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function storeRead() {
    try {
      var raw = getCookie("spiix_attr") || window.localStorage.getItem("spiix_attr");
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function storeWrite(obj) {
    var raw = JSON.stringify(obj);
    try { setCookie("spiix_attr", raw, 365); } catch (e) {}
    try { window.localStorage.setItem("spiix_attr", raw); } catch (e) {}
  }
  function touchType(t) {
    if (t.utm_medium === "cpc" || t.gclid || t.fbclid || t.msclkid) return "paid";
    if (t.utm_medium === "email") return "email";
    if (t.utm_medium === "social" || /facebook|instagram|linkedin|twitter|x\.com|tiktok/.test(t.referring_domain || "")) return "social";
    if (t.utm_medium === "organic" || /google|bing|duckduckgo/.test(t.referring_domain || "")) return "organic";
    if (t.referring_domain && t.referring_domain.indexOf(host) === -1) return "referral";
    return "direct";
  }
  function currentTouch() {
    var q = new URLSearchParams(window.location.search);
    var t = {};
    var has = false;
    UTM_KEYS.forEach(function (k) { var v = q.get(k); if (v) { t[k] = v.toLowerCase(); has = true; } });
    CLICK_IDS.forEach(function (k) { var v = q.get(k); if (v) { t[k] = v; has = true; } });
    var ref = document.referrer || "";
    var refDomain = "";
    try { refDomain = ref ? new URL(ref).hostname : ""; } catch (e) {}
    if (refDomain && refDomain !== host) has = true;
    t.referrer = ref;
    t.referring_domain = refDomain;
    t.landing_page = window.location.origin + window.location.pathname;
    t.landing_path = window.location.pathname;
    t.touch_timestamp = new Date().toISOString();
    t.touch_type = touchType(t);
    return has || sessionStorage.getItem("spiix_touch") ? t : t;
  }

  var stored = storeRead();
  var touch = currentTouch();
  var isNewSession = !window.sessionStorage.getItem("spiix_session");
  try { window.sessionStorage.setItem("spiix_session", "1"); } catch (e) {}
  if (!stored.first) stored.first = touch;
  if (isNewSession || touch.utm_source || touch.gclid || touch.fbclid) stored.last = touch;
  if (!stored.last) stored.last = touch;
  storeWrite(stored);
  var attrFirst = stored.first, attrLast = stored.last;

  function flatten(prefix, obj) {
    var out = {};
    if (!obj) return out;
    Object.keys(obj).forEach(function (k) { out[prefix + k] = obj[k]; });
    return out;
  }

  /* ---------- cross-door stitching (ph_did) ---------- */
  var inboundDid = null;
  try { inboundDid = new URLSearchParams(window.location.search).get("ph_did"); } catch (e) {}

  /* ---------- PostHog stub + load ---------- */
  (function (t, e) {
    var o, n, p, r;
    e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) {
      function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; }
      (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0,
        p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js",
        (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
      var u = e;
      for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e; }, u.people.toString = function () { return u.toString(1) + ".people (stub)"; }, n = "capture alias identify register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group setPersonProperties".split(" "), o = 0; o < n.length; o++) g(u, n[o]);
      e._i.push([i, s, a]);
    }, e.__SV = 1);
  })(document, window.posthog || []);

  var appId = (cfg.property_id || "").split(".").pop() || "";
  var superProps = {
    org: "spiix",
    brand: cfg.brand || "",
    property_id: cfg.property_id || "",
    surface: cfg.surface || "web",
    env: env,
    taxonomy_version: TAXONOMY_VERSION,
    app_id: appId,
    attribution_first: attrFirst,
    attribution_last: attrLast
  };
  var flatFirst = flatten("attr_first_", attrFirst);
  var flatLast = flatten("attr_last_", attrLast);
  Object.keys(flatFirst).forEach(function (k) { superProps[k] = flatFirst[k]; });
  Object.keys(flatLast).forEach(function (k) { superProps[k] = flatLast[k]; });

  window.posthog.init(cfg.key, {
    api_host: API_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: !!cfg.autocapture,
    person_profiles: cfg.person_profiles || "identified_only",
    persistence: "localStorage+cookie"
  });
  window.posthog.register(superProps);

  // Adopt an inbound cross-door distinct id before the first capture.
  if (inboundDid) {
    try {
      var cur = window.posthog.get_distinct_id();
      if (cur && cur !== inboundDid) window.posthog.identify(inboundDid, {}, {});
    } catch (e) {}
  }

  var lastUrl = window.location.href;
  function pageview(extra) {
    var props = {
      $current_url: window.location.href,
      title: document.title,
      attribution_first: attrFirst,
      attribution_last: attrLast
    };
    if (extra) Object.keys(extra).forEach(function (k) { props[k] = extra[k]; });
    window.posthog.capture("$pageview", props);
  }
  function routeChanged() {
    if (window.location.href !== lastUrl) { lastUrl = window.location.href; pageview(); }
  }
  ["pushState", "replaceState"].forEach(function (m) {
    var orig = history[m];
    if (orig) history[m] = function () { var r = orig.apply(this, arguments); setTimeout(routeChanged, 0); return r; };
  });
  window.addEventListener("popstate", routeChanged);
  window.addEventListener("hashchange", routeChanged);
  pageview();

  var ESTATE_HOSTS = /(stevepeeleii\.com|panlabs\.io|heybinsly\.lol)$/;
  function decorate(url) {
    try {
      var u = new URL(url, window.location.href);
      if (u.hostname === host) return url;
      if (!ESTATE_HOSTS.test(u.hostname)) return url;
      var did = window.posthog.get_distinct_id();
      if (did && !u.searchParams.get("ph_did")) u.searchParams.set("ph_did", did);
      return u.toString();
    } catch (e) { return url; }
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;
    var next = decorate(a.getAttribute("href"));
    if (next && next !== a.getAttribute("href")) a.setAttribute("href", next);
  }, true);

  window.spiixIdentify = function (userId, traits) {
    if (!userId) return;
    try {
      var anon = window.posthog.get_distinct_id();
      if (anon && anon !== userId) { try { window.posthog.alias(userId, anon); } catch (e) {} }
      var setOnce = {
        initial_utm_source: attrFirst.utm_source || null,
        initial_utm_campaign: attrFirst.utm_campaign || null,
        initial_utm_medium: attrFirst.utm_medium || null,
        initial_referring_domain: attrFirst.referring_domain || null,
        initial_landing_page: attrFirst.landing_page || null,
        first_seen_at: attrFirst.touch_timestamp || new Date().toISOString(),
        first_property_id: cfg.property_id || ""
      };
      window.posthog.identify(userId, traits || {}, setOnce);
      window.posthog.register({ attribution_first: attrFirst, attribution_last: attrLast });
    } catch (e) {}
  };
  window.spiixTrack = function (name, props) {
    var p = props || {};
    if (!p.attribution_first) p.attribution_first = attrFirst;
    if (!p.attribution_last) p.attribution_last = attrLast;
    window.posthog.capture(name, p);
  };
  window.spiix = {
    track: window.spiixTrack,
    identify: window.spiixIdentify,
    pageview: pageview,
    decorate: decorate,
    distinctId: function () { try { return window.posthog.get_distinct_id(); } catch (e) { return null; } }
  };
})();
