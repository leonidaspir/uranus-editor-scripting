# Uranus Editor Scripting for Playcanvas

Uranus Editor Scripting is a framework that extends the scripting system of the Playcanvas game engine to work inside the Playcanvas editor.

Building on top of the easiness of coding in the Playcanvas platform, any existing script can be easily extended to both execute in editor and run editor only code.

The Playcanvas team has already done a great job in providing us with an excellent editor API (unofficial for the moment) and the editor UI components for use in user projects ([PCUI](https://github.com/playcanvas/pcui)).

The goal of this project is to fill the gab of editor scripting in Playcanvas until the official solution has been provided by the Playcanvas team.

## Use Cases

- Create custom editor tools that can easily interact and write to your scene entity hierarchy and create/update/delete assets on demand (e.g. procedural world generation, world painting tools, nav mesh generation etc.).
- Run runtime code in editor to easily visualize and work on your final view of your scene (e.g. shader effects, runtime generated models like terrains from heightmaps).
- Write importers/exporters to easily import or export content from your Playcanvas project (e.g. export a Playcanvas level to further model and re-import in an external modeling application).

![](uranis-editing.gif)
