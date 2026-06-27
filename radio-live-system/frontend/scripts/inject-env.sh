#!/bin/sh
# Inject environment variables ke public/runtime-env.js SAAT CONTAINER START
# (bukan saat build), sehingga NEXT_PUBLIC_API_URL & NEXT_PUBLIC_STREAM_URL
# selalu sesuai dengan environment variable Railway saat ini, tanpa perlu
# rebuild image setiap kali variable berubah.

OUT_FILE="/app/public/runtime-env.js"

cat > "$OUT_FILE" << EOF
window.__ENV__ = {
  NEXT_PUBLIC_API_URL: "${NEXT_PUBLIC_API_URL:-http://localhost:4000}",
  NEXT_PUBLIC_STREAM_URL: "${NEXT_PUBLIC_STREAM_URL:-}"
};
EOF

echo "Runtime env injected: $OUT_FILE"
exec "$@"
