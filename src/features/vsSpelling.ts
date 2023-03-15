// TODO: Probably allow for defined dictionaties as well as sys default
//    TODO: What to retun by default?

import * as vscode from "vscode";
// TODO: Better way for this?
import * as path from "path";
// import * as fs from 'fs';

import { HunspellFactory, loadModule } from "hunspell-asm";
import { readFile } from "fs/promises";
import { resolve } from "path";
// TODO: Set path in settings
const dictPath = path.resolve("/Library/Spelling");
export const getSpellingSuggestions = async (
  range: vscode.Range,
  file: vscode.TextDocument
): Promise<string[]> => {
  const hunspellFactory = await loadModule();

  const affBuffer: ArrayBufferView = await readFile(
    path.join(dictPath, "en_AU.aff")
  );
  const dicBuffer: ArrayBufferView = await readFile(
    path.join(dictPath, "en_AU.dic")
  );

  const affFile = hunspellFactory.mountBuffer(affBuffer, "en_AU.aff");
  const dictFile = hunspellFactory.mountBuffer(dicBuffer, "en_AU.dic");

  var errorText = file.getText(range);

  const hunspell = hunspellFactory.create(affFile, dictFile);
  const misSpell = hunspell.spell(errorText);

  const suggestion = hunspell.suggest(errorText);
  //    TODO: What to return by default?
  return suggestion;
};
