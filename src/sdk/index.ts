import Editor from "./core/main";

// @ts-ignore
if (!window.Uranus) {
  // @ts-ignore
  window.Uranus = {};
}

if (Editor.inEditor() === true) {
  new Editor();
}
