const UranusEffectMaterialMix = pc.createScript("uranusEffectMaterialMix");

UranusEffectMaterialMix.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});
UranusEffectMaterialMix.attributes.add("materialAsset", {
  type: "asset",
});
UranusEffectMaterialMix.attributes.add("materialChannels", {
  type: "json",
  array: true,
  schema: [
    {
      name: "channelName",
      title: "Channel Name",
      type: "string",
      description: "The channel name to override the corresponding shader. Currently supported channels are: diffuse and normalMap.",
    },
    {
      name: "mask",
      title: "Mask",
      type: "asset",
      assetType: "texture",
      description: "A RGB or RGBA mask to be used for masking.",
    },
    {
      name: "invertR",
      title: "Invert Channel R",
      type: "boolean",
      default: false,
      description: "If selected the mask color will be used inverted, from 1.0 to 0.0.",
    },
    {
      name: "invertG",
      title: "Invert Channel G",
      type: "boolean",
      default: false,
      description: "If selected the mask color will be used inverted, from 1.0 to 0.0.",
    },
    {
      name: "invertB",
      title: "Invert Channel B",
      type: "boolean",
      default: false,
      description: "If selected the mask color will be used inverted, from 1.0 to 0.0.",
    },
    {
      name: "invertA",
      title: "Invert Channel A",
      type: "boolean",
      default: false,
      description: "If selected the mask color will be used inverted, from 1.0 to 0.0.",
    },
    {
      name: "textures",
      title: "Textures",
      type: "asset",
      assetType: "texture",
      array: true,
      description: "A list of texture to be assigned in order using the mask corresponding color channel.",
    },
    {
      name: "tilingR",
      title: "Tiling Channel R",
      type: "number",
      default: 1,
      description: "The tiling for each channel in order.",
    },
    {
      name: "tilingG",
      title: "Tiling Channel G",
      type: "number",
      default: 1,
      description: "The tiling for each channel in order.",
    },
    {
      name: "tilingB",
      title: "Tiling Channel B",
      type: "number",
      default: 1,
      description: "The tiling for each channel in order.",
    },
    {
      name: "tilingA",
      title: "Tiling Channel A",
      type: "number",
      default: 1,
      description: "The tiling for each channel in order.",
    },
  ],
});

UranusEffectMaterialMix.channelOrder = ["normalMap", "diffuse"];

UranusEffectMaterialMix.prototype.initialize = function () {
  // --- variables
  this.channels = undefined;
  this.texturesUsed = undefined;

  // --- execute
  this.prepare();

  // --- events
  this.on("attr", this.prepare);
};

UranusEffectMaterialMix.prototype.prepare = function () {
  this.prepareChannels();

  this.updateMaterial();
};

UranusEffectMaterialMix.prototype.prepareChannels = function () {
  this.channels = [];
  this.texturesUsed = {};

  // --- order array by shader compilation order
  const orderedChannels = this.materialChannels.sort((a, b) => (UranusEffectMaterialMix.channelOrder.indexOf(a.channelName) > UranusEffectMaterialMix.channelOrder.indexOf(b.channelName) ? 1 : -1));

  orderedChannels.forEach((materialChannel) => {
    if (!materialChannel || UranusEffectMaterialMix.channelOrder.indexOf(materialChannel.channelName) === -1) return true;

    // --- prepare the channel
    const channel = {
      chunkName: materialChannel.channelName,
      mask: undefined,
      textures: [],
    };

    // --- prepare the mask and attempt to reuse if it's already in use
    if (this.texturesUsed[materialChannel.mask.id]) {
      const textureFromHistory = this.texturesUsed[materialChannel.mask.id];
      channel.mask = {
        uniformName: textureFromHistory.uniformName,
        resource: textureFromHistory.resource,
        inUse: true,
      };
    } else {
      channel.mask = {
        uniformName: `textureU_${channel.chunkName}_mask`,
        resource: materialChannel.mask.resource,
        inUse: false,
      };

      // --- keep track of textures used
      this.texturesUsed[materialChannel.mask.id] = channel.mask;
    }

    const maskColors = channel.mask.resource.format === pc.PIXELFORMAT_R8_G8_B8_A8 ? ["r", "g", "b", "a"] : ["r", "g", "b"];
    const textureTiling = [materialChannel.tilingR, materialChannel.tilingG, materialChannel.tilingB, materialChannel.tilingA];
    const invertChannel = [materialChannel.invertR, materialChannel.invertG, materialChannel.invertB, materialChannel.invertA];

    // --- assign the textures
    materialChannel.textures.forEach((textureAsset, textureIndex) => {
      if (textureAsset) {
        const texture = {
          uniformName: `textureU_${channel.chunkName}_channel${textureIndex}`,
          resource: textureAsset.resource,
          colorChannel: maskColors[textureIndex],
          tiling: textureTiling[textureIndex].toFixed(2),
          invertChannel: invertChannel[textureIndex],
        };

        channel.textures.push(texture);
      }
    });

    this.channels.push(channel);
  });
};

UranusEffectMaterialMix.prototype.updateMaterial = function () {
  const material = this.materialAsset.resource;

  this.channels.forEach((channel) => {
    switch (channel.chunkName) {
      case "diffuse":
        if (!material.diffuseMap) {
          material.diffuseMap = channel.mask.resource;
        }
        material.diffuseMapTiling = new pc.Vec2(1, 1);
        material.chunks.diffusePS = this.getDiffuseShader(material, channel);

        break;
      case "normalMap":
        let baseNormalMap = true;
        if (!material.normalMap) {
          material.normalMap = channel.mask.resource;
          baseNormalMap = false;
        }
        material.normalMapTiling = new pc.Vec2(1, 1);
        material.chunks.normalMapPS = this.getNormalShader(material, channel, baseNormalMap);

        break;
      default:
        return true;
    }
  });

  material.update();
};

UranusEffectMaterialMix.prototype.getDiffuseShader = function (material, channel) {
  // --- prepare uniforms
  let uniforms = "";
  let dAlbedo = "";

  if (channel.textures.length > 0) {
    // --- add mask to uniform, if required
    if (channel.mask.inUse === false) {
      uniforms = `uniform sampler2D ${channel.mask.uniformName};\n`;

      uniforms += `vec4 dColormapU;\n`;
      dAlbedo += `dColormapU = texture2D(${channel.mask.uniformName}, $UV);\n`;

      material.setParameter(channel.mask.uniformName, channel.mask.resource);
    }

    // --- add the color channel uniforms
    channel.textures.forEach((texture, index) => {
      //if (index > 0) return;
      uniforms += `uniform sampler2D ${texture.uniformName};\n`;

      const checkInvert = texture.invertChannel ? "1.0 - " : "";
      dAlbedo += `dAlbedo += texture2D(${texture.uniformName}, $UV * ${texture.tiling}).rgb * (${checkInvert}dColormapU.${texture.colorChannel});\n`;

      material.setParameter(texture.uniformName, texture.resource);
    });
  }

  let shader = `

  ${uniforms}

  #ifdef MAPCOLOR
  uniform vec3 material_diffuse;
  #endif

  void getAlbedo() {
      
      ${dAlbedo}
      dAlbedo=gammaCorrectInput(dAlbedo);

      #ifdef MAPCOLOR
      dAlbedo *= material_diffuse.rgb;
      #endif         

      #ifdef MAPVERTEX
      dAlbedo *= gammaCorrectInput(saturate(vVertexColor.$VC));
      #endif      
  }  
  `;

  return shader;
};

UranusEffectMaterialMix.prototype.getNormalShader = function (material, channel, baseNormalMap) {
  // --- prepare uniforms
  let uniforms = "";
  let normalMap = "";

  // --- base material normal map
  if (baseNormalMap) {
    uniforms += "uniform sampler2D texture_normalMap;\n";
    normalMap += "normalMap = unpackNormal(texture2D(texture_normalMap, $UV));\n";
  } else {
    normalMap += "normalMap = vec3(0.0, 0.0, 1.0);\n";
  }

  if (channel.textures.length > 0) {
    // --- add mask to uniform, if required
    if (channel.mask.inUse === false) {
      uniforms += `uniform sampler2D ${channel.mask.uniformName};\n`;
      uniforms += `vec4 dColormapU;\n`;

      normalMap += `dColormapU = texture2D(${channel.mask.uniformName}, $UV);\n`;

      material.setParameter(channel.mask.uniformName, channel.mask.resource);
    }

    // --- add the color channel uniforms
    channel.textures.forEach((texture, index) => {
      //if (index > 0) return;
      uniforms += `uniform sampler2D ${texture.uniformName};\n`;

      const checkInvert = texture.invertChannel ? "1.0 - " : "";

      normalMap += `normalMap += unpackNormal(texture2D(${texture.uniformName}, $UV * ${texture.tiling})) * (${checkInvert}dColormapU.${texture.colorChannel});\n`;

      material.setParameter(texture.uniformName, texture.resource);
    });
  }

  let shader = `
  
    ${uniforms}

    uniform float material_bumpiness;

    void getNormal() {

        vec3 normalMap;
        ${normalMap}
        normalMap = normalize(mix(vec3(0.0, 0.0, 1.0), normalMap, material_bumpiness));
        dNormalMap = normalMap;
        dNormalW = dTBN * dNormalMap; 
    }  
    `;

  console.log(shader);
  return shader;
};
