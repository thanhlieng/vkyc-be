import { Request, Response } from "express";
import {
  AccessToken,
  EgressClient,
  EncodedFileType,
  EncodingOptionsPreset,
  RoomServiceClient,
  Room,
} from "livekit-server-sdk";
import { responseBadRequest, responseSuccess } from "../../utils/responseUtils";
import { getRandomName, getRandomRoomName } from "../../utils/randomString";
import { checkIsEmpty } from "../../utils/stringUtils";
import { clientSupabase } from "../../supabase";

import path from "path";
import moment from "moment";
import { supabaseUrl } from "../../constant";
import { supabaseKey } from "../../constant";
import { createClient } from "@supabase/supabase-js";
import roomService from "../../service/livekitService";

export interface CreateTokenBody extends Request {
  body: {
    roomName: string;
    userName: string;
  };
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const createToken = async (req: Request, res: Response) => {
  let roomName: string;
  if (checkIsEmpty(req.body.roomName)) {
    roomName = getRandomRoomName();
  } else {
    roomName = req.body.roomName.replaceAll(" ", "-");
  }

  let participantName: string;

  if (checkIsEmpty(req.body.userName)) {
    participantName = getRandomName();
  } else {
    participantName = req.body.userName;
  }

  const at = new AccessToken(process.env.key, process.env.secret, {
    identity: participantName,
  });

  const fileName = path.join(
    moment().format("DD-MM-YYYY"),
    roomName + "-" + moment().format("hh-mm-ss") + ".mp4"
  );
  roomService
    .createRoom({
      name: roomName,
      emptyTimeout: 5 * 60, // 10 minutes
      maxParticipants: 3,
    })
    .then((room: Room) => {
      console.log("room created", room);
    })
    .catch((e) => console.log("???", e));
  // try {
  //   const room = await roomService.createRoom({
  //     name: roomName,
  //     emptyTimeout: 5 * 60, // 10 minutes
  //     maxParticipants: 3,
  //   });
  //   console.log(room);
  // } catch (e) {
  //   console.log("errr", e);
  // }

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    roomRecord: true,
  });
  const token = at.toJwt();

  if (token) {
    const pathVideo = path.join("src/assets/video", fileName);
    const room = await clientSupabase.insertRoom({
      roomName,
      userToken: token,
      video: pathVideo.replaceAll("\\", "/"),
    });
    const roomId = room.data ? room.data[0].id : null;
    const agency = await clientSupabase.agency
      .select()
      .eq("is_available", true);
    const deviceTokens = agency.data?.map((agency) => agency.token_device);

    res
      .status(200)
      .json(responseSuccess({ token, room: room?.data ? room.data[0] : null }));
  }
};

export const startRecord = async (req: Request, res: Response) => {
  try {
    const egressClient = new EgressClient(
      "http://localhost:7880",
      process.env.key,
      process.env.secret
    );

    if (checkIsEmpty(req.body.roomId)) {
      const error = "RoomId is required";
      return res.status(400).json(responseBadRequest({ error }));
    }

    const room = await supabase
      .from("room")
      .select()
      .eq("id", req.body.roomId)
      .eq("status", true);
    if (!room.data || !room.data[0]) {
      return res
        .status(400)
        .json(responseBadRequest({ error: "Room not found" }));
    }
    const filePath = room.data[0].video.replace(
      "src/assets/video",
      "/home/egress/egress_output"
    );
    console.log(filePath);
    const output = {
      fileType: EncodedFileType.MP4,
      filepath: filePath.replaceAll("\\", "/"),
    };

    const info = await egressClient.startRoomCompositeEgress(
      room.data[0].room,
      output,
      {
        layout: "grid",
        encodingOptions: EncodingOptionsPreset.PORTRAIT_H264_720P_30,
      }
    );
    console.log("egress", info);

    const egressID = info.egressId;
    if (egressID) {
      const room = await supabase
        .from("room")
        .update({ egress_id: egressID })
        .eq("id", req.body.roomId);
    }
    return res.status(200).json(responseSuccess({ egressID }));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const agentToken = async (req: Request, res: Response) => {
  try {
    if (checkIsEmpty(req.body.roomId)) {
      const error = "RoomId is required";
      return res.status(400).json(responseBadRequest({ error }));
    }
    if (checkIsEmpty(req.body.agentName)) {
      const error = "AgentName is required";
      return res.status(400).json(responseBadRequest({ error }));
    }
    const roomId = req.body.roomId;
    const agentName = req.body.agentName;
    const room = await supabase.from("room").select().eq("id", roomId);
    if (room.data && room.data.length > 0) {
      const at = new AccessToken(process.env.key, process.env.secret, {
        identity: agentName,
      });
      const roomName = room.data[0].room;
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        roomRecord: true,
      });
      const token = at.toJwt();
      res
        .status(200)
        .json(
          responseSuccess({ token, room: room?.data ? room.data[0] : null })
        );
    } else {
      const error = "Room not found with id " + roomId;
      return res.status(400).json(responseBadRequest({ error }));
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};
