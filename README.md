# Vale Extension for VS Code

> The official Visual Studio Code extension for [Vale](https://errata.ai/vale) and [Vale Server](https://errata.ai/vale-server/).

The Vale extension provides customizable spelling, style, and grammar checking for English text.

## Installation

You can use this extension with Vale CLI, Vale server, or both.

To get started with Vale CLI:

1. Install [Vale CLI](https://errata.ai/vale)
2. Install and configure styles

To get started with Vale Server:

1. Install [Vale Server](https://errata.ai/vale-server/)

1. Install `vale-vscode` (this extension) via the [Marketplace](https://marketplace.visualstudio.com/items?itemName=errata-ai.vale-vscode); and
2. restart VS Code (if necessary)
3. Toggle using Vale CLI or Server from _Preferences > Extensions > Vale > Use CLI_

## Features

<table>
    <tr>
        <th>Detailed Problems View</th>
        <th>Go-To Rule</th>
    </tr>
    <tr>
        <td width="50%">
            <a href="https://user-images.githubusercontent.com/8785025/60772616-10e97600-a0ae-11e9-86d1-83dfe1872f2f.png">
                <img src="https://user-images.githubusercontent.com/8785025/60772616-10e97600-a0ae-11e9-86d1-83dfe1872f2f.png" width="100%">
            </a>
        </td>
        <td width="50%">
            <a href="https://user-images.githubusercontent.com/8785025/60772682-b6044e80-a0ae-11e9-8ab3-e94ff06204c9.gif">
                <img src="https://user-images.githubusercontent.com/8785025/60772682-b6044e80-a0ae-11e9-8ab3-e94ff06204c9.gif" width="100%">
            </a>
        </td>
    </tr>
    <tr>
        <td width="50%">
            Browse detailed information for each alert.
        </td>
        <td width="50%">Easily navigate to any rule's implementation.</td>
    </tr>
    <tr>
        <th>Quick Fixes</th>
        <th>Build your own style according to <a href="https://errata-ai.github.io/vale-server/docs/style">custom rules</a></th>
    </tr>
    <tr>
        <td width="50%">
            <a href="https://user-images.githubusercontent.com/8785025/66071464-0c472900-e508-11e9-882f-5b83011d0a92.png">
                <img src="https://user-images.githubusercontent.com/8785025/66071464-0c472900-e508-11e9-882f-5b83011d0a92.png" width="100%">
            </a>
        </td>
        <td width="50%">
            <a href="https://user-images.githubusercontent.com/8785025/66071907-d9e9fb80-e508-11e9-80ec-62b7a08d27cb.png">
                <img src="https://user-images.githubusercontent.com/8785025/66071907-d9e9fb80-e508-11e9-80ec-62b7a08d27cb.png" width="100%">
            </a>
        </td>
    </tr>
    <tr>
        <td width="50%">Choose from a selection of provided 'Quick Fixes'.</td>
        <td width="50%">Implement your own rules or follow an existing style guide.</td>
    </tr>
</table>

## Usage

Vale for VSCode automatically checks a document when you open or save it.  Use the `Vale: Lint workspace` command to check a file manually.

This extension supports the following file extensions by default, but you can change them with the `vscode-vale.fileExtensions` config item (see below):

-   **Asciidoc**: _.adoc_ and _.asciidoc_
-   **Markdown**: _.md_ and _.markdown_
-   **reStructuredText**: _.rst_
-   **LaTeX**: _.tex_
-   **plain text**: _.txt_

## Settings

The following settings are available:

- `vale-vscode.useCLI`: (default `false`). Use Vale CLI instead of Vale Server.
-   `vscode-vale.configPath`: Absolute path to Vale config file when using CLI. If not specified, uses normal Vale config scoping rules.
-   `vscode-vale.path`: (default `vale`). Absolute path to the `vale` binary when using CLI, useful if you don't want to use the global binary.

    **Example**

    ```js
    {
    // You can use ${workspaceFolder} it will be replaced by workspace folder path
    "vscode-vale.path": "${workspaceFolder}/node_modules/.bin/vale"

    // or use some absolute path
    "vscode-vale.path": "/some/path/to/vale"
    }
    ```

- `vscode-vale.serverURL`: (default `http://localhost:7777`). URL to running Vale Server instance.
- `vscode-vale.extensions`: (default `".md", ".rst", ".adoc", ".txt"`). File extensions to lint. Note, these also need to be in your Vale config file if you are using Vale CLI.
