import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./constant";
import moment from "moment";


const supabase = createClient(supabaseUrl, supabaseKey);
const room = supabase.from("room");
const request = supabase.from("request");
const session = supabase.from("session");
const agency = supabase.from("agency");


async function insertRoom({
  roomName,
  userToken,
  video
}: {
  roomName: string;
  userToken: string;
  video?: string
}) {
  const result = await room.insert({ room: roomName, user: userToken, video: video, updated_at: moment() }).select();
  console.log("add room", result);
  return result;
}

async function updateRoom({
  room_id,
  status,
  agency,
}: {
  room_id: number;
  status?: boolean;
  agency?: number;
}) {
  let data = {};
  if (status != null) {
    data = { ...data, status };
  }
  if (agency != null) {
    data = { ...data, agency_id: agency };
  }
  const result = await room.update(data).eq("id", room_id).select();
  console.log("update room", result);
  return result;
}

async function insertRequest({
  url,
  response,
  room_id,
  request_id,
  session_id,
}: {
  url: string;
  response: any;
  room_id: number;
  request_id: string;
  session_id?: string | null;
}) {
  let data = {
    url,
    response,
    room_id,
    request_id,
    session_id,
  };
  if (session_id != null) {
    data = { ...data, session_id };
  }
  const result = await request.insert(data);
  console.log("add request", result);
  return result;
}

async function insertSession({ id, room_id }: { id: string; room_id: number }) {
  let data = {
    id,
    room_id,
  };
  const result = await session.insert(data);
  console.log("add request", result);
  return result;
}

async function updateAgency({
  agencyId,
  name,
  isAvailable,
}: {
  agencyId: number;
  isAvailable?: boolean;
  name?: string;
}) {
  let data = {};
  if (name != null) {
    data = { ...data, name };
  }
  if (isAvailable != null) {
    data = { ...data, is_available: isAvailable };
  }
  const result = await agency.update(data).eq("id", agencyId).select();
  console.log("update agency", result);
  return result;
}

export const clientSupabase = {
  updateAgency, updateRoom, insertRequest, insertSession, insertRoom, room, agency, request, session
};
