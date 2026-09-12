import { io } from "socket.io-client";

const token = process.env.ACCESS_TOKEN;
const taskId = process.env.TASK_ID;

if (!token) {
  throw new Error("ACCESS_TOKEN environment variable is required");
}

if (!taskId) {
  throw new Error("TASK_ID environment variable is required");
}

const socket = io("http://localhost:4000", {
  auth: { token },
});

socket.on("task:status-changed", (event) => {
  console.log("TASK STATUS EVENT:", event);
});

socket.on("connect", () => {
  console.log("CONNECTED:", socket.id);

  socket.emit("task:join", taskId, (response: unknown) => {
    console.log("TASK JOIN RESPONSE:", response);

    if (
      typeof response === "object" &&
      response !== null &&
      "ok" in response &&
      response.ok === true
    ) {
      console.log("Waiting for task status event...");
    }
  });
});

socket.on("connect_error", (error) => {
  console.error("CONNECTION ERROR:", error.message);
  process.exit(1);
});

socket.on("disconnect", (reason) => {
  console.log("DISCONNECTED:", reason);
});