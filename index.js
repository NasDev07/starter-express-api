const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors"); // Import cors
const multer = require("multer");

const app = express();
app.use(express.static("public")); // Mengatur folder 'public' agar dapat diakses secara publik
app.use(cors()); // Gunakan middleware cors

const upload = multer({ dest: "uploads/" });

let nextId = 1;

// Endpoint untuk mengunggah foto
app.post("/photo", upload.single("photo"), (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Gunakan ID terakhir yang digunakan atau 1 jika belum ada yang diunggah
    const id = nextId > 1 ? nextId : fs.readdirSync("uploads").length + 1;
    nextId = id + 1; // Update nextId untuk ID berikutnya

    const filename = `${id}_${file.originalname}`;

    // Simpan file di direktori uploads
    fs.renameSync(file.path, `uploads/${filename}`);

    const uploadedFile = {
      id: id,
      filename: filename,
      size: file.size,
      mimetype: file.mimetype,
    };

    // Kirim respons dengan data file yang diunggah
    res.status(200).json(uploadedFile);
  } catch (err) {
    console.error("Error uploading photo:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint untuk mengirim data foto sebagai SSE
app.get("/photos", (req, res, next) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "http://localhost:5173", // Izinkan akses dari aplikasi React
  });

  // Mengonfigurasi Express untuk melayani file statis dari direktori 'uploads'
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  const intervalId = setInterval(() => {
    try {
      const files = fs.readdirSync("uploads");
      let photoData = files.map((file) => {
        const stats = fs.statSync(`uploads/${file}`);
        return {
          id: file.split("_")[0],
          filename: `http://localhost:3000/uploads/${file}`,
          size: stats.size,
          lastModified: stats.mtime,
        };
      });

      // Urutkan photoData berdasarkan lastModified secara descending
      photoData.sort((a, b) => b.lastModified - a.lastModified);

      res.write(`data: ${JSON.stringify({ photos: photoData })}\n\n`);
    } catch (err) {
      console.error("Error sending photo data:", err);
      clearInterval(intervalId);
      res.end();
    }
  }); // jika anda meu gunakan delai kirim data bisa di ini contohnya 1000 itu 1 detik

  req.on("close", () => {
    clearInterval(intervalId);
    res.end();
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
