var UranusTerrainSplatmaps = pc.createScript("uranusTerrainSplatmaps");

UranusTerrainSplatmaps.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});
UranusTerrainSplatmaps.attributes.add("materialAsset", {
  type: "asset",
  assetType: "material",
});
UranusTerrainSplatmaps.attributes.add("colormap", {
  type: "asset",
  assetType: "texture",
  title: "Colormap",
});
UranusTerrainSplatmaps.attributes.add("textureChannel0", {
  type: "asset",
  assetType: "material",
  title: "Textures Channel 1",
  description:
    "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel1", {
  type: "asset",
  assetType: "material",
  title: "Textures Channel 2",
  description:
    "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel2", {
  type: "asset",
  assetType: "material",
  title: "Textures Channel 3",
  description:
    "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel3", {
  type: "asset",
  assetType: "material",
  title: "Textures Channel 4",
  description:
    "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("tiling", {
  type: "number",
  default: 1,
});

// initialize code called once per entity
UranusTerrainSplatmaps.prototype.initialize = function () {
  this.app.on("splatmaps:render", this.render, this);

  this.on("attr", this.onAttrUpdate, this);

  this.on("destroy", this.onDestroy, this);
};

UranusTerrainSplatmaps.prototype.onAttrUpdate = function (property, state) {
  this.updateUniforms();
};

UranusTerrainSplatmaps.prototype.onDestroy = function () {
  this.app.off("splatmaps:render", this.render, this);
};

UranusTerrainSplatmaps.prototype.render = function () {
  var material = this.materialAsset.resource;

  this.material = material;

  material.chunks.diffusePS = this.getSplatmapDiffuseShader();

  material.update();

  this.updateUniforms();
};

UranusTerrainSplatmaps.prototype.updateUniforms = function () {
  this.material.setParameter("texture_colorMap", this.colormap.resource);

  this.material.setParameter(
    "texture_channel0",
    this.textureChannel0.resource.diffuseMap
  );
  this.material.setParameter(
    "texture_channel1",
    this.textureChannel1.resource.diffuseMap
  );
  this.material.setParameter(
    "texture_channel2",
    this.textureChannel2.resource.diffuseMap
  );
  this.material.setParameter(
    "texture_channel3",
    this.textureChannel3.resource.diffuseMap
  );

  this.material.setParameter("tile", this.tiling);
};

UranusTerrainSplatmaps.prototype.getSplatmapDiffuseShader = function () {
  return (
    "   uniform sampler2D texture_colorMap;" +
    "   uniform float tile;" +
    "   uniform sampler2D texture_channel0;" +
    "   uniform sampler2D texture_channel1;" +
    "   uniform sampler2D texture_channel2;" +
    "   uniform sampler2D texture_channel3;" +
    "   void getAlbedo() {" +
    "       vec4 colormap = texture2D(texture_colorMap, vUv0);" +
    "       vec3 texel0 = texture2D(texture_channel0, vUv0 * tile).rgb;" +
    "       vec3 texel1 = texture2D(texture_channel1, vUv0 * tile).rgb;" +
    "       vec3 texel2 = texture2D(texture_channel2, vUv0 * tile).rgb;" +
    "       vec3 texel3 = texture2D(texture_channel3, vUv0 * tile).rgb;" +
    "       dAlbedo = gammaCorrectInput(colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 + colormap.a * texel3);" +
    "  }"
  );
};
