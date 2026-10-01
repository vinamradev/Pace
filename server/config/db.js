import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

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
    connectAttempts = 0;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    isConnecting = false;
    connectAttempts++;
    if (connectAttempts <= 1) {
      console.warn(`[MongoDB] Connection notice: Could not connect to MongoDB at ${mongoURI}`);
      console.warn(`[MongoDB] Error: ${error.message}`);
      console.warn(`[MongoDB] Tip: If you don't have local MongoDB installed, use a free cloud MongoDB Atlas URI in server/.env (MONGODB_URI=mongodb+srv://...)`);
    }
    // Exponential backoff up to 30s to avoid terminal spam
    const delay = Math.min(5000 * Math.pow(1.5, Math.min(connectAttempts, 4)), 30000);
    setTimeout(connectDB, delay);
  }
}

let connectAttempts = 0;

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
