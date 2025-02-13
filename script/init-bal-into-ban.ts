#!/usr/bin/env ts-node
import 'dotenv/config.js';
import fs from 'node:fs';
import path from 'node:path';
import { exit } from 'node:process';

import argvParser from 'minimist';
import { sendBalToBan } from '../src/bal-converter/index.js';
import { csvBalToJsonBal } from '../src/bal-converter/helpers/index.js';

const args = argvParser(process.argv.slice(2));

const {
  _: [pathToBalCSVToInit],
} = args;

if (!pathToBalCSVToInit) {
  console.error('Missing path to BAL CSV file');
  exit(1);
}

if (!fs.existsSync(pathToBalCSVToInit)) {
  console.error(`File '${pathToBalCSVToInit}' does not exist`);
  exit(1);
}

if (!pathToBalCSVToInit.match(/\.csv$/)) {
  console.error(`File '${pathToBalCSVToInit}' is not a CSV file`);
  exit(1);
}

const mockBalCSV = fs.readFileSync(pathToBalCSVToInit, 'utf8');
const bal = csvBalToJsonBal(mockBalCSV);

await sendBalToBan(bal);
console.log(
  `Data from '${path.basename(pathToBalCSVToInit)}' initialized in BAN DB`
);
