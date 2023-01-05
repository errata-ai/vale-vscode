import { Nodehun } from "nodehun";
import * as vscode from "vscode";
const fs = require("fs");

// TODO: Probably allow for defined dictionaties as well as sys default
const affix = fs.readFileSync("/Library/Spelling/en_AU.aff");
const dictionary = fs.readFileSync("/Library/Spelling/en_AU.dic");

export const checkSpelling = (
  range: vscode.Range,
  file: vscode.TextDocument
): Array<string> => {
  console.log(range);
  const nodehun = new Nodehun(affix, dictionary);

  var errorText = file.getText(range);
  console.log(errorText);
  // return new Array;
  nodehun.suggest(errorText).then((suggestions) => {
    return suggestions;
  });

  //    TODO: What to retun by default?
  return new Array();
};
