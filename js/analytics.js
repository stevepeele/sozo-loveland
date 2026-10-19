/* Sozo Loveland — PostHog analytics. Requires js/config.js loaded before this file.
   No-ops until window.SOZO_CONFIG.posthogKey is set. */
"use strict";

var POSTHOG_KEY =
  (window.SOZO_CONFIG && window.SOZO_CONFIG.posthogKey) || null;
var POSTHOG_HOST = "https://us.i.posthog.com";
var APP_ID = "sozo";

var _phReady = false;
function _initPostHog() {
  if (_phReady || !POSTHOG_KEY || typeof window === "undefined") return;
  _phReady = true;
  (function (t, e) {
    var o, n, p, r;
    e.__SV || ((window.posthog = e), (e._i = []),
      (e.init = function (i, s, a) {
        function g(t, e) {
          var o = e.split(".");
          2 == o.length && ((t = t[o[0]]), (e = o[1]));
          t[h] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); };
        }
        (p = t.createElement("script")).type = "text/javascript";
        p.async = !0; p.src = s.api_host + "/static/array.js";
        (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
        var u = e; void 0 !== a ? (u = e[a] = []) : (a = "posthog");
        u.people = u.people || [];
        u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " stack"), e; };
        u._i.push([i, s, a]);
      }),
      e.__SV = 1)
  })(document, (window.posthog = window.posthog || []));
  window.posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
  });
}

function track(event, props) {
  try {
    if (!POSTHOG_KEY) return;
    _initPostHog();
    if (window.posthog && window.posthog.capture) {
      window.posthog.capture(event, Object.assign({ app: APP_ID }, props || {}));
    }
  } catch (e) { /* analytics must never break the app */ }
}

function identify(userId, traits) {
  try {
    if (!POSTHOG_KEY) return;
    _initPostHog();
    if (window.posthog && window.posthog.identify) {
      window.posthog.identify(userId, traits || {});
    }
  } catch (e) {}
}

/* $pageview on load */
track("$pageview", { path: location.pathname });
