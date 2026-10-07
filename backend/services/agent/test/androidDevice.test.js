import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAndroidActionArgs,
  inspectHierarchy,
  isUsbDeviceSerial,
  parseDevicesOutput,
} from "../lib/agent/tools/android.js";

test("only authorized physical USB-style serials can be controlled", () => {
  assert.equal(isUsbDeviceSerial("ABC123"), true);
  assert.equal(isUsbDeviceSerial("emulator-5554"), false);
  assert.equal(isUsbDeviceSerial("192.168.1.8:5555"), false);
  assert.equal(isUsbDeviceSerial("bad;serial"), false);
});

test("device listing preserves ADB state and control eligibility", () => {
  const devices = parseDevicesOutput(
    "List of devices attached\nABC123 device usb:1-1 product:pixel model:Pixel_8\nOLDADB device product:pixel\nemulator-5554 device\nXYZ unauthorized usb:1-2\n",
  );
  assert.deepEqual(
    devices.map(({ serial, state, canControl }) => ({ serial, state, canControl })),
    [
      { serial: "ABC123", state: "device", canControl: true },
      { serial: "OLDADB", state: "device", canControl: false },
      { serial: "emulator-5554", state: "device", canControl: false },
      { serial: "XYZ", state: "unauthorized", canControl: false },
    ],
  );
});

test("screen hierarchy hides password contents and reports actionable labels", () => {
  const screen = inspectHierarchy(
    '<hierarchy><node text="Continue &amp; Next" content-desc="" resource-id="app:id/continue" class="Button" clickable="true" enabled="true" password="false" bounds="[1,2][30,40]" /><node text="secret" content-desc="secret" resource-id="app:id/password" password="true" bounds="[2,3][40,50]" /></hierarchy>',
  );
  assert.match(screen, /text="Continue & Next"/);
  assert.match(screen, /id="app:id\/continue"/);
  assert.match(screen, /\[hidden password\]/);
  assert.doesNotMatch(screen, /secret/);
});

test("action builder accepts only fixed, validated UI operations", () => {
  assert.deepEqual(buildAndroidActionArgs({ serial: "ABC123", action: "tap", x: 12, y: 34 }), [
    "-s",
    "ABC123",
    "shell",
    "input",
    "tap",
    "12",
    "34",
  ]);
  assert.throws(
    () => buildAndroidActionArgs({ serial: "ABC123", action: "run", command: "rm -rf /" }),
    /action must be/,
  );
  assert.throws(
    () => buildAndroidActionArgs({ serial: "ABC123", action: "launch_app", packageName: "app;evil" }),
    /valid Android application id/,
  );
});

test("text input is passed as one quoted argument and blocks control characters", () => {
  const args = buildAndroidActionArgs({ serial: "ABC123", action: "type_text", text: "hello world; 'ok'" });
  assert.equal(args.at(-1), "input text 'hello%sworld;%s'\\''ok'\\'''");
  assert.throws(
    () => buildAndroidActionArgs({ serial: "ABC123", action: "type_text", text: "hello\nworld" }),
    /printable characters/,
  );
});
