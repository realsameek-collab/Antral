import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { registerTool } from "./registry.js";

const MAX_OUTPUT_CHARS = 20_000;
const PACKAGE_NAME = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
const SERIAL = /^[A-Za-z0-9._-]{1,128}$/;
const KEY_CODES = new Set(["BACK", "HOME", "ENTER", "TAB", "DPAD_UP", "DPAD_DOWN", "DPAD_LEFT", "DPAD_RIGHT"]);

export const isUsbDeviceSerial = (serial) =>
  typeof serial === "string" && SERIAL.test(serial) && !/^emulator-/i.test(serial);

export const parseDevicesOutput = (output) =>
  output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const match = /^\s*(\S+)\s+(\S+)(?:\s+(.*))?$/.exec(line);
      if (!match) return null;
      return {
        serial: match[1],
        state: match[2],
        details: match[3] || "",
        canControl:
          match[2] === "device" &&
          isUsbDeviceSerial(match[1]) &&
          /(?:^|\s)usb:\S+/.test(match[3] || ""),
      };
    })
    .filter(Boolean);

const shellQuote = (value) => `'${value.replace(/'/g, "'\\''")}'`;

const adbPath = () => process.env.ANDROID_ADB_PATH?.trim() || "adb";

const runAdb = (args, { signal, timeoutMs = 15_000 } = {}) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("The run was cancelled."));
      return;
    }
    const child = spawn(adbPath(), args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let truncated = false;
    const append = (chunk) => {
      const remaining = MAX_OUTPUT_CHARS - output.length;
      if (remaining <= 0) {
        truncated = true;
        return;
      }
      const text = chunk.toString("utf8");
      output += text.slice(0, remaining);
      if (text.length > remaining) truncated = true;
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);

    let timedOut = false;
    const kill = () => child.kill();
    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, timeoutMs);
    const onAbort = () => kill();
    signal?.addEventListener("abort", onAbort, { once: true });

    child.on("error", (error) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error.code === "ENOENT") {
        reject(
          new Error(
            "ADB was not found. Install Android SDK Platform-Tools and add adb to PATH, or set ANDROID_ADB_PATH to adb.exe.",
          ),
        );
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      const body = output.trimEnd();
      const notes = [
        truncated ? "Output truncated." : "",
        timedOut ? `ADB stopped after ${Math.round(timeoutMs / 1000)} seconds.` : "",
        signal?.aborted ? "The run was cancelled." : "",
      ].filter(Boolean);
      resolve({ code, output: [body, ...notes].filter(Boolean).join("\n") });
    });
  });

const runAdbChecked = async (args, options) => {
  const result = await runAdb(args, options);
  if (result.code !== 0) throw new Error(`ADB failed (exit ${result.code}): ${result.output || "(no output)"}`);
  return result.output;
};

const requireConnectedUsbDevice = async (serial, signal) => {
  if (!isUsbDeviceSerial(serial)) {
    throw new Error("Choose a connected USB device serial from android_list_devices; emulators and network ADB devices are not supported.");
  }
  const devices = parseDevicesOutput(await runAdbChecked(["devices", "-l"], { signal }));
  const device = devices.find((entry) => entry.serial === serial);
  if (!device) throw new Error(`Device "${serial}" is not listed by ADB. Reconnect it and check the USB debugging prompt.`);
  if (device.state !== "device") {
    throw new Error(`Device "${serial}" is ${device.state}; unlock it and accept the USB debugging authorization prompt.`);
  }
  if (!device.canControl) throw new Error("Only authorized physical devices connected over USB can be controlled.");
};

const validateDeviceSerial = (serial) => {
  if (!isUsbDeviceSerial(serial)) {
    throw new Error("serial must be a physical USB device serial from android_list_devices.");
  }
};

export const buildAndroidActionArgs = ({ serial, action, x, y, endX, endY, durationMs, text, packageName, key }) => {
  validateDeviceSerial(serial);
  const prefix = ["-s", serial, "shell"];

  if (action === "launch_app") {
    if (typeof packageName !== "string" || !PACKAGE_NAME.test(packageName)) {
      throw new Error("packageName must be a valid Android application id.");
    }
    return [...prefix, "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"];
  }
  if (action === "tap") {
    if (![x, y].every((n) => Number.isInteger(n) && n >= 0 && n <= 10_000)) {
      throw new Error("x and y must be integer screen coordinates between 0 and 10000.");
    }
    return [...prefix, "input", "tap", String(x), String(y)];
  }
  if (action === "swipe") {
    if (![x, y, endX, endY].every((n) => Number.isInteger(n) && n >= 0 && n <= 10_000)) {
      throw new Error("Swipe coordinates must be integers between 0 and 10000.");
    }
    if (!Number.isInteger(durationMs) || durationMs < 50 || durationMs > 2_000) {
      throw new Error("durationMs must be an integer between 50 and 2000.");
    }
    return [...prefix, "input", "swipe", String(x), String(y), String(endX), String(endY), String(durationMs)];
  }
  if (action === "type_text") {
    if (typeof text !== "string" || !text.trim() || text.length > 500 || /[\u0000-\u001f\u007f]/.test(text)) {
      throw new Error("text must contain 1–500 printable characters.");
    }
    const encoded = text.replace(/%/g, "%25").replace(/\s/g, "%s");
    return [...prefix, `input text ${shellQuote(encoded)}`];
  }
  if (action === "press_key") {
    if (typeof key !== "string" || !KEY_CODES.has(key)) {
      throw new Error(`key must be one of: ${[...KEY_CODES].join(", ")}.`);
    }
    return [...prefix, "input", "keyevent", `KEYCODE_${key}`];
  }
  throw new Error("action must be launch_app, tap, swipe, type_text, or press_key.");
};

const xmlDecode = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");

export const inspectHierarchy = (xml) => {
  const start = xml.indexOf("<hierarchy");
  const end = xml.lastIndexOf("</hierarchy>");
  if (start < 0 || end < 0) throw new Error("ADB did not return a readable UI hierarchy.");

  const nodes = [...xml.slice(start, end + "</hierarchy>".length).matchAll(/<node\b([^>]*)\/?>/g)]
    .slice(0, 100)
    .map(([, raw]) => {
      const attrs = Object.fromEntries(
        [...raw.matchAll(/([A-Za-z][A-Za-z0-9_-]*)="([^"]*)"/g)].map(([, name, value]) => [
          name,
          xmlDecode(value),
        ]),
      );
      const password = attrs.password === "true";
      const text = password ? "[hidden password]" : attrs.text;
      const description = password ? "" : attrs["content-desc"];
      return [
        attrs.clickable === "true" ? "clickable" : "",
        attrs.enabled === "false" ? "disabled" : "",
        text ? `text="${text}"` : "",
        description ? `description="${description}"` : "",
        attrs["resource-id"] ? `id="${attrs["resource-id"]}"` : "",
        attrs.bounds ? `bounds=${attrs.bounds}` : "",
      ]
        .filter(Boolean)
        .join(" ");
    })
    .filter(Boolean);

  return nodes.length ? nodes.join("\n") : "(no visible UI elements)";
};

registerTool({
  name: "android_list_devices",
  category: "computer",
  description:
    "List devices visible to ADB on this computer. Shows whether USB debugging is authorized; this does not read phone content.",
  scope: "android_device",
  targetTypes: ["local"],
  parameters: { type: "object", properties: {} },
  run: async (_args, { signal }) => {
    const output = await runAdbChecked(["devices", "-l"], { signal });
    const devices = parseDevicesOutput(output);
    if (!devices.length) return "No Android devices found. Connect the phone over USB, enable USB debugging, and accept its authorization prompt.";
    return devices
      .map(({ serial, state, details, canControl }) =>
        `${serial}: ${state}${details ? ` (${details})` : ""}${canControl ? " — ready for USB control" : ""}`,
      )
      .join("\n");
  },
});

registerTool({
  name: "android_read_screen",
  category: "computer",
  description:
    "Read text and accessibility labels from the connected phone's current screen to guide UI actions. Password-field contents are hidden; other visible screen text may be included in run history and sent to the configured AI model provider.",
  scope: "android_device",
  targetTypes: ["local"],
  parameters: {
    type: "object",
    properties: { serial: { type: "string", description: "Authorized USB serial from android_list_devices." } },
    required: ["serial"],
  },
  run: async ({ serial }, { signal }) => {
    validateDeviceSerial(serial);
    await requireConnectedUsbDevice(serial, signal);
    const remotePath = `/sdcard/antral-ui-${randomUUID()}.xml`;
    try {
      await runAdbChecked(["-s", serial, "shell", "uiautomator", "dump", remotePath], {
        signal,
        timeoutMs: 30_000,
      });
      const xml = await runAdbChecked(["-s", serial, "shell", "cat", remotePath], { signal });
      return `Visible screen elements (up to 100):\n${inspectHierarchy(xml)}`;
    } finally {
      await runAdbChecked(["-s", serial, "shell", "rm", "-f", remotePath], { timeoutMs: 5_000 });
    }
  },
});

registerTool({
  name: "android_interact",
  category: "computer",
  description:
    "Perform one specific action on an authorized USB-connected Android phone: launch an installed app, tap or swipe screen coordinates, enter text, or press a basic navigation key. Every call asks the user for approval. No arbitrary shell commands, file access, or app installation.",
  scope: "android_device",
  targetTypes: ["local"],
  mutating: true,
  parameters: {
    type: "object",
    properties: {
      serial: { type: "string", description: "Authorized USB serial from android_list_devices." },
      action: {
        type: "string",
        enum: ["launch_app", "tap", "swipe", "type_text", "press_key"],
      },
      packageName: { type: "string", description: "Installed app id, required for launch_app." },
      x: { type: "integer", description: "Starting or tap screen x coordinate." },
      y: { type: "integer", description: "Starting or tap screen y coordinate." },
      endX: { type: "integer", description: "Swipe destination x coordinate." },
      endY: { type: "integer", description: "Swipe destination y coordinate." },
      durationMs: { type: "integer", description: "Swipe duration from 50 to 2000 milliseconds." },
      text: { type: "string", description: "Text to enter, from 1 to 500 printable characters." },
      key: {
        type: "string",
        enum: ["BACK", "HOME", "ENTER", "TAB", "DPAD_UP", "DPAD_DOWN", "DPAD_LEFT", "DPAD_RIGHT"],
      },
    },
    required: ["serial", "action"],
  },
  describe: ({ serial, action, packageName, x, y, endX, endY, text, key }) => {
    if (action === "launch_app") return `Launch app ${packageName} on Android device ${serial}`;
    if (action === "tap") return `Tap Android device ${serial} at (${x}, ${y})`;
    if (action === "swipe") return `Swipe Android device ${serial} from (${x}, ${y}) to (${endX}, ${endY})`;
    if (action === "type_text") return `Type "${text}" on Android device ${serial}`;
    if (action === "press_key") return `Press ${key} on Android device ${serial}`;
    return `Interact with Android device ${serial}`;
  },
  ruleFor: () => null,
  run: async (args, { signal }) => {
    await requireConnectedUsbDevice(args.serial, signal);
    const commandArgs = buildAndroidActionArgs(args);
    const output = await runAdbChecked(commandArgs, { signal });
    return `Action "${args.action}" completed on ${args.serial}.${output ? `\n${output}` : ""}`;
  },
});
