# 🚀 PSY-IA — Déploiement

App : compagnon IA privacy-first. Expo (React Native) → Web + Mobile, backend Supabase.

- **Web (prod, public) :** https://psy-ia.vercel.app
- **Repo :** https://github.com/germainia17-dev/PSY-IA
- **Mobile :** voir [MOBILE_DEPLOYMENT.md](./MOBILE_DEPLOYMENT.md)

---

## Architecture

| Couche | Techno |
|--------|--------|
| Frontend | Expo (React Native) — mobile + web |
| Backend | Supabase + Edge Functions (Deno) |
| Base de données | PostgreSQL (Supabase) |
| IA | Anthropic Claude / Gemini |

---

## Web (Vercel)

Déployé sur Vercel, accès **public permanent** (Deployment Protection désactivée).

```bash
cd src
npm install --legacy-peer-deps
npx vercel --prod          # build + deploy
```

`vercel.json` régénère le build à chaque déploiement :
```json
{
  "buildCommand": "npx expo export --platform web --output-dir dist",
  "outputDirectory": "dist",
  "installCommand": "npm install --legacy-peer-deps",
  "cleanUrls": true
}
```

### Variables d'environnement

À définir dans Vercel (Settings → Environment Variables) :
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Domaine / alias

```bash
vercel alias set <deployment-url> psy-ia.vercel.app
```

### Rendre public (si la protection est réactivée)

Via l'API Vercel (token dans `~/Library/Application Support/com.vercel.cli/auth.json`) :
```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<projectId>?teamId=<teamId>" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'
```
Ou : Dashboard → projet → Settings → Deployment Protection → Disable.

---

## Mobile

Voir [MOBILE_DEPLOYMENT.md](./MOBILE_DEPLOYMENT.md) — build iOS/Android via EAS (nécessite compte Expo + creds Apple/Google).

---

## Statut

| Composant | État |
|-----------|------|
| Web (Vercel) | ✅ public — https://psy-ia.vercel.app |
| Variables d'env | ✅ Supabase configuré |
| iOS / Android | ⏳ guide prêt, build non lancé |
| Backend Supabase | ✅ configuré (ref `airakqqfpetzpbrrlyqq`) |
