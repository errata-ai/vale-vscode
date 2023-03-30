import * as vscode from "vscode";
import nspell from "nspell";
import dictionary from "dictionary-en";

export const getSpellingSuggestions = async (
  range: vscode.Range,
  file: vscode.TextDocument
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const word = file.getText(range);
    dictionary(function (error, en) {
      if (error) {
        reject(error);
      }
      const spell = nspell(en);
      resolve(spell.suggest(word));
    });
  });
