import "dotenv/config.js";
import express, { Application } from "express";
import routes from "./routes.js";

const PORT = process.env.PORT || 3000;

// Initialize the Express application
const app: Application = express();

// Middleware to parse JSON requests
app.use(express.json());

// Define the API routes
app.use("/", routes);

// Start the server on the specified port
app.listen(PORT, () => {
  console.log(`The server has started on port ${PORT}`);
});
