var UranusBillboardRenderer = pc.createScript('UranusBillboardRenderer');

UranusBillboardRenderer.attributes.add('cameraEntity', {type: 'entity', title: 'Camera'});
UranusBillboardRenderer.attributes.add('billboard', {type: 'entity', title: 'Billboard'});
UranusBillboardRenderer.attributes.add('resolution', {type: 'vec2', default: [1024,1024], placeholder: ['width', 'height'], title: 'Resolution'});
UranusBillboardRenderer.attributes.add('crop', {type: 'boolean', default: true, title: 'Crop'});
UranusBillboardRenderer.attributes.add('baseHeight', {type: 'boolean', default: true, title: 'Base Height'});

// initialize code called once per entity
UranusBillboardRenderer.prototype.initialize = function() {

    // --- variables
    this.vec = new pc.Vec3();
    this.count = 0;
    this.cameraEntity = this.cameraEntity ? this.cameraEntity : this.app.root.findByName('Camera');
    this.billboard = this.billboard ? this.billboard : this.entity;
        
    // --- prepare
    this.canvas = document.getElementById('application-canvas');
    this.trimCanvas = document.createElement('canvas');
    this.resizeCanvas = document.createElement('canvas');
    
    var linkElement = document.createElement('a');
    linkElement.id = 'link';
    window.document.body.appendChild(linkElement);
    
    // --- events
    this.app.keyboard.on(pc.EVENT_KEYUP, this.onKeyUp, this);
};

UranusBillboardRenderer.prototype.render = function() {
    
    // --- find the aabb and try to center/fit the object in the camera view
    this.aabb = new pc.BoundingBox();
    
    this.buildAabb(this.aabb, this.billboard);

    this.cameraEntity.camera.orthoHeight = this.aabb.halfExtents.y * 1.2;
    
    var cameraPos = this.cameraEntity.getPosition();
    this.cameraEntity.setPosition(cameraPos.x, this.aabb.center.y, cameraPos.z);

    // --- save and download a screen grab
    this.count++;

    var filename;
    
    if( this.billboard.model && this.billboard.model.asset ){
        var asset = this.app.assets.get(this.billboard.model.asset);
        filename = asset.name.split('.')[0] + '_billboard';
    }else{
        filename = this.billboard.name + '_billboard';
    }
        
    window.setTimeout( function(){
        this.takeScreenshot(filename);
    }.bind(this), 100 );
};

UranusBillboardRenderer.prototype.onKeyUp = function(event){
  
    if( event.key === pc.KEY_SPACE ){
        
        this.render();    
    }
};

UranusBillboardRenderer.prototype.buildAabb = function(aabb, entity, modelsAdded) {
    
    var i = 0;

    if (entity.model) {
        var mi = entity.model.meshInstances;
        for (i = 0; i < mi.length; i++) {
            if (modelsAdded === 0) {
                aabb.copy(mi[i].aabb);
            } else {
                aabb.add(mi[i].aabb);
            }

            modelsAdded += 1;
        }
    }

    for (i = 0; i < entity.children.length; ++i) {
        modelsAdded += this.buildAabb(aabb, entity.children[i], modelsAdded);
    }

    return modelsAdded;    
};

UranusBillboardRenderer.prototype.takeScreenshot = function (filename) {

    var image = this.canvas.toDataURL('image/png');
    
    if( this.crop ){
     
        this.trimImage(image).then( function(base64){

            this.downloadImage(filename, base64);

        }.bind(this) );        
        
    }else{
        
        this.downloadImage(filename, image);
    }
};

UranusBillboardRenderer.prototype.downloadImage = function(filename, image) {

    var link = document.getElementById('link');
    link.setAttribute('download', filename+'.png');
    link.setAttribute('href', image.replace("image/png", "image/octet-stream"));
    link.click();    
};

UranusBillboardRenderer.prototype.trimImage = function(base64) {
    
    return new Promise( function(resolve){
        
        this.trimCanvas.width = this.canvas.width;
        this.trimCanvas.height = this.canvas.height;

        var ctx = this.trimCanvas.getContext('2d');
        var img = new Image();

        img.onload = function() {
            
            ctx.drawImage(img, 0, 0, this.trimCanvas.width, this.trimCanvas.height);
            
            var pixels = ctx.getImageData(0, 0, this.trimCanvas.width, this.trimCanvas.height);

            var l = pixels.data.length,
                i,
                bound = {
                    top: null,
                    left: null,
                    right: null,
                    bottom: null
                },
                x, y;
            
            // Iterate over every pixel to find the highest
            // and where it ends on every axis ()
            for (i = 0; i < l; i += 4) {
                if (pixels.data[i + 3] !== 0) {

                    x = (i / 4) % this.trimCanvas.width;
                    y = ~~((i / 4) / this.trimCanvas.width);

                    if (bound.top === null) {
                        bound.top = y;
                    }

                    if (bound.left === null) {
                        bound.left = x;
                    } else if (x < bound.left) {
                        bound.left = x;
                    }

                    if (bound.right === null) {
                        bound.right = x;
                    } else if (bound.right < x) {
                        bound.right = x;
                    }

                    if (bound.bottom === null) {
                        bound.bottom = y;
                    } else if (bound.bottom < y) {
                        bound.bottom = y;
                    }
                }
            }

                        
            var trimHeight = bound.bottom - bound.top,
                trimWidth = bound.right - bound.left,    
                trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);
                
            if( this.resolution.x === 0 && this.resolution.y === 0 ){
                         
                this.trimCanvas.width = trimWidth;
                this.trimCanvas.height = trimHeight;
                ctx.putImageData(trimmed, 0, 0);           
                
                resolve(this.trimCanvas.toDataURL('image/png'));
                
            }else{
                
                this.trimCanvas.width = this.baseHeight ? trimHeight : trimWidth;
                this.trimCanvas.height = this.baseHeight ? trimHeight : trimWidth;
                
                ctx.putImageData(trimmed, 
                                 this.baseHeight ? (this.trimCanvas.width - trimWidth ) / 2 : 0,
                                 this.baseHeight ? 0 : (this.trimCanvas.height - trimHeight ) / 2 );                 
                
                this.resizeCanvas.width = this.resolution.x;
                this.resizeCanvas.height = this.resolution.y;
                
                this.resizeCanvas.getContext('2d').drawImage(this.trimCanvas, 0, 0, this.trimCanvas.width, this.trimCanvas.height, 0, 0, this.resizeCanvas.width, this.resizeCanvas.height);
                
                resolve(this.resizeCanvas.toDataURL('image/png'));
            }
            
        }.bind(this);
        
        img.src = base64;
        
    }.bind(this));
};