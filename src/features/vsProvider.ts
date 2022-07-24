"use strict";

import * as path from "path";
import * as fs from "fs";
import * as request from "request-promise-native";
import * as vscode from "vscode";
import { execFile, ChildProcess } from "child_process";

import InitCommands from "./vsCommands";
import * as utils from "./vsUtils";

export default class ValeServerProvider implements vscode.CodeActionProvider {
  private diagnosticCollection!: vscode.DiagnosticCollection;
  private readabilityStatus!: vscode.StatusBarItem;
  private alertMap: Record<string, IValeErrorJSON> = {};
  private diagnosticMap: Record<string, vscode.Diagnostic[]> = {};
  private stylesPath!: string;
  private useCLI!: boolean;

  private static commandId: string = "ValeServerProvider.runCodeAction";
  private command!: vscode.Disposable;
  private logger!: vscode.OutputChannel;
  private nlpServer!: ChildProcess;

  private async startNLP(): Promise<ChildProcess> {
    return execFile("nlpapi");
  }

  private async doVale(textDocument: vscode.TextDocument) {
    const configuration = vscode.workspace.getConfiguration();
    if (!utils.isElligibleDocument(textDocument)) {
      return;
    }

    this.alertMap = {};
    this.useCLI = configuration.get("vale.core.useCLI", false);

    if (!this.useCLI) {
      // We're using Vale Server ...
      const limit = configuration.get("vale.server.lintContext", 0);

      let response: string = "";
      if (limit < 0 || (limit > 0 && textDocument.lineCount >= limit)) {
        const ext = path.extname(textDocument.fileName);
        const ctx = utils.findContext();

        response = await utils.postString(ctx.Content, ext);
        this.handleJSON(response, textDocument, ctx.Offset);
      } else {
        response = await utils.postFile(textDocument);
        this.handleJSON(response, textDocument, 0);
      }
    } else {
      // We're using the CLI ...
      try {
        await this.runVale(textDocument);
      } catch (error) {
        vscode.window.showErrorMessage(
          `There was an error running Vale ${error}.`
        );
      }
    }
  }

  private async runVale(file: vscode.TextDocument) {
    const folder = path.dirname(file.fileName);

    const binaryLocation = utils.readBinaryLocation(this.logger, file);
    const configLocation = utils.readFileLocation(this.logger, file);
    if (binaryLocation === null || configLocation === null) {
      // `file` is not part of the workspace, so we could not resolve a workspace-relative path. Ignore this file.
      return;
    }

    // There are two cases we need to handle here:
    //
    // (1) If we're given an explicit value for `--config`, then we should
    // error if it doesn't exist.
    //
    // (2) If we're not given a value (the default is ""), then we need to look
    // for a `.vale.ini`. However, we can't send an error if we don't find one
    // because the user may simply be editing a non-Vale project/file.
    let stylesPath: Array<string> = [];
    if (configLocation !== "" && !fs.existsSync(configLocation)) {
      vscode.window.showErrorMessage(
        `[Vale]: '${configLocation}' does not exist.`
      );
    } else if (configLocation !== "") {
      stylesPath = [
        binaryLocation,
        "--output=JSON",
        "--config",
        configLocation,
        "ls-config",
      ];
    } else {
      stylesPath = [binaryLocation, "--output=JSON", "ls-config"];
    }

    const configOut = await utils.runInWorkspace(folder, stylesPath);
    try {
      const configCLI = JSON.parse(configOut);

      this.stylesPath = configCLI.StylesPath;
      const command = utils.buildCommand(
        binaryLocation,
        configLocation,
        file.fileName
      );

      const stdout = await utils.runInWorkspace(folder, command);
      this.handleJSON(stdout.toString(), file, 0);
    } catch (error) {
      this.logger.appendLine(error);
    }
  }

  private handleJSON(
    contents: string,
    doc: vscode.TextDocument,
    offset: number
  ) {
    const diagnostics: vscode.Diagnostic[] = [];
    const backend = this.useCLI ? "Vale" : "Vale Server";
    let body = JSON.parse(contents.toString());
    if (body.Code && body.Text) {
      this.logger.appendLine(body.Text);
      if (body.Path) {
        this.logger.appendLine(body.Path);
      }
      return;
    }

    this.readabilityStatus.hide();
    for (let key in body) {
      const alerts = body[key];
      for (var i = 0; i < alerts.length; ++i) {
        if (alerts[i].Match === "") {
          var readabilityMessage = alerts[0].Message;
          this.updateStatusBarItem(readabilityMessage);
        } else {
          let diagnostic = utils.toDiagnostic(
            alerts[i],
            this.stylesPath,
            backend,
            offset
          );

          let key = `${diagnostic.message}-${diagnostic.range}`;
          this.alertMap[key] = alerts[i];

          diagnostics.push(diagnostic);
        }
      }
    }

    this.diagnosticCollection.set(doc.uri, diagnostics);
    this.diagnosticMap[doc.uri.toString()] = diagnostics;
  }

  private updateStatusBarItem(message: string): void {
    this.readabilityStatus.text = `${message}`;
    this.readabilityStatus.show();
  }

  public async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]> {
    let diagnostic: vscode.Diagnostic = context.diagnostics[0];
    let actions: vscode.CodeAction[] = [];

    if (diagnostic === undefined || this.useCLI) {
      return actions;
    }

    let key = `${diagnostic.message}-${diagnostic.range}`;
    let alert = this.alertMap[key];

    let server: string = vscode.workspace
      .getConfiguration()
      .get("vale.server.serverURL", "http://localhost:7777");

    await request
      .post({
        uri: server + "/suggest",
        qs: { alert: JSON.stringify(alert) },
        json: true,
      })
      .catch((error) => {
        return Promise.reject(`Vale Server could not connect: ${error}.`);
      })
      .then((body) => {
        for (let idx in body["suggestions"]) {
          const suggestion = body["suggestions"][idx];
          const title = utils.toTitle(alert, suggestion);
          const action = new vscode.CodeAction(
            title,
            vscode.CodeActionKind.QuickFix
          );

          action.command = {
            title: title,
            command: ValeServerProvider.commandId,
            arguments: [
              document,
              diagnostic,
              alert.Match,
              suggestion,
              alert.Action.Name,
            ],
          };

          actions.push(action);
        }
      });

    return actions;
  }

  private runCodeAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    error: string,
    suggestion: string,
    action: string
  ): any {
    let docError: string = document.getText(diagnostic.range);

    if (error === docError) {
      // Remove diagnostic from list
      let diagnostics: vscode.Diagnostic[] = this.diagnosticMap[
        document.uri.toString()
      ];
      let index: number = diagnostics.indexOf(diagnostic);

      diagnostics.splice(index, 1);

      // Update with new diagnostics
      this.diagnosticMap[document.uri.toString()] = diagnostics;
      this.diagnosticCollection.set(document.uri, diagnostics);

      // Insert the new text
      let edit = new vscode.WorkspaceEdit();
      if (action !== "remove") {
        edit.replace(document.uri, diagnostic.range, suggestion);
      } else {
        // NOTE: we need to add a character when deleting to avoid leaving a
        // double space.
        const range = new vscode.Range(
          diagnostic.range.start.line,
          diagnostic.range.start.character,
          diagnostic.range.end.line,
          diagnostic.range.end.character + 1
        );
        edit.delete(document.uri, range);
      }

      return vscode.workspace.applyEdit(edit);
    } else {
      vscode.window.showErrorMessage(
        "The suggestion was not applied because it is out of date."
      );
      console.log(error, docError);
    }
  }

  public async activate(subscriptions: vscode.Disposable[]) {
    this.logger = vscode.window.createOutputChannel("Vale");

    this.nlpServer = await this.startNLP();
    if (this.nlpServer.pid) {
      this.logger.appendLine("Successfully started NLP server on port 8000!")
    } else {
      this.logger.appendLine("Failed to start NLP server on port 8000.");
      this.logger.appendLine("You may need to run `pip3 install nlpapi`.");
    }

    const configuration = vscode.workspace.getConfiguration();
    this.command = vscode.commands.registerCommand(
      ValeServerProvider.commandId,
      this.runCodeAction,
      this
    );
    subscriptions.push(this);

    this.readabilityStatus = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection();

    this.useCLI = configuration.get("vale.core.useCLI", false);
    if (!this.useCLI) {
      this.stylesPath = await utils.getStylesPath();
    }

    vscode.workspace.onDidOpenTextDocument(this.doVale, this, subscriptions);
    vscode.workspace.onDidCloseTextDocument(
      (textDocument) => {
        this.diagnosticCollection.delete(textDocument.uri);
      },
      null,
      subscriptions
    );

    vscode.workspace.onDidSaveTextDocument(this.doVale, this);
    vscode.workspace.textDocuments.forEach(this.doVale, this);

    vscode.languages.registerCodeActionsProvider(
      { scheme: "*", language: "*" },
      this
    );

    InitCommands(subscriptions);
  }

  public dispose(): void {
    this.diagnosticCollection.clear();

    this.diagnosticCollection.dispose();
    this.command.dispose();
    this.readabilityStatus.dispose();

    this.diagnosticMap = {};
    this.alertMap = {};

    this.logger.dispose();
    this.nlpServer.kill();
  }
}
