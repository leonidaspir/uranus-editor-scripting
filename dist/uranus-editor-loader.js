// editor.on("scene:load", function () {
//   window.setTimeout(bootUranusEditor, 750);
// });
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const bootUranusEditor = () => __awaiter(this, void 0, void 0, function* () {
    const app = editor.call("viewport:app");
    const sdkUrl = app.assets.find("uranus-editor-sdk.js");
    if (!sdkUrl)
        return;
    yield loadScriptAsync(sdkUrl.getFileUrl());
    startUranusEditor();
});
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
bootUranusEditor();
