import * as vscode from "vscode";

import * as path from "path";
import * as request from "request-promise-native";

/**
 * An Alert From Vale.
 */
interface IValeConfigJSON {
  readonly Project: string;
  readonly StylesPath: string;
}

export default function InitCommands(subscriptions: vscode.Disposable[]) {
  subscriptions.push(
    vscode.commands.registerCommand("vale.addToAccept", addToAccept),
    vscode.commands.registerCommand("vale.addToReject", addToReject),

    vscode.commands.registerCommand("vale.openAccept", openAccept),
    vscode.commands.registerCommand("vale.openReject", openReject)
  );
}

const addToAccept = async () => {
  await addToVocab("accept");
};
const addToReject = async () => {
  await addToVocab("reject");
};

const openAccept = async () => {
  await openVocabFile("accept");
};
const openReject = async () => {
  await openVocabFile("reject");
};

/**
 * Get the user's active Vale Server configuration.
 */
const getConfig = async (server: string): Promise<IValeConfigJSON> => {
  let config: IValeConfigJSON = {} as IValeConfigJSON;

  await request
    .get({ uri: server + "/config", json: true })
    .catch((error) => {
      throw new Error(`Vale Server could not connect: ${error}.`);
    })
    .then((body) => {
      config = body;
    });

  return config;
};

const openVocabFile = async (name: string) => {
  const configuration = vscode.workspace.getConfiguration();
  const server: string = configuration.get(
    "vale.server.serverURL",
    "http://localhost:7777"
  );
  const config: IValeConfigJSON = await getConfig(server);

  const src = path.join(
    config.StylesPath,
    "Vocab",
    config.Project,
    name + ".txt"
  );
  vscode.workspace
    .openTextDocument(src)
    .then((doc) => vscode.window.showTextDocument(doc));
};

/**
 * Add the currently-selected word to the user's active Vocab.
 */
const addToVocab = async (filename: string) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const configuration = vscode.workspace.getConfiguration();
  const server: string = configuration.get(
    "vale.server.serverURL",
    "http://localhost:7777"
  );
  const config: IValeConfigJSON = await getConfig(server);

  const word: string = editor.document.getText(editor.selection);
  const name: string = config.Project;
  const styles: string = config.StylesPath;

  await request
    .get({
      uri: server + "/vocab",
      qs: {
        name: name,
        file: filename,
      },
      json: true,
    })
    .catch((error) => {
      throw new Error(`Vale Server could not connect: ${error}.`);
    })
    .then((contents: Array<string>) => {
      contents.push(word);

      // TODO: Do we need to (shoud we?) sort ourselves?
      let body = [...new Set(contents)].sort((a, b) => {
        if (a.toLowerCase() > b.toLowerCase()) {
          return 1;
        } else if (a.toLowerCase() < b.toLowerCase()) {
          return -1;
        }
        return 0;
      });

      request
        .post({
          uri: server + "/update",
          qs: {
            path: name + "." + filename,
            text: body.join("\n"),
          },
          json: true,
        })
        .catch((error) => {
          throw new Error(`Vale Server could not connect: ${error}.`);
        })
        .then(() => {
          const src = path.join(styles, "Vocab", name, filename + ".txt");
          vscode.window
            .showInformationMessage(
              `Successfully added '${word}' to '${name}' vocab.`,
              ...["View File"]
            )
            .then((selection) => {
              if (selection === "View File") {
                vscode.workspace
                  .openTextDocument(src)
                  .then((doc) => vscode.window.showTextDocument(doc));
              }
            });
        });
    });
};
