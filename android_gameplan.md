# Android Launch Gameplan for Quizza

## 1. Build with EAS

```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Log in
eas login

# Build Android (AAB for Play Store)
eas build --platform android --profile production
```

Make sure `eas.json` has a production profile:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

EAS builds in the cloud — no Android Studio needed. You'll get a `.aab` file to download.

## 2. Google Play Console Setup

- Go to [play.google.com/console](https://play.google.com/console)
- Pay the **$25 one-time fee**
- Create your app listing (screenshots, description, etc.)

## 3. Upload & Submit

- Go to **Production → Create new release**
- Upload the `.aab` file from EAS
- Fill in release notes
- Submit for review

## 4. In-App Purchase (Tip Jar)

- Set up the product in Google Play Console with the **same product ID** (`com.quizza.app.tip`)
- The `expo-in-app-purchases` library handles both platforms — existing code should work as-is
- Configure as a **one-time product** (equivalent of iOS Consumable)

## 5. Authentication — Sign in with Google

### Why

Sign in with Apple is not available on Android. You need **Sign in with Google** as the equivalent.

Email/password login requires **no changes**.

### App-Side Code

Use `expo-auth-session` with the Google provider:

```tsx
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';

const [request, response, promptAsync] = Google.useAuthRequest({
  androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  // iosClientId: 'YOUR_IOS_CLIENT_ID',  // optional if you want Google on iOS too
});
```

Swap the sign-in button per platform on the login screen:

```tsx
{Platform.OS === 'ios' ? (
  <AppleSignInButton onPress={handleAppleSignIn} />
) : (
  <GoogleSignInButton onPress={handleGoogleSignIn} />
)}
```

### Google Cloud Console Setup (~30 min)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Credentials
2. Create an **Android** OAuth 2.0 client ID
3. You'll need your app's **package name** and **SHA-1 signing certificate**
   - Get SHA-1 from EAS: `eas credentials`
4. Save the client ID for use in your app code

### Server-Side Changes

Your backend currently verifies Apple ID tokens. Add a similar flow for Google:

1. Receive the Google ID token from the app
2. Verify it with Google's API: `https://oauth2.googleapis.com/tokeninfo`
3. Create/find the user and return your auth token

## 6. Testing

```bash
# Run on Android emulator or device
npx expo run:android

# or use Expo Go
npx expo start
```

Test before submitting:
- Email/password login
- Google sign-in
- Tip jar purchase (use Google Play test tracks)
- All game modes

## 7. Play Store Listing Assets

- App screenshots (phone + 7" tablet at minimum)
- Feature graphic (1024x500)
- App description, short description
- Privacy policy URL (can reuse your existing one)

## 8. App Signing

EAS manages signing keys by default. Let it handle this — don't manually manage keystores unless you have a reason.

## Summary of Changes Needed

| Area               | Effort         | Changes                                    |
|--------------------|----------------|--------------------------------------------|
| Email/password     | None           | Works as-is                                |
| Sign in with Apple | Hide on Android| Platform check to show/hide                |
| Sign in with Google| Medium         | New button + library + handler             |
| Google Cloud setup | ~30 min        | OAuth client ID for Android                |
| Server auth        | Small-Medium   | Add Google token verification endpoint     |
| IAP (Tip Jar)      | Small          | Set up product in Google Play Console      |
| EAS Build          | Minimal        | One command to build AAB                   |
| Play Store listing | ~1 hour        | Screenshots, description, assets           |
