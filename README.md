# Vale + VS Code

> The official Visual Studio Code extension for [Vale](https://github.com/errata-ai/vale).

The Vale extension for VS Code provides customizable spelling, style, and grammar checking for a variety of markup formats (Markdown, AsciiDoc, reStructuredText, HTML, and DITA).

As of **v0.15.0**, the extension drops support for [Vale Server](https://errata.ai/vale-server/) which has ceased development. Many of the features from Vale Server will find their way into the Vale CLI tool, and this extension.

## Installation

1. Install [Vale](https://docs.errata.ai/vale/install);
2. install `vale-vscode` (this extension) via the [Marketplace](https://marketplace.visualstudio.com/items?itemName=errata-ai.vale-server);
3. restart VS Code (recommended).

## Features

### Detailed Problems View

<p align="center">
  <img src="https://user-images.githubusercontent.com/8785025/89956665-76c9fa80-dbea-11ea-9eba-3f272a5a26e5.png" />
</p>

Browse detailed information for each alert, including the file location, style, and rule ID.

### Go-To Rule

<p align="center">
  <img src="https://user-images.githubusercontent.com/8785025/89956857-d1635680-dbea-11ea-8e50-8e2715721e5d.png" />
</p>

Navigate from an in-editor alert to a rule's implementation on your `StylesPath` by clicking "View Rule".

### Quick Fixes

<p align="center">
  <img src="https://user-images.githubusercontent.com/8785025/89957413-2eabd780-dbec-11ea-97e1-9a04bce950ce.png" />
</p>

Fix word usage, capitalization, and more using [Quick Fixes](https://code.visualstudio.com/docs/editor/refactoring#_code-actions-quick-fixes-and-refactorings) (macOS: <kbd>cmd</kbd> + <kbd>.</kbd>, Windows/Linux: <kbd>Ctrl</kbd> + <kbd>.</kbd>)

Spelling errors are currently not supported, but will be supported in a future version.

## Settings

The extension offers a number of settings and configuration options (_Preferences > Extensions > Vale_)..

- `vale.valeCLI.config` (default: `null`): Absolute path to a Vale configuration file. Use the predefined [`${workspaceFolder}`](https://code.visualstudio.com/docs/editor/variables-reference#_predefined-variables) variable to reference configuration file from a custom location. (**NOTE**: On Windows you can use '/' and can omit `.cmd` in the path value.) If not specified, the extension uses the default search process (relative to the current file).

    **Example**

    ```jsonc
    {
      // You can use ${workspaceFolder} it will be replaced by workspace folder path
      "vale.valeCLI.config": "${workspaceFolder}/node_modules/some-package/.vale.ini"

      // or use some absolute path
      "vale.valeCLI.config": "/some/path/to/.vale.ini"
    }
    ```

- `vale.valeCLI.path` (default: `null`): Absolute path to the Vale binary. Use the predefined [`${workspaceFolder}`](https://code.visualstudio.com/docs/editor/variables-reference#_predefined-variables) variable to reference a non-global binary. (**NOTE**: On Windows you can use '/' and can omit `.cmd` in the path value.)

    **Example**

    ```jsonc
    {
      // You can use ${workspaceFolder} it will be replaced by workspace folder path
      "vale.valeCLI.path": "${workspaceFolder}/node_modules/.bin/vale"

      // or use some absolute path
      "vale.valeCLI.path": "/some/path/to/vale"
    }
    ```

- `vale.valeCLI.minAlertLevel` (default: `inherited`): Defines from which level of errors and above to display in the problems output.
