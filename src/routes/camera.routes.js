import { Router } from "express";
import { takeSnapshot, startStream } from "../services/camera.service.js";

const router = Router();

router.get("/snapshot", async (req, res) => {
  try {
    const file = await takeSnapshot(req, res);
    // res.sendFile(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stream", (req, res) => {
  startStream(res, req);
});

export default router;
