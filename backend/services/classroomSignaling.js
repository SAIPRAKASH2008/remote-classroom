const { Server } = require("socket.io");

const CLASSROOM_ID = "remote-classrooms-live";
const MAX_PARTICIPANTS = 12;

function attachClassroomSignaling(httpServer, sessionMiddleware, demoParticipants = []) {
  const io = new Server(httpServer, {
    maxHttpBufferSize: 1e6,
    cors: { origin: false },
  });
  const participants = new Map();

  io.engine.use(sessionMiddleware);
  io.use((socket, next) => {
    const origin = socket.handshake.headers.origin;
    const host = socket.handshake.headers.host;
    if (origin && host && new URL(origin).host !== host) {
      return next(new Error("Cross-origin classroom connections are not allowed."));
    }
    const user = socket.request.session?.user;
    if (!user || !["student", "faculty"].includes(user.role)) {
      return next(new Error("Sign in as a student or faculty member to join the classroom."));
    }
    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    socket.on("class:join", (ack) => {
      if (typeof ack !== "function") ack = () => {};
      if (participants.has(socket.id)) return ack({ ok: true, room: CLASSROOM_ID });
      const isFaculty = socket.data.user.role === "faculty";
      const activeFaculty = Array.from(participants.values()).find((person) => person.role === "faculty");
      if (isFaculty && activeFaculty) {
        return ack({ ok: false, error: "A faculty member is already hosting this demo classroom." });
      }
      if (!isFaculty && !activeFaculty) {
        return ack({ ok: false, error: "The faculty member has not started the live class yet." });
      }
      if (participants.size >= MAX_PARTICIPANTS) {
        return ack({ ok: false, error: "This demo classroom has reached its 12-person limit." });
      }

      const currentParticipants = Array.from(participants, ([id, person]) => ({
        id,
        name: person.name,
        role: person.role,
      }));
      participants.set(socket.id, {
        name: String(socket.data.user.name).slice(0, 120),
        role: socket.data.user.role,
        recording: false,
      });
      socket.join(CLASSROOM_ID);
      ack({
        ok: true,
        room: CLASSROOM_ID,
        participants: currentParticipants,
        demoParticipants: isFaculty ? demoParticipants : [],
        recording: activeFaculty?.recording || false,
      });
      socket.to(CLASSROOM_ID).emit("class:peer-joined", {
        id: socket.id,
        name: String(socket.data.user.name).slice(0, 120),
        role: socket.data.user.role,
      });
    });

    socket.on("class:signal", ({ to, description, candidate } = {}) => {
      if (!participants.has(socket.id) || typeof to !== "string" || !participants.has(to)) return;
      const signal = { from: socket.id };
      if (description && ["offer", "answer"].includes(description.type)) signal.description = description;
      else if (candidate && typeof candidate === "object") signal.candidate = candidate;
      else return;
      io.to(to).emit("class:signal", signal);
    });

    socket.on("class:recording", (recording) => {
      if (participants.get(socket.id)?.role !== "faculty" || typeof recording !== "boolean") return;
      participants.get(socket.id).recording = recording;
      socket.to(CLASSROOM_ID).emit("class:recording", { recording });
    });

    socket.on("class:end", () => {
      if (participants.get(socket.id)?.role !== "faculty") return;
      endClass(socket.id);
    });

    socket.on("disconnect", () => {
      if (participants.get(socket.id)?.role === "faculty") {
        endClass(socket.id);
        return;
      }
      if (!participants.delete(socket.id)) return;
      io.to(CLASSROOM_ID).emit("class:peer-left", { id: socket.id });
    });
  });

  function endClass(hostId) {
    if (!participants.has(hostId)) return;
    io.to(CLASSROOM_ID).emit("class:ended", { message: "The faculty member ended the live class." });
    for (const socketId of participants.keys()) {
      const peer = io.sockets.sockets.get(socketId);
      peer?.leave(CLASSROOM_ID);
      participants.delete(socketId);
    }
  }

  return { io, close: () => io.close() };
}

module.exports = attachClassroomSignaling;
