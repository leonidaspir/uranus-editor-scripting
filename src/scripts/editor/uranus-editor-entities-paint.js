// LOD spawn entity as a single one, not a list
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

UranusEditorEntitiesPaint.attributes.add("removeComponents", {
  type: "string",
  default: "model",
  title: "Remove Components",
  description:
    "A comma separated list of entity compoments to be removed when spawning an instance. When using HW instancing the model component should be removed.",
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
  type: "vec4",
  default: [10, 30, 50, 70],
  title: "LOD Levels",
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

UranusEditorEntitiesPaint.attributes.add("densityDistance", {
  type: "number",
  default: 0,
  title: "Density Distance",
  min: 0,
  description:
    "The distance from the culling camera at which density reduce will be applied.",
});

UranusEditorEntitiesPaint.attributes.add("isStatic", {
  type: "boolean",
  default: false,
  title: "Is Static",
  description:
    "When hardware instancing is enabled, checking this flag will provide a performance increase since no translations will be updated on runtime.",
});

UranusEditorEntitiesPaint.prototype.initialize = function () {
  this.vec = new pc.Vec3();
  this.vec1 = new pc.Vec3();
  this.vec2 = new pc.Vec3();
  this.quat = new pc.Quat();

  this.tempSphere = { center: null, radius: 0.5 };
  this.lodDistance = [
    this.lodLevels.x * this.lodLevels.x,
    this.lodLevels.y * this.lodLevels.y,
    this.lodLevels.z * this.lodLevels.z,
    this.lodLevels.w * this.lodLevels.w,
  ];

  this.densityDistanceSq = this.densityDistance * this.densityDistance;

  this.spawnEntities = [];
  this.meshInstances = undefined;

  this.instanceData = {
    name: undefined,
    position: new pc.Vec3(),
    rotation: new pc.Quat(),
    scale: new pc.Vec3(),
  };

  this.hiddenCamera = this.cullingCamera.clone();

  if (this.hideAfter > 0) {
    this.hiddenCamera.camera.farClip = this.hideAfter;
    this.cells = undefined;
  }

  // --- load first any streaming data available
  this.loadStreamingData().then(
    function (streamingData) {
      this.streamingData = streamingData;

      if (this.hardwareInstancing) {
        this.enableHardwareInstancing();

        this.updateHardwareInstancing();
      }
    }.bind(this)
  );

  // --- events
  this.on("attr", this.editorAttrChange, this);

  this.on(
    "state",
    function (enabled) {
      if (this.hardwareInstancing) {
        if (enabled) {
          this.enableHardwareInstancing();

          this.updateHardwareInstancing();
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
    // const p1 = performance.now();

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

  this.matrix = new pc.Mat4();

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

  // --- if HW instancing is enabled we automatically add model in the list, if it's not
  if (
    this.hardwareInstancing &&
    this.componentsToClear.indexOf("model") === -1
  ) {
    this.componentsToClear.push("model");
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
    this.streamingData = this.loadStreamingData();
  }

  if (property === "hardwareInstancing") {
    this.enableHardwareInstancing();
  }

  if (this.cullingCamera && property === "hideAfter") {
    var hideAfter = value;

    this.hiddenCamera.camera.farClip =
      hideAfter > 0 ? hideAfter : this.cullingCamera.camera.farClip;

    if (this.hardwareInstancing) {
      this.updateHardwareInstancing();
    }
  }

  if (property === "lodLevels") {
    this.lodDistance = [
      value.x * value.x,
      value.y * value.y,
      value.z * value.z,
      value.w * value.w,
    ];
  }

  if (property === "densityDistance") {
    this.densityDistanceSq = value * value;
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
    this.updateHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.onHistoryRedo = function () {
  // --- update renderer if required
  if (this.hardwareInstancing) {
    this.updateHardwareInstancing();
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

  // ToDo run batcher
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
    this.updateHardwareInstancing();
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
      var a = Math.random();
      var b = Math.random();

      this.randomPosition.x =
        this.currentPosition.x +
        b * this.brushRadius * Math.cos((2 * Math.PI * a) / b);
      this.randomPosition.z =
        this.currentPosition.z +
        b * this.brushRadius * Math.sin((2 * Math.PI * a) / b);

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
    this.updateHardwareInstancing();
  }
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

        if (
          !removeEntity ||
          removeEntity.get("tags").indexOf("uranus-lod-entity") === -1
        )
          return;

        editor.call("entities:removeEntity", removeEntity);
      });
    }
  }

  // --- scale them up
  var scale = this.vec.copy(referenceEntity.getLocalScale());
  var newScaleFactor = pc.math.random(this.scaleMinMax.x, this.scaleMinMax.y);
  scale.scale(newScaleFactor);

  // --- rotate or align them
  let angles = this.vec1;
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

  // --- position + offset
  var offset = this.vec2.copy(this.posOffset);

  // --- if required project offset to scale
  if (this.projectOffset) {
    offset.x *= scale.x;
    offset.y *= scale.y;
    offset.z *= scale.z;
  }

  if (!this.streamingFile) {
    item.history.enabled = false;

    item.set("enabled", true);
    item.set("position", [
      position.x + offset.x,
      position.y + offset.y,
      position.z + offset.z,
    ]);
    item.set("rotation", [angles.x, angles.y, angles.z]);
    item.set("scale", [scale.x, scale.y, scale.z]);

    item.history.enabled = true;
  } else {
    // --- save streaming info
    this.streamingData.push(bankIndex);
    this.streamingData.push(
      this.roundNumber(position.x + offset.x, this.streamingPrecision)
    );
    this.streamingData.push(
      this.roundNumber(position.y + offset.y, this.streamingPrecision)
    );
    this.streamingData.push(
      this.roundNumber(position.z + offset.z, this.streamingPrecision)
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
    this.updateHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.clearInstances = function () {
  this.meshInstances.forEach(function (meshInstance) {
    if (
      meshInstance.instancingData &&
      meshInstance.instancingData.vertexBuffer
    ) {
      meshInstance.instancingData.vertexBuffer.destroy();
    }

    meshInstance.setInstancing();
    meshInstance.cullingData = undefined;
  });
};

UranusEditorEntitiesPaint.prototype.enableHardwareInstancing = function () {
  this.spawnEntities =
    this.spawnEntity.children[0] instanceof pc.Entity
      ? this.spawnEntity.children
      : [this.spawnEntity];

  this.lodEntities = {};

  // --- loop through the materials of the spawn entity and enable hw instancing
  var materials = [];

  this.spawnEntities.forEach(
    function (spawnEntity) {
      if (this.useLOD === false && !spawnEntity.model) return true;

      if (this.useLOD === true && spawnEntity.children.length === 0)
        return true;

      var entities;

      if (this.useLOD === true) {
        entities = [];

        spawnEntity.children.forEach(
          function (child) {
            if (this.isLodEntity(child)) {
              entities.push(child);
            }
          }.bind(this)
        );
      } else {
        entities = [spawnEntity];
      }

      entities.forEach(
        function (lodEntity) {
          if (lodEntity.model) {
            lodEntity.model.meshInstances.forEach(
              function (meshInstance) {
                materials.push(meshInstance.material);
              }.bind(this)
            );
          }
        }.bind(this)
      );
    }.bind(this)
  );

  materials.forEach(
    function (material) {
      if (this.hardwareInstancing) {
        material.onUpdateShader = function (options) {
          options.useInstancing = true;
          return options;
        };
      } else {
        material.onUpdateShader = undefined;
        meshInstance.setInstancing();
      }
      material.update();
    }.bind(this)
  );
};

UranusEditorEntitiesPaint.prototype.updateHardwareInstancing = function () {
  var matrix = new pc.Mat4();

  var spawnEntities = this.spawnEntities;

  this.cells = {};
  this.meshInstances = [];

  var count = 0;

  spawnEntities.forEach(
    function (spawnEntity, spawnEntityIndex) {
      if (this.useLOD === false && !spawnEntity.model) return true;

      if (this.useLOD === true && spawnEntity.children.length === 0)
        return true;

      var entities;

      if (this.useLOD === true) {
        entities = [];

        spawnEntity.children.forEach(
          function (child) {
            if (this.isLodEntity(child)) {
              entities.push(child);
            }
          }.bind(this)
        );
      } else {
        entities = [spawnEntity];
      }

      this.lodEntities[spawnEntity._guid] = entities;

      // --- calculate number of instances
      var instances = this.filterInstances(spawnEntity, spawnEntityIndex);

      if (instances.length === 0) {
        // --- if no instances, and we have a vertex buffer, clear it
        entities.forEach(function (lodEntity) {
          if (!lodEntity.model) return true;

          lodEntity.model.meshInstances.forEach(function (meshInstance) {
            if (
              meshInstance.instancingData &&
              meshInstance.instancingData.vertexBuffer
            ) {
              meshInstance.instancingData.vertexBuffer.destroy();
            }

            meshInstance.setInstancing();
            meshInstance.cullingData = undefined;
          });
        });

        return true;
      }

      var spawnScale = spawnEntity.getLocalScale();

      entities.forEach(
        function (lodEntity, lodIndex) {
          if (!lodEntity.model) return true;

          lodEntity.model.meshInstances.forEach(
            function (meshInstance, meshInstanceIndex) {
              // --- calculate pivot offset
              var offset = this.vec
                .copy(meshInstance.aabb.center)
                .sub(spawnEntity.getPosition());

              offset.x /= spawnScale.x;
              offset.y /= spawnScale.y;
              offset.z /= spawnScale.z;

              // --- store matrices for individual instances into array
              var matrices = new Float32Array(instances.length * 16);
              var matricesList = [];
              var boundingsOriginal = [];
              var cellsList = [];

              var matrixIndex = 0;

              for (var i = 0; i < instances.length; i++) {
                var instance = this.getInstanceData(
                  instances[i],
                  spawnEntities
                );

                // --- check if we are interested in this mesh instance
                if (instance.name !== spawnEntity.name) continue;

                var scale = this.vec2.copy(instance.scale).scale(0.01);

                // --- calculate pivot point position
                this.vec1.copy(instance.position);
                this.vec1.x += offset.x * scale.x;
                this.vec1.y += offset.y * scale.y;
                this.vec1.z += offset.z * scale.z;

                matrix.setTRS(this.vec1, instance.rotation, scale);

                // copy matrix elements into array of floats
                for (var m = 0; m < 16; m++) {
                  matrices[matrixIndex] = matrix.data[m];
                  matrixIndex++;
                }

                // --- save culling data
                matricesList[i] = matrix.clone();

                var bounding = new pc.BoundingSphere(
                  this.vec1.clone(),
                  meshInstance._aabb.halfExtents.length() * 2
                );
                boundingsOriginal[i] = bounding;

                // --- add instance to cell
                if (lodIndex === 0) {
                  var cellPos = new pc.Vec3();
                  this.getCellPos(cellPos, instance.position);
                  var cellGuid = this.getCellGuid(cellPos);

                  if (!this.cells[cellGuid]) {
                    var halfExtents = this.vec1.copy(this.cellSize).scale(2);
                    this.cells[cellGuid] = new pc.BoundingBox(
                      cellPos.clone(),
                      halfExtents.clone()
                    );
                    this.cells[cellGuid].sphere = new pc.BoundingSphere(
                      cellPos.clone(),
                      this.cellSize.x * 1.5
                    );
                  }
                  cellsList[i] = this.cells[cellGuid];

                  if (meshInstanceIndex === 0) {
                    count++;
                  }
                }
              }

              // --- create the vertex buffer
              if (
                meshInstance.instancingData &&
                meshInstance.instancingData.vertexBuffer
              ) {
                meshInstance.instancingData.vertexBuffer.destroy();
              }

              var renderInitial = false;
              if (
                this.useLOD === false ||
                (this.useLOD === true && lodIndex === 0)
              ) {
                renderInitial = true;
              }

              var vertexBuffer = new pc.VertexBuffer(
                this.app.graphicsDevice,
                pc.VertexFormat.defaultInstancingFormat,
                renderInitial ? instances.length : 0,
                pc.BUFFER_STATIC,
                renderInitial ? matrices : new Float32Array()
              );

              meshInstance.setInstancing(vertexBuffer);

              meshInstance.cullingData = {
                lodIndex: lodIndex,
                instances: instances,
                boundings: boundingsOriginal,
                culledList: this.useLOD && lodIndex === 0 ? [] : undefined,
                distances: this.useLOD && lodIndex === 0 ? [] : undefined,
                matrices: matrices.slice(0),
                matricesList: matricesList,
                cellsList: cellsList,
              };

              this.meshInstances.push(meshInstance);
            }.bind(this)
          );
        }.bind(this)
      );
    }.bind(this)
  );

  console.log(this.entity.name, "instances", count);
};

UranusEditorEntitiesPaint.prototype.cullHardwareInstancing = function () {
  var cullingEnabled = this.cullingCamera && this.cullingCamera.camera;

  if (!cullingEnabled && !this.useLOD && this.isStatic === true) {
    return;
  }

  var app = this.app;
  var spawnEntities = this.spawnEntities;
  var isStatic = this.isStatic === false || this.streamingFile;
  var useLOD = this.useLOD;
  var vec = this.vec;
  var vec1 = this.vec1;
  var lodDistance = this.lodDistance;
  var lodEntities = this.lodEntities;
  var hideAfter = this.hideAfter;
  var perInstanceCull = this.perInstanceCull;
  var densityReduce = this.densityReduce;
  var densityDistance = this.densityDistanceSq;
  var self = this;

  var frustum = cullingEnabled ? this.cullingCamera.camera.frustum : null;
  var cameraPos = cullingEnabled ? this.cullingCamera.getPosition() : null;

  // --- use custom culling, if required
  if (hideAfter > 0) {
    this.hiddenCamera.setPosition(cameraPos);
    this.hiddenCamera.setRotation(this.cullingCamera.getRotation());

    app.renderer.updateCameraFrustum(this.hiddenCamera.camera.camera);

    frustum = this.hiddenCamera.camera.frustum;
  }

  // --- update visibility cells
  if (this.cells) {
    for (const cellGuid in this.cells) {
      var cell = this.cells[cellGuid];
      cell.isVisible = frustum.containsSphere(cell.sphere);
      cell.distanceFromCamera = self.distanceSq(cameraPos, cell.center);
    }
  }

  for (var a = 0; a < spawnEntities.length; a++) {
    var spawnEntity = spawnEntities[a];

    if (useLOD === false && !spawnEntity.model) return true;

    if (useLOD === true && spawnEntity.children.length === 0) return true;

    var spawnScale = spawnEntity.getLocalScale();
    var entities = lodEntities[spawnEntity._guid];

    for (var lodIndex = 0; lodIndex < entities.length; lodIndex++) {
      var lodEntity = entities[lodIndex];

      for (
        var meshInstanceIndex = 0;
        meshInstanceIndex < lodEntity.model.meshInstances.length;
        meshInstanceIndex++
      ) {
        var meshInstance = lodEntity.model.meshInstances[meshInstanceIndex];

        if (!meshInstance.cullingData) return false;

        // --- check if we will be updating translations
        if (isStatic === false) {
          // --- calculate pivot offset
          var offset = vec
            .copy(meshInstance.aabb.center)
            .sub(spawnEntity.getPosition());

          offset.x /= spawnScale.x;
          offset.y /= spawnScale.y;
          offset.z /= spawnScale.z;
        }

        var instances = meshInstance.cullingData.instances;
        var boundings = meshInstance.cullingData.boundings;

        var matrices = meshInstance.cullingData.matrices;
        var matricesList = meshInstance.cullingData.matricesList;

        // --- find visible instances
        var visibleCount = 0;
        var matrixIndex = 0;
        var visible = 0;
        var activeDensity = densityReduce;

        var cellsList =
          entities[0].model.meshInstances[meshInstanceIndex].cullingData
            .cellsList;

        var culledList =
          entities[0].model.meshInstances[meshInstanceIndex].cullingData
            .culledList;

        for (var i = 0; i < instances.length; i++) {
          var cell = cellsList[i];
          activeDensity++;

          if (
            cell.distanceFromCamera >= densityDistance &&
            activeDensity <= densityReduce
          ) {
            continue;
          }
          activeDensity = 0;

          var instance = instances[i];
          var bounding = boundings[i];

          // --- check first if the containing cell is visible
          if (perInstanceCull === false && hideAfter > 0) {
            visible = cell.isVisible;
          } else {
            visible = 1;
          }

          // --- frustum culling
          if (perInstanceCull === true && visible > 0) {
            visible = cullingEnabled
              ? lodIndex === 0
                ? frustum.containsSphere(bounding)
                : culledList[i]
              : 0;
          }

          // --- if LOD is used, we have a last step before rendering this instance: check if it's the active LOD
          if (useLOD === true) {
            if (lodIndex === 0) {
              culledList[i] = visible;
            }

            if (visible > 0) {
              var instanceLodIndex = meshInstance.cullingData.lodIndex;

              var distanceFromCamera =
                lodIndex === 0
                  ? self.distanceSq(cameraPos, bounding.center)
                  : entities[0].model.meshInstances[meshInstanceIndex]
                      .cullingData.distances[i];

              // --- save check for later LOD levels
              if (lodIndex === 0) {
                meshInstance.cullingData.distances[i] = distanceFromCamera;
              }

              var activeLodIndex = 0;

              if (
                distanceFromCamera >= lodDistance[1] &&
                distanceFromCamera < lodDistance[2]
              ) {
                activeLodIndex = 1;
              } else if (
                distanceFromCamera >= lodDistance[2] &&
                distanceFromCamera < lodDistance[3]
              ) {
                activeLodIndex = 2;
              } else if (distanceFromCamera >= lodDistance[3]) {
                activeLodIndex = 3;
              }

              if (instanceLodIndex !== activeLodIndex) {
                visible = 0;
              }
            }
          }

          if (visible > 0) {
            visibleCount++;

            var matrix = matricesList[i];

            // --- check if we will be updating translations
            if (isStatic === false) {
              var scale = instance.getLocalScale();

              // --- calculate pivot point position
              vec1.copy(instance.getPosition());
              vec1.x += offset.x * scale.x;
              vec1.y += offset.y * scale.y;
              vec1.z += offset.z * scale.z;

              matrix.setTRS(vec1, instance.getRotation(), scale);
            }

            for (var m = 0; m < 16; m++) {
              matrices[matrixIndex] = matrix.data[m];
              matrixIndex++;
            }
          }
        }

        var subarray = matrices.subarray(0, matrixIndex);

        // --- update the vertex buffer, by replacing the current one (uses the same bufferId)
        var vertexBuffer = meshInstance.instancingData.vertexBuffer;

        // stats update
        app.graphicsDevice._vram.vb -= vertexBuffer.numBytes;

        var format = vertexBuffer.format;
        vertexBuffer.numBytes = format.verticesByteSize
          ? format.verticesByteSize
          : format.size * visibleCount;

        // stats update
        app.graphicsDevice._vram.vb += vertexBuffer.numBytes;

        vertexBuffer.setData(subarray);
        meshInstance.instancingData.count = visibleCount;
        vertexBuffer.numVertices = visibleCount;
      }
    }
  }
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

UranusEditorEntitiesPaint.prototype.isLodEntity = function (entity) {
  if (Uranus.Editor.inEditor()) {
    var item = editor.call("entities:get", entity._guid);

    return item.get("tags").indexOf("uranus-lod-entity") > -1;
  } else {
    return entity.tags.has("uranus-lod-entity");
  }
};

UranusEditorEntitiesPaint.prototype.roundNumber = function (x, base) {
  // base can be 1e3, 1e3 etc
  return Math.round(x * base) / base;
};

UranusEditorEntitiesPaint.prototype.loadStreamingData = function () {
  return new Promise(
    function (resolve) {
      if (this.streamingFile) {
        var onLoad = function () {
          var data =
            Array.isArray(this.streamingFile.resources) &&
            this.streamingFile.resources.length >= 10
              ? this.streamingFile.resources
              : [];

          resolve(data);
        }.bind(this);

        if (this.streamingFile.loaded) {
          onLoad();
        } else {
          this.streamingFile.ready(onLoad);

          this.app.assets.load(this.streamingFile);
        }
      } else {
        resolve([]);
      }
    }.bind(this)
  );
};

UranusEditorEntitiesPaint.prototype.saveStreamingData = function () {
  var url = "https://playcanvas.com/api/assets/" + this.streamingFile.id;

  var form = new FormData();
  form.append("name", "" + this.streamingFile.name);
  form.append(
    "file",
    new Blob([JSON.stringify(this.streamingData)]),
    this.streamingFile.name
  );

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
        return child.name === spawnEntity.name;
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
  spawnEntities
) {
  if (!this.streamingFile) {
    var entity = pointer;

    this.instanceData.name = entity.name;
    this.instanceData.position.copy(entity.getPosition());
    this.instanceData.rotation.copy(entity.getRotation());
    this.instanceData.scale.copy(entity.getLocalScale());
  } else {
    var data = this.streamingData;
    this.instanceData.name = spawnEntities
      ? spawnEntities[data[pointer]].name
      : undefined;
    this.instanceData.position.set(
      data[pointer + 1],
      data[pointer + 2],
      data[pointer + 3]
    );
    this.instanceData.rotation.setFromEulerAngles(
      data[pointer + 4],
      data[pointer + 5],
      data[pointer + 6]
    );
    this.instanceData.scale.set(
      data[pointer + 7],
      data[pointer + 8],
      data[pointer + 9]
    );
  }

  return this.instanceData;
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
