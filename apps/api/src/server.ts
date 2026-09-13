import "dotenv/config";
import http from "node:http";
import app from "./app";
import { initializeSocket } from "./websocket/socket";
import { scheduleOverdueTaskJob } from "./jobs/scheduler";

const PORT = Number(process.env.PORT ?? 4000);

const httpServer = http.createServer(app);

const io = initializeSocket(httpServer);

app.set("io", io);

scheduleOverdueTaskJob().catch((error) => {
  console.error("Failed to start overdue task scheduler:", error);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`AgencyFlow API + WebSocket running on http://0.0.0.0:${PORT}`);
});