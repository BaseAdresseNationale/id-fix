import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import csvBalToJsonBal from './csv-bal-to-json-bal.js';

const pathToMockBalCSV = './data-mock/adresses-21286_cocorico.csv';
const mockBalCSV = fs.readFileSync(pathToMockBalCSV, 'utf8');
const pathToMockBalCSV15 = './data-mock/adresses-21286_cocorico.1.5.csv';
const mockBalCSV15 = fs.readFileSync(pathToMockBalCSV15, 'utf8');

describe('csvBalToJsonBal', () => {
  test('should convert BAL CSV list into BAL JSON list', async () => {
    const balJSON = csvBalToJsonBal(mockBalCSV);
    expect(balJSON).toMatchSnapshot();
  });

  test('should prioritize BAL 1.5 toponyme over voie_nom', () => {
    const balJSON = csvBalToJsonBal(mockBalCSV15);

    expect(balJSON[0].toponyme).toBe('Rue Rhoam Bosphoramus');
    expect(balJSON[0].voie_nom).toBe('Rue Rhoam Bosphoramus');
    expect(balJSON[0].voie_nom).not.toBe('ANCIEN_VOIE');
  });

  test('should convert BAL 1.5 CSV list into BAL 1.5 JSON list', () => {
    const balJSON = csvBalToJsonBal(mockBalCSV15);
    expect(balJSON).toMatchSnapshot();
  });
});
