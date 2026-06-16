# PSY-IA 🧠

Compagnon IA privacy-first — un soutien émotionnel, pas un service médical.

**🌐 App web :** https://psy-ia.vercel.app

## Stack

- **Frontend :** Expo (React Native) — mobile + web
- **Backend :** Supabase + Edge Functions (Deno)
- **Base de données :** PostgreSQL (Supabase)
- **IA :** Anthropic Claude / Gemini

## Démarrage

```bash
cd src
npm install --legacy-peer-deps
npx expo start        # mobile + web en dev
```

## Déploiement

- **Web (Vercel) :** voir [DEPLOY.md](./DEPLOY.md)
- **Mobile (iOS/Android via EAS) :** voir [MOBILE_DEPLOYMENT.md](./MOBILE_DEPLOYMENT.md)

## Confidentialité

Les conversations restent entre l'utilisateur et son compagnon. Mémoire stockée
localement sur l'appareil ; le serveur relaie la conversation (HTTPS) vers l'IA
sans jamais l'enregistrer. Aucun compte, aucun traqueur.

> En cas de besoin urgent : le **3114** (gratuit, 24h/24) est là.
