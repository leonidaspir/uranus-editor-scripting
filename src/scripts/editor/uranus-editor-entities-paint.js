// ToDo optimize deletion time
// ToDo add offset pos
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
UranusEditorEntitiesPaint.attributes.add("hardwareInstancing", {
  type: "boolean",
  default: false,
  title: "Hardware Instancing",
});

UranusEditorEntitiesPaint.prototype.initialize = function () {
  this.vec = new pc.Vec3();
  this.vec1 = new pc.Vec3();

  if (this.hardwareInstancing) {
    this.enableHardwareInstancing();

    this.updateHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.editorInitialize = function () {
  // --- variables
  this.buildButtonState = false;
  this.building = false;
  this.mouseDown = false;
  this.currentPosition = new pc.Vec3();
  this.randomPosition = new pc.Vec3();
  this.lastPosition = new pc.Vec3();

  this.parentItem = undefined;
  this.keyUpListener = undefined;

  // --- add custom CSS
  var sheet = window.document.styleSheets[0];
  sheet.insertRule(
    ".active-entities-painter-button { background-color: #f60 !important; color: white !important; }",
    sheet.cssRules.length
  );
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
      this.buildButtonState = !this.buildButtonState;
      this.setBuildingState(btnBuild);
    }.bind(this)
  );
  containerEl.append(btnBuild.element);

  this.setBuildingState(btnBuild);

  // --- clear button for removing all entity children
  var btnClearInstances = new ui.Button({
    text: "- Clear Instances",
  });

  btnClearInstances.on("click", this.clearEditorInstances.bind(this));
  containerEl.append(btnClearInstances.element);
};

UranusEditorEntitiesPaint.prototype.editorAttrChange = function (
  property,
  value
) {
  if (!this.building) return;

  if (property === "spawnEntity") {
  }
};

UranusEditorEntitiesPaint.prototype.setBuildingState = function (btnBuild) {
  if (this.buildButtonState) {
    this.startBuilding();

    btnBuild.element.classList.add("active-entities-painter-button");
  } else {
    this.stopBuilding();

    btnBuild.element.classList.remove("active-entities-painter-button");
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
};

UranusEditorEntitiesPaint.prototype.stopBuilding = function () {
  if (this.building === false) return;
  this.building = false;

  Uranus.Editor.editorPickerState(true);

  // --- disable input handlers
  this.setInputState(false);
};

UranusEditorEntitiesPaint.prototype.setInputState = function (state) {
  if (state === true) {
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);

    //this.keyUpListener = this.onKeyUp.bind(this);
    //window.addEventListener("keyup", this.keyUpListener, true);
  } else {
    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);

    //window.removeEventListener("keyup", this.keyUpListener, true);
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

  // ToDo run batcher
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
    this.spawnEntityInPoint(result.point, result.normal);
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
      this.vec.set(this.randomPosition.x, 10000, this.randomPosition.z);
      this.vec1.set(this.randomPosition.x, -10000, this.randomPosition.z);

      var result = this.app.systems.rigidbody.raycastFirst(this.vec, this.vec1);

      if (result) {
        this.randomPosition.y = result.point.y;
      } else {
        this.randomPosition.y = this.currentPosition.y;
      }

      this.createItem(this.randomPosition, normal);
    }
  } else {
    this.createItem(this.currentPosition, normal);
  }

  this.lastPosition.set(point.x, point.y, point.z);

  // --- update renderer if required
  if (this.hardwareInstancing) {
    this.updateHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.createItem = function (position, normal) {
  if (!this.parentItem) {
    return false;
  }

  // --- parent item to add new items
  var bankItem = editor.call("entities:get", this.spawnEntity._guid);

  if (!bankItem) {
    return false;
  }

  var item;

  // --- if we are using HW instancing, we spawn an empty entity (no model or other components)
  if (this.hardwareInstancing) {
    item = editor.call("entities:new", {
      name: bankItem.entity.name,
      parent: this.parentItem,
      noHistory: true,
      noSelect: true,
    });
    item.set("enabled", false);
  } else {
    item = Uranus.Editor.duplicateEntities([bankItem], this.parentItem)[0];
  }

  // --- scale them up
  var scale = this.vec.copy(item.entity.getLocalScale());
  var newScaleFactor = pc.math.random(this.scaleMinMax.x, this.scaleMinMax.y);
  scale.scale(newScaleFactor);

  // --- rotate them
  const angles = this.vec1.copy(item.entity.getLocalEulerAngles());
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

  item.history.enabled = false;

  item.set("enabled", true);
  item.set("position", [position.x, position.y, position.z]);
  item.set("rotation", [angles.x, angles.y, angles.z]);
  item.set("scale", [scale.x, scale.y, scale.z]);

  item.history.enabled = true;
};

UranusEditorEntitiesPaint.prototype.clearEditorInstances = function () {
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

  // --- update renderer if required
  if (this.hardwareInstancing) {
    this.updateHardwareInstancing();
  }
};

UranusEditorEntitiesPaint.prototype.enableHardwareInstancing = function () {
  if (!this.spawnEntity || !this.spawnEntity.model) {
    return false;
  }

  // --- loop through the materials of the spawn entity and enable hw instancing
  this.spawnEntity.model.meshInstances.forEach(function (meshInstance) {
    var material = meshInstance.material;
    material.onUpdateShader = function (options) {
      options.useInstancing = true;
      return options;
    };
    material.update();
  });
};

UranusEditorEntitiesPaint.prototype.updateHardwareInstancing = function () {
  var instanceCount = this.entity.children.length;

  var matrix = new pc.Mat4();
  var rot = new pc.Quat();
  var spawnScale = this.spawnEntity.getLocalScale();

  this.spawnEntity.model.meshInstances.forEach(
    function (meshInstance) {
      // --- calculate pivot offset
      var offset = this.vec
        .copy(meshInstance.aabb.center)
        .sub(this.spawnEntity.getPosition());

      offset.x /= spawnScale.x;
      offset.y /= spawnScale.y;
      offset.z /= spawnScale.z;

      // --- store matrices for individual instances into array
      var matrices = new Float32Array(instanceCount * 16);
      var matrixIndex = 0;
      for (var i = 0; i < instanceCount; i++) {
        var instance = this.entity.children[i];

        var scale = instance.getLocalScale();
        var angles = instance.getLocalEulerAngles();

        // --- calculate pivot point position
        this.vec1.copy(instance.getPosition());
        this.vec1.x += offset.x * scale.x;
        this.vec1.y += offset.y * scale.y;
        this.vec1.z += offset.z * scale.z;

        matrix.setTRS(
          this.vec1,
          rot.setFromEulerAngles(angles.x, angles.y, angles.z),
          scale
        );

        // copy matrix elements into array of floats
        for (var m = 0; m < 16; m++) matrices[matrixIndex++] = matrix.data[m];
      }

      // --- create the vertex buffer
      if (
        meshInstance.instancingData &&
        meshInstance.instancingData.vertexBuffer
      ) {
        meshInstance.instancingData.vertexBuffer.destroy();
      }
      var vertexBuffer = new pc.VertexBuffer(
        this.app.graphicsDevice,
        pc.VertexFormat.defaultInstancingFormat,
        instanceCount,
        pc.BUFFER_STATIC,
        matrices
      );

      meshInstance.setInstancing(vertexBuffer);
    }.bind(this)
  );

  console.log(
    "Spawned " + this.entity.name + " " + instanceCount + " instances."
  );
};
