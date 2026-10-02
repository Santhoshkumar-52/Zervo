const dotenv = require("dotenv");
const http = require("http");
const app = require("./src/app");

const testDatabase = require("./src/config/testdatabase");

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testDatabase();
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error starting server:", err);
  }
};
startServer();
