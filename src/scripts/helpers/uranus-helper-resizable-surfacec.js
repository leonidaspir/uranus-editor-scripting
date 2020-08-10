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
  title: "target",
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

UranusHelperResizableSurface.attributes.add("offset", {
  type: "vec3",
  default: [0, 0, 0],
  title: "Offset",
});

UranusHelperResizableSurface.attributes.add("minSize", {
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
  this.aabb = new pc.BoundingBox();
  this.initialScale = new pc.Vec3();

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

  this.initialScale.copy(this.target.getLocalScale());
};

UranusHelperResizableSurface.prototype.updateSurface = function () {
  if (!this.target || !this.children) {
    return false;
  }

  // --- calculate the total bounding box
  for (var i = 0; i < this.children.length; ++i) {
    this.buildAabb(this.children[i], i);
  }

  // --- position the surface
  this.vec.copy(this.aabb.center).add(this.offset);
  this.target.setPosition(this.vec);

  // --- scale the surface
  this.vec.copy(this.aabb.halfExtents).scale(2 + this.padding / 2);

  let lockedAxis;
  switch (this.alignPlane) {
    case "xz":
      this.vec.y = this.initialScale.y;
      lockedAxis = "y";
      break;
    case "xy":
      this.vec.z = this.initialScale.z;
      lockedAxis = "z";
      break;
    case "yz":
      this.vec.x = this.initialScale.x;
      lockedAxis = "x";
      break;
  }

  if (this.vec.x < this.minSize.x && lockedAxis !== "x") {
    this.vec.x = this.minSize.x;
  }
  if (this.vec.y < this.minSize.y && lockedAxis !== "y") {
    this.vec.y = this.minSize.y;
  }
  if (this.vec.z < this.minSize.z && lockedAxis !== "z") {
    this.vec.z = this.minSize.z;
  }

  this.target.setLocalScale(this.vec);

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
