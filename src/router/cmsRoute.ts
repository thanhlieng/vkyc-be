import express from "express";
import {
  changeRoomOCRData,
  checkIfVideoPlayable,
  closedRoom,
  confirmRoom,
  detailRoom,
  joinRoom,
  listRoom,
} from "../controller/cms";

const cmsRouter = express.Router();

cmsRouter.post("/room/closed", closedRoom);
cmsRouter.post("/room/join", joinRoom);
cmsRouter.post("/room/detail", detailRoom);
cmsRouter.get("/room/list", listRoom);
cmsRouter.post("/room/confirm", confirmRoom);
cmsRouter.post("/check/video", checkIfVideoPlayable);
cmsRouter.post("/room/ocr/:roomId", changeRoomOCRData);

export default cmsRouter;
