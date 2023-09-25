#!/usr/bin/env ts-node
import 'dotenv/config.js';
import fs from "node:fs";
import path from "node:path";
import argvParser from "minimist";
import {
  sendBalToBan
} from "../src/bal-converter/index.js";
import { exit } from "node:process";

const args = argvParser(process.argv.slice(2));

const {
  _: [pathToBalCSVToInit],
} = args;

if (!pathToBalCSVToInit) {
  console.error("Missing path to BAL CSV file");
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

const mockBalCSV = fs.readFileSync(pathToBalCSVToInit, "utf8");

await sendBalToBan(mockBalCSV);
console.log(
  `Data from '${path.basename(
    pathToBalCSVToInit
  )}' initialized in BAN DB`
);