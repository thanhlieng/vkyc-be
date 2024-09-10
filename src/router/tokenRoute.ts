import express from "express";
import { agentToken, createToken, startRecord } from "../controller";

const tokenRouter = express.Router();

tokenRouter.post("/", createToken);
tokenRouter.post("/startRecord", startRecord);
tokenRouter.post("/agent", agentToken);

export default tokenRouter;
