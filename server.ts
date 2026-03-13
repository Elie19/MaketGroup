import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/marketgroup";
if (!process.env.MONGODB_URI) {
  console.warn("WARNING: MONGODB_URI environment variable is not set. Using local default: mongodb://localhost:27017/marketgroup");
}

console.log("Attempting to connect to MongoDB...");
mongoose.connect(MONGODB_URI, { 
  serverSelectionTimeoutMS: 5000 // Timeout after 5s if can't connect
})
  .then(() => console.log("✅ Successfully connected to MongoDB"))
  .catch(err => {
    console.error("❌ CRITICAL: MongoDB connection error:");
    console.error(err);
    console.error("Please ensure your MONGODB_URI is correct in the Settings menu.");
  });

// Configure Mongoose to include virtuals in toJSON
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret: any) => {
    ret.id = ret._id;
    // delete ret._id; // Keep _id if needed, but id is what frontend expects
    return ret;
  }
});

// --- Models ---

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  displayName: String,
  email: String,
  photoURL: String,
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", UserSchema);

const AnnonceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  price: Number,
  photos: [String],
  location: String,
  userId: String,
  userName: String,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
const Annonce = mongoose.model("Annonce", AnnonceSchema);

const MessageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  content: String,
  annonceId: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

const GroupSchema = new mongoose.Schema({
  name: String,
  description: String,
  type: { type: String, default: 'public' },
  creatorId: String,
  image: String,
  createdAt: { type: Date, default: Date.now }
});
const Group = mongoose.model("Group", GroupSchema);

const GroupMessageSchema = new mongoose.Schema({
  groupId: String,
  senderId: String,
  senderName: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});
const GroupMessage = mongoose.model("GroupMessage", GroupMessageSchema);

// --- API Routes ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database connection check middleware
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next(); // Skip for health check
  
  if (mongoose.connection.readyState !== 1) {
    console.log(`DB not ready (state: ${mongoose.connection.readyState}) for request: ${req.url}`);
    return res.status(503).json({ 
      error: "Database not connected", 
      details: "The server is still connecting to MongoDB. Please wait a few seconds and try again." 
    });
  }
  next();
});

// Users
app.get("/api/users/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Error in GET /api/users/:uid:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { uid, displayName, email, photoURL, role } = req.body;
    let user = await User.findOne({ uid });
    if (!user) {
      user = new User({ uid, displayName, email, photoURL, role });
      await user.save();
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/users/:uid", async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ uid: req.params.uid }, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Annonces
app.get("/api/annonces", async (req, res) => {
  try {
    const { category, limit } = req.query;
    let query: any = {};
    if (category && category !== 'Toutes') query.category = category;
    
    let q = Annonce.find(query).sort({ createdAt: -1 });
    if (limit) q = q.limit(parseInt(limit as string));
    
    const annonces = await q;
    res.json(annonces);
  } catch (err) {
    console.error("Error in GET /api/annonces:", err);
    res.status(500).json({ error: "Server error", details: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/annonces/user/:userId", async (req, res) => {
  try {
    const annonces = await Annonce.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(annonces);
  } catch (err) {
    console.error("Error in GET /api/annonces/user/:userId:", err);
    res.status(500).json({ error: "Server error", details: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/annonces/:id", async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.id);
    if (!annonce) return res.status(404).json({ error: "Annonce not found" });
    res.json(annonce);
  } catch (err) {
    console.error("Error in GET /api/annonces/:id:", err);
    res.status(500).json({ error: "Server error", details: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/annonces", async (req, res) => {
  try {
    const annonce = new Annonce(req.body);
    await annonce.save();
    res.json(annonce);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/annonces/:id", async (req, res) => {
  try {
    await Annonce.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Messages
app.get("/api/messages/user/:userId", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.params.userId }, { receiverId: req.params.userId }]
    }).sort({ timestamp: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/messages/conversation", async (req, res) => {
  try {
    const { u1, u2 } = req.query;
    const messages = await Message.find({
      $or: [
        { senderId: u1, receiverId: u2 },
        { senderId: u2, receiverId: u1 }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Groups
app.get("/api/groups", async (req, res) => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/groups", async (req, res) => {
  try {
    const group = new Group(req.body);
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/groups/:id", async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Group Messages
app.get("/api/group-messages/:groupId", async (req, res) => {
  try {
    const messages = await GroupMessage.find({ groupId: req.params.groupId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/group-messages", async (req, res) => {
  try {
    const message = new GroupMessage(req.body);
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
