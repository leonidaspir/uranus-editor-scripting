declare var browser: any;

// --- cross browser extension
// @ts-ignore
window.browser = (function () {
  return (
    // @ts-ignore
    window.msBrowser ||
    // @ts-ignore
    window.browser ||
    // @ts-ignore
    window.chrome
  );
})();

const state = {
  injected: false,
};

//Listen for runtime message
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "inject-editor" && state.injected === false) {
    state.injected = true;

    const localUrl = browser.runtime.getURL("dist/editor.js");

    fetch(localUrl).then(async (response) => {
      const code = await response.text();

      const script = document.createElement("script");
      script.innerHTML = code;
      document.head.appendChild(script);
    });
  }
});
