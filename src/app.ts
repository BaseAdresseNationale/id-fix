import 'dotenv/config.js';
import express, { Application } from 'express';
import setupMocks from './mock.js';
import routes from './routes.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3000;
const STANDALONE_MODE = process.env.STANDALONE_MODE === 'true' || false;

// Initialize the Express application
const app: Application = express();

// Middleware to parse JSON requests
app.use(express.json());

// Apply mocks if in standalone mode
// Standalone mode is used for testing the API without the need for dump-api to be running
// BALs are retrieved locally from the path PATH_TO_BAL_FILE (env variable)
// Local bal files needs to be named bal-<cog>.csv
if (STANDALONE_MODE) {
  logger.info('Standalone mode : setting up mocks');
  setupMocks(); // Call the mock setup function
}

// Define the API routes
app.use('/', routes);

// Start the server on the specified port
app.listen(PORT, () => {
  console.log(`The server has started on port ${PORT}`);
});
