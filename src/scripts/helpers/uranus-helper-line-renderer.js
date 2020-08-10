// --- dependencies
// bezier.js
// ----------------
var UranusHelperLineRenderer = pc.createScript("uranusHelperLineRenderer");

UranusHelperLineRenderer.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusHelperLineRenderer.attributes.add("points", {
  type: "entity",
  array: true,
  title: "Points",
});

UranusHelperLineRenderer.attributes.add("color", {
  type: "rgb",
  title: "Color",
});

UranusHelperLineRenderer.attributes.add("isBezier", {
  type: "boolean",
  default: false,
  title: "Is Bezier?",
});

UranusHelperLineRenderer.attributes.add("bezierWeight", {
  type: "number",
  default: 0.5,
  title: "Bezier Weight",
});

UranusHelperLineRenderer.attributes.add("bezierAxis", {
  type: "string",
  default: "x",
  title: "Bezier Axis",
  enum: [{ X: "x" }, { Y: "y" }, { Z: "z" }],
});

UranusHelperLineRenderer.attributes.add("bezierDivisions", {
  type: "number",
  default: 25,
  title: "Bezier Divisions",
});

UranusHelperLineRenderer.attributes.add("renderOnInit", {
  type: "boolean",
  default: true,
  title: "Render On Init",
});

UranusHelperLineRenderer.attributes.add("updatePerFrame", {
  type: "boolean",
  default: false,
  title: "Update per Frame",
});

UranusHelperLineRenderer.attributes.add("fromSurface", {
  type: "boolean",
  default: false,
  title: "Points From Surface",
});

UranusHelperLineRenderer.prototype.initialize = function () {
  // --- variables
  this.lines = [];
  this.p1 = new pc.Vec3();
  this.p2 = new pc.Vec3();
  this.p3 = new pc.Vec3();
  this.p4 = new pc.Vec3();
  this.ready = false;

  // --- execute
  if (this.renderOnInit) {
    this.prepareLines();
  }
};

UranusHelperLineRenderer.prototype.editorAttrChange = function (
  property,
  value
) {
  this.prepareLines();
};

// update code called every frame
UranusHelperLineRenderer.prototype.update = function () {
  if (this.updatePerFrame) {
    this.prepareLines();
  }

  if (this.ready) {
    this.renderLines();
  }
};

UranusHelperLineRenderer.prototype.prepareLines = function (points) {
  if (points) {
    this.points = points;
  }

  if (this.fromSurface && this.entity.script.uranusHelperResizableSurface) {
    this.points = this.entity.script.uranusHelperResizableSurface.children;
  }

  for (let index = 0; index < this.points.length - 1; index++) {
    var point = this.points[index];

    // --- create a line object or reuse on from the pool
    if (!this.lines[index]) {
      this.lines[index] = {
        startPoint: new pc.Vec3(),
        endPoint: new pc.Vec3(),
        bezier: undefined,
      };
    }

    var line = this.lines[index];

    // --- find start/end points
    line.startPoint = new pc.Vec3().copy(point.getPosition());
    line.endPoint = new pc.Vec3().copy(this.points[index + 1].getPosition());

    // --- prepare bezier line if required
    if (this.isBezier === true) {
      line.bezier = this.prepareBezierLine(line);
    } else {
      line.bezier = undefined;
    }
  }

  this.ready = true;
};

UranusHelperLineRenderer.prototype.prepareBezierLine = function (line) {
  // --- find start/end and middle points
  this.p1.copy(line.startPoint);
  this.p4.copy(line.endPoint);

  this.p2.lerp(this.p1, this.p4, this.bezierWeight);
  this.p2[this.bezierAxis] = this.p1[this.bezierAxis];

  this.p3.lerp(this.p4, this.p1, this.bezierWeight);
  this.p3[this.bezierAxis] = this.p3[this.bezierAxis];

  // --- spawn an instance
  return new Bezier(
    this.p1.x,
    this.p1.y,
    this.p1.z,
    this.p2.x,
    this.p2.y,
    this.p2.z,
    this.p3.x,
    this.p3.y,
    this.p3.z,
    this.p4.x,
    this.p4.y,
    this.p4.z
  );
};

UranusHelperLineRenderer.prototype.renderLines = function () {
  for (let index = 0; index < this.points.length - 1; index++) {
    var line = this.lines[index];

    if (this.isBezier === true) {
      this.renderBezierLine(line);
    } else {
      this.app.renderLine(line.startPoint, line.endPoint, this.color);
    }
  }
};

UranusHelperLineRenderer.prototype.renderBezierLine = function (line) {
  // Render the curve itself
  const lut = line.bezier.getLUT(this.bezierDivisions);
  for (let i = 0; i < lut.length - 1; i++) {
    this.p1.x = lut[i].x;
    this.p1.y = lut[i].y;
    this.p1.z = lut[i].z;
    this.p2.x = lut[i + 1].x;
    this.p2.y = lut[i + 1].y;
    this.p2.z = lut[i + 1].z;

    this.app.renderLine(this.p1, this.p2, this.color);
  }
};
