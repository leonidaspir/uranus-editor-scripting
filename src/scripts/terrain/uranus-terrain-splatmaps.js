var UranusTerrainSplatmaps = pc.createScript("uranusTerrainSplatmaps");

UranusTerrainSplatmaps.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});
UranusTerrainSplatmaps.attributes.add("colorMaps", {
  type: "asset",
  array: true,
  assetType: "texture",
  title: "Color Maps",
});
UranusTerrainSplatmaps.attributes.add("useOcclusion", {
  type: "number",
  default: 0,
  enum: [{ None: 0 }, { "From DiffuseMap": 1 }, { "From NormalMap Alpha": 2 }],
});
UranusTerrainSplatmaps.attributes.add("materialAsset", {
  type: "asset",
  assetType: "material",
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
UranusTerrainSplatmaps.attributes.add("tiling", {
  type: "number",
  default: 1,
});

UranusTerrainSplatmaps.attributes.add("eventInit", {
  type: "string",
});

UranusTerrainSplatmaps.attributes.add("eventReady", {
  type: "string",
  default: "uranusTerrain:splatmaps:ready",
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

  this.loadTerrainAssets([this.materialAsset].concat(this.colorMaps)).then(
    function () {
      // --- check if we are using the
      this.useAlpha = this.materialChannels.length === 4;
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

      if (material.normalMap) {
        material.chunks.normalMapPS = this.getNormalShader(colormapReady === false);
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
  var allColormaps = this.colorMaps;

  var x, y, xa, ya;
  var index = 0;

  for (x = 0; x < this.gridSize; x++) {
    for (y = 0; y < this.gridSize; y++) {
      var colormap = allColormaps[index];

      index++;

      for (xa = 0; xa < this.subGridSize; xa++) {
        for (ya = 0; ya < this.subGridSize; ya++) {
          var totalX = x + xa;
          var totalY = y + ya;

          var chunkEntity = this.entity.findByName("Tile_" + totalX + "_" + totalY);
          var meshInstance = chunkEntity.model.meshInstances[0];

          this.updateVertexUniforms(meshInstance, totalX, totalY);

          this.updateUniforms(meshInstance, colormap.resource);
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

UranusTerrainSplatmaps.prototype.updateUniforms = function (meshInstance, colormap) {
  meshInstance.setParameter("texture_colorMap", colormap);

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
  return "varying vec2 terrain_colorMap_uv;\n" + "uniform sampler2D texture_colorMap;\n" + "vec4 colormap;\n" + "uniform float terrain_tile;\n" + "uniform vec3 view_position;\n" + "uniform vec3 light_globalAmbient;\n" + "float square(float x) {\n" + "   return x*x;\n" + "}\n" + "float saturate(float x) {\n" + "   return clamp(x, 0.0, 1.0);\n" + "}\n" + "vec3 saturate(vec3 x) {\n" + "   return clamp(x, vec3(0.0), vec3(1.0));\n" + "}\n";

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
  return (
    "   uniform sampler2D texture_channel0;\n" +
    "   uniform sampler2D texture_channel1;\n" +
    "   uniform sampler2D texture_channel2;\n" +
    "   uniform sampler2D texture_channel3;\n" +
    (this.useOcclusion === 1 ? "   uniform sampler2D texture_diffuseMap;\n" : "") +
    "   void getAlbedo() {\n" +
    (calcColormap ? "       colormap = texture2D(texture_colorMap, terrain_colorMap_uv);\n" : "") +
    "     vec3 texel0 = texture2D(texture_channel0, vUv0 * terrain_tile).rgb;\n" +
    "     vec3 texel1 = texture2D(texture_channel1, vUv0 * terrain_tile).rgb;\n" +
    "     vec3 texel2 = texture2D(texture_channel2, vUv0 * terrain_tile).rgb;\n" +
    (this.useAlpha ? " vec3 texel3 = texture2D(texture_channel3, vUv0 * terrain_tile).rgb;\n" : "") +
    "     dAlbedo = gammaCorrectInput(addAlbedoDetail(colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 " +
    (this.useAlpha ? "+ colormap.a * texel3" : "") +
    "));\n" +
    (this.useOcclusion > 0 ? "   float occlusion = texture2D( " + (this.useOcclusion === 2 ? "texture_normalMap" : "texture_diffuseMap") + ", terrain_colorMap_uv)." + (this.useOcclusion === 2 ? "a" : "r") + ";\ndAlbedo *= occlusion;\n" : "") +
    "  }\n"
  );
};

UranusTerrainSplatmaps.prototype.getNormalShader = function (calcColormap) {
  return (
    " uniform sampler2D texture_normalMap;\n" +
    " uniform sampler2D normalMap_channel0;\n" +
    " uniform sampler2D normalMap_channel1;\n" +
    " uniform sampler2D normalMap_channel2;\n" +
    " uniform sampler2D normalMap_channel3;\n" +
    " uniform float material_bumpiness;\n" +
    " void getNormal() {\n" +
    (calcColormap ? "   colormap = texture2D(texture_colorMap, terrain_colorMap_uv);\n" : "") +
    "   vec3 baseNormalMap = unpackNormal(texture2D(texture_normalMap, terrain_colorMap_uv));\n" +
    "   vec3 texel0 = unpackNormal(texture2D(normalMap_channel0, vUv0  * terrain_tile + dUvOffset));\n" +
    "   vec3 texel1 = unpackNormal(texture2D(normalMap_channel1, vUv0  * terrain_tile + dUvOffset));\n" +
    "   vec3 texel2 = unpackNormal(texture2D(normalMap_channel2, vUv0  * terrain_tile + dUvOffset));\n" +
    (this.useAlpha ? " vec3 texel3 = unpackNormal(texture2D(normalMap_channel3, vUv0  * terrain_tile + dUvOffset));\n" : "") +
    "   vec3 normalMap = baseNormalMap.rgb + colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2" +
    (this.useAlpha ? "+ colormap.a * texel3" : "") +
    ";\n" +
    "   dNormalMap = addNormalDetail(normalMap);\n" +
    "   normalMap = mix(vec3(0.0, 0.0, 1.0), normalMap, material_bumpiness);\n" +
    "   dNormalW = dTBN * normalMap;\n" +
    "}\n"
  );
};

UranusTerrainSplatmaps.prototype.getParallaxShader = function (calcColormap) {
  return (
    " uniform sampler2D heightMap_channel0;\n" +
    " uniform sampler2D heightMap_channel1;\n" +
    " uniform sampler2D heightMap_channel2;\n" +
    " uniform sampler2D heightMap_channel3;\n" +
    " uniform float material_heightMapFactor;\n" +
    " void getParallax() {\n" +
    "   float parallaxScale = material_heightMapFactor;\n" +
    (calcColormap ? "   colormap = texture2D(texture_colorMap, terrain_colorMap_uv);\n" : "") +
    "   float texel0 = texture2D(" +
    (this.materialChannels[0].materialAsset.resource.heightMapChannel === "a" ? "texture_channel0" : "heightMap_channel0") +
    ", vUv0  * terrain_tile).$CH;\n" +
    "   float texel1 = texture2D(" +
    (this.materialChannels[1].materialAsset.resource.heightMapChannel === "a" ? "texture_channel1" : "heightMap_channel1") +
    ", vUv0  * terrain_tile).$CH;\n" +
    "   float texel2 = texture2D(" +
    (this.materialChannels[2].materialAsset.resource.heightMapChannel === "a" ? "texture_channel2" : "heightMap_channel2") +
    ", vUv0  * terrain_tile).$CH;\n" +
    (this.useAlpha ? "   float texel3 = texture2D(" + (this.materialChannels[3].materialAsset.resource.heightMapChannel === "a" ? "texture_channel3" : "heightMap_channel3") + ", vUv0  * terrain_tile).$CH;\n" : "") +
    "   float height = colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2" +
    (this.useAlpha ? "+ colormap.a * texel3" : "") +
    ";\n" +
    "   height = height * parallaxScale - parallaxScale*0.5;\n" +
    "   vec3 viewDirT = dViewDirW * dTBN;\n" +
    "   viewDirT.z += 0.42;\n" +
    "   dUvOffset = height * (viewDirT.xy / viewDirT.z);\n" +
    "}\n"
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
