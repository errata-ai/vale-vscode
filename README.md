# Vale Server for VS Code

> The official Visual Studio Code extension for [Vale Server](https://errata.ai/vale-server/).

The Vale Server extension provides customizable spelling, style, and grammar checking for English text.

## Installation

To get started,

1. Install [Vale Server](https://errata.ai/vale-server/);
2. install `vale-server` via the [Marketplace](https://marketplace.visualstudio.com/items?itemName=errata-ai.vale-server); and
3. restart VS Code (if necessary).

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

## Settings

The following settings are currently available:

```json
{
   "properties":{
      "vale-server.serverURL":{
         "type":"string",
         "default":"http://localhost:7777",
         "description":"URL to your running Vale Server instance."
      },
      "vale-server.extensions":{
         "type":[
            "string",
            "array"
         ],
         "items":{
            "type":"string"
         },
         "default":[
            ".md",
            ".rst",
            ".adoc",
            ".txt"
         ],
         "description":"File extensions to lint."
      }
   }
}
```
