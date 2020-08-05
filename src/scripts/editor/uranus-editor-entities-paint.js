// ToDo optimize deletion time
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

UranusEditorEntitiesPaint.attributes.add("hardwareInstancing", {
  type: "boolean",
  default: false,
  title: "Hardware Instancing",
});

UranusEditorEntitiesPaint.prototype.initialize = function () {
  this.vec = new pc.Vec3();
  this.vec1 = new pc.Vec3();
  this.vec2 = new pc.Vec3();

  this.enableHardwareInstancing();

  this.updateHardwareInstancing();
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
  this.quat = new pc.Quat();

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
      if (this.eraseButtonState === true) {
        this.eraseButtonState = false;
        this.setEraseState(btnErase);
      }

      this.buildButtonState = !this.buildButtonState;
      this.setBuildingState(btnBuild);
    }.bind(this)
  );
  containerEl.append(btnBuild.element);

  this.setBuildingState(btnBuild);

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

  this.setEraseState(btnErase);

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
  if (!this.building) return;

  this.setGizmoState(false);
  this.setGizmoState(true);

  if (property === "hardwareInstancing") {
    this.enableHardwareInstancing();
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

UranusEditorEntitiesPaint.prototype.setEraseState = function (btnErase) {
  if (this.eraseButtonState) {
    this.startBuilding();

    btnErase.element.classList.add("active-entities-painter-button");
  } else {
    this.stopBuilding();

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
};

UranusEditorEntitiesPaint.prototype.stopBuilding = function () {
  if (this.building === false) return;
  this.building = false;

  Uranus.Editor.editorPickerState(true);

  // --- disable input handlers
  this.setInputState(false);

  // --- disable gizmo
  this.setGizmoState(false);
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
  if (!this.parentItem) {
    return false;
  }

  var center = this.vec.copy(point);

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
        this.randomPosition.x.y + 10000,
        this.randomPosition.z
      );
      this.vec1.set(
        this.randomPosition.x,
        this.randomPosition.x.y - 10000,
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
  if (bankChildren && bankChildren.length > 0) {
    var randomGuid =
      bankChildren[Math.floor(Math.random() * bankChildren.length)];
    bankItem = editor.call("entities:get", randomGuid);
  }

  if (!bankItem) {
    return false;
  }

  var item;
  var referenceEntity;

  // --- if we are using HW instancing, we spawn an empty entity (no model or other components)
  if (this.hardwareInstancing) {
    item = editor.call("entities:new", {
      name: bankItem.entity.name,
      parent: this.parentItem,
      noHistory: true,
      noSelect: true,
    });
    item.set("enabled", false);
    referenceEntity = bankItem.entity;
  } else {
    item = Uranus.Editor.duplicateEntities([bankItem], this.parentItem)[0];
    referenceEntity = item.entity;
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
  }

  // --- position + offset
  var offset = this.vec2.copy(this.posOffset);
  offset.x *= scale.x;
  offset.y *= scale.y;
  offset.z *= scale.z;

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
  var entities =
    this.spawnEntity.children[0] instanceof pc.Entity
      ? this.spawnEntity.children
      : [this.spawnEntity];

  // --- loop through the materials of the spawn entity and enable hw instancing
  entities.forEach(
    function (spawnEntity) {
      if (!spawnEntity.model) return true;

      spawnEntity.model.meshInstances.forEach(
        function (meshInstance) {
          var material = meshInstance.material;

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
    }.bind(this)
  );
};

UranusEditorEntitiesPaint.prototype.updateHardwareInstancing = function () {
  var entities =
    this.spawnEntity.children[0] instanceof pc.Entity
      ? this.spawnEntity.children
      : [this.spawnEntity];

  var instanceCount = this.entity.children.length;
  var matrix = new pc.Mat4();

  entities.forEach(
    function (spawnEntity) {
      if (!spawnEntity.model) return true;

      var spawnScale = spawnEntity.getLocalScale();

      spawnEntity.model.meshInstances.forEach(
        function (meshInstance) {
          // --- calculate pivot offset
          var offset = this.vec
            .copy(meshInstance.aabb.center)
            .sub(spawnEntity.getPosition());

          offset.x /= spawnScale.x;
          offset.y /= spawnScale.y;
          offset.z /= spawnScale.z;

          // --- store matrices for individual instances into array
          var matrices = new Float32Array(instanceCount * 16);
          var matrixIndex = 0;
          for (var i = 0; i < instanceCount; i++) {
            var instance = this.entity.children[i];

            // --- check if we are interested in this mesh instance
            if (instance.name !== spawnEntity.name) continue;

            var scale = instance.getLocalScale();

            // --- calculate pivot point position
            this.vec1.copy(instance.getPosition());
            this.vec1.x += offset.x * scale.x;
            this.vec1.y += offset.y * scale.y;
            this.vec1.z += offset.z * scale.z;

            matrix.setTRS(this.vec1, instance.getRotation(), scale);

            // copy matrix elements into array of floats
            for (var m = 0; m < 16; m++)
              matrices[matrixIndex++] = matrix.data[m];
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
    }.bind(this)
  );
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
