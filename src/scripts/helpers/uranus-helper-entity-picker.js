var UranusHelperEntityPicker = pc.createScript("uranusHelperEntityPicker");

UranusHelperEntityPicker.attributes.add("camera", {
  type: "entity",
  title: "Camera",
});

UranusHelperEntityPicker.attributes.add("pickTag", {
  type: "string",
  default: "uranus-pickable",
  title: "Pick Tack",
  description:
    "If a tag is provided, only entities with that tag will be picked.",
});

UranusHelperEntityPicker.attributes.add("pickEvent", {
  type: "string",
  default: "uranusEntityPicker:picked",
  title: "Pick Event",
  description: "The app wide event fired when an entity is picked.",
});

// update code called every frame
UranusHelperEntityPicker.prototype.initialize = function () {
  this.picker = new pc.Picker(
    this.app.graphicsDevice,
    this.app.graphicsDevice.canvas.width,
    this.app.graphicsDevice.canvas.height
  );
  this.app.mouse.on(pc.EVENT_MOUSEUP, this.onSelect, this);

  if (this.app.touch) {
    this.app.touch.on(pc.EVENT_TOUCHEND, this.onSelect, this);
  }

  // --- events
  this.app.graphicsDevice.on("resizecanvas", this.onResize.bind(this));
};

UranusHelperEntityPicker.prototype.onResize = function (width, height) {
  this.picker.resize(width, height);
};

UranusHelperEntityPicker.prototype.onSelect = function (event) {
  var camera = this.camera.camera;
  var scene = this.app.scene;
  var picker = this.picker;

  picker.prepare(camera, scene);

  var selected = picker.getSelection(event.x, event.y);

  if (selected[0]) {
    // Get the graph node used by the selected mesh instance
    var entity = selected[0].node;

    // Bubble up the hierarchy until we find an actual Entity
    while (!(entity instanceof pc.Entity) && entity !== null) {
      entity = entity.getParent();
    }
    if (entity && (!this.pickTag || entity.tags.has(this.pickTag) === true)) {
      this.app.fire(this.pickEvent, entity);
    }
  }
};
