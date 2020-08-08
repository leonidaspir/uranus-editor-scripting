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
    const modules = [
      {
        moduleName: "Ammo",
        glueUrl: "ammo.wasm.js",
        wasmUrl: "ammo.wasm.wasm",
        fallbackUrl: "ammo.js",
        loaded: false,
      },
    ];

    Uranus.Editor.loadModules(modules).then(function () {
      Uranus.Editor.startAppLoop(true, modules[0].loaded === true);
      Uranus.Editor.batchExecuteScripts();
    });
  }
}
