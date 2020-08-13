var UranusNodeProperty = pc.createScript("uranusNodeProperty");

UranusNodeProperty.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusNodeProperty.attributes.add("side", {
  type: "string",
  default: "right",
  title: "Side",
  enum: [{ Right: "right" }, { Bottom: "bottom" }, { Left: "left" }],
});

UranusNodeProperty.attributes.add("type", {
  type: "string",
  title: "Type",
  description:
    "The type of node allowed to connect, if a category name is inserted multiple types of nodes can connect.",
});

UranusNodeProperty.attributes.add("array", {
  type: "boolean",
  default: false,
  title: "Array",
});

UranusNodeProperty.attributes.add("target", {
  type: "entity",
  title: "Target",
  description:
    "The entity that holds the node/nodes for this property. Leave blank to set this entity as target.",
});
