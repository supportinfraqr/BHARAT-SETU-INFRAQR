// test-client.js
const { io } = require("socket.io-client");

const socket = io("http://localhost:3300", {
  transports: ["websocket"], // optional
});

socket.on("connect", () => {
  console.log("✅ Connected to socket:", socket.id);

  socket.emit("join-user", {
      employeeId: "67a370dda38daae94d986796",
      org_uuid: "67a3412da38daae94d9861d2",

  });

  socket.on("attendance-update", (data) => {
    console.log("📩 attendance-update:", data);
  });
});

socket.on("connect_error", (err) => {
  console.error("❌ Connect error:", err.message);
});
