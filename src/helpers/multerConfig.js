const multer = require("multer");
const path = require("path");

const uploadDir = path.resolve("../../temp");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const uploadMiddleware = multer({ storage });

module.exports = { uploadMiddleware };
