require("dotenv").config();
import { Request, Response } from "express";
import router from "./router";
import moment from "moment";
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./constant";
import roomService from "./service/livekitService";

const cors = require("cors");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cron = require("node-cron");

const app = express();
const port = process.env.PORT;
const host = "0.0.0.0";
moment.locale();

export const supabase = createClient(supabaseUrl, supabaseKey);
app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
// Define a route that responds with "Hello, World!"
app.use("/", router);

app.get("/download/:filename", (req: Request, res: Response) => {
  const filename = req.params.filename;
  const file = path.join(__dirname, "asset/video", filename);
  // Assuming your files are in a 'files' director

  // Check if the file exists and then serve it
  res.download(file, (err: Error) => {
    if (err) {
      res.status(404).send(err.message);
    }
  });
});
const updateStatusRoom = async () => {
  try {
    const utcNow = moment.utc();
    const oneHourAgo = utcNow.clone().subtract(1, "hours").toISOString();
    const twoHoursAgo = utcNow.clone().subtract(2, "hours").toISOString();

    const rooms = await supabase
      .from("room")
      .select()
      .eq("status", true)
      .gte("created_at", twoHoursAgo)
      .lte("created_at", oneHourAgo);

    console.log("room need to stop", rooms);
    if (rooms.data && rooms.data.length > 0) {
      const livekitRooms = await roomService.listRooms();
      console.log("livekitRooms", livekitRooms);
      if (livekitRooms.length > 0) {
        const commonRooms = rooms.data.filter((room) =>
          livekitRooms.some((livekitRoom) => livekitRoom.name != room.room)
        );
        console.log("commonRooms", commonRooms);
        if (commonRooms.length > 0) {
          const roomIdsToUpdate = commonRooms.map((room) => room.id);

          const { data, error } = await supabase
            .from("room")
            .update({ status: false })
            .in("id", roomIdsToUpdate);

          if (error) {
            console.error("Update stutus room error: ", error);
          } else {
            console.log("Update status room succesfullly: ", data);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in updateStatusRoom: ", error);
  }
};

//Runs once every 1 hour
// cron.schedule('0 * * * *', () => {
//   updateStatusRoom()
// });

//Runs once every 1 minute
// cron.schedule('* * * * *', () => {
//   updateStatusRoom()
// });

// Start the server
app.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
