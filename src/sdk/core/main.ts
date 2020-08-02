import * as Modules from "./modules";
import * as Assets from "./assets";
import * as Scripts from "./scripts";
import * as Entities from "./entities";
import * as Systems from "./systems";

import Interface from "../interface";

declare var editor: any;

export default class Editor {
  public app: pc.Application;
  public interface: Interface;

  private appRunning: boolean;
  private renderOutline: boolean = true;
  public selectionOutline: any = {};

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

  public setEntityModelOutline = Entities.setEntityModelOutline.bind(this);
  public duplicateEntity = Entities.duplicateEntity.bind(this);
  public duplicateEntities = Entities.duplicateEntities.bind(this);

  public editorPickerState = Systems.editorPickerState.bind(this);
  public runBatcher = Systems.runBatcher.bind(this);

  constructor() {
    this.app = editor ? editor.call("viewport:app") : undefined;

    this.setupOutline(this.app);

    this.interface = new Interface();

    // @ts-ignore
    window.setEntityModelOutline = Entities.setEntityModelOutline.bind(this);

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

    this.interface.logMessage("Started pc.App update loop");
  }

  private setupOutline(app: pc.Application) {
    // @ts-ignore
    const renderer = app.renderer;
    const device = renderer.device;
    const scene = app.scene;

    let targets: any = [];
    let textures: any = [];

    const createSolidTex = function (
      name: string,
      r: number,
      g: number,
      b: number,
      a: number
    ) {
      var result = new pc.Texture(app.graphicsDevice, {
        width: 1,
        height: 1,
        format: pc.PIXELFORMAT_R8_G8_B8_A8,
      });
      result.name = name;
      var pixels = result.lock();
      pixels.set(new Uint8Array([r, g, b, a]));
      result.unlock();
      return result;
    };

    const whiteTex = createSolidTex("outline-tex", 255, 255, 255, 255);

    const SHADER_OUTLINE = 24;

    // ### OVERLAY QUAD MATERIAL ###
    const chunks = pc.shaderChunks;
    const shaderFinal = chunks.createShaderFromCode(
      device,
      chunks.fullscreenQuadVS,
      chunks.outputTex2DPS,
      "outputTex2D"
    );

    // ### OUTLINE EXTEND SHADER H ###
    const shaderBlurHPS =
      " \
        precision " +
      device.precision +
      " float;\n \
        varying vec2 vUv0;\n \
        uniform float uOffset;\n \
        uniform sampler2D source;\n \
        void main(void)\n \
        {\n \
            float diff = 0.0;\n \
            vec4 pixel;\n \
            vec4 texel = texture2D(source, vUv0);\n \
            vec4 firstTexel = texel;\n \
            \n \
            pixel = texture2D(source, vUv0 + vec2(uOffset * -2.0, 0.0));\n \
            texel = max(texel, pixel);\n \
            diff = max(diff, length(firstTexel.rgb - pixel.rgb));\n \
            \n \
            pixel = texture2D(source, vUv0 + vec2(uOffset * -1.0, 0.0));\n \
            texel = max(texel, pixel);\n \
            diff = max(diff, length(firstTexel.rgb - pixel.rgb));\n \
            \n \
            pixel = texture2D(source, vUv0 + vec2(uOffset * +1.0, 0.0));\n \
            texel = max(texel, pixel);\n \
            diff = max(diff, length(firstTexel.rgb - pixel.rgb));\n \
            \n \
            pixel = texture2D(source, vUv0 + vec2(uOffset * +2.0, 0.0));\n \
            texel = max(texel, pixel);\n \
            diff = max(diff, length(firstTexel.rgb - pixel.rgb));\n \
            \n \
            gl_FragColor = vec4(texel.rgb, min(diff, 1.0));\n \
        }\n";
    const shaderBlurH = chunks.createShaderFromCode(
      device,
      chunks.fullscreenQuadVS,
      shaderBlurHPS,
      "editorOutlineH"
    );

    // ### OUTLINE EXTEND SHADER V ###
    const shaderBlurVPS =
      " \
        precision " +
      device.precision +
      " float;\n \
        varying vec2 vUv0;\n \
        uniform float uOffset;\n \
        uniform sampler2D source;\n \
        void main(void)\n \
        {\n \
            vec4 pixel;\n \
            vec4 texel = texture2D(source, vUv0);\n \
            vec4 firstTexel = texel;\n \
            float diff = texel.a;\n \
            \n \
            pixel = texture2D(source, vUv0 + vec2(0.0, uOffset * -2.0));\n \
            texel = max(texel, pixel);\n \
            diff = max(diff, length(firstTexel.rgb - pixel.rgb));\n \
            \n \
            pixel = texture2D(source, vUv0 + vec2(0.0, uOffset * -1.0));\n \
            texel = max(texel, pixel);\n \
            diff = max(diff, length(firstTexel.rgb - pixel.rgb));\n \
            \n \
            pixel = texture2D(source, vUv0 + vec2(0.0, uOffset * +1.0));\n \
            texel = max(texel, pixel);\n \
            diff = max(diff, length(firstTexel.rgb - pixel.rgb));\n \
            \n \
            pixel = texture2D(source, vUv0 + vec2(0.0, uOffset * +2.0));\n \
            texel = max(texel, pixel);\n \
            diff = max(diff, length(firstTexel.rgb - pixel.rgb));\n \
            \n \
            gl_FragColor = vec4(texel.rgb, min(diff, 1.0));\n \
        }\n";
    const shaderBlurV = chunks.createShaderFromCode(
      device,
      chunks.fullscreenQuadVS,
      shaderBlurVPS,
      "editorOutlineV"
    );

    // ### SETUP THE LAYER ###
    const viewportLayer = app.scene.layers.getLayerByName("UI");
    viewportLayer.onPostRender = function () {
      var uColorBuffer = device.scope.resolve("source");
      uColorBuffer.setValue(textures[0]);
      device.setBlending(true);
      device.setBlendFunction(
        pc.BLENDMODE_SRC_ALPHA,
        pc.BLENDMODE_ONE_MINUS_SRC_ALPHA
      );
      pc.drawQuadWithShader(device, null, shaderFinal, null, null, true);
    };

    const outlineLayer = new pc.Layer({
      name: "Outline",
      opaqueSortMode: pc.SORTMODE_NONE,
      passThrough: true,
      overrideClear: true,
      clearColorBuffer: true,
      clearDepthBuffer: true,
      clearColor: new pc.Color(0, 0, 0, 0),
      shaderPass: SHADER_OUTLINE,

      onPostRender: function () {
        // extend pass X
        var uOffset = device.scope.resolve("uOffset");
        var uColorBuffer = device.scope.resolve("source");
        uOffset.setValue(1.0 / device.width / 2.0);
        uColorBuffer.setValue(textures[0]);
        pc.drawQuadWithShader(device, targets[1], shaderBlurH);

        // extend pass Y
        uOffset.setValue(1.0 / device.height / 2.0);
        uColorBuffer.setValue(textures[1]);
        pc.drawQuadWithShader(device, targets[0], shaderBlurV);
      },
    });
    const outlineComp = new pc.LayerComposition();
    outlineComp.pushOpaque(outlineLayer);

    const onUpdateShaderOutline = function (options: any) {
      if (options.pass !== SHADER_OUTLINE) return options;
      var outlineOptions = {
        opacityMap: options.opacityMap,
        opacityMapUv: options.opacityMapUv,
        opacityMapChannel: options.opacityMapChannel,
        opacityMapTransform: options.opacityMapTransform,
        opacityVertexColor: options.opacityVertexColor,
        opacityVertexColorChannel: options.opacityVertexColorChannel,
        vertexColors: options.vertexColors,
        alphaTest: options.alphaTest,
        skin: options.skin,
      };
      return outlineOptions;
    };

    // --- render loop
    app.on("update", (dt) => {
      // ### INIT/RESIZE RENDERTARGETS ###
      if (
        targets[0] &&
        (targets[0].width !== device.width ||
          targets[1].height !== device.height)
      ) {
        for (var i = 0; i < 2; i++) {
          targets[i].destroy();
          textures[i].destroy();
        }
        targets = [];
        textures = [];
      }
      if (!targets[0]) {
        for (var i = 0; i < 2; i++) {
          textures[i] = new pc.Texture(device, {
            format: pc.PIXELFORMAT_R8_G8_B8_A8,
            width: device.width,
            height: device.height,
          });
          textures[i].minFilter = pc.FILTER_NEAREST;
          textures[i].magFilter = pc.FILTER_NEAREST;
          textures[i].addressU = pc.ADDRESS_CLAMP_TO_EDGE;
          textures[i].addressV = pc.ADDRESS_CLAMP_TO_EDGE;

          // @ts-ignore
          targets[i] = new pc.RenderTarget(device, textures[i]);
        }
      }

      const camera = editor.call("camera:current").camera;

      if (this.renderOutline) {
        // ### RENDER COLORED MESHINSTANCES TO RT0 ###

        outlineLayer.renderTarget = targets[0];
        outlineLayer.clearMeshInstances();

        //@ts-ignore
        if (outlineLayer.cameras[0] !== camera) {
          outlineLayer.clearCameras();
          outlineLayer.addCamera(camera);
        }

        // @ts-ignore
        var meshInstances = outlineLayer.opaqueMeshInstances;

        for (let i in this.selectionOutline) {
          if (!this.selectionOutline[i]) continue;

          var selection = this.selectionOutline[i];

          var model = selection.entity.model;
          if (!model || !model.model) continue;

          var meshes = model.meshInstances;
          for (var m = 0; m < meshes.length; m++) {
            var instance = meshes[m];

            //if (! instance.command && instance.drawToDepth && instance.material && instance.layer === pc.LAYER_WORLD) {
            if (!instance.command && instance.material) {
              instance.onUpdateShader = onUpdateShaderOutline;
              instance.setParameter(
                "material_emissive",
                selection.color,
                1 << SHADER_OUTLINE
              );
              instance.setParameter(
                "texture_emissiveMap",
                whiteTex,
                1 << SHADER_OUTLINE
              );
              meshInstances.push(instance);
            }
          }
        }

        // @ts-ignore
        app.renderer.renderComposition(outlineComp);
      }
    });
  }
}
