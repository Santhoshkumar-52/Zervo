const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authenticate every socket connection.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      socket.user = {
        id: decoded.userId,
        role: decoded.role,
        branchId: decoded.branchId,
      };

      if (!socket.user.id) {
        return next(new Error("Invalid access token"));
      }

      next();
    } catch (error) {
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket) => {
    const { id, branchId } = socket.user;

    // Private room for this staff user.
    socket.join(`user:${id}`);

    // Branch room, only if branch membership was validated.
    if (branchId != null) {
      socket.join(`branch:${branchId}`);
    }

    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id}`, reason);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized. Initialize it in server.js first.",
    );
  }

  return io;
}

module.exports = {
  initializeSocket,
  getIO,
};
