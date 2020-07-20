import * as Modules from "./modules";
import * as Assets from "./assets";
import * as Scripts from "./scripts";
import * as Entities from "./entities";
import * as Systems from "./systems";

import Interface from "../interface";

declare var editor: any;

export default class Editor {
  public app: pc.Application;
  private interface: Interface;

  private appRunning: boolean;

  // --- extend class with methods
  public loadScriptAsync = Modules.loadScriptAsync.bind(this);
  public loadWasmModuleAsync = Modules.loadWasmModuleAsync.bind(this);
  public wasmSupported = Modules.wasmSupported.bind(this);
  public loadModules = Modules.loadModules.bind(this);

  public batchPreloadAssets = Assets.batchPreloadAssets.bind(this);
  public loadEditorScriptAssets = Assets.loadEditorScriptAssets.bind(this);

  public batchExecuteScripts = Scripts.batchExecuteScripts.bind(this);
  public prepareEditorScriptAttributes = Scripts.prepareEditorScriptAttributes.bind(
    this
  );

  public duplicateEntity = Entities.duplicateEntity.bind(this);
  public duplicateEntities = Entities.duplicateEntities.bind(this);

  public editorPickerState = Systems.editorPickerState.bind(this);
  public runBatcher = Systems.runBatcher.bind(this);

  constructor() {
    this.app = editor ? editor.call("viewport:app") : undefined;
    this.interface = new Interface();

    // @ts-ignore
    window.Uranus = {
      Editor: this,
    };

    this.interface.boot();
  }

  static inEditor() {
    return (
      // @ts-ignore
      window.editor !== undefined &&
      window.location.href.indexOf("launch.playcanvas.com") === -1
    );
  }

  public startAppLoop(startImmediately: boolean, updatePhysics: boolean) {
    if (!editor) return;

    if (updatePhysics) {
      // @ts-ignore
      this.app.systems.rigidbody.onLibraryLoaded();
    }

    this.appRunning = startImmediately;

    this.interface.addRunUpdateButton(
      "Update Running",
      "checkbox",
      this.appRunning,
      (state: boolean) => {
        this.appRunning = state;

        if (state === true) {
          tick();
        }
      }
    );

    // --- Make pc.Application update
    const update = (dt: number) => {
      const app = this.app;
      // @ts-ignore
      app.frame++;

      // @ts-ignore
      pc.ComponentSystem.update(dt);
      // @ts-ignore
      pc.ComponentSystem.animationUpdate(dt);
      // @ts-ignore
      pc.ComponentSystem.postUpdate(dt);

      // fire update event
      app.fire("update", dt);
    };

    const tick = () => {
      if (this.appRunning === false) return;

      const app = this.app;

      // have current application pointer in pc
      //@ts-ignore
      pc.app = app;

      //@ts-ignore
      var now = pc.now();
      //@ts-ignore
      var ms = now - (app._time || now);
      var dt = ms / 1000.0;
      dt = pc.math.clamp(dt, 0, app.maxDeltaTime);
      dt *= app.timeScale;

      //@ts-ignore
      app._time = now;

      // Submit a request to queue up a new animation frame immediately
      window.requestAnimationFrame(tick);
      editor.call("viewport:render");
      update(dt);

      if (updatePhysics === true) {
        // @ts-ignore
        this.app.systems.rigidbody.onUpdate(dt);
      }
    };

    tick();
  }
}
