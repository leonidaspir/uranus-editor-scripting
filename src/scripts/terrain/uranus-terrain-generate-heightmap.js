var UranusTerrainGenerateHeightmap = pc.createScript("uranusTerrainGenerateHeightmap");

UranusTerrainGenerateHeightmap.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusTerrainGenerateHeightmap.attributes.add("heightMap", {
  type: "asset",
  assetType: "texture",
  array: true,
});

UranusTerrainGenerateHeightmap.attributes.add("subGridSize", {
  type: "number",
  default: 1,
  enum: [{ "1x1": 1 }, { "2x2": 2 }, { "3x3": 3 }, { "4x4": 4 }],
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

UranusTerrainGenerateHeightmap.attributes.add("modelLayers", {
  type: "string",
  description: "A comma separated list of layers to be added to the terrain model",
});

UranusTerrainGenerateHeightmap.attributes.add("eventInit", {
  type: "string",
});

UranusTerrainGenerateHeightmap.attributes.add("eventReady", {
  type: "string",
  default: "uranusTerrain:surface:ready",
});

//https://gamedev.stackexchange.com/questions/45938/apply-portion-of-texture-atlas

// initialize code called once per entity
UranusTerrainGenerateHeightmap.prototype.initialize = function () {
  // --- variables
  this.vec = new pc.Vec3();
  this.canvas = document.createElement("canvas");
  this.context = this.canvas.getContext("2d");
  this.gridSize = undefined;
  this.gridVertexData = undefined;

  // --- check when to execute, directly or after a custom event is fired
  if (this.eventInit) {
    this.app.on(this.eventInit, this.init, this);
  } else {
    this.init();
  }
};

UranusTerrainGenerateHeightmap.prototype.init = function () {
  // --- check if we've already initialized the terrain
  if (this.gridVertexData) {
    return false;
  }

  this.loadTerrainAssets([this.material].concat(this.heightMap)).then(this.createTerrain.bind(this));
};

UranusTerrainGenerateHeightmap.prototype.findGridHeightmaps = function () {
  var allHeightmaps = this.heightMap;
  var gridHeightmaps = [];

  this.gridSize = Math.floor(Math.sqrt(this.heightMap.length));
  var index = 0;

  for (var x = 0; x < this.gridSize; x++) {
    for (var y = 0; y < this.gridSize; y++) {
      var heightmap = allHeightmaps[index];

      if (!gridHeightmaps[x]) {
        gridHeightmaps[x] = [];
      }

      gridHeightmaps[x][y] = heightmap;

      index++;
    }
  }

  return gridHeightmaps;
};

UranusTerrainGenerateHeightmap.prototype.createTerrain = function () {
  // --- check if we've already initialized the terrain
  if (this.gridVertexData) {
    return false;
  }

  var x, y, xa, ya;

  // --- sort all heightmaps on a 2D grid
  var gridHeightmaps = this.findGridHeightmaps();

  // --- prepare the terrain vertex data
  this.gridVertexData = [];

  for (x = 0; x < this.gridSize; x++) {
    for (y = 0; y < this.gridSize; y++) {
      var heightmapAsset = gridHeightmaps[x][y];
      var heightmap = heightmapAsset.resource.getSource();

      var bufferWidth = heightmap.width;
      var bufferHeight = heightmap.height;
      this.canvas.width = bufferWidth;
      this.canvas.height = bufferHeight;

      this.context.drawImage(heightmap, 0, 0);

      var subGridVertexData = [];

      for (xa = 0; xa < this.subGridSize; xa++) {
        for (ya = 0; ya < this.subGridSize; ya++) {
          var totalX = x + xa;
          var totalY = y + ya;

          if (!this.gridVertexData[totalX]) {
            this.gridVertexData[totalX] = [];
          }

          if (!subGridVertexData[xa]) {
            subGridVertexData[xa] = [];
          }

          var vertexData = this.prepareTerrainFromHeightMap(totalX, totalY, subGridVertexData);

          this.gridVertexData[totalX][totalY] = vertexData;
          subGridVertexData[xa][ya] = vertexData;
        }
      }

      heightmapAsset.unload();
    }
  }

  var totalGridSize = this.gridSize * this.subGridSize;

  // --- fix the border normals now that we have all neighbor data
  for (x = 0; x < totalGridSize; x++) {
    for (y = 0; y < totalGridSize; y++) {
      this.calculateNormalsBorders(x, y, this.subdivisions);
    }
  }

  // --- create the final tile model for each chunk
  for (x = 0; x < totalGridSize; x++) {
    for (y = 0; y < totalGridSize; y++) {
      var vertexData = this.gridVertexData[x][y];

      var model = this.createTerrainFromVertexData(vertexData);

      var chunkEntity = this.addModelToComponent(model, x, y);
      chunkEntity.setPosition(x * this.width, 0, (totalGridSize - y - 1) * this.depth);
    }
  }

  // --- to trick the physics engine to add the bodies in the sim
  this.entity.enabled = false;
  this.entity.enabled = true;

  // --- fire a custom app wide event that the terrain surface is ready
  this.app.fire(this.eventReady, this.entity);
};

UranusTerrainGenerateHeightmap.prototype.createTerrainVertexData = function (options) {
  var positions = [];
  var uvs = [];
  var indices = [];
  var row, col;

  var lastRow = [];
  var lastCol = [];

  for (row = 0; row <= options.subdivisions; row++) {
    for (col = 0; col <= options.subdivisions; col++) {
      var position = new pc.Vec3((col * options.width) / options.subdivisions - options.width / 2.0, 0, ((options.subdivisions - row) * options.height) / options.subdivisions - options.height / 2.0);

      var heightMapX = (((position.x + options.width / 2) / options.width) * (options.bufferWidth - 1)) | 0;
      var heightMapY = ((1.0 - (position.z + options.height / 2) / options.height) * (options.bufferHeight - 1)) | 0;

      var pos = (heightMapX + heightMapY * options.bufferWidth) * 4;

      var r = options.buffer[pos] / 255.0;
      var g = options.buffer[pos + 1] / 255.0;
      var b = options.buffer[pos + 2] / 255.0;

      var gradient = r * 0.3 + g * 0.59 + b * 0.11;

      position.y = options.minHeight + (options.maxHeight - options.minHeight) * gradient;

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
    lastCol: lastCol,
    lastRow: lastRow,
  };
};

UranusTerrainGenerateHeightmap.prototype.calculateNormalsBorders = function (x, y, subdivisions) {
  var i, b;
  var vec = this.vec;
  var normals = this.gridVertexData[x][y].normals;

  if (this.gridVertexData[x][y + 1] !== undefined) {
    for (i = 0; i <= subdivisions; i++) {
      b = i + subdivisions * (subdivisions + 1);

      vec.set(normals[b * 3], normals[b * 3 + 1], normals[b * 3 + 2]);

      vec.x += this.gridVertexData[x][y + 1].normals[i * 3];
      vec.y += this.gridVertexData[x][y + 1].normals[i * 3 + 1];
      vec.z += this.gridVertexData[x][y + 1].normals[i * 3 + 2];

      vec.normalize();

      normals[b * 3] = vec.x;
      normals[b * 3 + 1] = vec.y;
      normals[b * 3 + 2] = vec.z;

      this.gridVertexData[x][y + 1].normals[i * 3] = vec.x;
      this.gridVertexData[x][y + 1].normals[i * 3 + 1] = vec.y;
      this.gridVertexData[x][y + 1].normals[i * 3 + 2] = vec.z;
    }
  }

  if (this.gridVertexData[x + 1] !== undefined && this.gridVertexData[x + 1][y] !== undefined) {
    for (var index = 0; index <= subdivisions; index++) {
      i = index * (subdivisions + 1) + subdivisions;
      b = index * (subdivisions + 1);

      vec.set(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);

      vec.x += this.gridVertexData[x + 1][y].normals[b * 3];
      vec.y += this.gridVertexData[x + 1][y].normals[b * 3 + 1];
      vec.z += this.gridVertexData[x + 1][y].normals[b * 3 + 2];

      vec.normalize();

      normals[i * 3] = vec.x;
      normals[i * 3 + 1] = vec.y;
      normals[i * 3 + 2] = vec.z;

      this.gridVertexData[x + 1][y].normals[b * 3] = vec.x;
      this.gridVertexData[x + 1][y].normals[b * 3 + 1] = vec.y;
      this.gridVertexData[x + 1][y].normals[b * 3 + 2] = vec.z;
    }
  }
};

UranusTerrainGenerateHeightmap.prototype.prepareTerrainFromHeightMap = function (cellX, cellY, subGridVertexData) {
  var totalWidth = this.canvas.width;
  var totalHeight = this.canvas.height;

  var cellWidth = totalWidth / this.subGridSize;
  var cellHeight = totalHeight / this.subGridSize;

  var startX = cellWidth * cellX;
  var startY = cellHeight * cellY;

  var buffer = this.context.getImageData(startX, startY, cellWidth, cellHeight).data;

  if (cellX > 0 || cellY > 0) {
    var prevCellX = subGridVertexData[cellX - 1] ? subGridVertexData[cellX - 1][cellY] : null;
    var lastRow = prevCellX ? prevCellX.bufferWidth * 4 - 4 : 0;

    var prevCellY = subGridVertexData[cellX][cellY - 1];
    var lastCol = prevCellY ? (prevCellY.bufferHeight - 1) * prevCellY.bufferWidth * 4 : 0;

    for (var p = 0; p <= buffer.length; p += 4) {
      var curX = (p / 4) % cellWidth,
        curY = (p / 4 - curX) / cellHeight;

      if (curX === 0 && prevCellX) {
        buffer[p] = prevCellX.buffer[p + lastRow];
        buffer[p + 1] = prevCellX.buffer[p + lastRow + 1];
        buffer[p + 2] = prevCellX.buffer[p + lastRow + 2];
        buffer[p + 3] = prevCellX.buffer[p + lastRow + 3];
      }

      if (curY === 0 && prevCellY) {
        buffer[p] = prevCellY.buffer[p + lastCol];
        buffer[p + 1] = prevCellY.buffer[p + lastCol + 1];
        buffer[p + 2] = prevCellY.buffer[p + lastCol + 2];
        buffer[p + 3] = prevCellY.buffer[p + lastCol + 3];
      }
    }
  }

  var vertexData = this.createTerrainVertexData({
    width: this.width,
    height: this.depth,
    subdivisions: this.subdivisions,
    minHeight: this.minHeight * this.subGridSize,
    maxHeight: this.maxHeight * this.subGridSize,
    buffer: buffer,
    bufferWidth: cellWidth,
    bufferHeight: cellHeight,
  });

  vertexData.buffer = buffer;
  vertexData.bufferWidth = cellWidth;
  vertexData.bufferHeight = cellHeight;

  return vertexData;
};

UranusTerrainGenerateHeightmap.prototype.createTerrainFromVertexData = function (vertexData) {
  var node = new pc.GraphNode();

  var material = this.material.resource;

  var mesh = pc.createMesh(this.app.graphicsDevice, vertexData.positions, {
    normals: vertexData.normals,
    uvs: vertexData.uvs,
    indices: vertexData.indices,
  });

  var meshInstance = new pc.MeshInstance(node, mesh, material);

  var model = new pc.Model();
  model.graph = node;
  model.meshInstances.push(meshInstance);

  return model;
};

UranusTerrainGenerateHeightmap.prototype.addModelToComponent = function (renderModel, coordX, coordY) {
  var chunkEntity = new pc.Entity();
  chunkEntity.name = "Tile_" + coordX + "_" + coordY;
  this.entity.addChild(chunkEntity);

  var layers = [this.app.scene.layers.getLayerByName("World").id];

  // --- check if we've been passed additional layers
  var customLayers = this.modelLayers.split(",");

  customLayers.forEach(
    function (customLayerName) {
      if (customLayerName) {
        // --- check if layer exists
        var layer = this.app.scene.layers.getLayerByName(customLayerName);

        if (layer) {
          layers.push(layer.id);
        }
      }
    }.bind(this)
  );

  chunkEntity.addComponent("model", {
    layers: layers,
    castShadows: false,
    receiveShadows: true,
  });
  chunkEntity.model.model = renderModel;

  if (this.addCollision) {
    chunkEntity.addComponent("collision", {
      type: "mesh",
    });
    chunkEntity.collision.model = renderModel;

    chunkEntity.addComponent("rigidbody", {
      friction: this.entity.rigidbody ? this.entity.rigidbody.friction : 0.5,
      restitution: this.entity.rigidbody ? this.entity.rigidbody.restitution : 0.5,
      type: "static",
    });
  }

  return chunkEntity;
};

UranusTerrainGenerateHeightmap.prototype.loadTerrainAssets = function (assets) {
  return new Promise(
    function (resolve) {
      // --- load the assets
      var count = 0;

      assets.forEach(
        function (assetToLoad) {
          assetToLoad.ready(function () {
            count++;

            if (count === assets.length) {
              resolve();
            }
          });

          this.app.assets.load(assetToLoad);
        }.bind(this)
      );
    }.bind(this)
  );
};
