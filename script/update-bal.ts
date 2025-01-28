#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import argvParser from 'minimist';
import {
  csvBalToJsonBal,
  balJSONlegacy2balJSON,
  jsonBalToCsvBal,
} from '../src/bal-converter/helpers/index.js';
import { exit } from 'node:process';

const args = argvParser(process.argv.slice(2));

const {
  _: [pathToMockBalCSV, argPathOfDestFile],
  json = false,
  id = true,
} = args;

const destFileExt = json ? '.updated.json' : '.updated.csv';

if (!pathToMockBalCSV) {
  console.error('Missing path to BAL CSV file');
  exit(1);
}

if (!fs.existsSync(pathToMockBalCSV)) {
  console.error(`File '${pathToMockBalCSV}' does not exist`);
  exit(1);
}

if (!pathToMockBalCSV.match(/\.csv$/)) {
  console.error(`File '${pathToMockBalCSV}' is not a CSV file`);
  exit(1);
}

const pathOfDestFile =
  argPathOfDestFile || pathToMockBalCSV.replace(/.csv$/, destFileExt);
const pathOfDestDir = path.dirname(pathOfDestFile);

const mockBalCSV = fs.readFileSync(pathToMockBalCSV, 'utf8');

const balJSONlegacy = csvBalToJsonBal(mockBalCSV);
const balJSON = id ? balJSONlegacy2balJSON(balJSONlegacy) : balJSONlegacy;

if (!fs.existsSync(pathOfDestDir)) {
  fs.mkdirSync(pathOfDestDir, { recursive: true });
}

if (json) {
  fs.writeFileSync(pathOfDestFile, JSON.stringify(balJSON), 'utf8');
} else {
  const balCSV = jsonBalToCsvBal(balJSON);
  fs.writeFileSync(pathOfDestFile, balCSV, 'utf8');
}

console.log(
  `File '${path.basename(
    pathToMockBalCSV
  )}' updated. \nUpdate created at '${path.resolve(pathOfDestFile)}'`
);
