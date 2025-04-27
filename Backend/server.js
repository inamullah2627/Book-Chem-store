const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(
  "mongodb+srv://book-store-1:bookstore1@bookstore.eqvlwm3.mongodb.net/bookstore?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

mongoose.connection
  .on("error", (err) => console.error(`MongoDB connection error: ${err}`))
  .once("open", () => console.log("MongoDB connected"));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Mongoose Schema and Model
const pdfSchema = new mongoose.Schema({
  title: { type: String, required: true },
  name: { type: String },
  path: { type: String },
  author: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const Pdf = mongoose.model("Pdf", pdfSchema);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({ storage });

// Routes

// Upload PDF
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const { title, author } = req.body;
    const { originalname, filename, size } = req.file;

    if (!title || !author) {
      return res.status(400).json({ error: "Title and Author are required" });
    }

    const newPdf = new Pdf({
      title,
      author,
      name: originalname,
      path: filename,
      size,
    });

    await newPdf.save();
    res.status(201).json({ message: "PDF uploaded successfully", pdf: newPdf });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Get all PDFs
app.get("/pdfs", async (req, res) => {
  try {
    const pdfs = await Pdf.find().sort({ uploadedAt: -1 });
    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Download PDF
app.get("/download/:id", async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ error: "PDF not found" });
    }
    const filePath = path.join(uploadsDir, pdf.path);
    res.download(filePath, pdf.title + ".pdf");
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});
// DELETE API to delete a PDF
app.delete("/pdfs/:id", async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ error: "PDF not found" });
    }

    await pdf.deleteOne();

    res.status(200).json({ message: "PDF deleted successfully" });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
