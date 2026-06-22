#!/usr/bin/env bash
# Teste si Google accepte le redirect_uri Supabase pour le client Web.
# Exit 0 = config OK (plus de redirect_uri_mismatch) -> login marchera.
# Exit 1 = encore cassé (URI pas encore enregistrée dans Google Cloud Console).
set -euo pipefail

CLIENT_ID="964276966328-t31stes4djltqddl2ro3psvpke1aq6so.apps.googleusercontent.com"
REDIRECT="https://airakqqfpetzpbrrlyqq.supabase.co/auth/v1/callback"
GURL="https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$REDIRECT")&response_type=code&scope=email+profile&state=loop"

LOC=$(curl -s -i "$GURL" -A "Mozilla/5.0" --max-redirs 0 2>/dev/null | grep -i "^location:" | head -1 || true)

if echo "$LOC" | grep -qi "oauth/error"; then
  echo "KO redirect_uri_mismatch (URI pas encore enregistree dans Google Cloud Console)"
  exit 1
else
  echo "OK Google accepte le redirect_uri -> config bonne, login marchera"
  exit 0
fi
