declare var editor: any;

if (editor) {
  editor.on("scene:load", function () {
    window.setTimeout(function () {
      const app = editor.call("viewport:app");

      // --- we attempt to find if the uranus editor loader is included
      const item = editor.call("assets:findOne", function (asset) {
        return (
          asset.get("type") === "script" &&
          asset.get("name") === "uranus-editor-sdk.js"
        );
      });

      if (!item) return;

      const asset = app.assets.get(item[1].get("id"));

      if (asset) {
        // --- if the loader is included, we load its contents and execute them
        const localUrl = asset.getFileUrl();

        fetch(localUrl).then(async (response) => {
          const code = await response.text();

          console.log("Uranus.Extension injecting editor loader");

          const script = document.createElement("script");
          script.innerHTML = code;
          document.head.appendChild(script);
        });
      }
    }, 1000);
  });
}
