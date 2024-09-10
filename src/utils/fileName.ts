import { Request } from "express";
import moment from "moment";
import path from "path";
export const getFilenameRoute = (req: Request) => {
  const url = req.url.replace("/", "-");
  const room = req.body.room_id;
  const face = req.body.isFront
    ? req.body.isFront.toLowerCase() === "true"
      ? "Front"
      : "Back"
    : "Face";

  return room + "-" + req.body.sessionId + url + "-" + face + "-" + ".jpg";
};

export const getFilenameController = (req: Request, request_id: string) => {
  const url = req.url.replace("/", "-");
  const room = req.body.room_id;
  console.log(req.body.isFront);

  const face =
    req.body.isFront != undefined
      ? req.body.isFront.toLowerCase() === "true"
        ? "Front"
        : "Back"
      : "Face";
  const folder = path.join(
    "src/assets/image",
    moment().format("DD-MM-YYYY"),
    request_id + url + "-" + face + ".jpg"
  );
  return folder;
};
