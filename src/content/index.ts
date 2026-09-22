const ROOT_ATTRIBUTE = "data-peek-extension";

if (!document.documentElement.hasAttribute(ROOT_ATTRIBUTE)) {
  document.documentElement.setAttribute(ROOT_ATTRIBUTE, "ready");
}
