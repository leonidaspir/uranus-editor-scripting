var UranusEffectWater = pc.createScript("uranusEffectWater");

UranusEffectWater.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});
UranusEffectWater.attributes.add("materialAsset", {
  type: "asset",
});
UranusEffectWater.attributes.add("depthMap", {
  type: "asset",
  assetType: "texture",
});
UranusEffectWater.attributes.add("camera", {
  type: "entity",
});
UranusEffectWater.attributes.add("resolution", {
  type: "number",
  default: 512,
  enum: [
    { 128: 128 },
    { 256: 256 },
    { 512: 512 },
    { 1024: 1024 },
    { 2048: 2048 },
    { 4096: 4096 },
  ],
});
UranusEffectWater.attributes.add("colorWater", {
  type: "rgb",
  default: [0, 0, 1],
});
UranusEffectWater.attributes.add("colorWave", {
  type: "rgba",
  default: [1, 1, 1, 0.5],
});
UranusEffectWater.attributes.add("speed", {
  type: "number",
  default: 2000,
});
UranusEffectWater.attributes.add("landWidth", {
  type: "number",
  default: 0.1,
});
UranusEffectWater.attributes.add("waveWidth", {
  type: "number",
  default: 0.1,
});
UranusEffectWater.attributes.add("waveFrequency", {
  type: "number",
  default: 1.0,
  min: 0.0,
});
UranusEffectWater.attributes.add("waveFalloff", {
  type: "number",
  default: 2.0,
  min: 0.0,
});
UranusEffectWater.attributes.add("depthFactor", {
  type: "number",
  default: 2.0,
  min: 1.0,
});
UranusEffectWater.attributes.add("depthDiscard", {
  type: "number",
  default: 1.0,
  min: 0.0,
  max: 1.0,
});
UranusEffectWater.attributes.add("autoUpdate", {
  type: "boolean",
  default: false,
});

UranusEffectWater.prototype.initialize = function () {
  // --- shader
  this.chunkSources = this.getChunkSourcesShader();
  this.shaderVert = this.getVertPassThroughShader();
  this.shaderBlur = this.getGaussianBlurShader();
  this.shaderWater = this.getWaterShader();

  this.blurSamples = 5;
  this.blurPasses = 3;

  this.dirty = true;
  this.rendering = false;

  this.prepare();

  this.app.on(
    "water:render",
    function () {
      this.dirty = true;
    },
    this
  );

  this.on("destroy", this.onDestroy, this);
};

UranusEffectWater.prototype.prepare = function () {
  this.material = this.materialAsset.resource;
  this.material.chunks.diffusePS = this.shaderWater;

  // --- we clear one of the default material maps, to use for our custom depth map later
  // --- the reason for not putting a custom uniform is to provide editor editing of the material without breaking the shader on recompilation
  this.material.chunks.normalDetailMapPS =
    "vec3 addNormalDetail(vec3 normalMap) {return normalMap;}";

  this.prepareShaders();
  this.prepareTextures();
  this.prepareLayers();

  this.on("attr", this.updateUniforms);
};

UranusEffectWater.prototype.onDestroy = function () {
  this.app.off("water:render", this.render, this);
};

UranusEffectWater.prototype.prepareShaders = function () {
  this.vertexBuffer = this.createFullscreenQuad(this.app.graphicsDevice);

  var shaderBlur = this.shaderBlur.replace(
    "%PRECISSION%",
    this.app.graphicsDevice.precision
  );

  this.quadShaderBlurHorizontal = new pc.Shader(this.app.graphicsDevice, {
    attributes: { aPosition: pc.SEMANTIC_POSITION },
    vshader: this.shaderVert,
    fshader: shaderBlur,
  });

  this.quadShaderBlurVertical = new pc.Shader(this.app.graphicsDevice, {
    attributes: { aPosition: pc.SEMANTIC_POSITION },
    vshader: this.shaderVert,
    fshader: shaderBlur,
  });

  this.uBlurOffsetsHorizontal = new Float32Array(this.blurSamples * 2);
  this.uBlurOffsetsVertical = new Float32Array(this.blurSamples * 2);
  this.uBlurWeights = new Float32Array([
    0.4,
    0.6,
    0.8,
    0.0875,
    0.05,
    0.025,
    0.0875,
    0.05,
    0.025,
    0.0875,
    0.05,
    0.025,
    0.0875,
    0.05,
    0.025,
  ]);

  var texel = 1 / this.resolution;
  // var offset = (this.blurSamples / 2) * texel;
  for (var i = 0; i < this.blurSamples; i++) {
    this.uBlurOffsetsHorizontal[i * 2] = texel * i;
    this.uBlurOffsetsVertical[i * 2 + 1] = texel * i;
  }
};

UranusEffectWater.prototype.prepareTextures = function () {
  this.textureA = new pc.Texture(this.app.graphicsDevice, {
    width: this.resolution,
    height: this.resolution,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
  });

  this.textureB = new pc.Texture(this.app.graphicsDevice, {
    width: this.resolution / 2,
    height: this.resolution / 2,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
  });

  this.renderTargetA = new pc.RenderTarget({
    colorBuffer: this.textureA,
    samples: 8,
  });

  this.renderTargetB = new pc.RenderTarget({
    colorBuffer: this.textureB,
    samples: 8,
  });
};

UranusEffectWater.prototype.prepareLayers = function () {
  var self = this;

  this.layer = this.app.scene.layers.getLayerByName("WaveSources");
  this.layer.renderTarget = this.renderTargetA;
  this.layer.passThrough = true;
  this.layer.shaderPass = 19;
  this.layer.enabled = false;

  var onUpdateShader = function (options) {
    if (!self.rendering) return options;

    var result = {};
    for (var key in options) {
      result[key] = options[key];
    }

    result.chunks = {};
    result.chunks.endPS = self.chunkSources;

    result.useSpecular = false;
    result.useMatalness = false;

    return result;
  };

  for (var i = 0; i < this.layer.opaqueMeshInstances.length; i++) {
    var mesh = this.layer.opaqueMeshInstances[i];
    mesh.material.onUpdateShader = onUpdateShader;
  }

  this.layer.clearCameras();
  this.layer.addCamera(this.camera.camera);

  this.layerComposition = new pc.LayerComposition();
  this.layerComposition.push(this.layer);
};

UranusEffectWater.prototype.updateWater = function () {
  //     this.camera.camera.orthoHeight = this.entity.getLocalScale().x / 2;

  //     var pos = this.entity.getPosition();
  //     this.camera.setPosition(pos.x, 16, pos.z);

  //     var rot = this.entity.getEulerAngles();
  //     if (rot.x > 90 || rot.x < -90) {
  //         this.camera.setEulerAngles(-90, 180 - rot.y, 0);
  //     } else {
  //         this.camera.setEulerAngles(-90, rot.y, 0);
  //     }

  this.camera.enabled = true;

  this.layer.enabled = true;
  this.rendering = true;
  this.app.renderer.renderComposition(this.layerComposition);
  this.rendering = false;
  this.layer.enabled = false;

  var scope = this.app.graphicsDevice.scope;

  scope.resolve("uWeights[0]").setValue(this.uBlurWeights);

  for (var i = 0; i < this.blurPasses; i++) {
    scope.resolve("uBaseTexture").setValue(this.textureA);
    scope.resolve("uOffsets[0]").setValue(this.uBlurOffsetsHorizontal);
    pc.drawFullscreenQuad(
      this.app.graphicsDevice,
      this.renderTargetB,
      this.vertexBuffer,
      this.quadShaderBlurHorizontal
    );

    scope.resolve("uBaseTexture").setValue(this.textureB);
    scope.resolve("uOffsets[0]").setValue(this.uBlurOffsetsVertical);
    pc.drawFullscreenQuad(
      this.app.graphicsDevice,
      this.renderTargetA,
      this.vertexBuffer,
      this.quadShaderBlurVertical
    );
  }

  this.material.diffuseMap = this.textureA;
  this.material.diffuseMapTiling = new pc.Vec2(1, 1);
  this.material.normalDetailMap = this.depthMap.resource;

  this.material.update();

  this.updateUniforms();

  this.camera.enabled = false;
};

UranusEffectWater.prototype.updateUniforms = function () {
  this.material.setParameter("waveWidth", this.waveWidth);
  this.material.setParameter("waveFrequency", this.waveFrequency);
  this.material.setParameter("waveFalloff", this.waveFalloff);
  this.material.setParameter("landWidth", this.landWidth);
  this.material.setParameter("depthFactor", this.depthFactor);
  this.material.setParameter("depthDiscard", this.depthDiscard);
  this.material.setParameter("colorWater", this.colorWater.data3);
  this.material.setParameter("colorWave", this.colorWave.data);
};

// update code called every frame
UranusEffectWater.prototype.update = function (dt) {
  if (!this.material) return;

  if (this.autoUpdate === true || this.dirty || this.material.dirty) {
    this.dirty = false;
    this.updateWater();
  }

  this.material.setParameter("time", 1 - ((Date.now() / this.speed) % 1));
};

UranusEffectWater.prototype.createFullscreenQuad = function (device) {
  // Create the vertex format
  var vertexFormat = new pc.VertexFormat(device, [
    { semantic: pc.SEMANTIC_POSITION, components: 2, type: pc.TYPE_FLOAT32 },
  ]);

  // Create a vertex buffer
  var vertexBuffer = new pc.VertexBuffer(device, vertexFormat, 4);

  // Fill the vertex buffer
  var iterator = new pc.VertexIterator(vertexBuffer);
  iterator.element[pc.SEMANTIC_POSITION].set(-1.0, -1.0);
  iterator.next();
  iterator.element[pc.SEMANTIC_POSITION].set(1.0, -1.0);
  iterator.next();
  iterator.element[pc.SEMANTIC_POSITION].set(-1.0, 1.0);
  iterator.next();
  iterator.element[pc.SEMANTIC_POSITION].set(1.0, 1.0);
  iterator.end();

  return vertexBuffer;
};

UranusEffectWater.prototype.getChunkSourcesShader = function () {
  return "gl_FragColor.rgb = vec3(1.0, 1.0, 1.0);";
};

UranusEffectWater.prototype.getVertPassThroughShader = function () {
  return (
    "attribute vec2 aPosition;\n" +
    "varying vec2 vUv0;\n" +
    "void main(void) {\n" +
    "    gl_Position = vec4(aPosition, 0.0, 1.0);\n" +
    "    vUv0 = (aPosition + 1.0) * 0.5;\n" +
    "}"
  );
};

UranusEffectWater.prototype.getGaussianBlurShader = function () {
  return (
    "precision %PRECISSION% float;\n" +
    "varying vec2 vUv0;\n" +
    "uniform sampler2D uBaseTexture;\n" +
    "uniform vec2 uOffsets[5];\n" +
    "uniform vec3 uWeights[5];\n" +
    "void main(void) {\n" +
    "    vec2 uvs = vUv0;// + (sin(vUv0 * 128.0) / 1024.0);\n" +
    "    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n" +
    "    gl_FragColor.rgb = texture2D(uBaseTexture, uvs).rgb * uWeights[0];\n" +
    "  \n" +
    "    for (int i = 1; i < 5; i++) {\n" +
    "        gl_FragColor.rgb += texture2D(uBaseTexture, uvs + uOffsets[i]).rgb * uWeights[i];\n" +
    "        gl_FragColor.rgb += texture2D(uBaseTexture, uvs - uOffsets[i]).rgb * uWeights[i];\n" +
    "    }\n" +
    "}"
  );
};

UranusEffectWater.prototype.getWaterShader = function () {
  return (
    "uniform sampler2D texture_diffuseMap;\n" +
    "uniform sampler2D texture_normalDetailMap;\n" +
    "uniform float time;\n" +
    "uniform float waveWidth;\n" +
    "uniform float waveFrequency;\n" +
    "uniform float waveFalloff;\n" +
    "uniform float landWidth;\n" +
    "uniform float depthFactor;\n" +
    "uniform float depthDiscard;\n" +
    "uniform vec3 colorWater;\n" +
    "uniform vec4 colorWave;\n" +
    "void getAlbedo() {\n" +
    "    vec3 depth = clamp( texture2D(texture_normalDetailMap, vec2(vUv0.x, 1.0 - vUv0.y)).rgb, 0.0, depthDiscard);\n" +
    "    dDiffuseLight = vec3(1.0);\n" +
    "    dAlbedo = mix(colorWater / depthFactor, colorWater, depth);\n" +
    "    vec3 base = texture2DSRGB(texture_diffuseMap, $UV).rgb;\n" +
    "    float b = mod((base.x / 2.0 + base.y / 2.0 + base.z) * 2.0, 1.0);\n" +
    "    float off = ((sin(vPositionW.x * waveFrequency) + 1.0) + (cos(vPositionW.z * waveFrequency) + 1.0)) / 4.0;// + time;\n" +
    "    float t = 1.0 - pow(1.0 - mod(time + off, 1.0), 0.3);\n" +
    "    float thickness = max(0.0, pow(t * 2.0, 2.0));\n" +
    "    if (base.z > 0.3) {\n" +
    "        dAlbedo = mix(dAlbedo, colorWave.rgb, colorWave.a);\n" +
    "    } else if (t < b && t > (b - (waveWidth * thickness)) && b > 0.01) {\n" +
    "        float o = 1.0 - pow(1.0 - t, waveFalloff);\n" +
    "        dAlbedo = mix(dAlbedo, colorWave.rgb, colorWave.a * o);\n" +
    "    }\n" +
    "    dAlbedo.rgb += base * landWidth;\n" +
    "}"
  );
};
