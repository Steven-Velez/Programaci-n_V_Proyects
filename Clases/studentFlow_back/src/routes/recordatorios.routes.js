import { Router } from "express";
import {
  createRecordatorio,
  deleteRecordatorio,
  getRecordatorio,
  listRecordatorios,
  listTasks,
  replaceRecordatorio,
  updateRecordatorio
} from "../controllers/recordatorios.controller.js";

const router = Router();

router.get("/", listRecordatorios);
router.get("/tareas", listTasks);
router.get("/:id", getRecordatorio);
router.post("/", createRecordatorio);
router.put("/:id", replaceRecordatorio);
router.patch("/:id", updateRecordatorio);
router.delete("/:id", deleteRecordatorio);

export default router;
