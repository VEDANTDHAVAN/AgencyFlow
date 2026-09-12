import "dotenv/config";
import http from "node:http";
import app from "./app";
import { initializeSocket } from "./websocket/socket";

const PORT = Number(process.env.PORT ?? 4000);

const httpServer = http.createServer(app);

const io = initializeSocket(httpServer);

app.set("io", io);

httpServer.listen(PORT, () => {
  console.log(`AgencyFlow API + WebSocket running on http://localhost:${PORT}`);
});