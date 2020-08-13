var UranusHelperResizableSurface = pc.createScript(
  "uranusHelperResizableSurface"
);

UranusHelperResizableSurface.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusHelperResizableSurface.attributes.add("target", {
  type: "entity",
  title: "Target",
});

UranusHelperResizableSurface.attributes.add("children", {
  type: "entity",
  array: true,
  title: "Children",
});

UranusHelperResizableSurface.attributes.add("alignPlane", {
  type: "string",
  default: "xz",
  title: "Align Plane",
  enum: [{ XZ: "xz" }, { XY: "xy" }, { YZ: "yz" }],
});

UranusHelperResizableSurface.attributes.add("padding", {
  type: "number",
  default: 0.1,
  title: "Padding",
});

UranusHelperResizableSurface.attributes.add("pivotPoint", {
  type: "string",
  default: "center",
  title: "Pivot Point",
  enum: [
    { Center: "center" },
    { "Top Left": "topLeft" },
    { "Top Right": "topRight" },
    { "Bottom Left": "bottomLeft" },
    { "Bottom Right": "bottomRight" },
  ],
});

UranusHelperResizableSurface.attributes.add("offset", {
  type: "vec3",
  default: [0, 0, 0],
  title: "Offset",
});

UranusHelperResizableSurface.attributes.add("minArea", {
  type: "vec3",
  default: [3, 3, 3],
  title: "Min Area",
});

UranusHelperResizableSurface.attributes.add("reorderChildren", {
  type: "string",
  default: "none",
  title: "Reorder Children",
  enum: [
    { "Don't reoder": "none" },
    { Ascending: "ascending" },
    { Descending: "descending" },
  ],
});

UranusHelperResizableSurface.attributes.add("renderOnInit", {
  type: "boolean",
  default: true,
  title: "Render On Init",
});

UranusHelperResizableSurface.attributes.add("updatePerFrame", {
  type: "boolean",
  default: false,
  title: "Update per Frame",
});

UranusHelperResizableSurface.prototype.initialize = function () {
  // --- variables
  this.vec = new pc.Vec3();
  this.vec2 = new pc.Vec3();
  this.aabb = new pc.BoundingBox();

  // --- execute
  if (this.renderOnInit) {
    this.prepare();

    this.updateSurface();
  }
};

// update code called every frame
UranusHelperResizableSurface.prototype.update = function () {
  if (this.updatePerFrame) {
    this.prepare();

    this.updateSurface();
  }
};

UranusHelperResizableSurface.prototype.editorAttrChange = function (
  property,
  value
) {};

UranusHelperResizableSurface.prototype.prepare = function (target, children) {
  if (children) {
    this.children = children;
  }

  if (target) {
    this.target;
  } else {
    this.target = this.target ? this.target : this.entity;
  }

  if (!this.target) {
    return false;
  }
};

UranusHelperResizableSurface.prototype.updateSurface = function () {
  if (!this.target || !this.children) {
    return false;
  }

  // --- calculate the total bounding box
  this.aabb.center.copy(this.entity.getPosition());
  this.aabb.halfExtents.set(0.001, 0.001, 0.001);

  for (var i = 0; i < this.children.length; ++i) {
    this.buildAabb(this.children[i], i + 1);
  }

  // --- scale the surface
  this.vec2.set(this.padding / 2, this.padding / 2, this.padding / 2);
  this.vec.copy(this.aabb.halfExtents).scale(2).add(this.vec2);

  let lockedAxis;
  switch (this.alignPlane) {
    case "xz":
      this.vec.y = this.minArea.y;
      lockedAxis = "y";
      break;
    case "xy":
      this.vec.z = this.minArea.z;
      lockedAxis = "z";
      break;
    case "yz":
      this.vec.x = this.minArea.x;
      lockedAxis = "x";
      break;
  }

  if (this.vec.x < this.minArea.x && lockedAxis !== "x") {
    this.vec.x = this.minArea.x;
  }
  if (this.vec.y < this.minArea.y && lockedAxis !== "y") {
    this.vec.y = this.minArea.y;
  }
  if (this.vec.z < this.minArea.z && lockedAxis !== "z") {
    this.vec.z = this.minArea.z;
  }

  this.target.setLocalScale(this.vec);

  // --- position the surface
  this.vec2.copy(this.entity.getPosition()).add(this.offset);
  //this.vec2[lockedAxis] -= this.vec[lockedAxis] + this.vec[lockedAxis] / 2;
  this.target.setPosition(this.vec2);

  // --- set pivot point
  if (this.alignPlane === "xz") {
    switch (this.pivotPoint) {
      case "topLeft":
        this.target.translate(-this.vec.x / 2, 0, this.vec.z / 2);
        break;
      case "topRight":
        this.target.translate(-this.vec.x / 2, 0, -this.vec.z / 2);
        break;
      case "bottomLeft":
        this.target.translate(this.vec.x / 2, 0, this.vec.z / 2);
        break;
      case "bottomRight":
        this.target.translate(this.vec.x / 2, 0, -this.vec.z / 2);
        break;
    }
  }
  if (this.alignPlane === "xy") {
    switch (this.pivotPoint) {
      case "topLeft":
        this.target.translate(this.vec.x / 2, -this.vec.y / 2, 0);
        break;
      case "topRight":
        this.target.translate(-this.vec.x / 2, -this.vec.y / 2, 0);
        break;
      case "bottomLeft":
        this.target.translate(this.vec.x / 2, this.vec.y / 2, 0);
        break;
      case "bottomRight":
        this.target.translate(-this.vec.x / 2, this.vec.y / 2, 0);
        break;
    }
  }
  if (this.alignPlane === "yz") {
    switch (this.pivotPoint) {
      case "topLeft":
        this.target.translate(0, -this.vec.y / 2, this.vec.z / 2);
        break;
      case "topRight":
        this.target.translate(0, -this.vec.y / 2, -this.vec.z / 2);
        break;
      case "bottomLeft":
        this.target.translate(0, this.vec.y / 2, this.vec.z / 2);
        break;
      case "bottomRight":
        this.target.translate(0, this.vec.y / 2, -this.vec.z / 2);
        break;
    }
  }

  // --- reorder children if required
  if (this.reorderChildren !== "none") {
    var primary = this.alignPlane[0];
    var secondary = this.alignPlane[1];

    this.children.sort(
      function (a, b) {
        var posA = a.getPosition();
        var posB = b.getPosition();

        var sameLine = Math.abs(posA[primary] - posB[primary]) <= 0.001;

        if (sameLine) {
          return this.reorderChildren === "ascending"
            ? posA[secondary] < posB[secondary]
              ? 1
              : -1
            : posA[secondary] > posB[secondary]
            ? 1
            : -1;
        } else {
          return this.reorderChildren === "ascending"
            ? posA[primary] < posB[primary]
              ? 1
              : -1
            : posA[primary] > posB[primary]
            ? 1
            : -1;
        }
      }.bind(this)
    );
  }
};

UranusHelperResizableSurface.prototype.buildAabb = function (
  entity,
  modelsAdded
) {
  var i = 0;

  if (entity.model && entity.model.meshInstances) {
    var mi = entity.model.meshInstances;
    for (i = 0; i < mi.length; i++) {
      if (modelsAdded === 0) {
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
