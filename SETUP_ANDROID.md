# MIMIR Android Setup Guide

Since we are building a native Android application, the development workflow differs from the web version. You will need a specific environment to build, run, and test the app.

## 1. Required Software

### Android Studio
You must install **Android Studio** (latest stable version, currently "Ladybug" or newer).
*   **Download**: [developer.android.com/studio](https://developer.android.com/studio)
*   **Components**: Ensure the following are selected during installation:
    *   Android SDK
    *   Android SDK Platform
    *   Android Virtual Device (AVD)

### Java Development Kit (JDK)
Android Studio usually comes with a bundled JDK (JetBrains Runtime), which is recommended. Ensure your `JAVA_HOME` environment variable is set if you plan to run Gradle commands from the terminal, though running from Android Studio is easier.

## 2. Setting Up the Emulator (or Physical Device)

### Option A: Android Emulator (Recommended for Dev)
1.  Open Android Studio.
2.  Go to **Device Manager**.
3.  Click **Create Device**.
4.  Choose a "Phone" definition (e.g., Pixel 8 or Pixel 9 Pro).
5.  Select a System Image: **API 35** (VanillaIceCream) or **API 34** (UpsideDownCake).
    *   *Note*: x86_64 images are faster on PC.
6.  Finish and launch the emulator.

### Option B: Physical Device
1.  Enable **Developer Options** on your phone (Tap "Build Number" 7 times in Settings > About Phone).
2.  Enable **USB Debugging**.
3.  Connect via USB.

## 3. The Iteration Workflow

Since I (the AI) cannot see your screen or run the emulator directly, we will work in a loop:

1.  **I write code**: I will generate the Kotlin/Compose files in `c:\Projects\MIMIR\android`.
2.  **You sync & run**:
    *   Open the `android` folder in Android Studio.
    *   Click "Sync Project with Gradle Files" (Elephant icon).
    *   Click "Run" (Green Play button).
3.  **Feedback**:
    *   If it crashes: Copy the **Logcat** output (red text) and paste it here.
    *   If it looks wrong: Take a screenshot and paste it here (or describe it).
4.  **Refine**: I will update the code based on your feedback.

## 4. Project Structure

The project will be structured as a standard Android app:

```text
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/mimir/app/  <-- Kotlin Code
│   │   │   ├── res/                 <-- Layouts, Strings, Images
│   │   │   └── AndroidManifest.xml
│   ├── build.gradle.kts             <-- App-level dependencies
├── gradle/                          <-- Gradle wrapper
├── build.gradle.kts                 <-- Project-level config
└── settings.gradle.kts              <-- Project settings
```
