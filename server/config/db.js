import mongoose from "mongoose";

let isConnected = false;
let isConnecting = false;

export async function connectDB() {
  if (isConnected || isConnecting) return;

  const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/pace";

  try {
    isConnecting = true;
    mongoose.set("bufferTimeoutMS", 3000);
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    isConnecting = false;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    isConnecting = false;
    console.warn(`[MongoDB] Connection notice: Could not connect to MongoDB.`);
    console.warn(`[MongoDB] Error: ${error.message}`);
    // Auto-retry in 5 seconds
    setTimeout(connectDB, 5000);
  }
}

mongoose.connection.on("connected", () => {
  isConnected = true;
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  setTimeout(connectDB, 5000);
});

export function getDBStatus() {
  if (!isConnected && !isConnecting) {
    connectDB().catch(() => {});
  }
  return {
    connected: isConnected,
    state: mongoose.connection.readyState,
    readyStateText: ["disconnected", "connected", "connecting", "disconnecting"][
      mongoose.connection.readyState
    ] || "unknown",
  };
}
