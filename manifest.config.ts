import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Peek — Preview links before opening",
  short_name: "Peek",
  description: "Preview links without losing your place.",
  version: "0.1.0",
  minimum_chrome_version: "116",
  icons: {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png"
  },
  action: {
    default_title: "Peek",
    default_popup: "src/popup/index.html",
    default_icon: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png"
    }
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
      all_frames: false
    }
  ],
  host_permissions: ["http://*/*", "https://*/*", "https://peek-license-api.example.workers.dev/*"],
  permissions: ["storage"],
  options_page: "src/options/index.html",
  commands: {
    "toggle-peek-stack": {
      suggested_key: {
        default: "Alt+Shift+P",
        mac: "MacCtrl+Shift+P"
      },
      description: "Open or close Peek Stack"
    }
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'"
  }
});
