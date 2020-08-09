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
  type: "vec4",
  default: [1, 1, 1, 1],
  title: "Padding",
});

UranusHelperResizableSurface.attributes.add("basePoint", {
  type: "string",
  default: "center",
  title: "Base Point",
  enum: [
    { Center: "center" },
    { "Top Left": "topLeft" },
    { "Top Right": "topRight" },
    { "Bottom Left": "bottomLeft" },
    { "Bottom Right": "bottomRight" },
  ],
});

UranusHelperResizableSurface.attributes.add("renderOnInit", {
  type: "boolean",
  default: true,
  title: "Render On Init",
});

UranusHelperResizableSurface.prototype.initialize = function () {
  // --- variables
  this.vec = new pc.Vec3();

  // --- execute
  if (this.renderOnInit) {
    this.prepare();
  }
};

UranusHelperResizableSurface.prototype.editorAttrChange = function (
  property,
  value
) {};

UranusHelperLineRenderer.prototype.prepare = function (target, children) {
  if (target) {
    this.target;
  } else {
    this.target = this.target ? this.target : this.entity;
  }

  if (children) {
    this.children = children;
  }
};
