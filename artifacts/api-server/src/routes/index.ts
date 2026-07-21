import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import schoolRouter from "./school";
import studentsRouter from "./students";
import teachersRouter from "./teachers";
import classesRouter from "./classes";
import attendanceRouter from "./attendance";
import resultsRouter from "./results";
import feesRouter from "./fees";
import announcementsRouter from "./announcements";
import parentRouter from "./parent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(schoolRouter);
router.use(studentsRouter);
router.use(teachersRouter);
router.use(classesRouter);
router.use(attendanceRouter);
router.use(resultsRouter);
router.use(feesRouter);
router.use(announcementsRouter);
router.use(parentRouter);

export default router;
