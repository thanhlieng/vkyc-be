import { RoomServiceClient } from "livekit-server-sdk";

const roomService = new RoomServiceClient(
  "wss://test-lr2tmegs.livekit.cloud",
  process.env.key,
  process.env.secret
);

export default roomService;
