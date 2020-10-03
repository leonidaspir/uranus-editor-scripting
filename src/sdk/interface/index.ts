import Styles from "./styles";

export default class Interface {
  private toolbar: HTMLElement;
  private messages: HTMLElement;
  private list: HTMLElement;

  constructor() {}

  addStyles(cssString: string) {
    const style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(cssString));

    document.head.appendChild(style);
  }

  boot() {
    // --- clone an existing Playcanvas editor toolbar
    const toolbarBank = document
      .getElementById("layout-viewport")
      .querySelector(".viewport-camera");

    // Create a copy of it
    this.toolbar = toolbarBank.cloneNode(true) as HTMLElement;

    // Update the ID, classes and initial style
    this.toolbar.id = "uranus-toolbar";
    this.toolbar.classList.add("uranus-toolbar");
    this.toolbar.style.top = "40px";
    this.toolbar.style.left = "4px";

    // Remove all children
    this.toolbar.querySelectorAll("*").forEach((n) => n.remove());

    // Add uranus main button
    const node = document.createElement("div");
    node.classList.add("value");
    node.innerHTML = "Uranus Editor";
    this.toolbar.appendChild(node);

    node.onclick = () => {
      if (this.toolbar.classList.contains("active")) {
        this.toolbar.classList.remove("active");
      } else {
        this.toolbar.classList.add("active");
      }
    };

    this.list = document.createElement("ul");
    this.list.classList.add("uranus-list");
    this.list.style.position = "absolute";
    this.list.style.top = "32px";

    this.toolbar.appendChild(this.list);

    // Attach a message container element
    this.addMessagesOutput();

    // Attach on DOM
    toolbarBank.after(this.toolbar);

    // --- append new styles to DOM
    this.addStyles(Styles.getOverrides());
  }

  addMessagesOutput() {
    this.messages = document.createElement("div");
    this.messages.classList.add("uranus-messages");

    this.toolbar.appendChild(this.messages);
  }

  logMessage(message: string) {
    const item = document.createElement("div");
    item.innerHTML = message;

    this.messages.appendChild(item);

    window.setTimeout(() => {
      item.remove();
    }, 3000);
  }

  addUIButton(
    label: string,
    type: string,
    initialValue: any,
    callback: Function
  ) {
    const button = document.createElement("li");
    button.innerHTML = label;
    button.classList.add("uranus-list-item");
    this.list.appendChild(button);

    let element: any = button;

    switch (type) {
      case "checkbox":
        element = document.createElement("input");
        element.setAttribute("type", "checkbox");
        element.checked = initialValue;
        element.classList.add("uranus-checkbox");

        button.appendChild(element);

        element.addEventListener("change", (event: any) => {
          callback(event.target.checked);
        });

        break;

      case "button":
        element.classList.add("uranus-button");

        element.addEventListener("click", (event: any) => {
          callback();
        });
        break;
    }
  }
}
