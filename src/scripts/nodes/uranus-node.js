var UranusNode = pc.createScript("uranusNode");

UranusNode.attributes.add("inEditor", {
  type: "boolean",
  default: true,
  title: "In Editor",
});

UranusNode.attributes.add("category", {
  type: "string",
  title: "Category",
});

UranusNode.attributes.add("properties", {
  type: "entity",
  array: true,
  title: "Properties",
});
