import express from "express";        // Express framework for building the server
import cors from "cors";              // Enables Cross-Origin Resource Sharing
import multer from "multer";           // Handles file uploads

import path from "path";               // Utilities for file paths
import fs from "fs";                   // File system access
import { fileURLToPath } from "url";   // Helps get __dirname in ES modules

// -------------------- DIRNAME SETUP --------------------
// ES modules don’t have __dirname by default, so we recreate it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// -------------------- CORS CONFIG --------------------
// Only allow requests from frontend URLs we trust
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      "http://localhost:5173",
      "https://easy-drop-2026.netlify.app",
      "https://pick-and-drop-2723.netlify.app"
    ];

    // Allow requests with no origin (like Postman or server-to-server)
    if (!origin) return callback(null, true);

    // Allow if origin is in whitelist
    if (allowed.includes(origin)) return callback(null, true);

    // Block everything else
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

// Trust proxy headers (useful if behind a load balancer)
app.set("trust proxy", 1);

// Parse incoming JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------- UPLOADS FOLDER --------------------
const uploadsDir = path.join(__dirname, 'uploads');

// Create uploads folder if it doesn’t exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

/*
  Example:
  File URL: http://localhost:5000/uploads/image1.jpg
  Route:    /uploads/image1.jpg
*/

// Serve uploaded images as static files
app.use('/uploads', express.static(uploadsDir));

// -------------------- IN-MEMORY STORAGE --------------------
// Temporarily stores uploaded images per user
const imageCache = new Map();

// Simple friend mapping (who can receive whose image)
const friendsMap = new Map([
  ['id1', 'id2'],
  ['id2', 'id1']
]);

// -------------------- MULTER CONFIG --------------------
// Configure where and how files are stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save files in uploads folder
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to avoid collisions
    const uniqueString = Math.random().toString(36).substring(7);
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);

    cb(null, `image-${name}-${timestamp}-${uniqueString}${ext}`);
  }
});

// Initialize multer with custom storage config
const upload = multer({ storage });

// -------------------- ROUTES --------------------

// Upload image route
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    // If no file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // Get userId from request body
    const userId = req.body.userId;

    // Store relative path to image
    const imagePath = `/uploads/${req.file.filename}`;

    // Save image path against userId
    imageCache.set(userId, imagePath);

    res.json({
      success: true,
      message: "Image uploaded successfully",
      imagePath
    });

  } catch (error) {
    console.error("Upload error: ", error);
    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
});

// Drop image route (receiver pulls image from friend)
app.get('/drop/:receiverId', (req, res) => {
  try {
    const receiverId = req.params.receiverId;

    // Find sender based on friend mapping
    const senderId = friendsMap.get(receiverId);

    if (!senderId) {
      return res.json({
        success: false,
        message: "No friend mapping found",
      });
    }

    // Get sender's uploaded image
    const imagePath = imageCache.get(senderId);

    if (!imagePath) {
      return res.json({
        success: false,
        message: "No image available from your friend",
      });
    }

    // Remove image after it’s picked up (one-time drop)
    imageCache.delete(senderId);

    res.json({
      success: true,
      imagePath,
      message: "Image received"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Drop failed",
    });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: "OK",
  });
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
