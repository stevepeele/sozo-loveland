#!/bin/sh
# Writes js/config.js from env vars; analytics stay off when unset.
printf '/* generated at build */\nwindow.SOZO_CONFIG = { posthogKey: "%s", segmentKey: "%s" };\n' "${POSTHOG_KEY:-}" "${SEGMENT_WRITE_KEY:-}" > js/config.js
