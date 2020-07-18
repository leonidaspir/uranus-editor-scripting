import Editor from "./core/main";

declare var editor: any;
declare var Uranus: any;

// @ts-ignore
if (!window.Uranus) {
  // @ts-ignore
  window.Uranus = {};
}

if (Editor.inEditor() === true) {
  new Editor();

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
}
