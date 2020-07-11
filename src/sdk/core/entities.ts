import Editor from "./main";

declare var editor: any;
declare var Observer: any;

export function duplicateEntity(
  this: Editor,
  entity: any,
  parent: any,
  ind: any
) {
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
      undefined
    );
  });

  return entity;
}
