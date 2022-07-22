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

The extension offers a number of settings and configuration options (_Preferences > Extensions > Vale_)..

<!-- TODO: Deprecating values and names -->

- `vale.server.provideFixes` (default: `true`): Offer solutions to alerts using the 'Quick Fix' button.

  > **NOTE**: The fixes feature currently has an occasional issue when it reports that a "suggestion is out of date". We are working on a long-term fix, but in the meantime, saving the file fixes the issue.

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
