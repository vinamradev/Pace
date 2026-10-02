import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server/.env is loaded relative to db.js module location
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

let isConnected = false;
let isConnecting = false;
let connectAttempts = 0;
let memServer = null;

export async function connectDB() {
  if (isConnected || isConnecting) return;

  const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pace";

  try {
    isConnecting = true;
    mongoose.set("bufferTimeoutMS", 5000);
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    isConnecting = false;
    connectAttempts = 0;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    // If local MongoDB connection failed, attempt in-memory server fallback
    if (mongoURI.includes("localhost") || mongoURI.includes("127.0.0.1")) {
      try {
        if (!memServer) {
          const { MongoMemoryServer } = await import("mongodb-memory-server");
          memServer = await MongoMemoryServer.create({
            instance: { dbName: "pace" },
          });
        }
        const memUri = memServer.getUri();
        const conn = await mongoose.connect(memUri, {
          serverSelectionTimeoutMS: 5000,
        });
        isConnected = true;
        isConnecting = false;
        connectAttempts = 0;
        console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
        return;
      } catch {
        // Fallback failed
      }
    }

    isConnected = false;
    isConnecting = false;
    connectAttempts++;
    if (connectAttempts <= 1) {
      console.warn(`[MongoDB] Connection notice: Could not connect to MongoDB at ${mongoURI}`);
      console.warn(`[MongoDB] Error: ${error.message}`);
    }
    const delay = Math.min(5000 * Math.pow(1.5, Math.min(connectAttempts, 4)), 30000);
    setTimeout(connectDB, delay);
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
