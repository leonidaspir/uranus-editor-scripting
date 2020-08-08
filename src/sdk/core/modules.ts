import Editor from "./main";

export function loadScriptAsync(url: string) {
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
}

export function loadWasmModuleAsync(
  this: Editor,
  moduleName: string,
  jsUrl: string,
  binaryUrl: string
) {
  return new Promise((resolve) => {
    this.loadScriptAsync(jsUrl).then(function () {
      // @ts-ignore
      const lib = window[moduleName];
      // @ts-ignore
      window[moduleName + "Lib"] = lib;
      lib({
        locateFile: function () {
          return binaryUrl;
        },
      }).then(function (instance: any) {
        // @ts-ignore
        window[moduleName] = instance;
        resolve();
      });
    });
  });
}

export function wasmSupported(this: Editor) {
  try {
    if (
      typeof WebAssembly === "object" &&
      typeof WebAssembly.instantiate === "function"
    ) {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      if (module instanceof WebAssembly.Module)
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
    }
  } catch (e) {}
  return false;
}

export async function loadModules(this: Editor, modules: any) {
  const urlPrefix = "";
  const wasm = this.wasmSupported();

  for (const module of modules) {
    const glueAsset = this.app.assets.find(module.glueUrl);
    const wasmAsset = this.app.assets.find(module.wasmUrl);
    const fallbackAsset = this.app.assets.find(module.fallbackUrl);

    if (!glueAsset || !wasmAsset || !fallbackAsset) continue;

    // --- prepare asset urls
    module.glueUrl = glueAsset.getFileUrl();
    module.wasmUrl = wasmAsset.getFileUrl();
    module.fallbackUrl = fallbackAsset.getFileUrl();

    if (wasm) {
      await this.loadWasmModuleAsync(
        module.moduleName,
        urlPrefix + module.glueUrl,
        urlPrefix + module.wasmUrl
      );
    } else {
      await this.loadWasmModuleAsync(
        module.moduleName,
        urlPrefix + module.fallbackUrl,
        ""
      );
    }
    module.loaded = true;
  }
}
