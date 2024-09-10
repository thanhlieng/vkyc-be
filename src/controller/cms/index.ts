import { NextFunction, Request, Response } from "express";
import { responseBadRequest, responseSuccess } from "../../utils/responseUtils";
import { checkIsEmpty } from "../../utils/stringUtils";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "../../constant";
import { supabaseKey } from "../../constant";

import moment from "moment";
import { EgressClient } from "livekit-server-sdk";
import roomService from "../../service/livekitService";
import { EgressStatus } from "livekit-server-sdk/dist/proto/livekit_egress";
const path = require("path");
const fs = require("fs");
const rangeParser = require("range-parser");

export interface CmsBody extends Request {
  body: {
    roomId: number;
    status: string;
    agencyId: number;
    roomName: string;
    userName: string;
    page: number;
    size: number;
    fileName: string;
  };
}

const supabase = createClient(supabaseUrl, supabaseKey);

const egressClient = new EgressClient(
  "http://localhost:7880",
  process.env.key,
  process.env.secret
);

export const closedRoom = async (req: Request, res: Response) => {
  try {
    if (checkIsEmpty(req.body.roomId)) {
      const error = "RoomId is required";
      return res.status(400).json(responseBadRequest({ error }));
    }

    const checkRoom = await supabase
      .from("room")
      .select()
      .eq("id", req.body.roomId);
    if (!checkRoom.data || !checkRoom.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Room not found" }));
    }

    const room = await supabase
      .from("room")
      .update({ status: false, is_occupied: false })
      .eq("id", req.body.roomId)
      .select();
    if (!room.data || !room?.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Not found room" }));
    }
    const agencyId = checkRoom.data[0].agency_id;
    if (agencyId && checkRoom.data[0].is_occupied == true) {
      await supabase
        .from("agency")
        .update({ is_available: true })
        .eq("id", agencyId);
    }
    const message = room.data;
    res.status(200).json(responseSuccess({ message }));

    if (!checkIsEmpty(req.body.egressId)) {
      try {
        const closeRoom = await egressClient.stopEgress(req.body.egressId);
        console.log("close egress", closeRoom);

        const closeRoomLivekit = await roomService.deleteRoom(
          room.data[0].room
        );
      } catch (err: any) {
        console.log("error Egress stop ", err?.response?.data?.msg);
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error");
  }
};

export const joinRoom = async (req: Request, res: Response) => {
  try {
    if (checkIsEmpty(req.body.roomId)) {
      const error = "RoomId is required";
      return res.status(400).json(responseBadRequest({ error }));
    }
    if (checkIsEmpty(req.body.agencyId)) {
      const error = "AgencyId is required";
      return res.status(400).json(responseBadRequest({ error }));
    }

    const checkRoom = await supabase
      .from("room")
      .select()
      .eq("id", req.body.roomId);
    if (!checkRoom.data || !checkRoom.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Room not found" }));
    }
    if (checkRoom.data[0].status == false) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Room is closed" }));
    }

    const checkAgency = await supabase
      .from("agency")
      .select()
      .eq("id", req.body.agencyId);
    if (!checkAgency.data || !checkAgency.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Agency not found" }));
    }
    if (checkAgency.data[0].is_available == false) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Agency in other  room " }));
    }

    await supabase
      .from("agency")
      .update({ is_available: false })
      .eq("is_available", true)
      .eq("id", req.body.agencyId);
    await supabase
      .from("room")
      .update({ agency_id: req.body.agencyId, is_occupied: true })
      .eq("id", req.body.roomId)
      .eq("status", true);
    await supabase
      .from("room_agency")
      .insert({ room_id: req.body.roomId, agency_id: req.body.agencyId });

    res.status(200).json(responseSuccess({ message: "OK" }));

    const agency = await await supabase
      .from("agency")
      .select()
      .eq("is_available", true);
    const deviceTokens = agency.data?.map((agency) => agency.token_device);
    // const messageFcm = {
    //   data: {
    //     message: "Close Room",
    //     room: String(req.body.roomId),
    //     status: String(false),
    //   },
    //   tokens: deviceTokens,
    // };
    // sendMultiFCM(messageFcm);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
};

export const detailRoom = async (req: Request, res: Response) => {
  const room = await supabase.from("room").select().eq("id", req.body.roomId);
  if (!room.data || !room.data[0]) {
    return res
      .status(400)
      .json(responseBadRequest({ error: "Room not found" }));
  }

  const session = await supabase
    .from("session")
    .select()
    .eq("room_id", req.body.roomId);
  let resSession = [];
  if (session.data) {
    for (const item of session.data) {
      if (item) {
        const requests = await supabase
          .from("request")
          .select()
          .eq("session_id", item.id);
        // requests.data?.forEach(r => (r.image = path.resolve(r.image).replaceAll(/\\/g, '/')))

        resSession.push({
          id: item.id,
          created_at: item.created_at,
          request: requests.data,
        });
      }
    }
  }
  return res.status(200).json(
    responseSuccess({
      room: room.data[0],
      session: resSession,
    })
  );
};

export const listRoom = async (req: Request, res: Response) => {
  const page = Number(req.query.page || 1);
  const size = Number(req.query.size || 20);

  const query = supabase.from("room")
    .select(`id, room, status, user, is_occupied, video, created_at, updated_at, 
                agency(id, name)`);
  if (req.query.status) {
    query.eq("status", req.query.status);
  }
  const roomTotal = await query;

  const room = await query
    .range((page - 1) * size, page * size - 1)
    .order("created_at", { ascending: false });
  const totalItem = roomTotal.data?.length || 0;
  const paging = {
    page: page,
    size: size,
    totalPage: Math.ceil(totalItem / size),
    totalItem: totalItem,
  };

  return res.status(200).json(
    responseSuccess({
      paging,
      list: room.data,
    })
  );
};

export const confirmRoom = async (req: Request, res: Response) => {
  try {
    if (checkIsEmpty(req.body.roomId)) {
      const error = "RoomId is required";
      return res.status(400).json(responseBadRequest({ error }));
    }

    const room = await supabase
      .from("room")
      .update({ is_success: true })
      .eq("id", req.body.roomId)
      .select();
    if (!room.data || !room?.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Not found room" }));
    }
    const message = room.data;
    res.status(200).json(responseSuccess({ message }));
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
};

export const checkIfVideoPlayable = async (req: Request, res: Response) => {
  try {
    if (!req.body.egressId) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "EgressId is required" }));
    }
    console.log("egress", req.body.egressId);
    const egressInfo = await egressClient.listEgress({
      egressId: req.body.egressId,
    });

    if (egressInfo.length > 0 && !checkIsEmpty(egressInfo[0].egressId)) {
      switch (egressInfo[0].status) {
        case EgressStatus.EGRESS_COMPLETE:
          res.status(200).json(
            responseSuccess({
              isReady: true,
              msg: "Egress is ready to display",
            })
          );
          break;
        case EgressStatus.EGRESS_ACTIVE:
          res.status(206).json(
            responseSuccess({
              isReady: false,
              msg: "Egress is still continue",
            })
          );
          break;
        case EgressStatus.EGRESS_ENDING:
          res.status(202).json(
            responseSuccess({
              isReady: false,
              msg: "Egress is in saving progress",
            })
          );
          break;
        default:
          res.status(400).json({
            error: egressInfo[0].status,
            isReady: false,
            msg: "Egress has error, cant save record",
          });
          break;
      }
    } else {
      res.status(400).json({
        error: 9999,
        isReady: false,
        msg: "Egress has error, cant save record",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
};

export const changeRoomOCRData = async (req: Request, res: Response) => {
  try {
    let editData = { data: true, error: false };
    if (!req.params.roomId) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "roomId is require" }));
    }
    if (req.body.dataOCR) {
      const data_ocr = await supabase
        .from("user_ocr_data")
        .select()
        .eq("room_id", req.params.roomId);
      if (data_ocr?.data && data_ocr?.data?.length >= 2) {
        return res.status(400).json(
          responseBadRequest({
            error: "Can not edit this room OCR data anymore",
          })
        );
      }
      if (!data_ocr.data || data_ocr?.data?.length <= 0) {
        return res.status(400).json(
          responseBadRequest({
            error: "This room not yet complete face-compare",
          })
        );
      }

      const data = data_ocr.data[0].data;
      const edited_data = await supabase
        .from("user_ocr_data")
        .insert({
          is_changed: true,
          room_id: req.params.roomId,
          data: { ...data, ...req.body.dataOCR },
        })
        .select();
      if (!edited_data.data) {
        return res.status(400).json({
          msg: "Update data OCR failed",
        });
      }
      editData = edited_data.data[0];
    }
    const confirmInfor = req.body.confirm ? req.body.confirm : "true";
    const updated_room = await supabase
      .from("room")
      .update({ post_inspection: confirmInfor })
      .eq("id", req.params.roomId)
      .select();
    console.log("ocr", editData);
    console.log("room", updated_room);
    if (!editData.error && !updated_room.error) {
      res.status(200).json(
        responseSuccess({
          dataOCR: { ...editData },
          room: { ...updated_room.data[0] },
        })
      );
      return;
    } else {
      return res.status(400).json({
        msg: "Something went wrong, please report us",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

class ApiForwardMiddleware {
  handleImageRequest(req: Request, res: Response, next: NextFunction) {
    if (req.path.startsWith("/file")) {
      const pathImage = req.path.replace("/file", "");
      const projectDirectory = process.cwd();
      const absolutePath = path.join(projectDirectory, pathImage);
      if (!absolutePath) {
        return res.status(400).json(responseBadRequest({ error: "Not found" }));
      }
      console.log(absolutePath.includes("video"));

      try {
        if (absolutePath.includes("image")) {
          console.log(absolutePath);
          const imageBuffer = fs.readFileSync(absolutePath);
          res.setHeader("Content-Type", "image/jpeg");
          return res.end(imageBuffer);
        } else if (absolutePath.includes("video")) {
          // res.setHeader('Content-Type', 'video/mp4');
          // if (!fs.existsSync(absolutePath)) {
          //     return res.status(404).json({ error: 'Video not found' });
          // }
          const stat = fs.statSync(absolutePath);
          const fileSize = stat.size;
          const rangeHeader = req.headers.range;
          if (rangeHeader) {
            const ranges = rangeHeader.match(/bytes=([0-9]+)-([0-9]+)?/);

            if (ranges) {
              const start = parseInt(ranges[1], 10);
              const end = ranges[2] ? parseInt(ranges[2], 10) : fileSize - 1;

              const chunkSize = end - start + 1;
              const file = fs.createReadStream(absolutePath, { start, end });

              res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": "video/mp4",
              });

              return file.pipe(res);
            }
          }

          res.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": "video/mp4",
          });

          return fs.createReadStream(absolutePath).pipe(res);
        }
      } catch (error) {
        return res.status(400).json(responseBadRequest({ error: "Not found" }));
      }
    } else {
      return next();
    }
  }
}

export const apiForwardMiddleware = new ApiForwardMiddleware();
