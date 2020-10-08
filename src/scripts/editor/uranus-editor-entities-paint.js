// --- dependencies
// msgpack.js
// ----------------
// ToDo don't remove model component if not explicitely added
var UranusEditorEntitiesPaint = pc.createScript("uranusEditorEntitiesPaint");

UranusEditorEntitiesPaint.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusEditorEntitiesPaint.attributes.add("spawnEntity", {
  type: "entity",
  title: "Spawn Entity",
});

UranusEditorEntitiesPaint.attributes.add("itemsPerStroke", {
  type: "number",
  default: 1,
  title: "Items Per Stroke",
});

UranusEditorEntitiesPaint.attributes.add("brushDistance", {
  type: "number",
  default: 10,
  min: 0.01,
  title: "Brush Distance",
});
UranusEditorEntitiesPaint.attributes.add("brushRadius", {
  type: "number",
  default: 10,
  min: 0.01,
  title: "Brush Radius",
});
UranusEditorEntitiesPaint.attributes.add("scaleMinMax", {
  type: "vec2",
  default: [0.8, 1.2],
  title: "Scale Min/Max",
});
UranusEditorEntitiesPaint.attributes.add("posOffset", {
  type: "vec3",
  default: [0.0, 0.0, 0.0],
  title: "Pos Offset",
});

UranusEditorEntitiesPaint.attributes.add("projectOffset", {
  type: "boolean",
  default: true,
  title: "Project Offset",
  description:
    "If enabled the offset will be projected to the final calculated scale of the instance.",
});

UranusEditorEntitiesPaint.attributes.add("rotateThem", {
  type: "string",
  enum: [
    { None: "none" },
    { "X axis": "x" },
    { "Y axis": "y" },
    { "Z axis": "z" },
  ],
  default: "y",
  title: "Rotate Them",
});
UranusEditorEntitiesPaint.attributes.add("alignThem", {
  type: "boolean",
  default: false,
  title: "Align To Surface",
});

UranusEditorEntitiesPaint.attributes.add("removeComponents", {
  type: "string",
  default: "model",
  title: "Remove Components",
  description:
    "A comma separated list of entity compoments to be removed when spawning an instance. When using HW instancing the model component should be removed.",
});

UranusEditorEntitiesPaint.attributes.add("streamingFile", {
  type: "asset",
  title: "Streaming File",
  description:
    "If a json or binary asset file is provided, instead of spawning new entities in the hierarchy, all translation info will be saved to the file. This is ideal when spawning a huge number of static instances.",
});

UranusEditorEntitiesPaint.attributes.add("streamingPrecision", {
  type: "number",
  default: 1e3,
  title: "Streaming Precision",
  description:
    "Less digits provide smaller precision but also smaller file sizes",
});

UranusEditorEntitiesPaint.attributes.add("playcanvasToken", {
  type: "string",
  title: "Playcanvas Token",
  description:
    "A valid Playcanvas Rest API access token to be used for updating the streaming file.",
});

UranusEditorEntitiesPaint.attributes.add("hardwareInstancing", {
  type: "boolean",
  default: false,
  title: "Hardware Instancing",
});

UranusEditorEntitiesPaint.attributes.add("cullingCamera", {
  type: "entity",
  title: "Culling Camera",
});

UranusEditorEntitiesPaint.attributes.add("cellSize", {
  type: "vec3",
  default: [10, 10, 10],
  title: "Cell Size",
});

UranusEditorEntitiesPaint.attributes.add("hideAfter", {
  type: "number",
  default: 0,
  title: "Far Clip",
  description:
    "Cull the instance after a distance from camera. Set to 0 to disable.",
});

UranusEditorEntitiesPaint.attributes.add("perInstanceCull", {
  type: "boolean",
  default: true,
  title: "Per Instance Cull",
  description:
    "If enabled instances will be culled based only on the visibility of their current cell. This is a great way to increase performance when a huge number of instances is parsed.",
});

UranusEditorEntitiesPaint.attributes.add("useLOD", {
  type: "boolean",
  default: false,
  title: "Use LOD",
  description:
    "A LOD system that works only when HW instancing is enabled. All LOD levels should be added as a first level entity to the spawn instance, with a model component and the 'uranus-lod-entity' tag.",
});

UranusEditorEntitiesPaint.attributes.add("lodLevels", {
  type: "vec3",
  default: [30, 50, 70],
  title: "LOD Levels",
});

UranusEditorEntitiesPaint.attributes.add("lodThreshold", {
  type: "number",
  default: 0.9,
  title: "LOD Threshold",
  description:
    "The amount of distance range where two LODs can overlap. Useful when doing LOD fade in/out effects.",
});

UranusEditorEntitiesPaint.attributes.add("isStatic", {
  type: "boolean",
  default: false,
  title: "Is Static",
  description:
    "When hardware instancing is enabled, checking this flag will provide a performance increase since no translations will be updated on runtime. It requires a culling camera to be referenced and Per Intance Cull to be enabled.",
});

UranusEditorEntitiesPaint.attributes.add("densityReduce", {
  type: "number",
  default: 0,
  title: "Density Reduce",
  min: 0,
  precision: 0,
  description:
    "Number of instances to be skipped for each instance rendered, useful to increase the performance in lower end devices.",
});

UranusEditorEntitiesPaint.attributes.add("densityIncrease", {
  type: "number",
  default: 0,
  title: "Density Increase",
  min: 0,
  precision: 0,
  description:
    "Number of instances to be randomnly added for each data instance, useful to increase complexity without massive data sets. Works only when streaming data.",
});

UranusEditorEntitiesPaint.attributes.add("densityIncreaseRadius", {
  type: "number",
  default: 0,
  title: "Density Increase Radius",
  description:
    "The radius at which to spawn a random instance using the data instance as center.",
});

UranusEditorEntitiesPaint.attributes.add("densityIncreaseRaycast", {
  type: "boolean",
  default: true,
  title: "Density Increase Raycast",
  description:
    "If set to true a physics raycast will be cast to get the Y pos with accuracy, otherwise the same height will be used.",
});

UranusEditorEntitiesPaint.zeroBuffer = new Float32Array();

UranusEditorEntitiesPaint.prototype.initialize = function () {
  this.vec = new pc.Vec3();
  this.vec1 = new pc.Vec3();
  this.vec2 = new pc.Vec3();
  this.vec3 = new pc.Vec3();
  this.vec4 = new pc.Vec3();
  this.vec5 = new pc.Vec3();
  this.quat = new pc.Quat();
  this.matrix = new pc.Mat4();
  this.randomPosition = new pc.Vec3();

  this.vecOne = new pc.Vec3(1, 1, 1);

  this.tempSphere = { center: null, radius: 0.5 };

  this.lodDistance = [
    this.lodLevels.x * this.lodLevels.x,
    this.lodLevels.y * this.lodLevels.y,
    this.lodLevels.z * this.lodLevels.z,
  ];
  this.lodDistanceRaw = [
    this.lodLevels.x,
    this.lodLevels.y,
    this.lodLevels.z,
    this.hideAfter,
  ];

  this.spawnEntities = [];
  this.meshInstances = undefined;

  this.instanceData = {
    name: undefined,
    position: new pc.Vec3(),
    rotation: new pc.Quat(),
    scale: new pc.Vec3(),
  };

  this.hiddenCamera = this.cullingCamera
    ? this.cullingCamera.clone()
    : undefined;

  if (this.hideAfter > 0 && this.hiddenCamera) {
    this.hiddenCamera.camera.farClip = this.hideAfter;
    this.cells = undefined;
  }

  // --- load first any streaming data available
  this.hwReady = false;

  this.loadStreamingData(this.streamingFile).then(
    function (streamingData) {
      this.streamingData = streamingData;

      this.hwReady = true;

      if (this.hardwareInstancing) {
        // const p1 = performance.now();
        this.prepareHardwareInstancing();
        // const p2 = performance.now();
        // const diff = p2 - p1;
        // console.log(this.entity.name, diff.toFixed(2));
      }
    }.bind(this)
  );

  // --- events
  if (Uranus.Editor.inEditor() === false) {
    this.on("attr", this.editorAttrChange, this);
  }

  this.on(
    "state",
    function (enabled) {
      if (!this.hwReady) {
        return false;
      }

      if (this.hardwareInstancing) {
        if (enabled) {
          this.prepareHardwareInstancing();
        } else {
          this.clearInstances();
        }
      }
    },
    this
  );
};

UranusEditorEntitiesPaint.prototype.update = function (dt) {
  if (this.hardwareInstancing) {
    //const p1 = performance.now();
    this.cullHardwareInstancing();
    // const p2 = performance.now();
    // const diff = p2 - p1;
    // console.log(diff.toFixed(2));
  }
};

UranusEditorEntitiesPaint.prototype.editorInitialize = function () {
  // --- variables
  this.buildButtonState = false;
  this.eraseButtonState = false;
  this.building = false;
  this.mouseDown = false;
  this.currentPosition = new pc.Vec3();
  this.randomPosition = new pc.Vec3();
  this.lastPosition = new pc.Vec3();

  this.x = new pc.Vec3();
  this.y = new pc.Vec3();
  this.z = new pc.Vec3();

  this.parentItem = undefined;
  this.keyUpListener = undefined;

  // --- gizmo material
  this.gizmoMaterial = new pc.StandardMaterial();
  this.gizmoMaterial.blendType = pc.BLEND_NORMAL;
  this.gizmoMaterial.emissive = new pc.Vec3(1, 1, 1);
  this.gizmoMaterial.emissiveInstensity = 10;
  this.gizmoMaterial.opacity = 0.25;
  this.gizmoMaterial.useLighting = false;

  this.gizmoMaterial.update();

  // --- prepare components to remove
  this.prepareComponentsToClear(this.removeComponents);

  // --- add custom CSS
  var sheet = window.document.styleSheets[0];
  sheet.insertRule(
    ".active-entities-painter-button { background-color: #f60 !important; color: white !important; }",
    sheet.cssRules.length
  );
};

UranusEditorEntitiesPaint.prototype.prepareComponentsToClear = function (
  value
) {
  this.componentsToClear = [];

  if (value && value.length > 0) {
    value
      .replace(/\s+/, "")
      .split(",")
      .forEach(
        function (componentName) {
          this.componentsToClear.push(componentName);
        }.bind(this)
      );
  }
};

// --- editor script methods
UranusEditorEntitiesPaint.prototype.editorScriptPanelRender = function (
  element
) {
  var containerEl = element.firstChild;

  // --- bake button the instances as editor items
  var btnBuild = new ui.Button({
    text: "+ Paint",
  });

  btnBuild.on(
    "click",
    function () {
      if (this.eraseButtonState === true) {
        this.eraseButtonState = false;
        this.setEraseState(btnErase);
      }

      this.buildButtonState = !this.buildButtonState;
      this.setBuildingState(btnBuild);
    }.bind(this)
  );
  containerEl.append(btnBuild.element);

  this.setBuildingState(btnBuild, true);

  var btnErase = new ui.Button({
    text: "- Erase",
  });

  btnErase.on(
    "click",
    function () {
      if (this.buildButtonState === true) {
        this.buildButtonState = false;
        this.setBuildingState(btnBuild);
      }

      this.eraseButtonState = !this.eraseButtonState;
      this.setEraseState(btnErase);
    }.bind(this)
  );
  containerEl.append(btnErase.element);

  this.setEraseState(btnErase, true);

  // --- update HW instances button
  var btnUpdateInstances = new ui.Button({
    text: "+ Update HW Instances",
  });

  btnUpdateInstances.on("click", this.prepareHardwareInstancing.bind(this));
  containerEl.append(btnUpdateInstances.element);

  // --- spawn binary asset
  var btnCreateBinary = new ui.Button({
    text: "+ Add Binary Asset",
  });

  btnCreateBinary.on(
    "click",
    function () {
      editor.call("assets:create", {
        type: "binary",
        name: this.entity.name + " Binary",
        preload: true,
        file: new Blob(["[]"], { type: "application/octet-stream" }),
      });
    }.bind(this)
  );
  containerEl.append(btnCreateBinary.element);

  // --- clear button for removing all entity children
  var btnClearInstances = new ui.Button({
    text: "- Clear All Instances",
  });

  btnClearInstances.on("click", this.clearEditorInstances.bind(this));
  containerEl.append(btnClearInstances.element);
};

UranusEditorEntitiesPaint.prototype.editorAttrChange = function (
  property,
  value
) {
  if (Uranus.Editor.inEditor()) {
    if (this.building) {
      this.setGizmoState(false);
      this.setGizmoState(true);
    }

    if (property === "removeComponents") {
      this.prepareComponentsToClear(value);
    }
  }

  if (property === "streamingFile") {
    this.loadStreamingData(value).then(
      function (data) {
        this.streamingData = data;

        this.prepareHardwareInstancing();
      }.bind(this)
    );
  }

  if (property === "hardwareInstancing") {
    this.prepareHardwareInstancing();
  }

  if (this.cullingCamera && property === "hideAfter") {
    var hideAfter = value;

    this.hiddenCamera.camera.farClip =
      hideAfter > 0 ? hideAfter : this.cullingCamera.camera.farClip;

    this.lodDistanceRaw[3] = value;

    if (this.hardwareInstancing) {
      this.prepareHardwareInstancing();
    }
  }

  if (property === "lodLevels") {
    this.lodDistance = [
      value.x * value.x,
      value.y * value.y,
      value.z * value.z,
    ];
    this.lodDistanceRaw = [value.x, value.y, value.z, this.hideAfter];
  }
};

UranusEditorEntitiesPaint.prototype.setBuildingState = function (
  btnBuild,
  dontTrigger
) {
  if (this.buildButtonState) {
    if (!dontTrigger) this.startBuilding();

    btnBuild.element.classList.add("active-entities-painter-button");
  } else {
    if (!dontTrigger) this.stopBuilding();

    btnBuild.element.classList.remove("active-entities-painter-button");
  }
};

UranusEditorEntitiesPaint.prototype.setEraseState = function (
  btnErase,
  dontTrigger
) {
  if (this.eraseButtonState) {
    if (!dontTrigger) this.startBuilding();

    btnErase.element.classList.add("active-entities-painter-button");
  } else {
    if (!dontTrigger) this.stopBuilding();

    btnErase.element.classList.remove("active-entities-painter-button");
  }
};

UranusEditorEntitiesPaint.prototype.startBuilding = function () {
  if (this.building === true || !this.spawnEntity) return;
  this.building = true;

  Uranus.Editor.editorPickerState(false);

  // --- keep track of the parent holder item
  var items = editor.call("selector:items");
  this.parentItem = items[0];

  // --- enable input handlers
  this.setInputState(true);

  // --- enable gizmo
  this.setGizmoState(true);

  // --- clear history to allow undo/redo to work without selecting a different entity
  var history = editor.call("editor:history");
  history.clear();
};

UranusEditorEntitiesPaint.prototype.stopBuilding = function () {
  if (this.building === false) return;
  this.building = false;

  Uranus.Editor.editorPickerState(true);

  // --- disable input handlers
  this.setInputState(false);

  // --- disable gizmo
  this.setGizmoState(false);

  // --- if we are streaming the data, update the file
  if (this.streamingFile) {
    this.saveStreamingData();
  }
};

UranusEditorEntitiesPaint.prototype.setGizmoState = function (state) {
  if (state === true) {
    this.gizmo = new pc.Entity("Gizmo Sphere");
    this.gizmo.addComponent("model", {
      type: "sphere",
      castShadows: false,
      receiveShadows: false,
    });
    this.gizmo.model.material = this.gizmoMaterial;
    this.gizmo.setLocalScale(
      this.brushDistance * 2,
      this.brushDistance * 2,
      this.brushDistance * 2
    );
    this.app.root.addChild(this.gizmo);
  } else {
    if (this.gizmo) {
      this.gizmo.destroy();
    }
  }
};

UranusEditorEntitiesPaint.prototype.setInputState = function (state) {
  var history = editor.call("editor:history");

  if (state === true) {
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);

    this.historyUndoRef = this.onHistoryUndo.bind(this);
    this.historyRedoRef = this.onHistoryRedo.bind(this);

    history.on("undo", this.historyUndoRef);
    history.on("redo", this.historyRedoRef);
  } else {
    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);

    history.unbind("undo", this.historyUndoRef);
    history.unbind("redo", this.historyRedoRef);
  }
};

UranusEditorEntitiesPaint.prototype.onHistoryUndo = function () {
  // --- update renderer if required
  if (this.hardwareInstancing) {
    this.prepareHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.onHistoryRedo = function () {
  // --- update renderer if required
  if (this.hardwareInstancing) {
    this.prepareHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.onMouseDown = function (e) {
  if (e.button !== pc.MOUSEBUTTON_LEFT) {
    return false;
  }

  // ToDo make it an Uranus.Editor method
  editor.emit("camera:toggle", false);

  this.mouseDown = true;

  this.lastPosition.set(Infinity, Infinity, Infinity);
};

UranusEditorEntitiesPaint.prototype.onMouseMove = function (e) {
  if (this.building === false || this.mouseDown === false) {
    return false;
  }

  this.parseMousePoint(e.x, e.y);
};

UranusEditorEntitiesPaint.prototype.onKeyUp = function (e) {
  switch (e.keyCode) {
    case pc.KEY_R:
      this.rotateBrushEntity();
      break;
  }
};

UranusEditorEntitiesPaint.prototype.onMouseUp = function (e) {
  editor.emit("camera:toggle", true);

  if (e.button === pc.MOUSEBUTTON_LEFT) {
    this.parseMousePoint(e.x, e.y);
  }
  this.mouseDown = false;
};

UranusEditorEntitiesPaint.prototype.parseMousePoint = function (
  screenPosX,
  screenPosY
) {
  var camera = editor.call("camera:current").camera;

  var start = camera.screenToWorld(screenPosX, screenPosY, camera.nearClip);
  var end = camera.screenToWorld(screenPosX, screenPosY, camera.farClip);

  var result = this.app.systems.rigidbody.raycastFirst(start, end);

  if (result) {
    // --- update the gizmo position
    if (this.gizmo) {
      this.gizmo.setPosition(result.point);
    }

    // --- check if we are painting or erasing
    if (this.buildButtonState) {
      this.spawnEntityInPoint(result.point, result.normal);
    } else if (this.eraseButtonState) {
      this.clearEntitiesInPoint(result.point);
    }
  }
};

UranusEditorEntitiesPaint.prototype.clearEntitiesInPoint = function (point) {
  var center = this.vec.copy(point);

  if (this.streamingData.length === 0) {
    if (!this.parentItem) {
      return false;
    }

    // --- iterate the instances and remove ones in the bounding area
    this.parentItem.get("children").forEach(
      function (guid) {
        var item = editor.call("entities:get", guid);

        if (
          item &&
          center.distance(item.entity.getPosition()) <= this.brushDistance
        ) {
          editor.call("entities:removeEntity", item);
        }
      }.bind(this)
    );
  } else {
    // --- get a list of all instances
    var instances = this.filterInstances(null, null);

    instances.forEach(
      function (instanceIndex) {
        var instance = this.getInstanceData(instanceIndex);

        if (center.distance(instance.position) <= this.brushDistance) {
          this.streamingData.splice(instanceIndex, 10);
        }
      }.bind(this)
    );
  }

  // --- update renderer if required
  if (this.hardwareInstancing) {
    this.prepareHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.spawnEntityInPoint = function (
  point,
  normal
) {
  this.currentPosition.set(point.x, point.y, point.z);

  // check if we are away of the config radius
  if (this.currentPosition.distance(this.lastPosition) < this.brushDistance) {
    return false;
  }

  let count = 0;

  // check how many items we will be creating
  if (this.itemsPerStroke > 1) {
    for (var i = 1; i <= this.itemsPerStroke; i++) {
      this.getRandomPositionInRadius(this.currentPosition, this.brushRadius);

      // --- get elevation under the point
      this.vec.set(
        this.randomPosition.x,
        this.randomPosition.y + 10000,
        this.randomPosition.z
      );
      this.vec1.set(
        this.randomPosition.x,
        this.randomPosition.y - 10000,
        this.randomPosition.z
      );

      var result = this.app.systems.rigidbody.raycastFirst(this.vec, this.vec1);

      if (result) {
        this.randomPosition.y = result.point.y;
      } else {
        this.randomPosition.y = this.currentPosition.y;
      }

      count++;
      this.createItem(this.randomPosition, normal);
    }
  } else {
    count++;
    this.createItem(this.currentPosition, normal);
  }

  this.lastPosition.set(point.x, point.y, point.z);

  Uranus.Editor.interface.logMessage(
    'Entities Painter spawned <strong style="color: lightred;">' +
      count +
      '</strong> instances for <strong style="color: cyan;">' +
      this.entity.name +
      "</strong>"
  );

  // --- update renderer if required
  if (this.hardwareInstancing) {
    this.prepareHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.getRandomPositionInRadius = function (
  center,
  radius
) {
  var a = Math.random();
  var b = Math.random();

  this.randomPosition.x =
    center.x + b * radius * Math.cos((2 * Math.PI * a) / b);
  this.randomPosition.z =
    center.z + b * radius * Math.sin((2 * Math.PI * a) / b);

  return this.randomPosition;
};

UranusEditorEntitiesPaint.prototype.createItem = function (position, normal) {
  if (!this.parentItem) {
    return false;
  }

  // --- find bank item
  var bankItem = editor.call("entities:get", this.spawnEntity._guid);
  var bankChildren = bankItem.get("children");
  var bankIndex = 0;
  if (bankChildren && bankChildren.length > 0) {
    bankIndex = Math.floor(Math.random() * bankChildren.length);
    var randomGuid = bankChildren[bankIndex];
    bankItem = editor.call("entities:get", randomGuid);
  }

  if (!bankItem) {
    return false;
  }

  var item;
  var referenceEntity = bankItem.entity;

  // --- if we are using HW instancing, we spawn an empty entity (no model or other components)
  // if (this.hardwareInstancing) {
  //   item = editor.call("entities:new", {
  //     name: bankItem.entity.name,
  //     parent: this.parentItem,
  //     noHistory: false,
  //     noSelect: true,
  //   });
  //   item.set("enabled", false);
  //   referenceEntity = bankItem.entity;
  // } else {
  //   item = Uranus.Editor.duplicateEntities([bankItem], this.parentItem)[0];
  //   referenceEntity = item.entity;
  // }

  if (!this.streamingFile) {
    item = Uranus.Editor.duplicateEntities([bankItem], this.parentItem)[0];
    //referenceEntity = item.entity;

    // --- remove components
    this.componentsToClear.forEach(function (componentName) {
      item.unset("components." + componentName);
    });

    // --- clear LOD children if we use HW instancing and LOD is enabled
    if (this.hardwareInstancing === true && this.useLOD) {
      item.get("children").forEach(function (child) {
        var removeEntity = editor.call("entities:get", child);

        if (!removeEntity || removeEntity.get("name").indexOf("_LOD") === -1)
          return;

        editor.call("entities:removeEntity", removeEntity);
      });
    }
  }

  // --- rotate or align them
  var angles = this.getBrushAngles(referenceEntity, normal);

  // --- scale them up
  var scale = this.getBrushScale(referenceEntity);

  // --- position + offset
  var finalPosition = this.getBrushPosition(position, scale);

  if (!this.streamingFile) {
    item.history.enabled = false;

    item.set("enabled", true);
    item.set("position", [finalPosition.x, finalPosition.y, finalPosition.z]);
    item.set("rotation", [angles.x, angles.y, angles.z]);
    item.set("scale", [scale.x, scale.y, scale.z]);

    item.history.enabled = true;
  } else {
    // --- save streaming info
    this.streamingData.push(bankIndex);
    this.streamingData.push(
      this.roundNumber(finalPosition.x, this.streamingPrecision)
    );
    this.streamingData.push(
      this.roundNumber(finalPosition.y, this.streamingPrecision)
    );
    this.streamingData.push(
      this.roundNumber(finalPosition.z, this.streamingPrecision)
    );
    this.streamingData.push(
      this.roundNumber(angles.x, this.streamingPrecision)
    );
    this.streamingData.push(
      this.roundNumber(angles.y, this.streamingPrecision)
    );
    this.streamingData.push(
      this.roundNumber(angles.z, this.streamingPrecision)
    );
    this.streamingData.push(this.roundNumber(scale.x, this.streamingPrecision));
    this.streamingData.push(this.roundNumber(scale.y, this.streamingPrecision));
    this.streamingData.push(this.roundNumber(scale.z, this.streamingPrecision));
  }
};

UranusEditorEntitiesPaint.prototype.getBrushPosition = function (
  position,
  scale
) {
  var offset = this.vec4.copy(this.posOffset);

  // --- if required project offset to scale
  if (this.projectOffset) {
    offset.x *= scale.x;
    offset.y *= scale.y;
    offset.z *= scale.z;
  }

  return this.vec5.set(
    position.x + offset.x,
    position.y + offset.y,
    position.z + offset.z
  );
};

UranusEditorEntitiesPaint.prototype.getBrushScale = function (referenceEntity) {
  var scale = this.vec.copy(referenceEntity.getLocalScale());
  var newScaleFactor = pc.math.random(this.scaleMinMax.x, this.scaleMinMax.y);
  scale.scale(newScaleFactor);

  return scale;
};

UranusEditorEntitiesPaint.prototype.getBrushAngles = function (
  referenceEntity,
  normal
) {
  var angles = this.vec1;
  if (this.alignThem) {
    // --- align in the direction of the hit normal
    this.setMat4Forward(this.matrix, normal, pc.Vec3.UP);
    this.quat.setFromMat4(this.matrix);
    angles
      .copy(this.quat.getEulerAngles())
      .sub(referenceEntity.getLocalEulerAngles());
  } else {
    angles.copy(referenceEntity.getLocalEulerAngles());
  }
  switch (this.rotateThem) {
    case "x":
      angles.x = pc.math.random(0, 360);
      break;
    case "y":
      angles.y = pc.math.random(0, 360);
      break;
    case "z":
      angles.z = pc.math.random(0, 360);
      break;
  }

  return angles;
};

UranusEditorEntitiesPaint.prototype.clearEditorInstances = function () {
  if (!this.streamingFile) {
    var items = editor.call("selector:items");

    if (!items || items.length === 0) {
      return false;
    }

    // --- parent item to add new items
    var parentItem = items[0];

    parentItem.get("children").forEach(function (guid) {
      var item = editor.call("entities:get", guid);

      if (item) {
        editor.call("entities:removeEntity", item);
      }
    });
  } else {
    this.streamingData = [];
    this.saveStreamingData();
  }

  // --- update renderer if required
  if (this.hardwareInstancing) {
    this.prepareHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.clearInstances = function () {
  var i, j;
  var payloads = this.payloads;

  if (payloads) {
    for (var lodIndex = 0; lodIndex < payloads.length; lodIndex++) {
      for (i = 0; i < payloads[lodIndex].length; i++) {
        var payload = payloads[lodIndex][i];

        var meshInstance = payload.meshInstance;

        // --- remove mesh instance to render lists
        var modelComponent = payload.baseEntity.model;

        for (j = 0; j < modelComponent.layers.length; j++) {
          var layerID = modelComponent.layers[j];
          var layer = this.app.scene.layers.getLayerById(layerID);

          if (layer) {
            layer.removeMeshInstances([meshInstance]);
          }
        }

        meshInstance.setInstancing();

        if (payload.vertexBuffer) {
          payload.vertexBuffer.destroy();
        }
      }
    }
  }

  this.payloads = undefined;
  this.cells = undefined;
};

UranusEditorEntitiesPaint.prototype.prepareHardwareInstancing = async function () {
  this.clearInstances();

  // --- get a list of the spawn entities to be instanced
  if (this.spawnEntity) {
    this.spawnEntities =
      this.spawnEntity.children[0] instanceof pc.Entity
        ? this.spawnEntity.children
        : [this.spawnEntity];
  } else {
    // --- use the children as spawn entities, names for instanced entities should be the same
    var spawnNames = [];

    this.spawnEntities = this.entity.find(
      function (entity) {
        if (
          entity instanceof pc.Entity &&
          spawnNames.indexOf(entity.name) === -1
        ) {
          spawnNames.push(entity.name);
          return true;
        }
      }.bind(this)
    );
  }

  await this.loadModelAssets(this.spawnEntities);

  // --- references for faster access
  var spawnEntities = this.spawnEntities;
  var vec = this.vec;
  var vec1 = this.vec1;
  var vec2 = this.vec2;
  var vec3 = this.vec3;
  var quat = this.quat;
  var matrix = this.matrix;

  // --- prepare the instancing payloads/cells per LOD level
  this.payloads = [[], [], [], []];
  this.cells = {};
  this.lodLevelsEnabled = [false, false, false, false];

  var i, j;

  for (
    var spawnIndex = 0;
    spawnIndex < this.spawnEntities.length;
    spawnIndex++
  ) {
    var spawnEntity = this.spawnEntities[spawnIndex];

    // --- get the instances / translation data
    var instances = this.filterInstances(spawnEntity, spawnIndex);

    // --- gather LOD entities or use the spawn entity for finding the base entity
    var lodEntities = [];
    if (spawnEntity.model) {
      lodEntities.push(spawnEntity);
    } else {
      for (i = 0; i < spawnEntity.children.length; i++) {
        var child = spawnEntity.children[i];

        if (!child.model) continue;

        // --- search for a LOD entity
        for (j = 0; j <= 3; j++) {
          if (child.name.indexOf("_LOD" + j) > -1) {
            lodEntities[j] = child;
            break;
          }
        }
      }
    }

    // --- main instancing prepare loop to find all the relevant mesh instances
    for (var lodIndex = 0; lodIndex < lodEntities.length; lodIndex++) {
      var lodEntity = lodEntities[lodIndex];

      if (!lodEntity) continue;

      this.lodLevelsEnabled[lodIndex] = true;

      // --- get per payload references
      //var spawnPos = lodEntity.getPosition();
      var spawnScale = this.spawnEntity
        ? lodEntity.getLocalScale()
        : this.vecOne;

      for (
        var meshInstanceIndex = 0;
        meshInstanceIndex < lodEntity.model.meshInstances.length;
        meshInstanceIndex++
      ) {
        var meshInstance = lodEntity.model.meshInstances[meshInstanceIndex];
        meshInstance.visible = false;

        var meshRotation = meshInstance.node.getLocalRotation().clone();
        var meshSphereRadius = meshInstance.aabb.halfExtents.length() * 2;

        // --- calculate pivot offset
        // var offset = this.getMeshInstancePosOffset(
        //   vec3,
        //   meshInstance.aabb.center,
        //   spawnPos,
        //   spawnScale
        // );

        // --- prepare a payload
        var payload = {
          baseEntity: lodEntity,
          instances: instances,
          meshInstance: new pc.MeshInstance(
            meshInstance.node.clone(),
            meshInstance.mesh,
            meshInstance.material
          ),
          meshRotation: meshRotation,
          matrices: [],
          matricesPerCell: {},
          totalBuffer: undefined,
          totalMatrices: undefined,
          vertexBuffer: undefined,
        };

        var densityReduce = this.densityReduce;
        var activeDensity = densityReduce;

        // --- increase density if required
        var instancesData = [];

        for (i = 0; i < instances.length; i++) {
          // --- check if we are reducing the density on build time
          if (densityReduce > 0) {
            activeDensity++;
            if (activeDensity <= densityReduce) {
              continue;
            }
            activeDensity = 0;
          }

          var instance = this.getInstanceData(
            instances[i],
            spawnEntities,
            true
          );
          instancesData.push(instance);

          if (this.densityIncrease > 0 && this.streamingFile) {
            for (j = 0; j < Math.floor(this.densityIncrease); j++) {
              var newPosition = this.getRandomPositionInRadius(
                instance.position,
                this.densityIncreaseRadius
              );

              var height = instance.position.y;
              var normal;

              // --- get elevation under the point
              if (this.densityIncreaseRaycast) {
                this.vec.set(
                  newPosition.x,
                  newPosition.y + 10000,
                  newPosition.z
                );
                this.vec1.set(
                  newPosition.x,
                  newPosition.y - 10000,
                  newPosition.z
                );

                var result = this.app.systems.rigidbody.raycastFirst(
                  this.vec,
                  this.vec1
                );

                if (result && result.entity.name.indexOf("Terrain") > -1) {
                  height = result.point.y;
                  normal = result.normal;
                } else {
                  continue;
                }
              }

              newPosition.y = height;

              // --- rotate or align them
              var angles = this.getBrushAngles(lodEntity, normal);

              // --- scale them up
              var scale = instance.scale;

              // --- position + offset
              var finalPosition = this.getBrushPosition(newPosition, scale);

              var newInstance = {
                name: instance.name,
                position: new pc.Vec3().copy(finalPosition),
                rotation: new pc.Quat().setFromEulerAngles(
                  angles.x,
                  angles.y,
                  angles.z
                ),
                scale: new pc.Vec3().copy(scale),
              };
              instancesData.push(newInstance);
            }
          }
        }

        // --- main prepare loop
        for (i = 0; i < instancesData.length; i++) {
          var instance = instancesData[i];

          // --- disable model component if we have an entity and it exists
          if (instance.entity && instance.entity.model) {
            instance.entity.model.enabled = false;
          }

          // --- check if we are interested in this mesh instance
          if (instance.name !== spawnEntity.name) continue;

          var scale = this.getInstanceScale(vec2, instance, spawnScale);
          // var position = this.getInstancePosition(
          //   vec1,
          //   instance,
          //   offset,
          //   scale
          // );

          var matrix = this.getInstanceMatrix(
            new pc.Mat4(),
            quat,
            instance,
            instance.position,
            meshRotation,
            scale
          );

          payload.matrices.push(matrix);

          // --- create a bounding box for this instance
          matrix.sphere = new pc.BoundingSphere(
            instance.position.clone(),
            meshSphereRadius
          );

          // --- add instance to total matrices list
          var cellPos = this.getCellPos(vec, instance.position);
          var cell = this.getVisibilityCell(cellPos);

          matrix.cell = cell;
          matrix.instanceEntity = instance.entity;

          // --- add instance to per cell matrices list
          if (!payload.matricesPerCell[cell.guid]) {
            payload.matricesPerCell[cell.guid] = [];
          }

          payload.matricesPerCell[cell.guid].push(matrix);
        }

        // --- add payload to renderable list
        if (payload.matrices.length > 0) {
          this.payloads[lodIndex].push(payload);
        }
      }
    }
  }

  // --- fill up buffers
  for (var lodIndex = 0; lodIndex < this.payloads.length; lodIndex++) {
    var lodPayloads = this.payloads[lodIndex];

    for (i = 0; i < lodPayloads.length; i++) {
      var payload = lodPayloads[i];

      // --- prepare the instances buffers
      payload.totalBuffer = new ArrayBuffer(payload.matrices.length * 16 * 4);
      payload.culledMatrices = new Float32Array(payload.matrices.length * 16);
      payload.totalMatrices = new Float32Array(
        payload.totalBuffer,
        0,
        payload.matrices.length * 16
      );
      var totalMatrices = payload.totalMatrices;
      var totalMatrixIndex = 0;

      var startCellIndex = 0;
      var endCellIndex = 0;

      // --- sort matrices per visibility cell
      for (var cellGuid in payload.matricesPerCell) {
        var matricesPerCell = payload.matricesPerCell[cellGuid];

        // --- populate matrices buffers
        for (var j = 0; j < matricesPerCell.length; j++) {
          for (var m = 0; m < 16; m++) {
            endCellIndex++;

            totalMatrices[totalMatrixIndex] = matricesPerCell[j].data[m];
            totalMatrixIndex++;
          }
        }

        var cellMatrices = new Float32Array(
          payload.totalBuffer,
          startCellIndex * 4,
          endCellIndex - startCellIndex
        );

        startCellIndex = endCellIndex;

        // --- replaces matrices references with the single cell typed array
        payload.matricesPerCell[cellGuid] = cellMatrices;
      }

      // --- create payload vertex buffer
      var bufferArray = this.cullingCamera
        ? UranusEditorEntitiesPaint.zeroBuffer
        : payload.totalMatrices;

      payload.vertexBuffer = new pc.VertexBuffer(
        this.app.graphicsDevice,
        pc.VertexFormat.defaultInstancingFormat,
        this.cullingCamera ? 0 : bufferArray.length / 16,
        pc.BUFFER_STATIC,
        this.cullingCamera ? UranusEditorEntitiesPaint.zeroBuffer : bufferArray
      );

      var meshInstance = payload.meshInstance;

      // --- enable instancing on the mesh instance
      meshInstance.material.onUpdateShader = function (options) {
        options.useInstancing = true;
        return options;
      };
      meshInstance.material.update();

      // --- add mesh instance to render lists
      var modelComponent = payload.baseEntity.model;
      meshInstance.castShadow =
        meshInstance.material.castShadows !== undefined
          ? meshInstance.material.castShadows
          : modelComponent.castShadows;
      meshInstance.receiveShadow =
        meshInstance.material.receiveShadows !== undefined
          ? meshInstance.material.receiveShadows
          : modelComponent.receiveShadows;
      meshInstance.cull = false;

      for (j = 0; j < modelComponent.layers.length; j++) {
        var layerID = modelComponent.layers[j];
        var layer = this.app.scene.layers.getLayerById(layerID);

        if (layer) {
          layer.addMeshInstances([meshInstance]);
        }
      }

      meshInstance.setInstancing(payload.vertexBuffer);
    }
  }

  // console.log(this.entity.name, "instances", count);
};

UranusEditorEntitiesPaint.prototype.getMeshInstancePosOffset = function (
  offset,
  center,
  spawnPos,
  spawnScale
) {
  offset.copy(center).sub(spawnPos);

  offset.x /= spawnScale.x;
  offset.y /= spawnScale.y;
  offset.z /= spawnScale.z;

  return offset;
};

UranusEditorEntitiesPaint.prototype.getInstancePosition = function (
  position,
  instance,
  offset,
  scale
) {
  // --- calculate pivot point position
  position.copy(instance.position);
  position.x += offset.x * scale.x;
  position.y += offset.y * scale.y;
  position.z += offset.z * scale.z;

  return position;
};

UranusEditorEntitiesPaint.prototype.getInstanceScale = function (
  scale,
  instance,
  spawnScale
) {
  scale.copy(instance.scale).mul(spawnScale).scale(0.01);

  return scale.set(scale.x, scale.z, scale.y);
};

UranusEditorEntitiesPaint.prototype.getInstanceMatrix = function (
  matrix,
  quat,
  instance,
  position,
  rotation,
  scale
) {
  // --- calculate angles
  quat.copy(instance.rotation).mul(rotation);

  // --- calculate instance matrix
  return matrix.setTRS(position, quat, scale);
};

UranusEditorEntitiesPaint.prototype.getVisibilityCell = function (cellPos) {
  var cellGuid = this.getCellGuid(cellPos);
  var cell = this.cells[cellGuid];

  // --- if cell doesn't exist, create it once
  if (!cell) {
    var halfExtents = new pc.Vec3().copy(this.cellSize).scale(2);
    this.cells[cellGuid] = new pc.BoundingBox(
      cellPos.clone(),
      halfExtents.clone()
    );
    cell = this.cells[cellGuid];

    cell.guid = cellGuid;
    cell.sphere = new pc.BoundingSphere(cellPos.clone(), this.cellSize.x * 1.5);
    cell.isVisible = 0;
    cell.distanceFromCamera = 0;
    cell.activeLOD = 0;
  }

  return cell;
};

UranusEditorEntitiesPaint.prototype.cullHardwareInstancing = function () {
  var cullingCamera = this.cullingCamera;
  var payloads = this.payloads;

  if (!cullingCamera || !payloads || payloads.length === 0) {
    return;
  }

  // --- grab references for faster access
  var app = this.app;
  var spawnEntity = this.spawnEntity;
  var cells = this.cells;
  var useLOD = this.useLOD;
  var hideAfter = this.hideAfter;
  var frustum;
  var cameraPos = cullingCamera.getPosition();
  var hiddenCamera = this.hiddenCamera;
  var perInstanceCull = this.perInstanceCull;
  var lodDistance = this.lodDistance;
  var isStatic = this.isStatic;
  var lodLevels = this.lodLevels;
  var lodLevelsEnabled = this.lodLevelsEnabled;
  var lodThreshold = this.lodThreshold;
  var lodDistanceRaw = this.lodDistanceRaw;
  var vecOne = this.vecOne;

  var i, j, lodIndex;

  var instanceData = this.instanceData;
  var vec1 = this.vec1;
  var vec2 = this.vec2;
  var vec3 = this.vec3;
  var quat = this.quat;

  // --- use custom culling, if required
  if (hiddenCamera && hideAfter > 0) {
    hiddenCamera.setPosition(cameraPos);
    hiddenCamera.setRotation(cullingCamera.getRotation());

    hiddenCamera.camera.aspectRatio = cullingCamera.camera.aspectRatio;

    app.renderer.updateCameraFrustum(hiddenCamera.camera.camera);

    frustum = hiddenCamera.camera.frustum;
  } else {
    frustum = cullingCamera.camera.frustum;
  }

  // --- update visibility cells
  if (isStatic === true) {
    for (var cellGuid in cells) {
      var cell = cells[cellGuid];
      cell.isVisible = frustum.containsSphere(cell.sphere);
      cell.distanceFromCamera = this.distanceSq(cameraPos, cell.center);
      cell.activeLOD = useLOD
        ? this.getActiveLOD(
            cell.distanceFromCamera,
            lodDistance,
            this.lodLevelsEnabled
          )
        : 0;
    }
  }

  for (lodIndex = 0; lodIndex < payloads.length; lodIndex++) {
    // --- prepare lod levels
    lodDistanceRaw[2] = lodLevelsEnabled[3]
      ? lodLevels.z
      : hideAfter > 0
      ? hideAfter
      : 100000;
    lodDistanceRaw[1] = lodLevelsEnabled[2]
      ? lodLevels.y
      : hideAfter > 0
      ? hideAfter
      : 100000;
    lodDistanceRaw[0] = lodLevelsEnabled[1]
      ? lodLevels.x
      : hideAfter > 0
      ? hideAfter
      : 100000;

    for (i = 0; i < payloads[lodIndex].length; i++) {
      var payload = payloads[lodIndex][i];
      var bufferArray = payload.culledMatrices;

      if (!bufferArray) continue;

      // --- update effects uniforms
      payload.meshInstance.setParameter(
        "uranusFadeOutDistance",
        lodDistanceRaw[lodIndex]
      );

      payload.meshInstance.setParameter(
        "uranusFadeInDistance",
        lodIndex > 0 ? lodDistanceRaw[lodIndex - 1] : 0
      );

      payload.meshInstance.setParameter("uranusViewPosition", [
        cameraPos.x,
        cameraPos.y,
        cameraPos.z,
      ]);

      var lodEntity = payload.baseEntity;
      var spawnScale, spawnPos, offset;

      if (isStatic === false) {
        // --- get per payload references
        // spawnPos = lodEntity.getPosition();
        spawnScale = spawnEntity ? lodEntity.getLocalScale() : vecOne;

        // --- calculate pivot offset
        // offset = this.getMeshInstancePosOffset(
        //   vec3,
        //   payload.meshInstance.aabb.center,
        //   spawnPos,
        //   spawnScale
        // );
      }

      // --- there two main culling strategies:
      if (perInstanceCull === false) {
        if (lodIndex === cell.activeLOD) {
          // 1. Per cell visibility
          var endCellIndex = 0;

          for (var cellGuid in payload.matricesPerCell) {
            // --- check if cell is visible
            if (cells[cellGuid].isVisible === 0) continue;

            var matricesPerCell = payload.matricesPerCell[cellGuid];
            bufferArray.set(matricesPerCell, endCellIndex);

            endCellIndex += matricesPerCell.length;
          }
          bufferArray = bufferArray.subarray(0, endCellIndex);
        } else {
          bufferArray = UranusEditorEntitiesPaint.zeroBuffer;
        }
      } else {
        // 2. Per instance visibility
        var matrixIndex = 0;
        var visible;
        var cell;
        var matrices = payload.matrices;

        for (var j = 0; j < matrices.length; j++) {
          var matrixInstance = matrices[j];

          // --- check first if the containing cell is visible
          visible = isStatic === true ? matrixInstance.cell.isVisible : 1;

          if (isStatic === false) {
            var instanceEntity = matrixInstance.instanceEntity;

            var instance = instanceData;
            instance.position.copy(instanceEntity.getPosition());
            instance.rotation.copy(instanceEntity.getRotation());
            instance.scale.copy(instanceEntity.getLocalScale());

            var scale = this.getInstanceScale(vec2, instance, spawnScale);
            // var position = this.getInstancePosition(
            //   vec1,
            //   instance,
            //   offset,
            //   scale
            // );

            matrixInstance.sphere.center.copy(instance.position);

            this.getInstanceMatrix(
              matrixInstance,
              quat,
              instance,
              instance.position,
              payload.meshRotation,
              scale
            );
          }

          // --- frustum culling
          if (visible > 0) {
            visible = frustum.containsSphere(matrixInstance.sphere);
          }

          // --- LOD culling
          if (useLOD === true && visible > 0) {
            var distanceFromCamera = this.distanceSq(
              cameraPos,
              matrixInstance.sphere.center
            );

            visible = this.checkActiveLOD(
              distanceFromCamera,
              lodDistance,
              lodIndex,
              lodLevelsEnabled,
              lodThreshold
            );
          }

          if (visible > 0) {
            for (var m = 0; m < 16; m++) {
              bufferArray[matrixIndex] = matrixInstance.data[m];
              matrixIndex++;
            }
          }
        }

        bufferArray = bufferArray.subarray(0, matrixIndex);
      }

      var instancesCount = bufferArray.length / 16;

      // --- render the culled final buffer array
      var vertexBuffer = payload.vertexBuffer;

      // stats update
      app.graphicsDevice._vram.vb -= vertexBuffer.numBytes;

      var format = vertexBuffer.format;
      vertexBuffer.numBytes = format.verticesByteSize
        ? format.verticesByteSize
        : format.size * instancesCount;

      // stats update
      app.graphicsDevice._vram.vb += vertexBuffer.numBytes;

      vertexBuffer.setData(bufferArray);
      payload.meshInstance.instancingData.count = instancesCount;
      vertexBuffer.numVertices = instancesCount;
    }

    if (useLOD === false) break;
  }
};

UranusEditorEntitiesPaint.prototype.getActiveLOD = function (
  distanceFromCamera,
  lodDistance,
  lodLevelsEnabled
) {
  var activeLodIndex = 0;

  if (
    distanceFromCamera >= lodDistance[0] &&
    (distanceFromCamera < lodDistance[1] || lodLevelsEnabled[2] === false)
  ) {
    activeLodIndex = 1;
  } else if (
    distanceFromCamera >= lodDistance[1] &&
    (distanceFromCamera < lodDistance[2] || lodLevelsEnabled[3] === false)
  ) {
    activeLodIndex = 2;
  } else if (distanceFromCamera >= lodDistance[2]) {
    activeLodIndex = 3;
  }

  return activeLodIndex;
};

UranusEditorEntitiesPaint.prototype.checkActiveLOD = function (
  distanceFromCamera,
  lodDistance,
  lodIndexToCheck,
  lodLevelsEnabled,
  lodThreshold
) {
  if (
    lodIndexToCheck === 0 &&
    (distanceFromCamera < lodDistance[0] || lodLevelsEnabled[1] === false)
  ) {
    return 1;
  } else if (
    lodIndexToCheck === 1 &&
    distanceFromCamera >= lodDistance[0] * lodThreshold &&
    (distanceFromCamera < lodDistance[1] || lodLevelsEnabled[2] === false)
  ) {
    return 1;
  } else if (
    lodIndexToCheck === 2 &&
    distanceFromCamera >= lodDistance[1] * lodThreshold &&
    (distanceFromCamera < lodDistance[2] || lodLevelsEnabled[3] === false)
  ) {
    return 1;
  } else if (
    lodIndexToCheck === 3 &&
    distanceFromCamera >= lodDistance[2] * lodThreshold
  ) {
    return 1;
  }

  return 0;
};

UranusEditorEntitiesPaint.prototype.setMat4Forward = function (
  mat4,
  forward,
  up
) {
  var x = this.x;
  var y = this.y;
  var z = this.z;

  // Inverse the forward direction as +z is pointing backwards due to the coordinate system
  z.copy(forward).scale(-1);
  y.copy(up).normalize();
  x.cross(y, z).normalize();
  y.cross(z, x);

  var r = mat4.data;

  r[0] = x.x;
  r[1] = x.y;
  r[2] = x.z;
  r[3] = 0;
  r[4] = y.x;
  r[5] = y.y;
  r[6] = y.z;
  r[7] = 0;
  r[8] = z.x;
  r[9] = z.y;
  r[10] = z.z;
  r[11] = 0;
  r[15] = 1;

  return mat4;
};

UranusEditorEntitiesPaint.prototype.roundNumber = function (x, base) {
  // base can be 1e3, 1e3 etc
  return Math.round(x * base) / base;
};

UranusEditorEntitiesPaint.prototype.loadStreamingData = function (
  streamingFile
) {
  return new Promise(
    function (resolve) {
      if (streamingFile) {
        var onLoad = function () {
          var data;

          switch (streamingFile.type) {
            case "binary":
              data = msgpack.decode(
                new Uint8Array(this.streamingFile.resource)
              );

              if (Array.isArray(data) === false) {
                data = [];
              }

              break;

            default:
              data =
                Array.isArray(streamingFile.resources) &&
                streamingFile.resources.length >= 10
                  ? streamingFile.resources
                  : [];
              break;
          }

          // --- unload source file to preserve memory
          streamingFile.unload();

          resolve(data);
        }.bind(this);

        if (streamingFile.loaded) {
          onLoad();
        } else {
          streamingFile.ready(onLoad);

          this.app.assets.load(streamingFile);
        }
      } else {
        resolve([]);
      }
    }.bind(this)
  );
};

UranusEditorEntitiesPaint.prototype.saveStreamingData = function () {
  // --- check if binary compression is required
  var filename = this.streamingFile.name;
  var contents;

  switch (this.streamingFile.type) {
    case "binary":
      contents = msgpack.encode(this.streamingData);

      break;

    default:
      contents = JSON.stringify(this.streamingData);

      // --- check if .json extension is included
      if (filename.indexOf(".json") === -1) {
        filename += ".json";
      }
      break;
  }

  var url = "https://playcanvas.com/api/assets/" + this.streamingFile.id;

  var form = new FormData();
  form.append("name", this.streamingFile.name);
  form.append("file", new Blob([contents]), filename);

  fetch(url, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + this.playcanvasToken,
    },
    body: form,
  });
};

UranusEditorEntitiesPaint.prototype.filterInstances = function (
  spawnEntity,
  spawnEntityIndex
) {
  if (!this.streamingFile) {
    if (spawnEntity) {
      return this.entity.find(function (child) {
        return child instanceof pc.Entity && child.name === spawnEntity.name;
      });
    } else {
      return this.entity.children;
    }
  } else {
    var instances = [];

    for (let i = 0; i < this.streamingData.length; i += 10) {
      var index = this.streamingData[i];
      if (
        spawnEntityIndex === null ||
        (spawnEntityIndex !== null && index === spawnEntityIndex)
      ) {
        instances.push(i);
      }
    }

    return instances;
  }
};

UranusEditorEntitiesPaint.prototype.getInstanceData = function (
  pointer,
  spawnEntities,
  spawnData
) {
  var instanceData = this.instanceData;
  if (spawnData) {
    instanceData = {
      name: undefined,
      position: new pc.Vec3(),
      rotation: new pc.Quat(),
      scale: new pc.Vec3(),
    };
  }

  if (!this.streamingFile) {
    var entity = pointer;

    instanceData.name = entity.name;
    instanceData.entity = entity;
    instanceData.position.copy(entity.getPosition());
    instanceData.rotation.copy(entity.getRotation());
    instanceData.scale.copy(entity.getLocalScale());
  } else {
    var data = this.streamingData;
    instanceData.name = spawnEntities
      ? spawnEntities[data[pointer]].name
      : undefined;
    instanceData.position.set(
      data[pointer + 1],
      data[pointer + 2],
      data[pointer + 3]
    );
    instanceData.rotation.setFromEulerAngles(
      data[pointer + 4],
      data[pointer + 5],
      data[pointer + 6]
    );
    instanceData.scale.set(
      data[pointer + 7],
      data[pointer + 8],
      data[pointer + 9]
    );
  }

  return instanceData;
};

UranusEditorEntitiesPaint.prototype.distanceSq = function (lhs, rhs) {
  var x = lhs.x - rhs.x;
  var y = lhs.y - rhs.y;
  var z = lhs.z - rhs.z;
  return x * x + y * y + z * z;
};

UranusEditorEntitiesPaint.prototype.getCellPos = function (cell, pos) {
  cell.x = Math.floor(pos.x / this.cellSize.x) * this.cellSize.x;
  cell.y = Math.floor(pos.y / this.cellSize.y) * this.cellSize.y;
  cell.z = Math.floor(pos.z / this.cellSize.z) * this.cellSize.z;

  return cell;
};

UranusEditorEntitiesPaint.prototype.getCellGuid = function (cell) {
  return cell.x.toFixed(3) + "_" + cell.y.toFixed(3) + "_" + cell.z.toFixed(3);
};

UranusEditorEntitiesPaint.prototype.loadModelAssets = function (spawnEntities) {
  return new Promise(
    function (resolve) {
      var modelComponents = [];

      spawnEntities.forEach(
        function (spawnEntity) {
          modelComponents = modelComponents.concat(
            spawnEntity.findComponents("model")
          );
        }.bind(this)
      );

      // --- assemble a list of all assets
      var assets = [];
      var asset;

      modelComponents.forEach(
        function (modelComponent) {
          if (modelComponent.asset) {
            asset = this.app.assets.get(modelComponent.asset);

            if (asset) {
              assets.push(asset);

              // --- gather material assets
              if (modelComponent._mapping) {
                for (var key in modelComponent._mapping) {
                  var materialAssetID = modelComponent._mapping[key];

                  asset = this.app.assets.get(materialAssetID);

                  if (asset) assets.push(asset);
                }
              }
            }
          }

          // --- gather material assets
          if (modelComponent.materialAsset) {
            asset = this.app.assets.get(modelComponent.materialAsset);

            if (asset) assets.push(asset);
          }
        }.bind(this)
      );

      // --- load the assets
      var count = 0;

      assets.forEach(
        function (assetToLoad) {
          assetToLoad.ready(function () {
            count++;

            if (count === assets.length) {
              resolve();
            }
          });

          this.app.assets.load(assetToLoad);
        }.bind(this)
      );
    }.bind(this)
  );
};
