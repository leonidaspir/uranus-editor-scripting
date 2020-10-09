var UranusEffectGrassWind = pc.createScript('UranusEffectGrassWind');

UranusEffectGrassWind.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusEffectGrassWind.attributes.add('materialAsset', { type: 'asset', assetType: 'material' });
UranusEffectGrassWind.attributes.add('wavelength', { type: 'number', default: 1 });
UranusEffectGrassWind.attributes.add('amplitude', { type: 'number', default: 0.05 });

// initialize code called once per entity
UranusEffectGrassWind.prototype.initialize = function() {

    if( !this.materialAsset ){
        return false;
    }    
    
    var self = this;

    this.timer = pc.math.random(0,10);

    this.materialAsset.ready( function(){

        var m = self.materialAsset.resource;
        self.material = m;
        
        if( self.material.uranusEffectGrassWind === true ){
            return;
        }

        self.material.uranusEffectGrassWind = true;

        m.chunks.baseVS =  '   attribute vec3 vertex_position;\n'  +  
 '   attribute vec3 vertex_normal;\n'  +  
 '   attribute vec4 vertex_tangent;\n'  +  
 '   attribute vec2 vertex_texCoord0;\n'  +  
 '   attribute vec2 vertex_texCoord1;\n'  +  
 '   attribute vec4 vertex_color;\n'  +  
 '   \n'  +  
 '   uniform mat4 matrix_viewProjection;\n'  +  
 '   uniform mat4 matrix_model;\n'  +  
 '   uniform mat3 matrix_normal;\n'  +  
 "   uniform float time;\n" +
 "   uniform float amplitude;\n" +
 "   uniform float wavelength;\n" +                            
 '   \n'  +  
 '   vec3 dPositionW;\n'  +  
 '   mat4 dModelMatrix;\n'  +  
 '   mat3 dNormalMatrix;\n'  +  
 '   vec3 dLightPosW;\n'  +  
 '   vec3 dLightDirNormW;\n'  +  
 '  vec3 dNormalW;\n' ; 
        
        m.chunks.transformVS =  
 '   mat4 getModelMatrix() {\n'  + 
 '       #ifdef DYNAMICBATCH\n'  + 
 '       return getBoneMatrix(vertex_boneIndices);\n'  + 
 '       #elif defined(SKIN)\n'  + 
 '       return matrix_model * getSkinMatrix(vertex_boneIndices, vertex_boneWeights);\n'  + 
 '       #elif defined(INSTANCING)\n'  + 
 '       return mat4(instance_line1, instance_line2, instance_line3, instance_line4);\n'  + 
 '       #else\n'  + 
 '       return matrix_model;\n'  + 
 '       #endif\n'  + 
 '   }\n'  + 
 '   vec4 getPosition() {\n'  + 
 '       dModelMatrix = getModelMatrix();\n'  + 
 '       vec3 localPos = vertex_position;\n'  + 
        "localPos.xyz += sin((vertex_texCoord0.x + time + localPos.x + localPos.z) / wavelength) * amplitude * vertex_texCoord0.y;\n" +            
 '       vec4 posW = dModelMatrix * vec4(localPos, 1.0);\n'  + 
 '       dPositionW = posW.xyz;\n'  + 
 '   \n'  + 
 '       vec4 screenPos;\n'  + 
 '       screenPos = matrix_viewProjection * posW;\n'  + 
 '       return screenPos;\n'  + 
 '   }\n'  + 
 '   vec3 getWorldPosition() {\n'  + 
 '       return dPositionW;\n'  + 
 '  }\n' ;       

        m.update();

        self.updateAttributes();
    });
    
    this.app.assets.load(this.materialAsset);
    
    this.on('attr', this.updateAttributes);
    
};

// update code called every frame
UranusEffectGrassWind.prototype.update = function(dt) {
    
    if( this.material ){
     
        this.timer += dt;

        this.material.setParameter('time', this.timer);      
    }
};

UranusEffectGrassWind.prototype.updateAttributes = function(){
  
    this.material.setParameter('wavelength', this.wavelength);
    this.material.setParameter('amplitude', this.amplitude);    
};