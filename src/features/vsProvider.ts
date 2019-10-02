'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as request from 'request-promise-native';

import {CancellationToken, CodeActionContext, CodeActionProvider, CodeAction, CodeActionKind, Command, commands, Diagnostic, DiagnosticCollection, DiagnosticSeverity, Range, Position, TextDocument, Disposable, languages, workspace, window, WorkspaceEdit, DiagnosticRelatedInformation, Location, Uri} from 'vscode';

/**
 * A severity from Vale Server.
 */
type ValeSeverity = 'suggestion'|'warning'|'error';

interface IValeActionJSON {
  readonly Name: string;
  readonly Params: [string];
}

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

/**
 * Convert a Vale severity string to a code diagnostic severity.
 *
 * @param severity The severity to convert
 */
const toSeverity = (severity: ValeSeverity): DiagnosticSeverity => {
  switch (severity) {
    case 'suggestion':
      return DiagnosticSeverity.Information;
    case 'warning':
      return DiagnosticSeverity.Warning;
    case 'error':
      return DiagnosticSeverity.Error;
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
const toDiagnostic = (alert: IValeErrorJSON, styles: string): Diagnostic => {
  const range = new Range(
      alert.Line - 1, alert.Span[0] - 1, alert.Line - 1, alert.Span[1]);
  const diagnostic =
      new Diagnostic(range, alert.Message, toSeverity(alert.Severity));

  diagnostic.source = 'Vale Server';
  diagnostic.code = alert.Check;

  const name = alert.Check.split('.');
  const rule = Uri.file(path.join(styles, name[0], name[1] + '.yml'));

  if (fs.existsSync(rule.fsPath)) {
    diagnostic.relatedInformation = [new DiagnosticRelatedInformation(
        new Location(rule, new Position(0, 0)), 'View rule')];
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
  return workspace.getConfiguration('vale-server')
      .get(setting, fallback)
      .replace(/\/+$/, '');
};

export default class ValeServerProvider implements CodeActionProvider {
  private diagnosticCollection!: DiagnosticCollection;
  private alertMap: Record<string, IValeErrorJSON> = {};
  private diagnosticMap: Record<string, Diagnostic[]> = {};
  private stylesPath!: string;

  private static commandId: string = 'ValeServerProvider.runCodeAction';
  private command!: Disposable;

  private doVale(textDocument: TextDocument) {
    const ext = path.extname(textDocument.fileName);
    const supported = workspace.getConfiguration('vale-server').get(
      'extensions', ['.md', '.rst', '.adoc', '.txt']);

    if (supported.indexOf(ext) < 0) {
      return;
    }
    // Reset out alert map:
    this.alertMap = {};

    let server: string = getWithDefault('serverURL', 'http://localhost:7777');
    request
        .post({
          uri: server + '/vale',
          qs: {
            text: textDocument.getText(),
            format: ext,
            path: path.dirname(textDocument.fileName)
          },
          json: true
        })
        .catch((error) => {
          throw new Error(`Vale Server could not connect: ${error}.`);
        })
        .then((body) => {
          const diagnostics: Diagnostic[] = [];
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
        });
  }

  public async provideCodeActions(
      document: TextDocument, range: Range, context: CodeActionContext,
      token: CancellationToken): Promise<CodeAction[]> {
    let diagnostic: Diagnostic = context.diagnostics[0];
    let key = `${diagnostic.message}-${diagnostic.range}`;

    let alert = this.alertMap[key];
    let actions: CodeAction[] = [];

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
            const action = new CodeAction(title, CodeActionKind.QuickFix);

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
      document: TextDocument, diagnostic: Diagnostic, error: string,
      suggestion: string, action: string): any {
    let docError: string = document.getText(diagnostic.range);

    if (error === docError) {
      // Remove diagnostic from list
      let diagnostics: Diagnostic[] =
          this.diagnosticMap[document.uri.toString()];
      let index: number = diagnostics.indexOf(diagnostic);

      diagnostics.splice(index, 1);

      // Update with new diagnostics
      this.diagnosticMap[document.uri.toString()] = diagnostics;
      this.diagnosticCollection.set(document.uri, diagnostics);

      // Insert the new text
      let edit = new WorkspaceEdit();
      if (action !== 'remove') {
        edit.replace(document.uri, diagnostic.range, suggestion);
      } else {
        // NOTE: we need to add a character when deletint to avoid leaving a
        // double space.
        const range = new Range(
            diagnostic.range.start.line, diagnostic.range.start.character,
            diagnostic.range.end.line, diagnostic.range.end.character + 1);
        edit.delete(document.uri, range);
      }

      return workspace.applyEdit(edit);
    } else {
      window.showErrorMessage(
          'The suggestion was not applied because it is out of date.');
        console.log(error, docError);
    }
  }

  public async activate(subscriptions: Disposable[]) {
    this.command = commands.registerCommand(
        ValeServerProvider.commandId, this.runCodeAction, this);
    subscriptions.push(this);

    this.diagnosticCollection = languages.createDiagnosticCollection();

    let server: string = getWithDefault('serverURL', 'http://localhost:7777');
    await request
        .get({
          uri: server + '/path',
          json: true
        })
        .catch((error) => {
          throw new Error(`Vale Server could not connect: ${error}.`);
        })
        .then((body) => {
          this.stylesPath = body.path;
        });

    workspace.onDidOpenTextDocument(this.doVale, this, subscriptions);
    workspace.onDidCloseTextDocument((textDocument) => {
      this.diagnosticCollection.delete(textDocument.uri);
    }, null, subscriptions);

    workspace.onDidSaveTextDocument(this.doVale, this);
    workspace.textDocuments.forEach(this.doVale, this);
  }

  public dispose(): void {
    this.diagnosticCollection.clear();

    this.diagnosticCollection.dispose();
    this.command.dispose();

    this.diagnosticMap = {};
    this.alertMap = {};
  }
}
