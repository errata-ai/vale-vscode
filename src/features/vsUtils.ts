import * as path from "path";
import * as which from "which";
import * as fs from "fs";
import * as os from "os";
import { execFile } from "child_process";

import * as vscode from "vscode";

// If `customPath` contains `${workspaceFolder}`, replaces it with the workspace that `file` comes from.
// Return `null` if `customPath` contains `${workspaceFolder}` and `file` is _not_ part of the workspace.
function replaceWorkspaceFolder(logger: vscode.OutputChannel, customPath: string, file: vscode.TextDocument): string | null {
  customPath = path.normalize(customPath);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(file.uri);
  if (workspaceFolder) {
    return customPath.replace(
      "${workspaceFolder}",
      workspaceFolder.uri.fsPath
    );
  }
  logger.appendLine(`Not running Vale on file '${file.uri}' as it is not contained within the workspace`);
  return null;
}

export const readBinaryLocation = (context: vscode.ExtensionContext, logger: vscode.OutputChannel, file: vscode.TextDocument): string | null => {
  const configuration = vscode.workspace.getConfiguration();

  const valeCLIUsage = configuration.get<string>("vale.valeCLI.usage")

  if (valeCLIUsage === "Use embedded Vale CLI") {
    return embeddedBinaryPath(context, logger);
  } else if(valeCLIUsage === "Use Vale CLI specified in vale.valeCLI.path setting") {
    let customBinaryPath = configuration.get<string>("vale.valeCLI.path");
    if (customBinaryPath) {
      return replaceWorkspaceFolder(logger, customBinaryPath, file);
    }
    logger.appendLine(`Falling back to embedded Vale CLI despite "Use Vale CLI specified in vale.valeCLI.path setting" specified because "vale.valeCLI.path" is empty.`);
  } else if(valeCLIUsage === "Use Vale CLI available from system path") {
    const valeOnSystemPath = which.sync("vale");
    if (valeOnSystemPath !== null) {
      return valeOnSystemPath;
    }
  }

  return embeddedBinaryPath(context, logger);
};

function embeddedBinaryPath(context: vscode.ExtensionContext, logger: vscode.OutputChannel): string {
  const osPlatform = os.platform();
  if(osPlatform === "win32") {
    return context.asAbsolutePath(path.join('binaries', 'vale_2.20.1_Windows_64-bit', 'vale.exe'));
  } else if(osPlatform === "linux"){
    return context.asAbsolutePath(path.join('binaries', 'vale_2.20.1_Linux_64-bit', 'vale'));
  } else if(osPlatform === "darwin") {
    return context.asAbsolutePath(path.join('binaries', 'vale_2.20.1_macOS_64-bit', 'vale'));
  } else {
    logger.appendLine(`Cannot use embedded Vale CLI with OS Platform "${osPlatform}"`);
    return "vale";
  }
}

export const readFileLocation = (logger: vscode.OutputChannel, file: vscode.TextDocument): string | null => {
  const configuration = vscode.workspace.getConfiguration();

  let customConfigPath = configuration.get<string>("vale.valeCLI.config");
  if (customConfigPath) {
    return replaceWorkspaceFolder(logger, customConfigPath, file);
  }
  return "";
};

/**
 * Convert a Vale severity string to a code diagnostic severity.
 *
 * @param severity The severity to convert
 */
export const toSeverity = (
  severity: ValeSeverity
): vscode.DiagnosticSeverity => {
  switch (severity) {
    case "suggestion":
      return vscode.DiagnosticSeverity.Information;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "error":
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
    case "remove":
      return "Remove '" + alert.Match + "'";
    case "replace":
      return "Replace with '" + suggestion + "'";
  }
  return "Replace with '" + suggestion + "'";
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
    vscode.window.showErrorMessage("Please save the file before linting.");
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
    alert.Line - 1 + offset,
    alert.Span[0] - 1,
    alert.Line - 1 + offset,
    alert.Span[1]
  );

  const diagnostic = new vscode.Diagnostic(
    range,
    alert.Message,
    toSeverity(alert.Severity)
  );

  diagnostic.source = backend;

  if (alert.Link.length > 0) {
    diagnostic.code = {
      value: alert.Check,
      target: vscode.Uri.parse(alert.Link)
    };
  } else {
    diagnostic.code = alert.Check;
  }

  const name = alert.Check.split(".");
  const rule = vscode.Uri.file(path.join(styles, name[0], name[1] + ".yml"));

  if (fs.existsSync(rule.fsPath)) {
    diagnostic.relatedInformation = [
      new vscode.DiagnosticRelatedInformation(
        new vscode.Location(rule, new vscode.Position(0, 0)),
        "View rule"
      ),
    ];
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
  command: ReadonlyArray<string>
): Promise<string> =>
  new Promise((resolve, reject) => {
    const cwd = folder ? folder : process.cwd();
    const maxBuffer = 10 * 1024 * 1024; // 10MB buffer for large results
    execFile(
      command[0],
      command.slice(1),
      { cwd, maxBuffer },
      (error, stdout, stderr) => {
        if (error) {
          resolve(stderr);
        } else {
          resolve(stdout);
        }
      }
    );
  });

const extractParagraph = (editor: vscode.TextEditor): vscode.Range => {
  let startLine = editor.selection.start.line;
  let endLine = editor.selection.end.line;

  while (
    startLine > 0 &&
    !editor.document.lineAt(startLine - 1).isEmptyOrWhitespace
  ) {
    startLine -= 1;
  }

  while (
    endLine < editor.document.lineCount - 1 &&
    !editor.document.lineAt(endLine + 1).isEmptyOrWhitespace
  ) {
    endLine += 1;
  }

  const startCharacter = 0;
  const endCharacter = editor.document.lineAt(endLine).text.length;

  return new vscode.Range(startLine, startCharacter, endLine, endCharacter);
};

export const findContext = (): IEditorContext => {
  const editor = vscode.window.activeTextEditor;

  let context: IEditorContext = { Content: "", Offset: 0 };
  if (!editor) {
    return context;
  }
  const range = extractParagraph(editor);

  context.Content = editor.document.getText(range);
  context.Offset = range.start.line;

  return context;
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
    "vale.valeCLI.minAlertLevel",
    "inherited"
  );

  if (minAlertLevel !== "inherited") {
    command = command.concat(["--minAlertLevel", minAlertLevel]);
  }

  command = command.concat(["--output", "JSON", path]);
  return command;
};
