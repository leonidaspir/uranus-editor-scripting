// --- dependencies
// bezier.js
// ----------------
var UranusSystemLineRender = pc.createScript("uranusSystemLineRender");

UranusSystemLineRender.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusSystemLineRender.attributes.add("pointA", {
  type: "entity",
  title: "Point A",
});

UranusSystemLineRender.attributes.add("pointB", {
  type: "entity",
  title: "Point B",
});

UranusSystemLineRender.attributes.add("color", {
  type: "rgb",
  title: "Color",
});

UranusSystemLineRender.attributes.add("isBezier", {
  type: "boolean",
  default: false,
  title: "Is Bezier?",
});

UranusSystemLineRender.attributes.add("bezierWeight", {
  type: "number",
  default: 0.5,
  title: "Bezier Weight",
});

UranusSystemLineRender.attributes.add("bezierDivisions", {
  type: "number",
  default: 25,
  title: "Bezier Divisions",
});

UranusSystemLineRender.attributes.add("renderOnInit", {
  type: "boolean",
  default: true,
  title: "Render On Init",
});

UranusSystemLineRender.attributes.add("updatePerFrame", {
  type: "boolean",
  default: false,
  title: "Update per Frame",
});

UranusSystemLineRender.prototype.initialize = function () {
  // --- variables
  this.list = undefined;
  this.p1 = new pc.Vec3();
  this.p2 = new pc.Vec3();
  this.p3 = new pc.Vec3();
  this.p4 = new pc.Vec3();
  this.startPoint = new pc.Vec3();
  this.endPoint = new pc.Vec3();
  this.bezier = undefined;
  this.ready = false;

  // --- execute
  if (this.renderOnInit) {
    this.prepareLine();
  }
};

UranusSystemLineRender.prototype.editorAttrChange = function (property, value) {
  this.prepareLine();
};

// update code called every frame
UranusSystemLineRender.prototype.update = function () {
  if (this.updatePerFrame) {
    this.prepareLine();
  }

  if (this.ready) {
    this.renderLine();
  }
};

UranusSystemLineRender.prototype.prepareLine = function (start, end) {
  // --- find start/end points
  if (start) {
    if (start instanceof pc.Entity) {
      this.pointA = start;
      this.startPoint.copy(start.getPosition());
    } else {
      this.pointA = undefined;
      this.startPoint.copy(start);
    }
  } else if (this.pointA) {
    this.startPoint.copy(this.pointA.getPosition());
  }

  if (end) {
    if (end instanceof pc.Entity) {
      this.pointB = end;
      this.endPoint.copy(end.getPosition());
    } else {
      this.pointB = undefined;
      this.endPoint.copy(end);
    }
  } else if (this.pointB) {
    this.endPoint.copy(this.pointB.getPosition());
  }

  // --- prepare bezier line if required
  if (this.isBezier === true) {
    this.prepareBezierLine();
  }

  this.ready = true;
};

UranusSystemLineRender.prototype.prepareBezierLine = function () {
  // --- find start/end and middle points
  this.p1.copy(this.startPoint);
  this.p4.copy(this.endPoint);
  var length = this.p1.distance(this.p4);

  this.p2.lerp(this.p1, this.p4, this.bezierWeight);
  this.p2.x = this.p1.x;

  this.p3.lerp(this.p4, this.p1, this.bezierWeight);
  this.p3.x = this.p3.x;

  // --- spawn an instance
  this.bezier = new Bezier(
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

UranusSystemLineRender.prototype.renderLine = function () {
  if (this.isBezier === true) {
    this.renderBezierLine();
  } else {
    this.app.renderLine(this.startPoint, this.endPoint, this.color);
  }
};

UranusSystemLineRender.prototype.renderBezierLine = function () {
  // Render the curve itself
  const lut = this.bezier.getLUT(this.bezierDivisions);
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
