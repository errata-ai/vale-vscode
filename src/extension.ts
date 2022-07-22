import * as vscode from "vscode";

import ValeProvider from "./features/vsProvider";

export function activate(context: vscode.ExtensionContext) {
  let linter = new ValeProvider();
  linter.activate(context.subscriptions);
}
