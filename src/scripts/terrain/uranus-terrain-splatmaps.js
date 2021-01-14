var UranusTerrainSplatmaps = pc.createScript("uranusTerrainSplatmaps");

UranusTerrainSplatmaps.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});
UranusTerrainSplatmaps.attributes.add("colorMapsA", {
  type: "asset",
  array: true,
  assetType: "texture",
  title: "Color Maps A",
});
UranusTerrainSplatmaps.attributes.add("colorMapsB", {
  type: "asset",
  array: true,
  assetType: "texture",
  title: "Color Maps B",
});
UranusTerrainSplatmaps.attributes.add("materialAsset", {
  type: "asset",
  assetType: "material",
});
UranusTerrainSplatmaps.attributes.add("useOcclusion", {
  type: "number",
  default: 0,
  title: "Occlusion Map",
  enum: [{ None: 0 }, { "Material DiffuseMap": 1 }, { "Material NormalMap Alpha": 2 }],
});
UranusTerrainSplatmaps.attributes.add("useNormal", {
  type: "number",
  default: 2,
  title: "Normal Map",
  enum: [{ None: 0 }, { "Full Terrain": 1 }, { "Per Channel": 2 }],
});
UranusTerrainSplatmaps.attributes.add("tiling", {
  type: "number",
  title: "Tiling",
  default: 1,
});

UranusTerrainSplatmaps.attributes.add("eventInit", {
  type: "string",
  title: "On Init",
});

UranusTerrainSplatmaps.attributes.add("eventReady", {
  type: "string",
  default: "uranusTerrain:splatmaps:ready",
  title: "On Ready",
});
UranusTerrainSplatmaps.attributes.add("materialChannels", {
  type: "json",
  array: true,
  schema: [
    {
      name: "materialAsset",
      title: "Material",
      type: "asset",
      assetType: "material",
      description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
    },
  ],
});

// initialize code called once per entity
UranusTerrainSplatmaps.prototype.initialize = function () {
  // --- variables
  this.uranusTerrain = undefined;
  this.gridSize = undefined;

  // --- check when to execute, directly or after a custom event is fired
  if (this.eventInit) {
    this.app.on(this.eventInit, this.init, this);
  }

  this.on("attr", this.render, this);
};

UranusTerrainSplatmaps.prototype.init = function (terrainEntity) {
  this.uranusTerrain = terrainEntity && terrainEntity.script && terrainEntity.script.uranusTerrainGenerateHeightmap ? terrainEntity.script.uranusTerrainGenerateHeightmap : null;

  this.loadTerrainAssets([this.materialAsset].concat(this.colorMapsA).concat(this.colorMapsB)).then(
    function () {
      // --- build the list of splatmap channels used
      var colorMapA = this.colorMapsA[0];
      var colorMapB = this.colorMapsB[0];
      if (colorMapA) {
        this.splatmapChannels = [
          {
            map: "colormapA",
            channel: "r",
          },
          {
            map: "colormapA",
            channel: "g",
          },
          {
            map: "colormapA",
            channel: "b",
          },
        ];

        if (colorMapA.resource.format === pc.PIXELFORMAT_R8_G8_B8_A8)
          this.splatmapChannels.push({
            map: "colormapA",
            channel: "a",
          });
      }
      if (colorMapB) {
        this.splatmapChannels.push(
          {
            map: "colormapB",
            channel: "r",
          },
          {
            map: "colormapB",
            channel: "g",
          },
          {
            map: "colormapB",
            channel: "b",
          }
        );

        if (colorMapB.resource.format === pc.PIXELFORMAT_R8_G8_B8_A8)
          this.splatmapChannels.push({
            map: "colormapB",
            channel: "a",
          });
      }

      console.log(this.splatmapChannels);

      this.useNormalMap = false;
      this.useDiffuseMap = false;
      this.useParallaxMap = false;

      // --- prepare the subgrid/grid/totalgrid
      this.gridSize = this.uranusTerrain.gridSize;
      this.subGridSize = this.uranusTerrain.subGridSize;
      this.totalGridSize = this.uranusTerrain.totalGridSize;

      // --- prepare the material
      var material = this.materialAsset.resource;
      this.material = material;

      // --- add the shader overrides per material channel
      material.chunks.startVS = this.getStartVertexShader();
      material.chunks.basePS = this.getBaseShader();

      var colormapReady = false;

      if (material.heightMap) {
        material.chunks.parallaxPS = this.getParallaxShader(colormapReady === false);

        colormapReady = true;
        this.useParallaxMap = true;
      }

      if (this.useNormal > 0) {
        var chunkName = "normalMapPS";

        material.chunks[chunkName] = this.getNormalShader(colormapReady === false);
        colormapReady = true;

        this.useNormalMap = true;
      }

      if (material.diffuseMap) {
        material.chunks.diffusePS = this.getDiffuseShader(colormapReady === false);
        colormapReady = true;

        this.useDiffuseMap = true;
      }

      material.update();

      this.render();

      // --- fire a custom app wide event that the terrain surface is ready
      this.app.fire(this.eventReady, this.entity);
    }.bind(this)
  );
};

UranusTerrainSplatmaps.prototype.render = function () {
  var x, y, xa, ya;
  var index = 0;

  for (x = 0; x < this.gridSize; x++) {
    for (y = 0; y < this.gridSize; y++) {
      var colorMapA = this.colorMapsA[index];
      var colorMapB = this.colorMapsB[index];

      index++;

      for (xa = 0; xa < this.subGridSize; xa++) {
        for (ya = 0; ya < this.subGridSize; ya++) {
          var totalX = x + xa;
          var totalY = y + ya;

          var chunkEntity = this.entity.findByName("Tile_" + totalX + "_" + totalY);
          var meshInstance = chunkEntity.model.meshInstances[0];

          this.updateVertexUniforms(meshInstance, totalX, totalY);

          this.updateUniforms(meshInstance, colorMapA ? colorMapA.resource : null, colorMapB ? colorMapB.resource : null);
        }
      }
    }
  }
};

UranusTerrainSplatmaps.prototype.updateVertexUniforms = function (meshInstance, cellX, cellY) {
  var ratioX = 1 / this.subGridSize;
  var ratioY = 1 / this.subGridSize;

  var offsetX = ratioX * cellX;

  var factorY = 0.0;
  switch (this.subGridSize) {
    case 2:
      factorY = 0.5;
      break;
    case 4:
      factorY = 0.75;
      break;
    case 8:
      factorY = 0.875;
      break;
    case 16:
      factorY = 0.9375;
      break;
  }
  var offsetY = -ratioY * cellY + factorY;

  meshInstance.setParameter("terrain_colorMap_ratio", [ratioX, ratioY]);
  meshInstance.setParameter("terrain_colorMap_offset", [offsetX, offsetY]);
};

UranusTerrainSplatmaps.prototype.updateUniforms = function (meshInstance, colorMapA, colorMapB) {
  if (colorMapA) meshInstance.setParameter("texture_colorMapA", colorMapA);
  if (colorMapB) meshInstance.setParameter("texture_colorMapB", colorMapB);

  if (this.useParallaxMap) {
    this.materialChannels.forEach((materialChannel, index) => {
      var material = materialChannel.materialAsset.resource;

      if (material.heightMapChannel !== "a") {
        var texture = material.heightMap;
        meshInstance.setParameter("heightMap_channel" + index, texture);
      }
    });
  }

  if (this.useNormalMap) {
    this.materialChannels.forEach((materialChannel, index) => {
      var texture = materialChannel.materialAsset.resource.normalMap;
      meshInstance.setParameter("normalMap_channel" + index, texture);
    });
  }

  if (this.useDiffuseMap) {
    this.materialChannels.forEach((materialChannel, index) => {
      var texture = materialChannel.materialAsset.resource.diffuseMap;
      meshInstance.setParameter("texture_channel" + index, texture);
    });
  }

  meshInstance.setParameter("terrain_tile", this.tiling);
};

UranusTerrainSplatmaps.prototype.getBaseShader = function () {
  return (
    "varying vec2 terrain_colorMap_uv;\n" + "uniform sampler2D texture_colorMapA;\n" + "uniform sampler2D texture_colorMapB;\n" + "vec4 colormapA;\n" + "vec4 colormapB;\n" + "uniform float terrain_tile;\n" + "uniform vec3 view_position;\n" + "uniform vec3 light_globalAmbient;\n" + "float square(float x) {\n" + "   return x*x;\n" + "}\n" + "float saturate(float x) {\n" + "   return clamp(x, 0.0, 1.0);\n" + "}\n" + "vec3 saturate(vec3 x) {\n" + "   return clamp(x, vec3(0.0), vec3(1.0));\n" + "}\n"
  );

  // vec2 getTexCoordFromAtlas(float tiling, float texRatio, float texOffsetX, float texOffsetY){
  //   vec2 uv = fract(vUv0 * tiling) * texRatio;
  //   uv.x += texOffsetX;
  //   uv.y += texOffsetY + 0.005;
  //   return uv;
  // }
};

UranusTerrainSplatmaps.prototype.getStartVertexShader = function () {
  return `
  uniform vec2 terrain_colorMap_offset;
  uniform vec2 terrain_colorMap_ratio;

  varying vec2 terrain_colorMap_uv;
  void main(void) {

    float terrainU = vertex_texCoord0.x * terrain_colorMap_ratio.x + terrain_colorMap_offset.x;
    float terrainV = vertex_texCoord0.y * terrain_colorMap_ratio.y + terrain_colorMap_offset.y;
    terrain_colorMap_uv = vec2(terrainU, terrainV);

    gl_Position = getPosition();
  `;
};

UranusTerrainSplatmaps.prototype.getDiffuseShader = function (calcColormap) {
  var channelUniforms = "";
  var channelTexels = "";
  var finalColor = "   dAlbedo = gammaCorrectInput(";

  var buffers = {};

  this.materialChannels.forEach((channel, index) => {
    var material = channel.materialAsset.resource;
    var nextChannel = this.splatmapChannels[index];

    if (material.diffuseMap && nextChannel) {
      // --- check if we can reuse buffer based on unique naming
      var textureIndex = index;
      if (isNaN(buffers[material.diffuseMap.name]) === false) {
        textureIndex = buffers[material.diffuseMap.name];
      } else {
        // --- store index to reuse the texture buffer
        buffers[material.diffuseMap.name] = index;

        channelUniforms += `   uniform sampler2D texture_channel${index};\n`;
        channelTexels += `   vec3 texel${index} = texture2D(texture_channel${index}, vUv0 * terrain_tile).rgb;\n`;
      }

      finalColor += `${nextChannel.map}.${nextChannel.channel} * texel${textureIndex} +`;
    }
  });

  finalColor = finalColor.slice(0, -1);
  finalColor += ");\n";

  return (
    channelUniforms +
    (this.useOcclusion === 1 ? "   uniform sampler2D texture_diffuseMap;\n" : "") +
    "   void getAlbedo() {\n" +
    (calcColormap ? "       colormapA = texture2D(texture_colorMapA, terrain_colorMap_uv);\n" : "") +
    (calcColormap && this.splatmapChannels.length >= 6 ? "       colormapB = texture2D(texture_colorMapB, terrain_colorMap_uv);\n" : "") +
    channelTexels +
    finalColor +
    (this.useOcclusion > 0 ? "   float occlusion = texture2D( " + (this.useOcclusion === 2 ? "texture_normalMap" : "texture_diffuseMap") + ", terrain_colorMap_uv)." + (this.useOcclusion === 2 ? "a" : "r") + ";\ndAlbedo *= occlusion;\n" : "") +
    "  }\n"
  );
};

UranusTerrainSplatmaps.prototype.getNormalShader = function (calcColormap) {
  var channelUniforms = "";
  var channelTexels = "";
  var finalColor = `   vec3 normalMap = ${this.useNormal === 1 ? "baseNormalMap.rgb +" : ""}`;

  if (this.useNormal === 2) {
    var buffers = {};

    this.materialChannels.forEach((channel, index) => {
      var material = channel.materialAsset.resource;
      var nextChannel = this.splatmapChannels[index];

      if (material.normalMap && nextChannel) {
        // --- check if we can reuse buffer based on unique naming
        var textureIndex = index;
        if (isNaN(buffers[material.normalMap.name]) === false) {
          textureIndex = buffers[material.normalMap.name];
        } else {
          // --- store index to reuse the texture buffer
          buffers[material.normalMap.name] = index;

          // --- find the right normal unpacking method for each channel
          var isPackedNormalMap = material.normalMap ? material.normalMap.format === pc.PIXELFORMAT_DXT5 || material.normalMap.type === pc.TEXTURETYPE_SWIZZLEGGGR : false;
          var unpackMethod = isPackedNormalMap ? "unpackTerrainNormalXY" : "unpackTerrainNormalXYZ";

          channelUniforms += `   uniform sampler2D normalMap_channel${index};\n`;
          channelTexels += `   vec3 texel${index} = ${unpackMethod}(texture2D(normalMap_channel${index}, vUv0  * terrain_tile + dUvOffset));\n`;
        }

        finalColor += `${nextChannel.map}.${nextChannel.channel} * texel${textureIndex} +`;
      }
    });
  }

  finalColor = finalColor.slice(0, -1);
  finalColor += ";\n";

  var baseUnpackMethod;
  if (this.useNormal === 1) {
    // --- find the right normal unpacking method for the base channel
    var isPackedNormalMap = this.material.normalMap ? this.material.normalMap.format === pc.PIXELFORMAT_DXT5 || this.material.normalMap.type === pc.TEXTURETYPE_SWIZZLEGGGR : false;
    baseUnpackMethod = isPackedNormalMap ? "unpackTerrainNormalXY" : "unpackTerrainNormalXYZ";
  }

  return (
    channelUniforms +
    (this.useNormal === 1 ? "   uniform sampler2D texture_normalMap;\n" : "") +
    " uniform float material_bumpiness;\n" +
    " vec3 unpackTerrainNormalXYZ(vec4 nmap) {return nmap.xyz * 2.0 - 1.0;}\n" +
    " vec3 unpackTerrainNormalXY(vec4 nmap) {vec3 normal; normal.xy = nmap.wy * 2.0 - 1.0; normal.z = sqrt(1.0 - saturate(dot(normal.xy, normal.xy))); return normal;}\n" +
    " void getNormal() {\n" +
    (calcColormap ? "       colormapA = texture2D(texture_colorMapA, terrain_colorMap_uv);\n" : "") +
    (calcColormap && this.splatmapChannels.length >= 6 ? "       colormapB = texture2D(texture_colorMapB, terrain_colorMap_uv);\n" : "") +
    (this.useNormal === 1 ? "   vec3 baseNormalMap = " + baseUnpackMethod + "(texture2D(texture_normalMap, terrain_colorMap_uv));\n" : "") +
    channelTexels +
    finalColor +
    "   dNormalMap = normalMap;\n" +
    "   normalMap = mix(vec3(0.0, 0.0, 1.0), normalMap, material_bumpiness);\n" +
    "   dNormalW = dTBN * normalMap;\n" +
    "  }\n"
  );
};

UranusTerrainSplatmaps.prototype.getParallaxShader = function (calcColormap) {
  var channelUniforms = "";
  var channelTexels = "";
  var finalColor = "   float height = ";

  var buffers = {};

  this.materialChannels.forEach((channel, index) => {
    var material = channel.materialAsset.resource;
    var nextChannel = this.splatmapChannels[index];

    if (material.heightMap && nextChannel) {
      // --- check if we can reuse buffer based on unique naming
      var textureIndex = index;
      if (isNaN(buffers[material.heightMap.name]) === false) {
        textureIndex = buffers[material.heightMap.name];
      } else {
        // --- store index to reuse the texture buffer
        buffers[material.heightMap.name] = index;

        channelUniforms += `   uniform sampler2D heightMap_channel${index};\n`;

        var sampler = material.heightMapChannel === "a" ? "texture_channel" : "heightMap_channel";
        channelTexels += `   float texel${index} = texture2D(${sampler}${index}, vUv0 * terrain_tile).$CH;\n`;
      }

      finalColor += `${nextChannel.map}.${nextChannel.channel} * texel${textureIndex} +`;
    }
  });

  finalColor = finalColor.slice(0, -1);
  finalColor += ";\n";

  return (
    channelUniforms +
    " uniform float material_heightMapFactor;\n" +
    " void getParallax() {\n" +
    "   float parallaxScale = material_heightMapFactor;\n" +
    (calcColormap ? "   colormapA = texture2D(texture_colorMapA, terrain_colorMap_uv);\n" : "") +
    (calcColormap && this.splatmapChannels.length >= 6 ? "   colormapB = texture2D(texture_colorMapB, terrain_colorMap_uv);\n" : "") +
    channelTexels +
    finalColor +
    "   height = height * parallaxScale - parallaxScale*0.5;\n" +
    "   vec3 viewDirT = dViewDirW * dTBN;\n" +
    "   viewDirT.z += 0.42;\n" +
    "   dUvOffset = height * (viewDirT.xy / viewDirT.z);\n" +
    "  }\n"
  );
};

UranusTerrainSplatmaps.prototype.loadTerrainAssets = function (assets) {
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
