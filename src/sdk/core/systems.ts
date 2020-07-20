import Editor from "./main";

declare var editor: any;

export function editorPickerState(this: Editor, state: boolean) {
  // --- we do this hack since the original editor method for disabling picking doesn't seem reliable
  // --- viewport:pick:state
  // @ts-ignore
  if (!this.pickerRef) {
    // @ts-ignore
    this.pickerRef = editor._hooks["viewport:pick"];
  }

  if (state) {
    // @ts-ignore
    editor._hooks["viewport:pick"] = this.pickerRef;
  } else {
    editor._hooks["viewport:pick"] = function () {};
  }
}

export function runBatcher(this: Editor, entities: pc.Entity[]) {
  const batchGroups = editor.call("settings:project").get("batchGroups");

  for (const groupID in batchGroups) {
    const group = batchGroups[groupID];
    this.app.batcher.addGroup(
      group.name,
      group.dynamic,
      group.maxAabbSize,
      group.id,
      group.layers
    );
  }

  const groupsToGenerate: number[] = [];

  if (!entities) return;

  entities.forEach((entity) => {
    const modelComps: any = entity.findComponents("model");

    modelComps.forEach((modelComp: pc.ModelComponent) => {
      if (entity.parent && modelComp && modelComp.batchGroupId > -1) {
        // @ts-ignore
        this.app.batcher.insert("model", modelComp.batchGroupId, entity);

        if (groupsToGenerate.indexOf(modelComp.batchGroupId) === -1) {
          groupsToGenerate.push(modelComp.batchGroupId);
        }
      }
    });
  });

  console.time("Uranus.Editor running batcher");
  this.app.batcher.generate(groupsToGenerate);
  console.timeEnd("Uranus.Editor running batcher");

  return groupsToGenerate;
}
