import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { documentRouter } from "./api/document.routes";

const app = express();
const PORT = process.env.PORT || 3001;

const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB, suficiente para un .md
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".md") || file.mimetype === "text/markdown" || file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Solo se aceptan archivos .md"));
    }
  }
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api/:docType/extraer", upload.single("archivo"));
app.use("/api", documentRouter);
app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
  res.sendStatus(204);
});
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

app.listen(PORT, () => {
  console.log(`Servidor de documentos corriendo en http://localhost:${PORT}`);
});
