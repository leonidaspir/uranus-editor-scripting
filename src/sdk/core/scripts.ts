import Editor from "./main";

declare var editor: any;

export async function batchExecuteScripts(this: Editor) {
  if (!editor) return;

  const scriptTypes = editor.call("assets:scripts:list");

  await this.loadEditorScriptAssets(scriptTypes);

  await this.batchPreloadAssets({
    exclude: ["script", "wasm"],
  });

  // --- we loop through the entity hierarchy to execute the scripts in order
  const entities = editor.call("entities:list");
  const scriptInstances: any = {};

  for (const item of entities) {
    const scripts = item.get("components.script.scripts");

    if (!scripts) continue;

    for (const scriptType in scripts) {
      // --- we load only scripts with an inEditor attribute set to true
      const inEditor = item.get(
        `components.script.scripts.${scriptType}.attributes.inEditor`
      );

      if (inEditor === null) continue;

      const entity = item.entity;

      if (!entity.script) {
        entity.addComponent("script");
      }

      if (entity.script[scriptType]) {
        entity.script.destroy(scriptType);
      }

      const instance = entity.script.create(scriptType, {
        enabled: false,
      });

      this.prepareEditorScriptAttributes(instance);
      instance.enabled = inEditor;

      if (typeof instance["editorInitialize"] === "function") {
        instance["editorInitialize"]();
      }

      let instanceRef = scriptInstances[item.get("resource_id")];

      if (!instanceRef) {
        scriptInstances[item.get("resource_id")] = {
          instances: [instance],
          scriptTypes: [scriptType],
        };
      } else {
        instanceRef.instances.push(instance);
        instanceRef.scriptTypes.push(scriptType);
      }
    }
  }

  // --- subscribe to inspector render event to provide UI extension to editor scripts
  editor.on("attributes:inspect[entity]", (items: any) => {
    const resource_id = items[0].get("resource_id");

    // --- each time the Playcanvas inspector opens, the script component DOM is re-rendered
    // --- we find the element and pass it to the script editor callback, if requested
    if (scriptInstances[resource_id]) {
      const instancesRef = scriptInstances[resource_id];
      const panelComponents = editor.call("attributes:entity.panelComponents");

      instancesRef.scriptTypes.forEach((scriptType: string, index: number) => {
        const nodeList = Array.from(
          panelComponents.dom.querySelectorAll(".pcui-panel-header-title")
        );

        let element: any = nodeList.find(
          (el: any) => el.textContent === scriptType
        );

        if (element) {
          try {
            element = element.parentElement.nextSibling;

            if (element) {
              const instance = instancesRef.instances[index];

              if (typeof instance["editorScriptPanelRender"] === "function") {
                instance["editorScriptPanelRender"](element);
              }
            }
          } catch (error) {}
        }
      });
    }
  });
}

export function prepareEditorScriptAttributes(script: any) {
  if (!editor) return;

  // --- check if we are running in editor to prepare the attributes
  const item = editor.call("entities:get", script.entity._guid);

  const path =
    "components.script.scripts." + script.__scriptType.__name + ".attributes";
  const settings = item.get(path);
  const properties = [];

  for (let property in settings) {
    script[property] = settings[property];

    properties.push(property);
  }

  // --- attach an attr on change listener
  properties.forEach(
    function (property: string) {
      const raw: any = item.getRaw(path + "." + property);

      let times = 0;
      const isArray = Array.isArray(raw);

      if (isArray) {
        times += raw.length;
      } else {
        times = 1;
      }

      for (let i = 0; i < times; i++) {
        const setPath =
          path + "." + property + (isArray ? `.${i}` : "") + ":set";

        item.on(
          setPath,
          function (value: any, valueOld: any) {
            if (isArray) {
              // --- find the correct key for the object
              const obj = script[property];
              let keys;
              if (isNaN(obj.x) === false) {
                keys = ["x", "y", "z", "w"];
              } else if (isNaN(obj.r) === false) {
                keys = ["r", "g", "b", "a"];
              }

              obj[keys[i]] = value;
            } else {
              script[property] = value;
            }

            script.fire("attr:" + property, script[property], valueOld);

            if (typeof script["editorAttrChange"] === "function") {
              script["editorAttrChange"](property, script[property], valueOld);
            }
          }.bind(script)
        );
      }
    }.bind(script)
  );
}
