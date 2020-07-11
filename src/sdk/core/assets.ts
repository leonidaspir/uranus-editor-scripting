import Editor from "./main";

declare var editor: any;

export async function batchPreloadAssets(this: Editor, options: any) {
  const items = editor.call("assets:find", (asset: any) => {
    // --- check if the type is accepted
    const type = asset.get("type");

    if (asset.get("preload") === false) return false;

    if (!options || (options.exclude && options.exclude.indexOf(type) === -1)) {
      return true;
    } else {
      return false;
    }
  });

  const promises: Promise<any>[] = [];

  items.forEach((itemArr: any) => {
    const item = itemArr[1];
    const asset = this.app.assets.get(item.get("id"));

    if (!asset || asset.loaded === true) return true;

    const promise = new Promise((resolve, reject) => {
      asset.ready(resolve);

      asset.on("error", reject);

      this.app.assets.load(asset);
    });

    promises.push(promise);
  });

  await Promise.all(promises);
}

export async function loadEditorScriptAssets(
  this: Editor,
  scriptTypes: string[]
) {
  if (!editor) return;

  const promises = [];

  for (const scriptType of scriptTypes) {
    const item = editor.call("assets:scripts:assetByScript", scriptType);

    const asset = this.app.assets.get(item.get("id"));

    const promise = new Promise((resolve) => {
      asset.ready(resolve);
      this.app.assets.load(asset);
    });
    promises.push(promise);
  }

  await Promise.all(promises);
}
