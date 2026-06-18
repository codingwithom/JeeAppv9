import { Router, type IRouter } from "express";
import healthRouter from "./health";
import streamRouter from "./stream";
import searchRouter from "./search";
import quizRouter from "./quiz";

const router: IRouter = Router();

router.use(healthRouter);
router.use(streamRouter);
router.use(searchRouter);
router.use("/quiz", quizRouter);

export default router;
