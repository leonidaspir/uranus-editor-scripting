var UranusEffectLodSwitch = pc.createScript("UranusEffectLodSwitch");

UranusEffectLodSwitch.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusEffectLodSwitch.attributes.add("materialAsset", { type: "asset", assetType: "material" });
UranusEffectLodSwitch.attributes.add("fadeThreshold", { type: "number", default: 1.0, min: 0.0, title: "Fade Threshold" });

// initialize code called once per entity
UranusEffectLodSwitch.prototype.initialize = function () {
  if (!this.materialAsset) {
    return false;
  }

  this.materialAsset.ready(this.onMaterialUpdate.bind(this));

  this.materialAsset.on("change", this.onMaterialUpdate.bind(this));

  this.app.assets.load(this.materialAsset);

  this.on("attr", this.updateAttributes);
};

UranusEffectLodSwitch.prototype.onMaterialUpdate = function () {
  var m = this.materialAsset.resource;
  this.material = m;

  m.chunks.alphaTestPS =
    "    uniform float alpha_ref;" +
    "    uniform vec3 uranusViewPosition;" +
    "    uniform float uranusFadeOutDistance;" +
    "    uniform float fadeThreshold;" +
    "    void alphaTest(float a) {" +
    "        float distance = distance(uranusViewPosition, vPositionW);" +
    "        float fadeFactor = alpha_ref;" +
    "        if( distance > (uranusFadeOutDistance * fadeThreshold ) ){" +
    "            fadeFactor = clamp(distance / uranusFadeOutDistance, alpha_ref, 1.0);" +
    "        }" +
    "        if (a < fadeFactor) discard;" +
    "    }";

  m.update();

  this.updateAttributes();
};

UranusEffectLodSwitch.prototype.updateAttributes = function () {
  this.material.setParameter("fadeThreshold", this.fadeThreshold);
};
