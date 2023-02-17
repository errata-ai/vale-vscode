import * as vscode from "vscode";

export const getSuggestions = (
  range: vscode.Range,
  file: vscode.TextDocument
): string[] => {
  // FIXME: call some library here ...
  const word = file.getText(range);
  return ['option 1', 'option 2', 'option 3'];
}


