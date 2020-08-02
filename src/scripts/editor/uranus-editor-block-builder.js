var UranusEditorBlockBuilder = pc.createScript("uranusEditorBlockBuilder");

UranusEditorBlockBuilder.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusEditorBlockBuilder.attributes.add("spawnEntity", {
  type: "entity",
  title: "Spawn Entity",
});

UranusEditorBlockBuilder.attributes.add("gridSizeDefault", {
  type: "vec3",
  default: [1, 1, 1],
  title: "Grid Size",
});

UranusEditorBlockBuilder.attributes.add("autoGrid", {
  type: "boolean",
  default: false,
  title: "Auto Grid",
  description:
    "The grid size on each axis will be calculated based on the total aabb of the spawn entity",
});

UranusEditorBlockBuilder.attributes.add("lockX", {
  type: "boolean",
  default: false,
  title: "Lock X",
});

UranusEditorBlockBuilder.attributes.add("lockY", {
  type: "boolean",
  default: true,
  title: "Lock Y",
});

UranusEditorBlockBuilder.attributes.add("lockZ", {
  type: "boolean",
  default: false,
  title: "Lock Z",
});

UranusEditorBlockBuilder.attributes.add("lockPlanes", {
  type: "vec3",
  default: [0, 0, 0],
  title: "Lock Planes",
});

UranusEditorBlockBuilder.attributes.add("brushDistance", {
  type: "number",
  default: 15,
  title: "Brush Distance",
});

UranusEditorBlockBuilder.prototype.editorInitialize = function () {
  // --- variables
  this.buildButtonState = false;
  this.building = false;
  this.gridSize = new pc.Vec3();
  this.currentCell = new pc.Vec3();
  this.startCoord = new pc.Vec2();
  this.lastCoord = new pc.Vec2();
  this.aabb = new pc.BoundingBox();
  this.brushEntity = undefined;
  this.brushEntityOffset = new pc.Vec3();

  this.parentItem = undefined;
  this.keyUpListener = undefined;

  // --- add custom CSS
  const sheet = window.document.styleSheets[0];
  sheet.insertRule(
    ".active-block-builder-button { background-color: #f60 !important; color: white !important; }",
    sheet.cssRules.length
  );
};

// --- editor script methods
UranusEditorBlockBuilder.prototype.editorScriptPanelRender = function (
  element
) {
  var containerEl = element.firstChild;

  // --- bake button the instances as editor items
  var btnBuild = new ui.Button({
    text: "+ Build",
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
};

UranusEditorBlockBuilder.prototype.editorAttrChange = function (
  property,
  value
) {
  if (!this.building) return;

  if (property === "brushDistance") {
    this.updateSelectedCell();
  }

  if (property === "spawnEntity") {
    this.removeBrushEntity();

    this.addBrushEntity();
    this.updateBrushEntity();
  }
};

UranusEditorBlockBuilder.prototype.setBuildingState = function (btnBuild) {
  if (this.buildButtonState) {
    this.startBuilding();

    btnBuild.element.classList.add("active-block-builder-button");
  } else {
    this.stopBuilding();

    btnBuild.element.classList.remove("active-block-builder-button");
  }
};

UranusEditorBlockBuilder.prototype.startBuilding = function () {
  if (this.building === true || !this.spawnEntity) return;
  this.building = true;

  Uranus.Editor.editorPickerState(false);

  // --- keep track of the parent holder item
  var items = editor.call("selector:items");
  this.parentItem = items[0];

  // --- enable input handlers
  this.setInputState(true);

  // --- calculate the size of the working grid
  this.calculateGridSize();

  // --- enable the brush entity
  this.addBrushEntity();
};

UranusEditorBlockBuilder.prototype.stopBuilding = function () {
  if (this.building === false) return;
  this.building = false;

  Uranus.Editor.editorPickerState(true);

  // --- disable input handlers
  this.setInputState(false);

  // --- remove brush
  this.removeBrushEntity();
};

UranusEditorBlockBuilder.prototype.setInputState = function (state) {
  if (state === true) {
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);

    this.keyUpListener = this.onKeyUp.bind(this);
    window.addEventListener("keyup", this.keyUpListener, true);
  } else {
    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.off(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);
    this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);

    window.removeEventListener("keyup", this.keyUpListener, true);
  }
};

UranusEditorBlockBuilder.prototype.onMouseDown = function (e) {
  this.startCoord.set(e.x, e.y);
};

UranusEditorBlockBuilder.prototype.onMouseMove = function (e) {
  if (this.building === false) {
    return false;
  }

  this.lastCoord.set(e.x, e.y);

  this.updateSelectedCell();
};

UranusEditorBlockBuilder.prototype.onKeyUp = function (e) {
  switch (e.keyCode) {
    case pc.KEY_R:
      this.rotateBrushEntity();
      break;
  }
};

UranusEditorBlockBuilder.prototype.onMouseUp = function (e) {
  if (e.altKey === true) {
    // --- handle options keys
    if (event.button === pc.MOUSEBUTTON_LEFT) {
      this.brushDistance += this.gridSize.x;
    } else if (event.button === pc.MOUSEBUTTON_RIGHT) {
      this.brushDistance -= this.gridSize.x;

      if (this.brushDistance <= 0) {
        this.brushDistance = this.gridSize.x;
      }
    }
    return;
  }

  // --- check if cursor has moved, that means the camera has moved
  // --- if that's the case we shouldn't be spawning
  if (
    this.startCoord.x !== this.lastCoord.x ||
    this.lastCoord.y !== this.lastCoord.y
  ) {
    return false;
  }

  this.spawnEntityInCell();
};

UranusEditorBlockBuilder.prototype.buildAabb = function (entity, modelsAdded) {
  var i = 0;

  if (entity.model && entity.model.meshInstances) {
    var mi = entity.model.meshInstances;
    for (i = 0; i < mi.length; i++) {
      if (!modelsAdded) {
        this.aabb.copy(mi[i].aabb);
      } else {
        this.aabb.add(mi[i].aabb);
      }

      modelsAdded += 1;
    }
  }

  for (i = 0; i < entity.children.length; ++i) {
    modelsAdded += this.buildAabb(entity.children[i], modelsAdded);
  }

  return modelsAdded;
};

UranusEditorBlockBuilder.prototype.calculateGridSize = function () {
  if (this.autoGrid) {
    // --- calculate the total AABB of the spawn entity
    this.buildAabb(this.spawnEntity);

    this.gridSize.copy(this.aabb.halfExtents).scale(2);
    return this.gridSize;
  } else {
    return this.gridSize.copy(this.gridSizeDefault);
  }
};

UranusEditorBlockBuilder.prototype.updateSelectedCell = function () {
  this.camera = editor.call("camera:current");

  // --- get world pos under the camera cursor
  this.camera.camera.screenToWorld(
    this.lastCoord.x,
    this.lastCoord.y,
    this.brushDistance,
    this.currentCell
  );

  // --- check locked axises
  if (this.lockX) {
    this.currentCell.x = this.lockPlanes.x;
  }
  if (this.lockY) {
    this.currentCell.y = this.lockPlanes.y;
  }
  if (this.lockZ) {
    this.currentCell.z = this.lockPlanes.z;
  }

  // --- convert to grid pos
  this.currentCell.x =
    Math.floor(this.currentCell.x / this.gridSize.x) * this.gridSize.x;
  this.currentCell.y =
    Math.floor(this.currentCell.y / this.gridSize.y) * this.gridSize.y;
  this.currentCell.z =
    Math.floor(this.currentCell.z / this.gridSize.z) * this.gridSize.z;

  // --- update brush
  this.updateBrushEntity();
};

UranusEditorBlockBuilder.prototype.getCellGuid = function () {
  return (
    this.currentCell.x + "_" + this.currentCell.y + "_" + this.currentCell.z
  );
};

UranusEditorBlockBuilder.prototype.addBrushEntity = function () {
  if (this.brushEntity) return;

  this.brushEntity = this.spawnEntity.clone();
  this.app.root.addChild(this.brushEntity);

  this.brushEntityOffset.copy(this.spawnEntity.getLocalPosition());

  Uranus.Editor.setEntityModelOutline(this.brushEntity, true);
};

UranusEditorBlockBuilder.prototype.updateBrushEntity = function () {
  if (!this.brushEntity) return;

  this.brushEntity.setPosition(this.currentCell);

  this.brushEntity.translate(this.brushEntityOffset);
};

UranusEditorBlockBuilder.prototype.rotateBrushEntity = function () {
  if (!this.brushEntity) return;

  this.brushEntity.rotate(0, -45, 0);
};

UranusEditorBlockBuilder.prototype.removeBrushEntity = function () {
  if (!this.brushEntity) return;

  this.brushEntity.destroy();

  Uranus.Editor.setEntityModelOutline(this.brushEntity, false);

  this.brushEntity = undefined;
};

UranusEditorBlockBuilder.prototype.spawnEntityInCell = function () {
  if (!this.parentItem) {
    return false;
  }

  // --- check if we have already spawned an entity on this grid cell
  var cellGuid = this.getCellGuid();
  var cellTag = "cell_" + cellGuid;

  var found = false;
  var children = this.parentItem.get("children");
  for (let i = 0; i < children.length; i++) {
    const child = editor.call("entities:get", children[i]);

    if (child.get("tags").indexOf(cellTag) > -1) {
      found = true;
      break;
    }
  }

  if (found) {
    return false;
  }

  // --- parent item to add new items
  var bankItem = editor.call("entities:get", this.spawnEntity._guid);

  if (!bankItem) {
    return false;
  }

  var newItem = Uranus.Editor.duplicateEntities([bankItem], this.parentItem)[0];

  var tags = newItem.get("tags");
  tags.push(cellTag);
  newItem.set("tags", tags);

  // calculate local position from world position
  var localPosition = this.brushEntity.getLocalPosition();
  var angles = this.brushEntity.getLocalEulerAngles();
  var scale = this.brushEntity.getLocalScale();

  newItem.history.enabled = false;

  newItem.set("enabled", true);
  newItem.set("position", [localPosition.x, localPosition.y, localPosition.z]);
  newItem.set("rotation", [angles.x, angles.y, angles.z]);
  newItem.set("scale", [scale.x, scale.y, scale.z]);

  newItem.history.enabled = true;

  Uranus.Editor.interface.logMessage(
    'Block builder spawned child for <strong style="color: cyan;">' +
      this.entity.name +
      "</strong>"
  );
};
