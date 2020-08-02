import Editor from "./main";

declare var editor: any;
declare var Observer: any;

export function setEntityModelOutline(
  this: Editor,
  entity: any,
  state: boolean,
  color?: number
) {
  if (state) {
    this.selectionOutline[entity._guid] = {
      entity: entity,
      color: color ? color : [1, 1, 1],
    };
  } else {
    if (this.selectionOutline[entity._guid]) {
      delete this.selectionOutline[entity._guid];
    }
  }
}

export function duplicateEntity(
  this: Editor,
  entity: any,
  parent: any,
  ind: any,
  duplicatedIdsMap: any
) {
  var originalResourceId = entity.get("resource_id");
  var data = entity.json();
  var children = data.children;

  data.children = [];
  data.resource_id = pc.guid.create();
  data.parent = parent.get("resource_id");

  entity = new Observer(data);
  editor.call(
    "entities:updateChildToParentIndex",
    entity.get("resource_id"),
    parent.get("resource_id")
  );

  if (duplicatedIdsMap) {
    // @ts-ignore
    duplicatedIdsMap[originalResourceId] = entity.get("resource_id");
  }

  // call add event
  editor.call("entities:add", entity);

  // sharedb
  editor.call("realtime:scene:op", {
    p: ["entities", entity.get("resource_id")],
    oi: entity.json(),
  });

  // this is necessary for the entity to be added to the tree view
  parent.history.enabled = false;
  parent.insert("children", entity.get("resource_id"), ind);
  parent.history.enabled = true;

  // add children too
  children.forEach((childId: any) => {
    this.duplicateEntity(
      editor.call("entities:get", childId),
      entity,
      undefined,
      duplicatedIdsMap
    );
  });

  return entity;
}

export function duplicateEntities(
  this: Editor,
  entities: any,
  parentHolder: any
) {
  var i;
  var id;
  var item;
  var root = editor.call("entities:root");
  var items = entities.slice(0);
  var entitiesNew: any[] = [];
  var entitiesNewData: any[] = [];
  var entitiesNewMeta = {};
  var ids = {};

  // make sure not duplicating root
  if (items.indexOf(root) !== -1) return;

  // build entities index
  for (i = 0; i < items.length; i++) {
    id = items[i].get("resource_id");

    // @ts-ignore
    ids[id] = {
      id: id,
      entity: items[i],
      parentId: editor.call("entities:getParentResourceId", id),
      ind: editor
        .call("entities:get", editor.call("entities:getParentResourceId", id))
        .get("children")
        .indexOf(id),
    };
  }

  // filter children off
  i = items.length;
  while (i--) {
    // @ts-ignore
    item = ids[items[i].get("resource_id")];
    var parentId = item.parentId;

    while (parentId && parentId !== root.get("resource_id")) {
      // @ts-ignore
      if (ids[parentId]) {
        items.splice(i, 1);
        // @ts-ignore
        delete ids[item.id];
        break;
      }
      parentId = editor.call("entities:getParentResourceId", parentId);
    }
  }

  // sort by order index within parent
  items.sort(function (a: any, b: any) {
    // @ts-ignore
    return ids[b.get("resource_id")].ind - ids[a.get("resource_id")].ind;
  });

  // remember current selection
  var selectorType = editor.call("selector:type");
  var selectorItems = editor.call("selector:items");
  for (i = 0; i < selectorItems.length; i++) {
    item = selectorItems[i];
    if (selectorType === "entity") {
      selectorItems[i] = {
        type: "entity",
        id: item.get("resource_id"),
      };
    } else if (selectorType === "asset") {
      selectorItems[i] = {};
      if (selectorItems[i].get("type") === "script") {
        selectorItems[i].type = "script";
        selectorItems[i].id = item.get("filename");
      } else {
        selectorItems[i].type = "asset";
        selectorItems[i].id = item.get("id");
      }
    }
  }

  // duplicate
  for (i = 0; i < items.length; i++) {
    var entity = items[i];
    id = entity.get("resource_id");
    var duplicatedIdsMap = {};
    var entityNew = this.duplicateEntity(
      entity,
      parentHolder,
      // @ts-ignore
      ids[id].ind + 1,
      duplicatedIdsMap
    );
    // resolveDuplicatedEntityReferenceProperties(
    //   entity,
    //   entity,
    //   entityNew,
    //   duplicatedIdsMap
    // );
    entitiesNew.push(entityNew);
    // @ts-ignore
    entitiesNewData.push(entityNew.json());

    //@ts-ignore
    entitiesNewMeta[entityNew.get("resource_id")] = {
      parentId: editor.call("entities:getParentResourceId", id),
      // @ts-ignore
      ind: ids[id].ind,
    };
  }

  // set new selection
  // setTimeout(function () {
  //   editor.call("selector:history", false);
  //   editor.call("selector:set", "entity", entitiesNew);
  //   editor.once("selector:change", function () {
  //     editor.call("selector:history", true);
  //   });
  // }, 0);

  // add history action
  editor.call("history:add", {
    name: "duplicate entities",
    undo: function () {
      var i;

      // remove duplicated entities
      for (i = 0; i < entitiesNewData.length; i++) {
        var entity = editor.call(
          "entities:get",
          entitiesNewData[i].resource_id
        );
        if (!entity) continue;

        editor.call("entities:removeEntity", entity);
      }

      // restore selection
      // if (selectorType) {
      //   var items = [];
      //   for (i = 0; i < selectorItems.length; i++) {
      //     var item;

      //     if (selectorItems[i].type === "entity") {
      //       item = editor.call("entities:get", selectorItems[i].id);
      //     } else if (selectorItems[i].type === "asset") {
      //       item = editor.call("assets:get", selectorItems[i].id);
      //     } else if (selectorItems[i].type === "script") {
      //       item = editor.call("sourcefiles:get", selectorItems[i].id);
      //     }

      //     if (!item) continue;

      //     items.push(item);
      //   }

      //   if (items.length) {
      //     editor.call("selector:history", false);
      //     editor.call("selector:set", selectorType, items);
      //     editor.once("selector:change", function () {
      //       editor.call("selector:history", true);
      //     });
      //   }
      // }
    },
    redo: function () {
      var entities: any = [];

      for (var i = 0; i < entitiesNewData.length; i++) {
        var id = entitiesNewData[i].resource_id;
        // @ts-ignore
        var meta = entitiesNewMeta[id];
        if (!meta) continue;

        var parent = editor.call("entities:get", meta.parentId);
        if (!parent) continue;

        var entity = new Observer(entitiesNewData[i]);
        editor.call("entities:addEntity", entity, parent, true, meta.ind + 1);

        entities.push(entity);
      }

      // if (entities.length) {
      //   setTimeout(function () {
      //     editor.call("selector:history", false);
      //     editor.call("selector:set", "entity", entities);
      //     editor.once("selector:change", function () {
      //       editor.call("selector:history", true);
      //     });
      //   }, 0);
      // }
    },
  });

  return entitiesNew;
}
