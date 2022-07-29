import * as vscode from "vscode";

import ValeProvider from "./features/vsProvider";

export function activate(context: vscode.ExtensionContext) {
  let linter = new ValeProvider(context);
  linter.activate(context.subscriptions);
}
