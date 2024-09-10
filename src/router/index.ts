import express from "express";
import tokenRouter from "./tokenRoute";
import techainerRouter from "./techainerRoute";
import cmsRouter from "./cmsRoute";
import { apiForwardMiddleware } from "../controller";

const mainRouter = express.Router();
mainRouter.use(apiForwardMiddleware.handleImageRequest);

mainRouter.use("/room", tokenRouter);
mainRouter.use("/vkyc", techainerRouter);
mainRouter.use("/cms", cmsRouter);

export default mainRouter;
