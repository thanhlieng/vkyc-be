import { Request, Response } from "express";
import {
  Host,
  frontUrl,
  sessionUrl,
  supabaseUrl,
  token,
  supabaseKey,
  faceUrl,
} from "../../constant";
import https from "https";
import FormData from "form-data";
// import { supabase } from "../../server";
import { clientSupabase } from "../../supabase";
import { getFilenameController } from "../../utils/fileName";
import { createClient } from "@supabase/supabase-js";
import { responseBadRequest } from "../../utils/responseUtils";
import { extractFront, extractBack } from "../../utils/extractOCR";

const axios = require("axios");
const fs = require("fs");

const supabase = createClient(supabaseUrl, supabaseKey);

export const ocrImage = async (req: Request, res: Response) => {
  console.log(req.body);

  try {
    const session = await supabase
      .from("session")
      .select()
      .eq("id", req.body.sessionId);
    console.log("session", session);

    if (!session.data || !session.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Session not found" }));
    }
    const roomId = session.data[0].room_id;
    const room = await supabase.from("room").select().eq("id", roomId);
    if (!room.data || !room.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Session invalid. Room not found" }));
    }
    console.log("room", room);

    const file = req.file;
    const fsImage = fs.createReadStream(file?.path);
    const isFront = req.body.isFront || "true";
    const formData = new FormData();
    formData.append("face_threshold", 0.8);
    formData.append("type", isFront?.toLowerCase() === "true" ? "FR" : "BA");
    formData.append("session_id", req.body.sessionId);
    formData.append("check_liveness", "True");
    formData.append("image", fsImage, { filename: file!!.originalname });

    try {
      const response = await axios.post(frontUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Token ${token}`,
        },
      });

      const reqUrl = `${req.url}-${
        isFront.toLowerCase() == "true" ? "FR" : "BA"
      }`;

      await supabase.from("request").insert({
        response: response.data,
        url: reqUrl,
        room_id: roomId,
        session_id: req.body.sessionId,
        image: response.data?.output?.cropped_image,
        request_id: response.data.request_id,
      });

      res.send(response.data);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const checkRoom = await supabase
      .from("room")
      .select()
      .eq("id", req.body.roomId);
    if (!checkRoom.data || !checkRoom.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Room not found" }));
    }
    const formData = new FormData();
    formData.append("source", "mascom");
    formData.append("is_sdk", "True");
    const url = sessionUrl;

    axios
      .post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Token ${token}`,
        },
      })
      .then(async (response: any) => {
        const requestTable = await clientSupabase.insertRequest({
          response: response.data,
          url: req.url,
          room_id: req.body.roomId,
          request_id: response.data.request_id,
        });
        const sessionTable = await supabase.from("session").insert({
          room_id: req.body.roomId,
          id: response.data?.output?.id,
        });
        res.status(200).json(response.data);
      })
      .catch((error: any) => {
        res.sendStatus(500);
        console.error(error);
      });
  } catch (err) {
    res.sendStatus(500);
  }
};

export const faceCompare = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    console.log(file);

    const fsImage = fs.createReadStream(file?.path);
    const session = await supabase
      .from("session")
      .select()
      .eq("id", req.body.sessionId);
    if (!session.data || !session.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Session not found" }));
    }
    const roomId = session.data[0].room_id;
    const room = await supabase.from("room").select().eq("id", roomId);
    if (!room.data || !room.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Session invalid. Room not found" }));
    }
    let formDataLiveness = new FormData();
    formDataLiveness.append("face_threshold", 0.8);
    formDataLiveness.append("threshold", 0.8);
    formDataLiveness.append("session_id", req.body.sessionId);
    formDataLiveness.append("check_liveness", "True");
    formDataLiveness.append("image", fsImage, {
      filename: file!!.originalname,
    });
    try {
      const response = await axios.post(faceUrl, formDataLiveness, {
        headers: {
          ...formDataLiveness.getHeaders(),
          Authorization: `Token ${token}`,
        },
      });

      await supabase.from("request").insert({
        response: response.data,
        url: req.url,
        room_id: roomId,
        session_id: req.body.sessionId,
        image: response.data?.output?.face_image?.cropped_image,
        request_id: response.data.request_id,
      });

      res.send(response.data);
      if (
        response.data.code == "Thành công" ||
        response.data.code == "SUCCESS"
      ) {
        const cardFront = extractFront(response.data.output.card_front.result);
        const cardBack = extractBack(response.data.output.card_back.result);
        const ocrData = await supabase
          .from("user_ocr_data")
          .insert({
            is_changed: false,
            data: { ...cardFront, ...cardBack, idSession: req.body.sessionId },
            room_id: roomId,
          })
          .select();
        console.log(ocrData);
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Error");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
};
