// import { Nodehun } from "nodehun";

// import * as vscode from "vscode";
// const fs = require("fs");

// // TODO: Probably allow for defined dictionaties as well as sys default
// const affix = fs.readFileSync("/Library/Spelling/en_AU.aff");
// const dictionary = fs.readFileSync("/Library/Spelling/en_AU.dic");

// export const checkSpelling = (
//   range: vscode.Range,
//   file: vscode.TextDocument
// ): Array<string> => {
//   console.log(range);
//   const nodehun = new Nodehun(affix, dictionary);

//   var errorText = file.getText(range);
//   console.log(errorText);
//   // return new Array;
//   nodehun.suggest(errorText).then((suggestions) => {
//     return suggestions;
//   });

//   //    TODO: What to retun by default?
//   return new Array();
// };

import * as vscode from "vscode";
// TODO: Better way for this?
import * as path from "path";
// import * as fs from 'fs';

// import { bindNodeCallback, firstValueFrom } from 'rxjs';
import { HunspellFactory, loadModule } from 'hunspell-asm';
import { readFile } from "fs/promises";

// const readFile = bindNodeCallback(fs.readFile);
const dictPath = path.resolve('/Library/Spelling');
// TODO: Again was previously promise, is that better?
export const getSpellingSuggestions = async (
  range: vscode.Range,
  file: vscode.TextDocument
): Promise<string[]> => {
const hunspellFactory = await loadModule();

const affBuffer: ArrayBufferView = await readFile(path.join(dictPath, 'en_AU.aff'));
const dicBuffer: ArrayBufferView = await readFile(path.join(dictPath, 'en_AU.dic'));

const affFile = hunspellFactory.mountBuffer(affBuffer, 'en_AU.aff');
const dictFile = hunspellFactory.mountBuffer(dicBuffer, 'en_AU.dic');

// const affFile = hunspellFactory.mountBuffer(affBuffer, 'en_AU.aff');
// const dicFile = hunspellFactory.mountBuffer(dicBuffer, 'en_AU.dic');


// const affBuffer = new Uint8Array(await aff.arrayBuffer());
// const affFile = hunspellFactory.mountBuffer(affBuffer, 'korean.aff');

// const dic = await fetch('https://unpkg.com/hunspell-dict-ko@0.0.3/ko.dic');
// const dicBuffer = new Uint8Array(await dic.arrayBuffer());
// const dictFile = hunspellFactory.mountBuffer(dicBuffer, 'korean.dic');


// const affBuffer = await readFile(path.join(dictPath, 'en_AU.aff')).firstValueFrom();
// const dicBuffer = await readFile(path.join(dictPath, 'en_AU.dic')).toPromise();
// const affFile = hunspellFactory.mountBuffer(affBuffer, 'en_AU.aff');
// const dictFile = hunspellFactory.mountBuffer(dicBuffer, 'en_AU.dic');


var errorText = file.getText(range);

const hunspell = hunspellFactory.create(affFile, dictFile);

const misSpell = hunspell.spell(errorText);

console.log(`check spell for word '${errorText}': ${misSpell}`);
  console.assert(misSpell === false);

  // const correctSpell = hunspell.spell(correctWord);
  // console.log(`check spell for word '${correctWord}': ${correctSpell}`);
  // console.assert(correctSpell === true);

  const suggestion = hunspell.suggest(errorText);
  // console.assert(suggestion[0] === correctWord);

// hunspellFactory.mountBuffer(affFileBuffer,"/Library/Spelling/en_AU.aff" 
// // loadModule({ timeout?: 5 }): Promise<HunspellFactory>
// const hunspell = hunspellFactory.create("/Library/Spelling/en_AU.aff", "/Library/Spelling/en_AU.dic");
  //    TODO: What to return by default?
  return suggestion;
};