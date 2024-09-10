import express from "express";
import { createSession, faceCompare, ocrImage } from "../controller";
import multer from "multer";
import path from "path";
import moment from "moment";
import { getFilenameRoute } from "../utils/fileName";

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use Moment.js to format the current date as a folder name
    const currentDate = moment().local(true).format("DD-MM-YYYY");

    // Set the destination folder
    const destinationFolder = path.join("src/assets/image", currentDate);

    // Create the folder if it doesn't exist
    require("fs").mkdirSync(destinationFolder, { recursive: true });

    cb(null, destinationFolder);
  },
  filename: function (req, file, cb) {
    const url = req.url.replace("/", "-");
    const face = req.body.isFront
      ? req.body.isFront.toLowerCase() === "true"
        ? "Front"
        : "Back"
      : "Face";
    const name = moment().local(true).format("x") + "-" + face + url + ".jpg";
    cb(null, name);
  },
});

const upload = multer({ storage });
const techainerRouter = express.Router();

techainerRouter.post("/session", upload.none(), createSession);
techainerRouter.post("/ocr", upload.single("image"), ocrImage);
techainerRouter.post("/face-compare", upload.single("image"), faceCompare);

export default techainerRouter;
