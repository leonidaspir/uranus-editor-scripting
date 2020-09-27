import Editor from "./core/main";

declare var editor: any;
declare var window: any;
declare var Uranus: any;

if (!window.Uranus) {
  window.Uranus = {
    Editor: Editor,
  };
}

if (Editor.inEditor() === true) {
  Uranus.Editor = new Editor();

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
