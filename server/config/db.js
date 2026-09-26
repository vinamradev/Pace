import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/pace";

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB] Connection notice: Could not connect to ${mongoURI}.`);
    console.warn(`[MongoDB] Server will run with local/mock data mode until MongoDB is reachable.`);
    console.warn(`[MongoDB] Error: ${error.message}`);
  }
}

export function getDBStatus() {
  return {
    connected: isConnected,
    state: mongoose.connection.readyState,
    readyStateText: ["disconnected", "connected", "connecting", "disconnecting"][
      mongoose.connection.readyState
    ] || "unknown",
  };
}
