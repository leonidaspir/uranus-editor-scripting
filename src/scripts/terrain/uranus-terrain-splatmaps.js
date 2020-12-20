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
UranusTerrainSplatmaps.attributes.add("occlusionMaps", {
  type: "asset",
  array: true,
  assetType: "texture",
  title: "Occlusion Maps",
});
UranusTerrainSplatmaps.attributes.add("materialAsset", {
  type: "asset",
  assetType: "material",
});
UranusTerrainSplatmaps.attributes.add("textureChannel0", {
  type: "asset",
  assetType: "material",
  title: "Textures Channel 1",
  description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel1", {
  type: "asset",
  assetType: "material",
  title: "Textures Channel 2",
  description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel2", {
  type: "asset",
  assetType: "material",
  title: "Textures Channel 3",
  description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel3", {
  type: "asset",
  assetType: "material",
  title: "Textures Channel 4",
  description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
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

  this.loadTerrainAssets([this.materialAsset].concat(this.colorMaps).concat(this.occlusionMaps)).then(
    function () {
      // --- check if we are using the
      this.useAlpha = this.textureChannel3 !== null;
      this.useNormalMap = false;
      this.useDiffuseMap = false;
      this.useParallaxMap = false;

      // --- prepare the material
      var material = this.materialAsset.resource;
      this.material = material;

      // --- add the shader overrides per material channel
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
        material.chunks.diffusePS = this.getDiffuseShader(colormapReady === false, this.occlusionMaps.length > 0);
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
  var allOcclusionmaps = this.occlusionMaps;
  this.gridSize = this.uranusTerrain.gridSize;

  var index = 0;

  for (var x = 0; x < this.gridSize; x++) {
    for (var y = 0; y < this.gridSize; y++) {
      var colormap = allColormaps[index];
      var occlusionmap = allOcclusionmaps[index];
      var chunkEntity = this.entity.findByName("Tile_" + x + "_" + y);

      this.updateUniforms(chunkEntity.model.meshInstances[0], colormap.resource, occlusionmap ? occlusionmap.resource : null);

      index++;
    }
  }
};

UranusTerrainSplatmaps.prototype.updateUniforms = function (meshInstance, colormap, occlusionmap) {
  meshInstance.setParameter("texture_colorMap", colormap);

  if (this.useParallaxMap) {
    meshInstance.setParameter("heightMap_channel0", this.textureChannel0.resource.heightMap);
    meshInstance.setParameter("heightMap_channel1", this.textureChannel1.resource.heightMap);
    meshInstance.setParameter("heightMap_channel2", this.textureChannel2.resource.heightMap);
    if (this.useAlpha) {
      meshInstance.setParameter("heightMap_channel3", this.textureChannel3.resource.heightMap);
    }
  }

  if (this.useNormalMap) {
    meshInstance.setParameter("normalMap_channel0", this.textureChannel0.resource.normalMap);
    meshInstance.setParameter("normalMap_channel1", this.textureChannel1.resource.normalMap);
    meshInstance.setParameter("normalMap_channel2", this.textureChannel2.resource.normalMap);
    if (this.useAlpha) {
      meshInstance.setParameter("normalMap_channel3", this.textureChannel3.resource.normalMap);
    }
  }

  if (this.useDiffuseMap) {
    meshInstance.setParameter("texture_channel0", this.textureChannel0.resource.diffuseMap);
    meshInstance.setParameter("texture_channel1", this.textureChannel1.resource.diffuseMap);
    meshInstance.setParameter("texture_channel2", this.textureChannel2.resource.diffuseMap);
    if (this.useAlpha) {
      meshInstance.setParameter("texture_channel3", this.textureChannel3.resource.diffuseMap);
    }

    if (occlusionmap) {
      meshInstance.setParameter("texture_occlusion", occlusionmap);
    }
  }

  meshInstance.setParameter("terrain_tile", this.tiling);
};

UranusTerrainSplatmaps.prototype.getBaseShader = function () {
  return "uniform sampler2D texture_colorMap;\n" + "vec4 colormap;\n" + "uniform float terrain_tile;\n" + "uniform vec3 view_position;\n" + "uniform vec3 light_globalAmbient;\n" + "float square(float x) {\n" + "   return x*x;\n" + "}\n" + "float saturate(float x) {\n" + "   return clamp(x, 0.0, 1.0);\n" + "}\n" + "vec3 saturate(vec3 x) {\n" + "   return clamp(x, vec3(0.0), vec3(1.0));\n" + "}\n";
};

UranusTerrainSplatmaps.prototype.getDiffuseShader = function (calcColormap, useOcclusion) {
  return (
    "   uniform sampler2D texture_channel0;\n" +
    "   uniform sampler2D texture_channel1;\n" +
    "   uniform sampler2D texture_channel2;\n" +
    "   uniform sampler2D texture_channel3;\n" +
    (useOcclusion ? "   uniform sampler2D texture_occlusion;\n" : "") +
    "   void getAlbedo() {\n" +
    (calcColormap ? "       colormap = texture2D(texture_colorMap, $UV);\n" : "") +
    "     vec3 texel0 = texture2D(texture_channel0, vUv0 * terrain_tile).rgb;\n" +
    "     vec3 texel1 = texture2D(texture_channel1, vUv0 * terrain_tile).rgb;\n" +
    "     vec3 texel2 = texture2D(texture_channel2, vUv0 * terrain_tile).rgb;\n" +
    (this.useAlpha ? " vec3 texel3 = texture2D(texture_channel3, vUv0 * terrain_tile).rgb\n;" : "") +
    "     dAlbedo = gammaCorrectInput(addAlbedoDetail(colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 " +
    (this.useAlpha ? "+ colormap.a * texel3" : "") +
    "));\n" +
    (useOcclusion ? "   vec3 occlusion = texture2D( texture_occlusion, vUv0).rgb;\ndAlbedo *= occlusion;\n" : "") +
    "  }\n"
  );
};

UranusTerrainSplatmaps.prototype.getNormalShader = function (calcColormap) {
  return (
    " uniform sampler2D normalMap_channel0;\n" +
    " uniform sampler2D normalMap_channel1;\n" +
    " uniform sampler2D normalMap_channel2;\n" +
    " uniform sampler2D normalMap_channel3;\n" +
    " uniform float material_bumpiness;\n" +
    " void getNormal() {\n" +
    (calcColormap ? "   colormap = texture2D(texture_colorMap, vUv0);\n" : "") +
    "   vec3 texel0 = unpackNormal(texture2D(normalMap_channel0, vUv0  * terrain_tile + dUvOffset));\n" +
    "   vec3 texel1 = unpackNormal(texture2D(normalMap_channel1, vUv0  * terrain_tile + dUvOffset));\n" +
    "   vec3 texel2 = unpackNormal(texture2D(normalMap_channel2, vUv0  * terrain_tile + dUvOffset));\n" +
    "   vec3 texel3 = unpackNormal(texture2D(normalMap_channel3, vUv0  * terrain_tile + dUvOffset));\n" +
    "   vec3 normalMap = colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 + colormap.a * texel3;\n" +
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
    (calcColormap ? "   colormap = texture2D(texture_colorMap, vUv0);\n" : "") +
    "   float texel0 = texture2D(heightMap_channel0, vUv0  * terrain_tile).$CH;\n" +
    "   float texel1 = texture2D(heightMap_channel1, vUv0  * terrain_tile).$CH;\n" +
    "   float texel2 = texture2D(heightMap_channel2, vUv0  * terrain_tile).$CH;\n" +
    "   float texel3 = texture2D(heightMap_channel3, vUv0  * terrain_tile).$CH;\n" +
    "   float height = colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 + colormap.a * texel3;\n" +
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
