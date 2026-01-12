import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const CAMERA_DEVICE = "/dev/video0";
const SNAPSHOT_DIR = path.join(process.cwd(), "snapshots");

if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR);
}

export function takeSnapshot(req, res) {
  let responded = false;

  const ffmpeg = spawn("ffmpeg", [
    "-loglevel", "error",
    "-f", "v4l2",
    "-input_format", "mjpeg",
    "-video_size", "1280x720",
    "-i", CAMERA_DEVICE,
    "-frames:v", "1",
    "-f", "image2pipe",
    "pipe:1"
  ]);

  const chunks = [];

  ffmpeg.stdout.on("data", (chunk) => {
    chunks.push(chunk);
  });

  ffmpeg.on("close", () => {
    if (responded) return;
    responded = true;

    const image = Buffer.concat(chunks);

    res.writeHead(200, {
      "Content-Type": "image/jpeg",
      "Content-Length": image.length,
      "Cache-Control": "no-cache"
    });

    res.end(image);
  });

  ffmpeg.on("error", (err) => {
    if (responded) return;
    responded = true;

    res.status(500).json({
      error: "Snapshot failed",
      detail: err.message
    });
  });
}

export function startStream(req, res) {
  req.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=frame",
    "Cache-Control": "no-cache",
    "Connection": "close",
    "Pragma": "no-cache"
  });

  const ffmpeg = spawn("ffmpeg", [
    "-loglevel", "quiet",
    "-f", "v4l2",
    "-input_format", "mjpeg",
    "-video_size", "1280x720",
    "-framerate", "10",
    "-i", CAMERA_DEVICE,
    "-f", "mjpeg",
    "-"
  ]);

  let buffer = Buffer.alloc(0);

  ffmpeg.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    let start = buffer.indexOf(Buffer.from([0xff, 0xd8])); // JPEG start
    let end = buffer.indexOf(Buffer.from([0xff, 0xd9]));   // JPEG end

    while (start !== -1 && end !== -1 && end > start) {
      const frame = buffer.slice(start, end + 2);
      buffer = buffer.slice(end + 2);

      req.write("--frame\r\n");
      req.write("Content-Type: image/jpeg\r\n");
      req.write(`Content-Length: ${frame.length}\r\n\r\n`);
      req.write(frame);
      req.write("\r\n");

      start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
      end = buffer.indexOf(Buffer.from([0xff, 0xd9]));
    }
  });

  req.on("close", () => {
    ffmpeg.kill("SIGINT");
  });
}