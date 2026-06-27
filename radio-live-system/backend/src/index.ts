import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";
import { initIO } from "./socket";
import { startScheduler } from "./services/scheduler.service";

const PORT = Number(process.env.PORT || 4000);

const app = createApp();
const httpServer = createServer(app);
initIO(httpServer);
startScheduler();

httpServer.listen(PORT, () => {
  console.log(`Radio backend berjalan di http://localhost:${PORT}`);
});
