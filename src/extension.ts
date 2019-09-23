import * as vscode from 'vscode';

import ValeServerProvider from './features/vsProvider';

export function activate(context: vscode.ExtensionContext) {
	let linter = new ValeServerProvider();
	linter.activate(context.subscriptions);
	vscode.languages.registerCodeActionsProvider('markdown', linter);
}
