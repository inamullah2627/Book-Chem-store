const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(
  "mongodb+srv://book-store-1:bookstore1@bookstore.eqvlwm3.mongodb.net/?retryWrites=true&w=majority&appName=bookstore",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
mongoose.connection.on("error", (err) => {
  console.log(`GOT AN DATABASE CONNECTION ERROR--${err}`);
});
mongoose.connection.on("connected", (conected) => {
  console.log(`MongoDB connected`);
});

// PDF model
const PdfSchema = new mongoose.Schema({
  name: String,
  path: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
});

const Pdf = mongoose.model("Pdf", PdfSchema);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Upload endpoint
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const { originalname, filename, size } = req.file;
    const pdf = new Pdf({
      name: originalname,
      path: filename,
      size,
    });
    await pdf.save();
    res.status(201).json({ message: "PDF uploaded successfully", pdf });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all PDFs endpoint
app.get("/pdfs", async (req, res) => {
  try {
    const pdfs = await Pdf.find().sort({ uploadedAt: -1 });
    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download endpoint
app.get("/download/:id", async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ error: "PDF not found" });
    }
    const filePath = path.join(__dirname, "uploads", pdf.path);
    res.download(filePath, pdf.name);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create uploads directory if it doesn't exist
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
