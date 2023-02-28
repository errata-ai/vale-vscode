// @ts-check

"use strict";

const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");


/**
 @type {import('webpack').Configuration}
 */
const config = {
  target: "node", // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  node: {
    __dirname: false,
  },
  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: false,
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
      {
        test: /\.node$/,
        loader: "node-loader",
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        path.resolve(__dirname, "node_modules", "dictionary-en", "index.aff"),
        path.resolve(__dirname, "node_modules", "dictionary-en", "index.dic"),
      ]
    })
  ]
};
module.exports = config;
