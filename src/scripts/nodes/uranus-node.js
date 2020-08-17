var UranusNode = pc.createScript("uranusNode");

UranusNode.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusNode.attributes.add("category", {
  type: "string",
  title: "Category",
});

UranusNode.attributes.add("properties", {
  type: "entity",
  array: true,
  title: "Properties",
});

UranusNode.prototype.initialize = function () {
  // --- variables
  this.ray = new pc.Ray();
  this.vec = new pc.Vec3();
  this.hitPosition = new pc.Vec3();
  this.plane = new pc.Plane();
  this.pickerCamera = undefined;
  this.moving = false;
  this.selected = false;
  this.uranusSurface = undefined;
  this.initialPos = this.entity.getPosition().clone();

  // --- events
  this.app.on("uranusEntityPicker:picked", this.onNodePicked, this);
};

UranusNode.prototype.update = function () {
  if (this.moving) {
    this.nodeMove();
  }
};

UranusNode.prototype.onNodePicked = function (entity, pickType, pickerCamera) {
  // --- check if no entity has been selected
  if (!entity) {
    this.moving = false;
    return false;
  }

  // --- check if the selected entity is the script entity
  if (this.entity._guid !== entity._guid) {
    return false;
  }

  switch (pickType) {
    case "clickDown":
      this.moving = true;
      break;
    case "click":
      this.moving = false;
      break;
  }

  this.pickerCamera = pickerCamera;
};

UranusNode.prototype.nodeMove = function () {
  if (!this.pickerCamera) {
    return false;
  }

  this.pickerCamera.camera.screenToWorld(
    UranusHelperEntityPicker.pickerCoords.x,
    UranusHelperEntityPicker.pickerCoords.y,
    this.pickerCamera.camera.farClip,
    this.ray.direction
  );

  this.ray.origin.copy(this.pickerCamera.getPosition());
  this.ray.direction.sub(this.ray.origin).normalize();

  // Test the ray against the surface plane
  this.uranusSurface.getSurfacePlane(this.plane);

  var result = this.plane.intersectsRay(this.ray, this.hitPosition);

  if (result) {
    var currentPos = this.entity.getPosition();
    this.vec.copy(currentPos);

    this.vec[this.uranusSurface.lockedAxis] = this.initialPos[
      this.uranusSurface.lockedAxis
    ];

    this.vec.x = this.hitPosition.x;

    if (this.uranusSurface.isSurfacePointAllowed(this.vec) === false) {
      this.vec.x = currentPos.x;
    }

    this.vec.y = this.hitPosition.y;

    if (this.uranusSurface.isSurfacePointAllowed(this.vec) === false) {
      this.vec.y = currentPos.y;
    }

    this.vec.z = this.hitPosition.z;

    if (this.uranusSurface.isSurfacePointAllowed(this.vec) === false) {
      this.vec.z = currentPos.z;
    }

    this.entity.setPosition(this.vec);
  }
};
