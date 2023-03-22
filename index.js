import express from "express";
import os from "os";
import WebSocket, { WebSocketServer } from "ws";
import fileUpload from "express-fileupload";
import fs from "fs";
import editly from "editly";
import path from "path";
import { fileURLToPath } from "url";
import rimraf from "rimraf";
import https from "https";
import moment from "moment";

//dependencies libxi-dev python

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const dirPath = path.join(__dirname, "public/projects");

if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath);
}

const app = express();
const port = 3000;

function isAuth(req, res, next) {
  const { password } = req.body;
  console.log("🚀 ~ file: index.js:30 ~ isAuth ~ password:", password);
  if (password === "xi72yow") {
    next();
  } else {
    res.status(401);
    res.send("Zugriff verweigert.");
  }
}

app.use(fileUpload());

// Add this line to serve our index.html page
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

function moveToPojectFolder(dir, file) {
  return new Promise((resolve, reject) => {
    file.mv(path.join(dir, file.name), function (err) {
      if (err) reject(err);
      resolve();
    });
  });
}

app.post("/upload", isAuth, async function (req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  const { logo, video } = req.files;

  const {
    spacingLeft = "0.05",
    spacingBottom = "0.3",
    logoWidth = "0.2",
    fast = false,
  } = req.body;

  const projectPath = path.join(dirPath, `${Date.now()}`);

  // cresting a folder for each project
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath);
  }

  await moveToPojectFolder(projectPath, video);
  await moveToPojectFolder(projectPath, logo);

  const outName =
    video.name.split(".")[0] +
    "_" +
    logo.name.split(".")[0] +
    (Boolean(fast) ? "_Vorschau" : "") +
    ".mp4";

  const downloadUrl = `/projects/${path.basename(projectPath)}/${outName}`;

  function sendDataToClient(data) {
    wss.clients.forEach((client) => {
      if (client)
        if (client.readyState === WebSocket.OPEN && client.id === downloadUrl)
          client.send(JSON.stringify({ ...data, downloadUrl }));
    });
  }

  res.send(downloadUrl);

  try {
    await editly({
      // input video
      in: path.join(projectPath, video.name),
      // output video
      outPath: path.join(projectPath, outName),
      clips: [
        {
          layers: [
            { type: "video", path: path.join(projectPath, video.name) },
            {
              type: "image-overlay",
              path: path.join(projectPath, logo.name),
              width: logoWidth,
              position: {
                x: spacingLeft,
                y: 1 - spacingBottom,
                originX: "left",
              },
            },
          ],
        },
      ],
      fast: Boolean(fast),
      onProgress: (process) => {
        sendDataToClient({ progress: process });
      },
    });
  } catch (e) {
    sendDataToClient({ error: e });
  }
  sendDataToClient({ progress: 100 });
  clearOldFolders();
});

function clearOldFolders() {
  fs.readdir(dirPath, (err, files) => {
    if (err) throw err;
    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        const createdTime = moment(fs.lstatSync(filePath).birthtime);
        if (moment().diff(createdTime, "days") > 7) {
          rimraf.sync(filePath);
        }
      }
    });
  });
}

const httpsOptions = {
  key: fs.readFileSync("./security/api.key"),
  cert: fs.readFileSync("./security/api.pem"),
};

const server = https.createServer(httpsOptions, app).listen(port, () => {
  console.log("App running at: ", `https://localhost:${port}/index.html`);
});

const wss = new WebSocketServer({ server, clientTracking: true });

wss.on("connection", (ws, req) => {
  console.log("New client connected!");
  ws.on("message", (message) => {
    console.log(
      "🚀 ~ file: index.js:169 ~ ws.on ~ message:",
      message.toString()
    );

    ws.id = message.toString();
  });
  ws.on("close", () => {
    console.log("Client has disconnected!");
  });
});
