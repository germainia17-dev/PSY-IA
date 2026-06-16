# 🚀 PSY-IA Deployment Guide

## Options de déploiement

### 1. **Mobile (Recommandé)**
```bash
cd src
npm install
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios --path <build-path>
eas submit --platform android --path <build-path>
```

### 2. **Web (Expo Web)**
```bash
cd src
npm install
npx expo export --platform web --output-dir dist
# Puis déployer dist/ sur Vercel/Netlify
```

### 3. **Docker + Railway/Render**
```bash
docker build -t psy-ia .
docker run -p 3000:3000 psy-ia
```

## Architecture

- **Frontend**: Expo (React Native) - Mobile + Web
- **Backend**: Supabase + Deno Functions
- **AI**: Gemini/Anthropic API
- **Database**: PostgreSQL (Supabase)

## Variables d'environnement

Créer un `.env` avec:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

## Status

✅ Code en production sur GitHub
✅ App prête pour EAS Build
✅ Backend Supabase configuré
✅ Sondage PSY intégré

À faire:
1. Configurer Supabase project
2. Obtenir les clés API (Gemini/Anthropic)
3. Lancer un EAS build ou export web
4. Déployer backend functions

---
Repository: https://github.com/germainia17-dev/PSY-IA
