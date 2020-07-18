const path = require("path");

module.exports = {
  entry: "./src/sdk/index.ts",
  mode: "production",
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "uranus-editor-sdk.js",
    path: path.resolve(__dirname, "../../dist/sdk/"),
  },
};
