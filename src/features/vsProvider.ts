'use strict';

import * as path from 'path';
import * as request from "request-promise-native";

import {
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    Range,
    Position,
    TextDocument,
    Disposable,
    languages,
    workspace,
    DiagnosticRelatedInformation,
    Location,
    Uri
} from "vscode";

/**
 * A severity from Vale Server.
 */
type ValeSeverity = "suggestion" | "warning" | "error";

interface IValeErrorJSON {
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
        case "suggestion":
            return DiagnosticSeverity.Information;
        case "warning":
            return DiagnosticSeverity.Warning;
        case "error":
            return DiagnosticSeverity.Error;
    }
};

/**
 * Convert a Vale error to a code diagnostic.
 *
 * @param alert The alert to convert
 */
const toDiagnostic = (alert: IValeErrorJSON, styles: string): Diagnostic => {
    const range = new Range(
        alert.Line - 1, alert.Span[0] - 1,
        alert.Line - 1, alert.Span[1]);
    const diagnostic = new Diagnostic(
        range, alert.Message, toSeverity(alert.Severity));

    diagnostic.source = "Vale Server";
    diagnostic.code = alert.Check;

    const name = alert.Check.split('.');
    const rule = path.join(styles, name[0], name[1] + '.yml');

    diagnostic.relatedInformation = [
        new DiagnosticRelatedInformation(new Location(
            Uri.file(rule), new Position(0, 0)),
            'View rule'
        )];

    return diagnostic;
};

export default class ValeServerProvider {

    private diagnosticCollection!: DiagnosticCollection;
    private stylesPath!: string;
    private command!: Disposable;

    private doVale(textDocument: TextDocument) {
        const ext = path.extname(textDocument.fileName);
        // TODO: Expose as a setting.
        if (['.md', '.rst', '.adoc', '.txt'].indexOf(ext) < 0) {
            return;
        }

        request
            .post({
              // TODO: Expose this as a setting.
              uri: 'http://localhost:7777/vale',
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
              const alerts = body[`stdin${ext}`];

              const diagnostics: Diagnostic[] = [];
              for (var i = 0; i < alerts.length; ++i) {
                diagnostics.push(toDiagnostic(alerts[i], this.stylesPath));
              }

              this.diagnosticCollection.set(textDocument.uri, diagnostics);
            });
    }

    public async activate(subscriptions: Disposable[]) {
        subscriptions.push(this);

        this.diagnosticCollection = languages.createDiagnosticCollection();
        await request.get({
            // TODO: Expose this as a setting.
            uri: 'http://localhost:7777/path',
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
    }
}
