import { RoomServiceClient } from "livekit-server-sdk";

const roomService = new RoomServiceClient(
  "wss://streaming.interdcs.com",
  process.env.key,
  process.env.secret
);

export default roomService;
