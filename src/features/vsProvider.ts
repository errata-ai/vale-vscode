'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as request from 'request-promise-native';

import * as which from "which";
import { execFile } from "child_process";

import * as vscode from 'vscode';
import {
  workspace,
  WorkspaceFolder,
} from "vscode";
// Consolidate
/**
 * A severity from Vale Server.
 */
type ValeSeverity = 'suggestion'|'warning'|'error';

/**
 * An Action From Vale.
 */
interface IValeActionJSON {
  readonly Name: string;
  readonly Params: [string];
}

// Really needed?
/**
 * The type of Vale’s JSON output.
 */
interface IValeJSON {
  readonly [propName: string]: ReadonlyArray<IValeErrorJSON>;
}

/**
 * An Alert From Vale.
 */
interface IValeErrorJSON {
  readonly Action: IValeActionJSON;
  readonly Check: string;
  readonly Match: string;
  readonly Description: string;
  readonly Line: number;
  readonly Link: string;
  readonly Message: string;
  readonly Span: [number, number];
  readonly Severity: ValeSeverity;
}

const readBinaryLocation = () => {
  const configuration = workspace.getConfiguration();
  const customBinaryPath = configuration.get<string>("vale-server.path");
  if (customBinaryPath) {
    return path.normalize(customBinaryPath);
  }
  // Assume that the binary is installed globally
  return which.sync("vale", { pathExt: ".cmd" });
};

const readFileLocation = () => {
  const configuration = workspace.getConfiguration();
  const customConfigPath = configuration.get<string>("vale-server.configPath");

  // Assume that the binary is installed globally
  return customConfigPath;
};

/**
 * Convert a Vale severity string to a code diagnostic severity.
 *
 * @param severity The severity to convert
 */
const toSeverity = (severity: ValeSeverity): vscode.DiagnosticSeverity => {
  switch (severity) {
    case 'suggestion':
      return vscode.DiagnosticSeverity.Information;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'error':
      return vscode.DiagnosticSeverity.Error;
  }
};

/**
 * Create an action title from a given alert and suggestion.
 *
 * @param alert The Vale-created alert
 * @param suggestion The vsengine-calculated suggestion
 */
const toTitle = (alert: IValeErrorJSON, suggestion: string): string => {
  switch (alert.Action.Name) {
    case 'remove':
      return 'Remove \'' + alert.Match + '\'';
  }
  return 'Replace with \'' + suggestion + '\'';
};

/**
 * Convert a Vale error to a code diagnostic.
 *
 * @param alert The alert to convert
 */
const toDiagnostic = (alert: IValeErrorJSON, styles: string): vscode.Diagnostic => {
  const range = new vscode.Range(
      alert.Line - 1, alert.Span[0] - 1, alert.Line - 1, alert.Span[1]);

  const diagnostic =
      new vscode.Diagnostic(range, alert.Message, toSeverity(alert.Severity));

  diagnostic.source = 'Vale';
  diagnostic.code = alert.Check;

  const name = alert.Check.split('.');
  const rule = vscode.Uri.file(path.join(styles, name[0], name[1] + '.yml'));

  if (fs.existsSync(rule.fsPath)) {
    diagnostic.relatedInformation = [new vscode.DiagnosticRelatedInformation(
        new vscode.Location(rule, new vscode.Position(0, 0)), 'View rule')];
  }
  return diagnostic;
};

/**
 * Get the given setting from the user's config.
 *
 * @param setting The name of the setting
 * @param fallback The default value
 */
const getWithDefault = (setting: string, fallback: string): string => {
  return vscode.workspace.getConfiguration('vale-server')
      .get(setting, fallback)
      .replace(/\/+$/, '');
};

/**
 * Run a command in a given workspace folder and get its standard output.
 *
 * If the workspace folder is undefined run the command in the working directory
 * of the current vscode instance.
 *
 * @param folder The workspace
 * @param command The command array
 * @return The standard output of the program
 */
const runInWorkspace = (
  folder: WorkspaceFolder | undefined,
  command: ReadonlyArray<string>,
): Promise<string> =>
  new Promise((resolve, reject) => {
      const cwd = folder ? folder.uri.fsPath : process.cwd();
      const maxBuffer = 10 * 1024 * 1024; // 10MB buffer for large results
      execFile(
          command[0],
          command.slice(1),
          { cwd, maxBuffer },
          (error, stdout) => {
              if (error) {
                  // Throw system errors, but do not fail if the command
                  // fails with a non-zero exit code.
                  console.error("Command error", command, error);
                  reject(error);
              } else {
                  resolve(stdout);
              }
          },
      );
  });

export default class ValeServerProvider implements vscode.CodeActionProvider {
  private diagnosticCollection!: vscode.DiagnosticCollection;
  private alertMap: Record<string, IValeErrorJSON> = {};
  private diagnosticMap: Record<string, vscode.Diagnostic[]> = {};
  private stylesPath!: string;
  private useCLI!: boolean;

  private static commandId: string = 'ValeServerProvider.runCodeAction';
  private command!: vscode.Disposable;

  private async doVale(textDocument: vscode.TextDocument) {
    const ext = path.extname(textDocument.fileName);
    const supported =
        vscode.workspace.getConfiguration('vale-server').get('extensions', [
          '.md', '.rst', '.adoc', '.txt'
        ]);

    if (supported.indexOf(ext) < 0) {
      return;
    }
    // Reset out alert map:
    this.alertMap = {};

    if (!textDocument.fileName.length) {
      vscode.window.showErrorMessage('Please save the file before linting.');
      return;
    }

    if (!this.useCLI) {
      // We're using Vale Server ...
      let server: string = getWithDefault('serverURL', 'http://127.0.0.1:7777');
      request
          .post({
            uri: server + '/file',
            qs: {
              file: textDocument.fileName,
              path: path.dirname(textDocument.fileName)
            },
            json: true
          })
          .catch((error) => {
            vscode.window.showErrorMessage(
                `Vale Server could not connect: ${error}.`);
          })
          .then((body) => {
            let contents = fs.readFileSync(body.path);
            this.handleJSON(contents.toString(), textDocument);
          });
      } else {
        // We're using the CLI ...
        try {
          const result = await this.runVale(textDocument);
      } catch (error) {
        // TODO: Error handling
      }

      }
  }

  private async runVale (file: vscode.TextDocument) {
    const binaryLocation = readBinaryLocation();
    const configLocation = readFileLocation()!;
    // TODO: Hmm
    this.stylesPath = "/Users/chrisward/Workspace/TesttheDocs";

    const command: ReadonlyArray<string> = [
        binaryLocation,
        "--no-exit",
        "--config",
        configLocation,
        "--output",
        "JSON",
        file.fileName,
    ];
    console.info("Run vale as", command);
    const stdout = await runInWorkspace(undefined, command);
    this.handleJSON(stdout.toString(), file);
}

  private handleJSON(contents: string, textDocument: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = [];
    let body = JSON.parse(contents.toString());

    for (let key in body) {
      const alerts = body[key];
      for (var i = 0; i < alerts.length; ++i) {

        let diagnostic = toDiagnostic(alerts[i], this.stylesPath);

        let key = `${diagnostic.message}-${diagnostic.range}`;
        this.alertMap[key] = alerts[i];

        diagnostics.push(diagnostic);
      }
    }

    this.diagnosticCollection.set(textDocument.uri, diagnostics);
    this.diagnosticMap[textDocument.uri.toString()] = diagnostics;
  }

  public async provideCodeActions(
      document: vscode.TextDocument, range: vscode.Range,
      context: vscode.CodeActionContext,
      token: vscode.CancellationToken): Promise<vscode.CodeAction[]> {
    let diagnostic: vscode.Diagnostic = context.diagnostics[0];
    let actions: vscode.CodeAction[] = [];

    if (diagnostic === undefined) {
      return actions;
    }

    let key = `${diagnostic.message}-${diagnostic.range}`;
    let alert = this.alertMap[key];

    let server: string = getWithDefault('serverURL', 'http://localhost:7777');
    await request
        .post({
          uri: server + '/suggest',
          qs: {alert: JSON.stringify(alert)},
          json: true
        })
        .catch((error) => {
          return Promise.reject(`Vale Server could not connect: ${error}.`);
        })
        .then((body) => {
          for (let idx in body['suggestions']) {
            const suggestion = body['suggestions'][idx];
            const title = toTitle(alert, suggestion);
            const action =
                new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);

            action.command = {
              title: title,
              command: ValeServerProvider.commandId,
              arguments: [
                document, diagnostic, alert.Match, suggestion, alert.Action.Name
              ]
            };

            actions.push(action);
          }
        });

    return actions;
  }

  private runCodeAction(
      document: vscode.TextDocument, diagnostic: vscode.Diagnostic,
      error: string, suggestion: string, action: string): any {
    let docError: string = document.getText(diagnostic.range);

    if (error === docError) {
      // Remove diagnostic from list
      let diagnostics: vscode.Diagnostic[] =
          this.diagnosticMap[document.uri.toString()];
      let index: number = diagnostics.indexOf(diagnostic);

      diagnostics.splice(index, 1);

      // Update with new diagnostics
      this.diagnosticMap[document.uri.toString()] = diagnostics;
      this.diagnosticCollection.set(document.uri, diagnostics);

      // Insert the new text
      let edit = new vscode.WorkspaceEdit();
      if (action !== 'remove') {
        edit.replace(document.uri, diagnostic.range, suggestion);
      } else {
        // NOTE: we need to add a character when deletint to avoid leaving a
        // double space.
        const range = new vscode.Range(
            diagnostic.range.start.line, diagnostic.range.start.character,
            diagnostic.range.end.line, diagnostic.range.end.character + 1);
        edit.delete(document.uri, range);
      }

      return vscode.workspace.applyEdit(edit);
    } else {
      vscode.window.showErrorMessage(
          'The suggestion was not applied because it is out of date.');
      console.log(error, docError);
    }
  }

  public async activate(subscriptions: vscode.Disposable[]) {
    this.command = vscode.commands.registerCommand(
        ValeServerProvider.commandId, this.runCodeAction, this);
    subscriptions.push(this);

    this.diagnosticCollection = vscode.languages.createDiagnosticCollection();


    this.useCLI = vscode.workspace.getConfiguration('vale-server').get('useCLI', false);
    if (!this.useCLI) {
      let server: string = getWithDefault('serverURL', 'http://localhost:7777');

    await request.get({uri: server + '/path', json: true})
        .catch((error) => {
            throw new Error(`Vale Server could not connect: ${error}.`);
        })
        .then((body) => {
          this.stylesPath = body.path;
        });
      }
    vscode.workspace.onDidOpenTextDocument(this.doVale, this, subscriptions);
    vscode.workspace.onDidCloseTextDocument((textDocument) => {
      this.diagnosticCollection.delete(textDocument.uri);
    }, null, subscriptions);

    vscode.workspace.onDidSaveTextDocument(this.doVale, this);
    vscode.workspace.textDocuments.forEach(this.doVale, this);
  }

  public dispose(): void {
    this.diagnosticCollection.clear();

    this.diagnosticCollection.dispose();
    this.command.dispose();

    this.diagnosticMap = {};
    this.alertMap = {};
  }
}
