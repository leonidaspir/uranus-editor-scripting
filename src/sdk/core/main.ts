import * as Modules from "./modules";
import * as Assets from "./assets";
import * as Scripts from "./scripts";
import * as Entities from "./entities";

declare var editor: any;

export default class Editor {
  public app: pc.Application;

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

  constructor() {
    this.app = editor ? editor.call("viewport:app") : undefined;

    // @ts-ignore
    window.Uranus = {
      Editor: this,
    };
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
