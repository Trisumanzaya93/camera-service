import express from "express";
import cors from "cors";
import cameraRoutes from "./routes/camera.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/camera", cameraRoutes);

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.json({
    name: "Camera Service API",
    status: "running",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      snapshot: "/camera/snapshot",
      stream: "/camera/stream"
    },
    notes: "Use /camera/stream in <img> tag or browser"
  });
});

export default app;
