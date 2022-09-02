import { expect } from 'chai';
import * as path from 'path';
import * as vscode from 'vscode';
import { waitUntil } from 'async-wait-until';

suite('Problem reporting', () => {

  test('Test basic problem detected', async () => {
    const docUri = getDocUri('test.txt');
    const doc = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(doc);
    await waitUntil(() => {
      const diagnostics = vscode.languages.getDiagnostics(docUri);
      return diagnostics.length == 1;
    });
    const diagnostics = vscode.languages.getDiagnostics(docUri);
    expect(diagnostics).to.have.lengthOf(1);
    expect(diagnostics[0].range.start.line).to.equal(1);
    expect(diagnostics[0].message).to.equal("Try to avoid using clichés like 'a chip off the old block'.");
  });
});

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, '../../../workspace for test', p);
};

export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};
