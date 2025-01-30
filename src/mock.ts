import nock from 'nock';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_DEPOT_URL = process.env.API_DEPOT_URL || "";
const PATH_TO_BAL_FILE = process.env.PATH_TO_BAL_FILE || "./";

const setupMocks = () => {
  // Mocking dump API requests in development
  nock(API_DEPOT_URL)
    .persist()
    .get(/\/communes\/([^/]+)\/current-revision/)
    .reply(200, (uri) => {
      const match = uri.match(/\/communes\/([^/]+)\/current-revision/);
      const cog = match ? match[1] : 'unknown'; // Extract 'cog' from the URL
      return {
        _id: cog,
        data: `Mocked data for COG ${cog}`,
      };
    });

  nock(API_DEPOT_URL)
    .persist()
    .get(/\/revisions\/([^/]+)\/files\/bal\/download/)
    .reply(200, (uri) => {
      const match = uri.match(/\/revisions\/([^/]+)\/files\/bal\/download/);
      const cog = match ? match[1] : 'unknown'; // Extract 'cog' from the URL
      const localBalPath = path.resolve(
        __dirname,
        '../',
        PATH_TO_BAL_FILE,
        `bal-${cog}.csv`
      );
      const localBal = readFileSync(localBalPath, 'utf-8');
      return localBal;
    });

  nock.emitter.on('no match', (req) => {
    console.error('No match for request:', req);
  });
};

export default setupMocks;
