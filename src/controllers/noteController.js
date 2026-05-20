import Note from "../models/Note.js";
import cloudinary from "../config/cloudinary.js";
import mammoth from "mammoth";
// import officeParser from "officeparser";
// import officeParser from "officeparser";

const extractTextFromFile = async (file) => {
  const mime = file.mimetype;

  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (mime === "text/plain") {
    return file.buffer.toString("utf-8");
  }

  return null;
};

const getFileType = (mime) => {
  const map = {
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "text/plain": "txt",
  };
  return map[mime] || "text";
};

export const createNote = async (req, res) => {
  try {
    const { title, tags, tone } = req.body;
    let { content } = req.body;
    let fileUrl = "";
    let extractedText = "";
    let type = "text";

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (req.file) {
      type = getFileType(req.file.mimetype);
      extractedText = await extractTextFromFile(req.file);

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "echo-app/notes",
            resource_type: type === "image" ? "image" : "raw",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });

      fileUrl = uploadResult.secure_url;
      content = extractedText || "";
    } else {
      if (!content) {
        return res
          .status(400)
          .json({ message: "Content is required for text notes" });
      }
      type = "text";
    }

   const note = await Note.create({
     userId: req.user._id,
     title,
     type,
     content,
     fileUrl,
     originalFilename: req.file ? req.file.originalname : "",
     tags: tags ? JSON.parse(tags) : [],
     tone: tone || "simple",
   });

    res.status(201).json({ note });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ notes });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.status(200).json({ note });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.fileUrl) {
      try {
        const urlParts = note.fileUrl.split("/");
        const folderAndFile = urlParts.slice(-2).join("/");
        const publicId = folderAndFile.split(".")[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
      } catch (cloudinaryError) {
        console.error("Cloudinary delete error:", cloudinaryError);
      }
    }

    await note.deleteOne();
    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};  
export const downloadNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.fileUrl) {
      const response = await fetch(note.fileUrl);
      const buffer = await response.arrayBuffer();

      const extMap = {
        pdf: "application/pdf",
        image: "image/jpeg",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        txt: "text/plain",
      };

      const mimeType = extMap[note.type] || "application/octet-stream";
      const filename = note.originalFilename || `${note.title}`;

      res.setHeader("Content-Type", mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      return res.send(Buffer.from(buffer));
    }

    if (note.type === "text" && note.content) {
      res.setHeader("Content-Type", "text/plain");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${note.title}.txt"`,
      );
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      return res.send(note.content);
    }

    res.status(400).json({ message: "No downloadable content found" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
