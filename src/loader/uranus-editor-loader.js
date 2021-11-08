// --- sample loader script to be used without the Uranus Extension
const loadScriptAsync = function (url) {
  return new Promise((resolve) => {
    var tag = document.createElement('script');
    tag.onload = function () {
      resolve();
    };
    tag.onerror = function () {
      throw new Error('failed to load ' + url);
    };
    tag.async = true;
    tag.src = url;
    document.head.appendChild(tag);
  });
};

const bootUranusEditor = async () => {
  const app = editor.call('viewport:app');

  const sdkUrl = app.assets.find('uranus-editor-sdk.js');

  if (!sdkUrl) return;

  await loadScriptAsync(sdkUrl.getFileUrl());

  startUranusEditor();
};

const startUranusEditor = function () {
  if (editor && Uranus && Uranus.Editor) {
    const modules = [
      // {
      //   moduleName: 'Ammo',
      //   glueUrl: 'ammo.wasm.js',
      //   wasmUrl: 'ammo.wasm.wasm',
      //   fallbackUrl: 'ammo.js',
      //   loaded: false,
      // },
    ];

    Uranus.Editor.loadModules(modules).then(function () {
      // Uranus.Editor.startAppLoop(true, modules[0].loaded === true);
      // Uranus.Editor.batchExecuteScripts();
    });
  }
};

// editor.once("assets:load", function () {
//   window.setTimeout(bootUranusEditor, 0);
// });

bootUranusEditor();
