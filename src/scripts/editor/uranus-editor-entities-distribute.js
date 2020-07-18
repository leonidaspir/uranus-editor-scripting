// --- dependencies
// UPNG.js
// ----------------
var UranusEditorEntitiesDistribute = pc.createScript(
  "uranusEditorEntitiesDistribute"
);

UranusEditorEntitiesDistribute.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusEditorEntitiesDistribute.attributes.add("distributeMap", {
  type: "asset",
  assetType: "texture",
  title: "Distribution Map",
});

UranusEditorEntitiesDistribute.attributes.add("terrainChannel", {
  type: "number",
  title: "Channel",
  default: 0,
  enum: [{ R: 0 }, { G: 1 }, { B: 2 }, { A: 3 }],
});

UranusEditorEntitiesDistribute.attributes.add("terrainWidth", {
  type: "number",
  default: 100,
  title: "Terrain Width",
});

UranusEditorEntitiesDistribute.attributes.add("terrainDepth", {
  type: "number",
  default: 100,
  title: "Terrain Depth",
});

UranusEditorEntitiesDistribute.attributes.add("minHeight", {
  type: "number",
  default: 0,
  title: "Min Height",
});

UranusEditorEntitiesDistribute.attributes.add("bank", {
  type: "entity",
  title: "Bank",
  description:
    "If a terrain is provided, you must provide a bank/entity with children entities to be used as templates for instancing.",
});

UranusEditorEntitiesDistribute.attributes.add("terrainSampleDist", {
  type: "number",
  default: 10,
  min: 0,
  title: "Sample Dist",
  description:
    "This is the distance in world units for which a point will be sampled from the splatmaps. Be careful a small value can produce a very high number of instances.",
});

UranusEditorEntitiesDistribute.attributes.add("terrainSampleOffset", {
  type: "number",
  default: 0.5,
  min: 0.1,
  max: 1,
  title: "Sample Offset",
  description:
    "This determines how definitive the splatmap color has to be to allow instances to be placed.",
});

UranusEditorEntitiesDistribute.attributes.add("onEvent", {
  type: "string",
  title: "On Event",
  description:
    "You can provide an event name that when globally fired the generation of the instances will start, instead of doing it inside the entity initialize method.",
});

UranusEditorEntitiesDistribute.attributes.add("brushRadius", {
  type: "number",
  title: "Dense Radius",
  min: 0.0,
  description:
    "If a value larger than 0 is provided the algorithm will spawn additional instances in a circle around the instance point.",
});

UranusEditorEntitiesDistribute.attributes.add("itemsNo", {
  type: "number",
  title: "Items No",
  min: 1.0,
  description:
    "The number of items will be spawned per instance if a dense radius is provided.",
});

UranusEditorEntitiesDistribute.attributes.add("brushAngle", {
  type: "number",
  title: "Rotate?",
  enum: [
    { "Don't rotate": 0 },
    { "X Axis": 1 },
    { "Y Axis": 2 },
    { "Z Axis": 3 },
  ],
});

UranusEditorEntitiesDistribute.attributes.add("brushScale", {
  type: "vec2",
  title: "Scale min/max",
  placeholder: ["Min", "Max"],
  description:
    "If a dense radius is provided use scale min/max to add a random scale factor to each spawned instance.",
});

UranusEditorEntitiesDistribute.attributes.add("runBatcher", {
  type: "boolean",
  default: true,
  title: "Run Batcher",
});

// this is an editor only script
UranusEditorEntitiesDistribute.prototype.editorInitialize = function (
  manualRun
) {
  if (!this.inEditor) return;

  this.running = false;

  // --- check if we already have children, so don't automatically run again
  if (this.entity.children.length > 0) {
    if (this.runBatcher === true) {
      this.executeBatcher();
    }
  } else {
    if (!manualRun && this.onEvent) {
      this.app.once(this.onEvent, this.initiate, this);
    } else {
      this.initiate();
    }
  }
};

UranusEditorEntitiesDistribute.prototype.initiate = function () {
  // --- variables
  this.vec = new pc.Vec3();
  this.vec1 = new pc.Vec3();
  this.vec2 = new pc.Vec3();
  this.vec3 = new pc.Vec3();
  this.nodes = undefined;
  this.batchGroups = undefined;

  this.running = true;

  // --- execute
  if (this.distributeMap) {
    // --- variables
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");

    this.prepareMap()
      .then(
        function (instances) {
          this.spawnInstances(instances);

          this.running = false;

          // --- manually run the batcher in editor to increase performance
          if (this.runBatcher === true) {
            this.executeBatcher();
          }
        }.bind(this)
      )
      .catch(function () {
        this.running = false;
      });
  }

  // --- events
  this.on("destroy", this.onDestroy, this);
};

UranusEditorEntitiesDistribute.prototype.onDestroy = function () {
  if (this.nodes) {
    this.nodes.forEach(function (node) {
      node.entity.destroy();
    });

    this.nodes = undefined;
  }

  this.clearBatches();
};

UranusEditorEntitiesDistribute.prototype.prepareMap = function () {
  return new Promise(
    function (resolve, reject) {
      var textureUrl = this.distributeMap.getFileUrl();

      pc.http.get(
        textureUrl,
        {
          responseType: "arraybuffer",
        },
        function (err, response) {
          if (!response) return;

          var image = UPNG.decode(response);

          var i, j;
          var points = [];

          var center = this.entity.getPosition();

          var pixels = image.data;
          var offset = this.terrainSampleOffset * 255;
          var samplesCount = 0;
          var nextDist = pc.math.random(
            this.terrainSampleDist * 0.5,
            this.terrainSampleDist * 1.5
          );

          for (i = 0; i < pixels.length; i += 4) {
            if (pixels[i + this.terrainChannel] >= offset) {
              var x = ((i / 4) % image.width) / image.width;
              var z = Math.floor(i / 4 / image.width) / image.width;

              x *= this.terrainWidth;
              z *= this.terrainDepth;

              z = this.terrainDepth - z;

              x += center.x - this.terrainWidth / 2;
              z += center.z - this.terrainDepth / 2;

              // --- check if we reached the sample distance
              if (samplesCount > nextDist) {
                samplesCount = 0;
                nextDist = pc.math.random(
                  this.terrainSampleDist * 0.5,
                  this.terrainSampleDist * 1.5
                );

                points.push([x, z]);
              }

              samplesCount++;
            }
          }

          // --- and assemble instances from terrain positions buffer
          var instances = [];

          for (let i = 0; i < points.length; i++) {
            const point = points[i];

            var x = point[0];
            var z = point[1];

            // --- get height at point
            this.vec2.set(x, 10000, z);
            this.vec3.set(x, -10000, z);

            var result = this.app.systems.rigidbody.raycastFirst(
              this.vec2,
              this.vec3
            );
            if (!result) continue;

            var height = result.point.y;

            if (height >= this.minHeight) {
              var bank = this.bank.children;
              var bankIndex = Math.floor(Math.random() * bank.length);

              // --- random rotation
              this.vec.set(0, 0, 0);
              this.setRandomRotation(this.vec, this.brushAngle);

              // --- random scale
              var newScaleFactor = pc.math.random(
                this.brushScale.x,
                this.brushScale.y
              );

              instances.push([
                bankIndex,
                x,
                height,
                z,
                this.vec.x,
                this.vec.y,
                this.vec.z,
                newScaleFactor,
              ]);
            }
          }

          resolve(instances);
        }.bind(this)
      );
    }.bind(this)
  );
};

UranusEditorEntitiesDistribute.prototype.condenseInstances = function (
  instances
) {
  instances.forEach(
    function (instance) {
      for (var i = 1; i <= this.itemsNo; i++) {
        var a = Math.random();
        var b = Math.random();

        var instancePos = this.vec.set(instance[1], instance[2], instance[3]);

        this.vec1.x =
          instancePos.x +
          b * this.brushRadius * Math.cos((2 * Math.PI * a) / b);
        this.vec1.z =
          instancePos.z +
          b * this.brushRadius * Math.sin((2 * Math.PI * a) / b);

        // --- get elevation under the point
        this.vec2.set(this.vec1.x, 10000, this.vec1.z);
        this.vec3.set(this.vec1.x, -10000, this.vec1.z);

        var result = this.app.systems.rigidbody.raycastFirst(
          this.vec2,
          this.vec3
        );

        if (result) {
          this.vec1.y = result.point.y;
        } else {
          this.vec1.y = instancePos.y;
        }

        // --- rotate them
        this.vec2.set(instance[4], instance[5], instance[6]);

        this.setRandomRotation(this.vec2, this.brushAngle);

        // --- scale them up
        var newScaleFactor = pc.math.random(
          this.brushScale.x,
          this.brushScale.y
        );

        // --- add a new instance to the instances array
        instances.push([
          instance[0],
          this.vec1.x,
          this.vec1.y,
          this.vec1.z,
          this.vec2.x,
          this.vec2.y,
          this.vec2.z,
          newScaleFactor,
        ]);
      }
    }.bind(this)
  );
};

UranusEditorEntitiesDistribute.prototype.spawnInstances = function (instances) {
  var parent = this.entity;

  // --- check if we are condensing
  if (this.brushRadius > 0) {
    this.condenseInstances(instances);
  }

  this.nodes = [];

  instances.forEach(
    function (instance, index) {
      var parentBank = this.bank.children;
      var bank = parentBank ? parentBank[instance[0]] : this.bank;

      var node = bank.clone();

      parent.addChild(node);

      this.nodes.push({
        bank: bank,
        entity: node,
      });

      var instancePos = this.vec.set(instance[1], instance[2], instance[3]);
      var instanceAngles = this.vec1.set(instance[4], instance[5], instance[6]);

      node.setPosition(instancePos);

      node.setEulerAngles(instanceAngles);
      node.rotateLocal(bank.getLocalEulerAngles());

      this.vec3.copy(bank.getLocalScale());
      this.vec3.scale(instance[7]);
      node.setLocalScale(this.vec3.x, this.vec3.y, this.vec3.z);

      node.enabled = true;
    }.bind(this)
  );

  console.log(
    "Spawned " + this.entity.name + " " + instances.length + " instances."
  );
};

UranusEditorEntitiesDistribute.prototype.setRandomRotation = function (
  vec,
  axis,
  single
) {
  switch (axis) {
    case 1:
      vec.x = pc.math.random(0, 360);

      if (single) {
        vec.y = 0;
        vec.z = 0;
      }
      break;
    case 2:
      vec.y = pc.math.random(0, 360);

      if (single) {
        vec.x = 0;
        vec.z = 0;
      }
      break;
    case 3:
      vec.z = pc.math.random(0, 360);

      if (single) {
        vec.x = 0;
        vec.y = 0;
      }
      break;
  }
};

// --- editor script methods
UranusEditorEntitiesDistribute.prototype.editorScriptPanelRender = function (
  element
) {
  var containerEl = element.firstChild;

  // --- bake button the instances as editor items
  var btnAdd = new ui.Button({
    text: "+ Bake Instances",
  });

  btnAdd.on("click", this.bakeInstancesInEditor.bind(this));
  containerEl.append(btnAdd.element);

  // --- clear button for removing all entity children
  var btnClearInstances = new ui.Button({
    text: "- Clear Instances",
  });

  btnClearInstances.on("click", this.clearEditorInstances.bind(this));
  containerEl.append(btnClearInstances.element);
};

UranusEditorEntitiesDistribute.prototype.executeBatcher = function () {
  if (this.runBatcher === true) {
    this.batchGroups = Uranus.Editor.runBatcher(this.entity.children);
  } else {
    this.clearBatches();
  }
};

UranusEditorEntitiesDistribute.prototype.clearBatches = function () {
  if (this.batchGroups) {
    // --- enable entity model component
    var modelComps = this.entity.findComponents("model");
    modelComps.forEach((model) => {
      if (model.batchGroupId > -1) {
        model.addModelToLayers();
      }
    });

    // --- clear batched entities
    var batchList = this.app.batcher._batchList;

    for (var i = 0; i < batchList.length; i++) {
      if (this.batchGroups.indexOf(batchList[i].batchGroupId) > -1) {
        this.app.batcher.destroy(batchList[i]);
      }
    }
  }

  this.batchGroups = undefined;
};

UranusEditorEntitiesDistribute.prototype.bakeInstancesInEditor = function () {
  if (!this.nodes || this.nodes.length === 0) {
    return;
  }

  var type = editor.call("selector:type");

  if (type !== "entity") {
    return false;
  }

  var items = editor.call("selector:items");

  if (!items || items.length === 0) {
    return false;
  }

  // --- parent item to add new items
  var parentItem = items[0];

  this.nodes.forEach(function (node) {
    var entity = node.entity;
    var bankItem = editor.call("entities:get", node.bank._guid);

    var newItem = Uranus.Editor.duplicateEntity(bankItem, parentItem);

    // calculate local position from world position
    var localPosition = entity.getLocalPosition();
    var angles = entity.getLocalEulerAngles();
    var scale = entity.getLocalScale();

    newItem.set("enabled", true);
    newItem.set("position", [
      localPosition.x,
      localPosition.y,
      localPosition.z,
    ]);
    newItem.set("rotation", [angles.x, angles.y, angles.z]);
    newItem.set("scale", [scale.x, scale.y, scale.z]);

    // destroy the app only entity
    entity.destroy();
  });

  this.nodes = undefined;

  // --- first we clear any batches on the internal entities
  this.clearBatches();

  // --- then we execute the batcher once more for the new entities
  this.executeBatcher();
};

UranusEditorEntitiesDistribute.prototype.clearEditorInstances = function () {
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
};

UranusEditorEntitiesDistribute.prototype.editorAttrChange = function (
  property,
  value
) {
  if (this.running === true) return;

  if (property === "runBatcher") {
    this.executeBatcher();
    return;
  }

  this.onDestroy();

  if (this.inEditor === true) {
    this.editorInitialize(true);
  }
};
