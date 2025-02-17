import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary"; // Fix Cloudinary import
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: "*", // Change this to your frontend URL for security
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define Mongoose Schema for Blogs
const blogSchema = new mongoose.Schema({
  blog_id: { type: Number, unique: true, index: true },
  blog_title: String,
  blog_description: String,
  blog_image: String,
});

const Blog = mongoose.model("Blog", blogSchema);

// Configure Multer  for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "uploads",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

// Fix: Increase payload limit
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

// Upload Blog with Image
app.post("/api/blogs", upload.single("blog_image"), async (req, res) => {
  try {
    const { blog_title, blog_description } = req.body;
    if (!blog_title || !blog_description || !req.file) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const blog_image = req.file.path; // Correct Cloudinary URL

    const lastBlog = await Blog.findOne().sort({ blog_id: -1 });
    const blog_id = lastBlog ? lastBlog.blog_id + 1 : 1; // Increment blog ID

    const blog = new Blog({
      blog_id,
      blog_title,
      blog_description,
      blog_image,
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    console.error("Error uploading blog", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Fetch all blogs
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: "Error fetching blogs" });
  }
});

// Fetch blog by ID
app.get("/api/blogs/:blog_id", async (req, res) => {
  try {
    const blog = await Blog.findOne({ blog_id: req.params.blog_id });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
