import * as path from 'path';
import * as which from "which";
import * as fs from 'fs';
import * as request from 'request-promise-native';
import { execFile } from "child_process";

import * as vscode from 'vscode';

export const readBinaryLocation = (file: vscode.TextDocument) => {
    const configuration = vscode.workspace.getConfiguration();

    let customBinaryPath = configuration.get<string>("vale.valeCLI.path");
    if (customBinaryPath) {
        customBinaryPath = path.normalize(customBinaryPath);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(file.uri);
        if (workspaceFolder) {
            customBinaryPath = customBinaryPath.replace(
                "${workspaceFolder}",
                workspaceFolder.uri.fsPath,
            );
        }
        return customBinaryPath;
    }
    return which.sync("vale");
};

export const readFileLocation = (file: vscode.TextDocument) => {
    const configuration = vscode.workspace.getConfiguration();

    let customConfigPath = configuration.get<string>("vale.valeCLI.config");
    if (customConfigPath) {
        customConfigPath = path.normalize(customConfigPath);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(file.uri);
        if (workspaceFolder) {
            customConfigPath = customConfigPath.replace(
                "${workspaceFolder}",
                workspaceFolder.uri.fsPath,
            );
        }
        return customConfigPath;
    }
    return "";
};

/**
 * Convert a Vale severity string to a code diagnostic severity.
 *
 * @param severity The severity to convert
 */
export const toSeverity = (severity: ValeSeverity): vscode.DiagnosticSeverity => {
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
export const toTitle = (alert: IValeErrorJSON, suggestion: string): string => {
    switch (alert.Action.Name) {
        case 'remove':
            return 'Remove \'' + alert.Match + '\'';
    }
    return 'Replace with \'' + suggestion + '\'';
};

/**
 * Whether a given document is elligible for linting.
 *
 * A document is elligible if it's in a supported format and saved to disk.
 *
 * @param document The document to check
 * @return Whether the document is elligible
 */
export const isElligibleDocument = (document: vscode.TextDocument): boolean => {
    if (document.isDirty) {
        vscode.window.showErrorMessage('Please save the file before linting.');
        return false;
    }
    return vscode.languages.match({ scheme: "file" }, document) > 0;
};

/**
 * Convert a Vale error to a code diagnostic.
 *
 * @param alert The alert to convert
 */
export const toDiagnostic = (
    alert: IValeErrorJSON,
    styles: string,
    backend: string,
    offset: number
): vscode.Diagnostic => {
    const range = new vscode.Range(
        (alert.Line - 1) + offset,
        alert.Span[0] - 1,
        (alert.Line - 1) + offset,
        alert.Span[1]
    );

    const diagnostic =
        new vscode.Diagnostic(range, alert.Message, toSeverity(alert.Severity));

    diagnostic.source = backend;
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
 * Run a command in a given workspace folder and get its standard output.
 *
 * If the workspace folder is undefined run the command in the working directory
 * of the current vscode instance.
 *
 * @param folder The workspace
 * @param command The command array
 * @return The standard output of the program
 */
export const runInWorkspace = (
    folder: string | undefined,
    command: ReadonlyArray<string>,
): Promise<string> =>
    new Promise((resolve, reject) => {
        const cwd = folder ? folder : process.cwd();
        const maxBuffer = 10 * 1024 * 1024; // 10MB buffer for large results
        execFile(
            command[0],
            command.slice(1),
            { cwd, maxBuffer },
            (error, stdout) => {
                resolve(stdout);
            },
        );
    });

const extractParagraph = (editor: vscode.TextEditor): vscode.Range => {
    let startLine = editor.selection.start.line;
    let endLine = editor.selection.end.line;

    while (startLine > 0 && !editor.document.lineAt(startLine - 1).isEmptyOrWhitespace) {
        startLine -= 1;
    }

    while (endLine < editor.document.lineCount - 1 &&
        !editor.document.lineAt(endLine + 1).isEmptyOrWhitespace) {
        endLine += 1;
    }

    const startCharacter = 0;
    const endCharacter = editor.document.lineAt(endLine).text.length;

    return new vscode.Range(startLine, startCharacter, endLine, endCharacter);
};

export const findContext = (): IEditorContext => {
    const editor = vscode.window.activeTextEditor;

    let context: IEditorContext = {Content: "", Offset: 0};
    if (!editor) {
        return context;
    }
    const range = extractParagraph(editor);

    context.Content = editor.document.getText(range);
    context.Offset = range.start.line;

    return context;
};

export const postFile = async (doc: vscode.TextDocument): Promise<string> => {
    let server: string = vscode.workspace.getConfiguration().get(
        'vale.server.serverURL',
        'http://localhost:7777'
    );
    let response: string = "";

    await request
        .post({
            uri: server + '/file',
            qs: {
                file: doc.fileName,
                path: path.dirname(doc.fileName)
            },
            json: true
        })
        .catch((error) => {
            vscode.window.showErrorMessage(
                `Vale Server could not connect: ${error}.`);
        })
        .then((body) => {
            response = fs.readFileSync(body.path).toString();
        });

    return response;
};

export const postString = async (content: string, ext: string): Promise<string> => {
    let server: string = vscode.workspace.getConfiguration().get(
        'vale.server.serverURL',
        'http://localhost:7777'
    );
    let response: string = "";

    await request
        .post({
            uri: server + '/vale',
            qs: {
                text: content,
                format: ext
            },
            json: false
        })
        .catch((error) => {
            vscode.window.showErrorMessage(
                `Vale Server could not connect: ${error}.`);
        })
        .then((body) => {
            response = body;
        });

    return response;
};

export const getStylesPath = async (): Promise<string> => {
    const configuration = vscode.workspace.getConfiguration();

    let path: string = "";
    let server: string = configuration.get(
        'vale.server.serverURL',
        'http://localhost:7777'
    );

    await request.get({ uri: server + '/path', json: true })
        .catch((error) => {
            throw new Error(`Vale Server could not connect: ${error}.`);
        })
        .then((body) => {
            path = body.path;
        });

    return path;
};

export const buildCommand = (
  exe: string,
  config: string,
  path: string
): Array<string> => {
    const configuration = vscode.workspace.getConfiguration();

    let command: Array<string> = [exe, "--no-exit"];
    if (config !== "") {
        command = command.concat(["--config", config]);
    }

    let minAlertLevel: string = configuration.get<string>(
        "vale.valeCLI.minAlertLevel", "inherited");

    if (minAlertLevel !== "inherited") {
        command = command.concat(["--minAlertLevel", minAlertLevel]);
    }

    command = command.concat(["--output", "JSON", path]);
    return command;
};

