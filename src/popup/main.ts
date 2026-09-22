import "../styles/surface.css";

document.querySelector<HTMLButtonElement>("#open-options")?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});
