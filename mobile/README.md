# knowAIedge mobile reader

One bundled HTML, CSS and JavaScript interface runs in Android WebView and iOS WKWebView. The app reads the public News, Repo Radar and Watchlist feeds from knowAIedge.fyi. Readers can filter by topic, open original sources, share a link through the system share sheet and bookmark summaries on their device. The **Full site** link opens the website in the default browser for Learn AI, Model Radar, sign-in and other web features.

## Android

Open `mobile/android` in Android Studio, select a device and press **Run**. For a command-line debug build, install JDK 17 and Android SDK 36, then run from the repository root:

```sh
cd mobile/android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The app supports Android 8.0 and later and requires a current Android System WebView. On Windows use `gradlew.bat`.

## iPhone or iPad

Open `mobile/ios/KnowAIedge.xcodeproj` in Xcode 16 or later, select the **KnowAIedge** scheme, choose an iPhone or iPad simulator, and press **Run**. On a physical device select your Apple development team under **Signing & Capabilities**. Both platforms use `fyi.knowaiedge.reader` as the application identifier. The iOS deployment target is 15.0.

## Feed and offline behavior

The native hosts fetch public JSON over HTTPS from `/api/news`, `/api/repositories`, and `/api/watchlist` when a tab first opens or the reader taps refresh. The JavaScript adapter normalizes each response while preserving source links and repository order. Requests are read-only and use no account credentials. External articles and videos open in their corresponding app or browser.

A small, dated November 2026 edition is bundled for first launch. Each successful refresh replaces that tab's local cache. Failed refreshes keep the available edition visible. Saved items retain their title, summary and source link even if the item leaves the feed. Bookmarks belong to this installation. Original articles and videos require connectivity.

## Development

Edit the shared reader in `mobile/web`. Both native projects package that directory directly. Android serves it from a local HTTPS origin and routes three fixed feed requests to the site. iOS serves the bundle from a private URL scheme and exposes a main-frame, read-only feed handler. There is no JavaScript dependency installation step.

Run the reader checks with Node.js 22 or later from the repository root:

```sh
node --test mobile/tests/*.test.cjs
```

The mobile build workflow also exercises a phone-sized Chromium viewport with the bundled edition and simulated online and offline responses.

Mobile builds produce a debug APK for Android and a simulator app for iOS. App Store, TestFlight and Google Play distribution require separate signing and release steps.
