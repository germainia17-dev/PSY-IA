# 📱 PSY-IA Mobile Deployment Guide

## Prerequisites

### 1. Create Expo Account
- Go to: https://expo.dev/signup
- Create free account (or use existing)
- Create a project called "PSY-IA"

### 2. Generate Expo Token
```bash
# In terminal on your machine:
eas login
# Or generate token at: https://expo.dev/accounts/[username]/settings/tokens
export EXPO_TOKEN="your_token_here"
```

### 3. Setup Apple Developer (for iOS)
- Developer account: https://developer.apple.com
- App ID: "PSY-IA" 
- Bundle ID: `com.germainia17.psy`
- Push certificate (optional)

### 4. Setup Google Play (for Android)
- Google Play account: https://play.google.com/console
- App ID: "PSY-IA"
- Package name: `com.germainia17.psy`

---

## Build iOS

```bash
cd /tmp/psy-ia/src

# Login to Expo
eas login

# Build for iOS (Apple)
eas build --platform ios --profile production

# This creates an .ipa file (iOS app)
# Status: https://expo.dev/accounts/[username]/projects/psy-ia/builds
```

**What happens:**
1. EAS compiles the React Native code
2. Creates production-signed iOS app (.ipa)
3. You can test on TestFlight or submit to App Store

---

## Build Android

```bash
cd /tmp/psy-ia/src

# Build for Android (Google Play)
eas build --platform android --profile production

# This creates an .aab file (Android Bundle)
# Status: https://expo.dev/accounts/[username]/projects/psy-ia/builds
```

**What happens:**
1. EAS compiles the React Native code
2. Creates production APK/AAB
3. Ready to submit to Google Play

---

## Submit to App Stores (Optional)

### iOS → App Store
```bash
# After successful build:
eas submit --platform ios --path "path/to/build.ipa"
```

**Requires:**
- Apple Developer account ($99/year)
- App Store Connect access
- Privacy policy
- Screenshots & description

### Android → Google Play
```bash
# After successful build:
eas submit --platform android --path "path/to/build.aab"
```

**Requires:**
- Google Play Developer account ($25 one-time)
- Privacy policy
- Screenshots & description

---

## Current Status

| Component | Status | Action |
|-----------|--------|--------|
| **Source Code** | ✅ Ready | In repo |
| **Web Version** | ✅ Live | https://companion-cvlqoparo-... |
| **iOS Build** | ⏳ Waiting | Need Apple creds |
| **Android Build** | ⏳ Waiting | Need signing key |
| **App Store** | ⏳ Future | Need developer account |
| **Google Play** | ⏳ Future | Need developer account |

---

## Quick Start (CLI)

```bash
# 1. Login to Expo
eas login

# 2. Build both platforms in parallel
eas build --platform android --profile production &
eas build --platform ios --profile production &
wait

# 3. Check status
eas build:list

# 4. Download builds
eas build:download [build-id]
```

---

## Environment Variables for Builds

Add to EAS if needed:
```bash
eas secret create EXPO_PUBLIC_SUPABASE_URL "https://..."
eas secret create EXPO_PUBLIC_SUPABASE_ANON_KEY "eyJ..."
```

---

## Troubleshooting

**Build fails with "No Apple credentials":**
- Run: `eas credentials`
- Follow wizard to create certificates

**Build fails with "Android signing key not found":**
- Run: `eas credentials`
- Generate new keystore for Android

**Want to test before App Store?**
- iOS: Use TestFlight (eas submit --testflight)
- Android: Use internal testing (Google Play Console)

---

## Timeline

- **iOS Build:** 10-15 minutes
- **Android Build:** 5-10 minutes
- **App Store Review:** 1-2 days
- **Google Play Review:** Usually instant (24h max)

---

## Documentation Links

- Expo EAS: https://docs.expo.dev/eas/
- App Store: https://appstoreconnect.apple.com
- Google Play: https://play.google.com/console
- Apple Developer: https://developer.apple.com

---

**Ready to build?** Follow the steps above or ask for help! 🚀
