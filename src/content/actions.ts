import type { RuntimeRequest } from "../core/messages";
import type { PreviewRecord } from "../core/types";
import { updateStorage } from "../platform/storage";

export async function openTab(url: string, active: boolean): Promise<void> {
  const message: RuntimeRequest = { type: "tab.open", requestId: crypto.randomUUID(), url, active };
  await chrome.runtime.sendMessage(message);
}

export async function copyUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const field = document.createElement("textarea");
    field.value = url;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
}

export async function togglePinned(record: PreviewRecord): Promise<boolean> {
  let pinned = false;
  await updateStorage((storage) => {
    const exists = storage.pinned.some((item) => item.normalizedUrl === record.normalizedUrl);
    pinned = !exists;
    if (exists) return { ...storage, pinned: storage.pinned.filter((item) => item.normalizedUrl !== record.normalizedUrl) };
    const next = storage.license.status === "pro" || storage.license.status === "grace" ? [...storage.pinned, record] : [record];
    return { ...storage, pinned: next };
  });
  return pinned;
}
