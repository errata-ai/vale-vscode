# Vale + VS Code

> The official Visual Studio Code extension for [Vale](https://github.com/errata-ai/vale) and [Vale Server](https://errata.ai/vale-server/).

The Vale extension for VS Code provides customizable spelling, style, and grammar checking for a variety of markup formats (Markdown, AsciiDoc, reStructuredText, HTML, and DITA).

As of **v0.10.0**, the extension supports both [Vale](https://github.com/errata-ai/vale) (the command-line tool) and [Vale Server](https://errata.ai/vale-server/) (the desktop application).

## Installation

> **NOTE**: While this extension supports both Vale CLI and Vale Server, many of the extension's more [advanced features](#features) (such as Quick Fixes and Vocabulary Management) are only available through Vale Server.

### Using Vale Server

1. Install [Vale Server](https://errata.ai/vale-server/);

2. install `vale-vscode` (this extension) via the [Marketplace](https://marketplace.visualstudio.com/items?itemName=errata-ai.vale-server); and

3. restart VS Code (recommended).

### Using Vale

1. Install [Vale](https://docs.errata.ai/vale/install);

2. install `vale-vscode` (this extension) via the [Marketplace](https://marketplace.visualstudio.com/items?itemName=errata-ai.vale-server);

3. set [`vale.core.useCLI`](#settings) to `true` in the extension settings (_Preferences > Extensions > Vale > Use CLI_); and

4. restart VS Code (recommended).

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

### Quick Fixes (Vale Server only)

<p align="center">
  <img src="https://user-images.githubusercontent.com/8785025/89957413-2eabd780-dbec-11ea-97e1-9a04bce950ce.png" />
</p>

Fix misspellings, word usage, capitalization, and more using [Quick Fixes](https://code.visualstudio.com/docs/editor/refactoring#_code-actions-quick-fixes-and-refactorings) (macOS: <kbd>cmd</kbd> + <kbd>.</kbd>, Windows/Linux: <kbd>Ctrl</kbd> + <kbd>.</kbd>)

### Vocab Management (Vale Server only)

<p align="center">
  <img src="https://user-images.githubusercontent.com/8785025/89957619-b8f43b80-dbec-11ea-846d-0d9ee7f50088.png" />
</p>

Add words and phrases to your active Vocab through the in-editor context menu.

<p align="center">
  <img src="https://user-images.githubusercontent.com/8785025/89957701-f062e800-dbec-11ea-9d03-2d9ce2542f03.png" />
</p>

Jump to your active Vocab files directly from the Command Palette.

### Folder Reports (Vale Server only)

Use the `Vale: View Folder Report` command to generate a [report for the active folder](https://docs.errata.ai/vale-server/gui#summary).

## Settings

The extension offers a number of settings and configuration options (_Preferences > Extensions > Vale_), which are split into three groups: `Vale > Core` (Vale and Vale Server), `Vale > Server` (Vale Server only), and `Vale > Vale CLI` (Vale only).

- `vale.core.useCLI` (default: `false`): Use Vale CLI instead of Vale Server.

- `vale.server.serverURL` (default: `http://127.0.0.1:7777`): URL to your running Vale Server instance.

- `vale.server.provideFixes` (default: `true`): Offer solutions to alerts using the 'Quick Fix' button.

- `vale.server.lintContext` (default: `0`): Only lint the *active* portion of a document (as determined by the cursor position), allowing for efficient on-the-fly linting of large documents. There are three supported values: `-1` (applies to all files), `0` (disabled), `n` (applies to any file with `lines >= n`).

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
