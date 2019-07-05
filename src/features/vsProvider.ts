'use strict';

import * as path from 'path';
import * as request from "request-promise-native";

import {
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    Range,
    TextDocument,
    Disposable,
    languages,
    workspace
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
 * The type of Vale’s JSON output.
 */
interface IValeJSON {
    readonly [propName: string]: ReadonlyArray<IValeErrorJSON>;
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
 * @param message The message to convert
 */
const toDiagnostic = (error: IValeErrorJSON): Diagnostic => {
    const range = new Range(
        error.Line - 1, error.Span[0] - 1,
        error.Line - 1, error.Span[1]);
    const diagnostic = new Diagnostic(
        range, error.Message, toSeverity(error.Severity));
    diagnostic.source = "Vale Server";
    diagnostic.code = error.Check;
    return diagnostic;
};

export default class ValeServerProvider {

    private diagnosticCollection!: DiagnosticCollection;
    private command!: Disposable;

    private doVale(textDocument: TextDocument) {
        const ext = path.extname(textDocument.fileName);
        // TODO: Expose as a setting.
        if (['.md', '.rst', '.adoc', '.txt'].indexOf(ext) < 0) {
            return;
        }

        request.post({
            // TODO: Expose this as a setting.
            uri: 'http://localhost:7777/vale',
            qs: {
                text: textDocument.getText(),
                format: ext
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
                    diagnostics.push(toDiagnostic(alerts[i]));
                }

                this.diagnosticCollection.set(textDocument.uri, diagnostics);
            });
    }

    public activate(subscriptions: Disposable[]) {
        subscriptions.push(this);
        this.diagnosticCollection = languages.createDiagnosticCollection();

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
