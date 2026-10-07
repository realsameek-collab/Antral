# Android phone access

The local Antral agent can inspect and operate an Android phone connected to
this computer over USB. It uses Android Debug Bridge (ADB) from Android SDK
Platform-Tools; no npm package is required.

## One-time setup on Windows

1. Install **Android SDK Platform-Tools** from the official Android developer
   site.
2. Enable **Developer options** and **USB debugging** on the phone.
3. Connect it with a data-capable USB cable, unlock it, and accept the
   **Allow USB debugging** prompt. Only approve your own computer.
4. Make `adb.exe` available on `PATH`. Alternatively, set
   `ANDROID_ADB_PATH` in the agent service environment to the full path of
   `adb.exe`, then restart the local Antral services.
5. Verify the connection in PowerShell with `adb devices -l`. The device should
   show as `device` and include a `usb:` transport.

If the device shows `unauthorized`, unlock the phone and accept its prompt. If
no device appears, try another USB cable/port and check that USB debugging is
enabled.

## Enable Antral access

In Antral, enable **Access and control an Android phone** both in account-wide
Permissions and in the target's permissions. This high-risk capability is off
by default. The agent can list authorized USB devices and read visible UI
labels; password-field contents are hidden. Screen text may be included in run
history and sent to the configured AI model provider.

Each app launch, tap, swipe, text entry, and navigation-key press requires a
separate approval. The Android tools do not provide arbitrary ADB commands,
phone-file browsing, or app installation. The agent service must run on the
same computer as ADB and the phone.
