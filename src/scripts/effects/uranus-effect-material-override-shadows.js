var UranusEffectMaterialOverrideShadows = pc.createScript('UranusEffectMaterialOverrideShadows');

UranusEffectMaterialOverrideShadows.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusEffectMaterialOverrideShadows.attributes.add('materialAsset', { type: 'asset', assetType: 'material' });

UranusEffectMaterialOverrideShadows.attributes.add("castShadows", {
  type: "boolean",
  default: true,
  title: "Cast Shadows",
});

UranusEffectMaterialOverrideShadows.attributes.add("receiveShadows", {
  type: "boolean",
  default: true,
  title: "Receive Shadows",
});

// initialize code called once per entity
UranusEffectMaterialOverrideShadows.prototype.initialize = function() {
    
    if( !this.materialAsset ){
        return false;
    }
        
    this.materialAsset.ready( function(){
        
        var material = this.materialAsset.resource;
        
        material.castShadows = this.castShadows;
        material.receiveShadows = this.receiveShadows;        
        
    }.bind(this));
};