var UranusTerrainGenerateHeightmap = pc.createScript(
  "uranusTerrainGenerateHeightmap"
);

UranusTerrainGenerateHeightmap.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusTerrainGenerateHeightmap.attributes.add("heightMap", {
  type: "asset",
  assetType: "texture",
});

UranusTerrainGenerateHeightmap.attributes.add("minHeight", {
  type: "number",
  default: 0,
});

UranusTerrainGenerateHeightmap.attributes.add("maxHeight", {
  type: "number",
  default: 10,
});

UranusTerrainGenerateHeightmap.attributes.add("width", {
  type: "number",
  default: 100,
});

UranusTerrainGenerateHeightmap.attributes.add("depth", {
  type: "number",
  default: 100,
});

UranusTerrainGenerateHeightmap.attributes.add("subdivisions", {
  type: "number",
  default: 250,
});

UranusTerrainGenerateHeightmap.attributes.add("addCollision", {
  type: "boolean",
  default: false,
});

UranusTerrainGenerateHeightmap.attributes.add("material", {
  type: "asset",
  assetType: "material",
});

// initialize code called once per entity
UranusTerrainGenerateHeightmap.prototype.initialize = function () {
  this.heightMap.ready(this.createTerrain.bind(this));

  this.app.assets.load(this.heightMap);
};

UranusTerrainGenerateHeightmap.prototype.createTerrain = function () {
  var img = this.heightMap.resource.getSource();

  var renderModel = this.createTerrainFromHeightMap(
    img,
    this.subdivisions
  ).then(
    function (renderModel) {
      var layers = [this.app.scene.layers.getLayerByName("World").id];

      // --- check if we have a waves layer
      var layerWaves = this.app.scene.layers.getLayerByName("WaveSources");
      if (layerWaves) {
        layers.push(layerWaves.id);
      }

      this.entity.addComponent("model", {
        layers: layers,
        castShadows: true,
        receiveShadows: true,
      });
      this.entity.model.model = renderModel;

      this.app.fire("water:render");

      this.app.fire("splatmaps:render");

      if (this.addCollision) {
        this.entity.addComponent("collision", {
          type: "mesh",
        });
        this.entity.collision.model = renderModel;

        this.entity.addComponent("rigidbody", {
          friction: 0.5,
          type: "static",
        });
      }

      // --- unload assets
      this.heightMap.unload();

      this.app.fire("terrain:ready");
    }.bind(this)
  );
};

UranusTerrainGenerateHeightmap.prototype.createTerrainVertexData = function (
  options
) {
  var positions = [];
  var uvs = [];
  var indices = [];
  var row, col;

  for (row = 0; row <= options.subdivisions; row++) {
    for (col = 0; col <= options.subdivisions; col++) {
      var position = new pc.Vec3(
        (col * options.width) / options.subdivisions - options.width / 2.0,
        0,
        ((options.subdivisions - row) * options.height) / options.subdivisions -
          options.height / 2.0
      );

      var heightMapX =
        (((position.x + options.width / 2) / options.width) *
          (options.bufferWidth - 1)) |
        0;
      var heightMapY =
        ((1.0 - (position.z + options.height / 2) / options.height) *
          (options.bufferHeight - 1)) |
        0;

      var pos = (heightMapX + heightMapY * options.bufferWidth) * 4;
      var r = options.buffer[pos] / 255.0;
      var g = options.buffer[pos + 1] / 255.0;
      var b = options.buffer[pos + 2] / 255.0;

      var gradient = r * 0.3 + g * 0.59 + b * 0.11;

      position.y =
        options.minHeight + (options.maxHeight - options.minHeight) * gradient;

      positions.push(position.x, position.y, position.z);
      uvs.push(col / options.subdivisions, 1.0 - row / options.subdivisions);
    }
  }

  for (row = 0; row < options.subdivisions; row++) {
    for (col = 0; col < options.subdivisions; col++) {
      indices.push(col + row * (options.subdivisions + 1));
      indices.push(col + 1 + row * (options.subdivisions + 1));
      indices.push(col + 1 + (row + 1) * (options.subdivisions + 1));

      indices.push(col + row * (options.subdivisions + 1));
      indices.push(col + 1 + (row + 1) * (options.subdivisions + 1));
      indices.push(col + (row + 1) * (options.subdivisions + 1));
    }
  }

  var normals = pc.calculateNormals(positions, indices);

  return {
    indices: indices,
    positions: positions,
    normals: normals,
    uvs: uvs,
  };
};

UranusTerrainGenerateHeightmap.prototype.createTerrainFromHeightMap = function (
  img,
  subdivisions
) {
  return new Promise(
    function (resolve) {
      var canvas = document.createElement("canvas");
      var context = canvas.getContext("2d");
      var bufferWidth = img.width;
      var bufferHeight = img.height;
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;

      context.drawImage(img, 0, 0);

      var buffer = context.getImageData(0, 0, bufferWidth, bufferHeight).data;
      var vertexData = this.createTerrainVertexData({
        width: this.width,
        height: this.depth,
        subdivisions: subdivisions,
        minHeight: this.minHeight,
        maxHeight: this.maxHeight,
        buffer: buffer,
        bufferWidth: bufferWidth,
        bufferHeight: bufferHeight,
      });

      var node = new pc.GraphNode();

      this.material.ready(
        function () {
          var material = this.material.resource;

          var mesh = pc.createMesh(
            this.app.graphicsDevice,
            vertexData.positions,
            {
              normals: vertexData.normals,
              uvs: vertexData.uvs,
              indices: vertexData.indices,
            }
          );

          var meshInstance = new pc.MeshInstance(node, mesh, material);

          var model = new pc.Model();
          model.graph = node;
          model.meshInstances.push(meshInstance);

          resolve(model);
        }.bind(this)
      );

      this.app.assets.load(this.material);
    }.bind(this)
  );
};
