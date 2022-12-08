import { WebSocketServer } from "ws";
const port = 1000;
const wss = new WebSocketServer({ port: port });

console.log("listening on port: " + port);

wss.on("connection", function connection(ws) {
  ws.on("message", function (message) {
    console.log("message: " + message);
    ws.send("echo: " + message);
  });

  console.log("new client connected!");
  ws.send("connected!");
  ws.onclose = function () {
    console.log("client disconnected!");
  };
});
