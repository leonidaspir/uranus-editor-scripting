editor.on("scene:load", function () {
  window.setTimeout(bootUranusEditor, 750);
});

const loadScriptAsync = function (url) {
  return new Promise((resolve) => {
    var tag = document.createElement("script");
    tag.onload = function () {
      resolve();
    };
    tag.onerror = function () {
      throw new Error("failed to load " + url);
    };
    tag.async = true;
    tag.src = url;
    document.head.appendChild(tag);
  });
};

const bootUranusEditor = async () => {
  const app = editor.call("viewport:app");

  const sdkUrl = app.assets.find("uranus-editor-sdk.js");

  if (!sdkUrl) return;

  await loadScriptAsync(sdkUrl.getFileUrl());

  startUranusEditor();
};

const startUranusEditor = function () {
  if (editor && Uranus && Uranus.Editor) {
    Uranus.Editor.loadModules([
      {
        moduleName: "Ammo",
        glueUrl: "ammo.wasm.js",
        wasmUrl: "ammo.wasm.wasm",
        fallbackUrl: "ammo.js",
      },
    ]).then(function () {
      Uranus.Editor.startAppLoop(true, true);
      Uranus.Editor.batchExecuteScripts();
    });
  }
};
