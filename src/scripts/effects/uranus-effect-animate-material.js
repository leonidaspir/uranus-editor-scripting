var UranusEffectAnimateMaterial = pc.createScript(
  "uranusEffectAnimateMaterial"
);

UranusEffectAnimateMaterial.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});
UranusEffectAnimateMaterial.attributes.add("materialAsset", {
  type: "asset",
});
UranusEffectAnimateMaterial.attributes.add("materialChannel", {
  type: "string",
});
UranusEffectAnimateMaterial.attributes.add("speed", {
  type: "vec2",
});

// initialize code called once per entity
UranusEffectAnimateMaterial.prototype.initialize = function () {
  this.vec = new pc.Vec2();
  this.material = this.materialAsset.resource;
};

// update code called every frame
UranusEffectAnimateMaterial.prototype.update = function (dt) {
  if (!this.material) return;

  // Calculate how much to offset the texture
  // Speed * dt
  this.vec.set(this.speed.x, this.speed.y);
  this.vec.scale(dt);

  // Update the diffuse and normal map offset values
  this.material[this.materialChannel].add(this.vec);
  this.material.update();
};
