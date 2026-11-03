const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

class LiveClass {
  constructor(role, user, onClose) {
    this.role = role;
    this.user = user;
    this.onClose = onClose;
    this.socket = null;
    this.localStream = null;
    this.peers = new Map();
    this.closed = false;
    this.tileCount = 0;
    this.recorder = null;
    this.recordingCanvas = null;
    this.recordingFrame = null;
    this.recordingStream = null;
    this.recordingAudioContext = null;
    this.recordingAudioDestination = null;
    this.recordingAudioSources = new Map();
    this.recordingStartedAt = 0;
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera and microphone access requires HTTPS or http://localhost in a supported browser.");
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    });

    try {
      await this.connect();
    } catch (error) {
      this.stopMedia();
      throw error;
    }

    this.render();
    this.socket.on("class:peer-joined", (peer) => this.connectToPeer(peer, true));
    this.socket.on("class:signal", (signal) => this.receiveSignal(signal));
    this.socket.on("class:peer-left", ({ id }) => this.removePeer(id));
    this.socket.on("class:recording", ({ recording }) => {
      this.recordingActive = recording === true;
      this.setStatus(this.recordingActive
        ? "This class is being recorded. You can leave the class at any time."
        : "Class recording has stopped.");
    });
    this.socket.on("class:ended", ({ message }) => {
      this.stop({ announce: false });
      this.onClose(message);
    });
    this.socket.on("disconnect", (reason) => {
      if (!this.closed && reason !== "io client disconnect") {
        this.setStatus("Connection lost. Try leaving and joining the class again.");
      }
    });

    for (const peer of this.participants) this.connectToPeer(peer, false);
    if (this.role === "faculty") {
      for (const student of this.demoParticipants) this.addDemoAttendee(student);
    }
    const demoCount = this.role === "faculty" ? this.demoParticipants.length : 0;
    this.setStatus(this.role === "faculty"
      ? `${demoCount} demo students attending (camera and mic off). Real students can join anytime.`
      : "You have joined the live class.");
  }

  async connect() {
    if (typeof window.io !== "function") {
      throw new Error("Live class signaling could not load. Restart the website and try again.");
    }

    this.socket = window.io({ autoConnect: false, reconnection: false });
    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("The live classroom server did not respond.")), 10000);
      this.socket.once("connect", () => {
        window.clearTimeout(timeout);
        resolve();
      });
      this.socket.once("connect_error", (error) => {
        window.clearTimeout(timeout);
        reject(new Error(error.message || "Could not connect to the live classroom."));
      });
      this.socket.connect();
    });

    const result = await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Could not join the live classroom.")), 10000);
      this.socket.emit("class:join", (reply) => {
        window.clearTimeout(timeout);
        if (reply?.ok) resolve(reply);
        else reject(new Error(reply?.error || "Could not join the live classroom."));
      });
    });
    this.participants = result.participants || [];
    this.demoParticipants = result.demoParticipants || [];
    this.recordingActive = result.recording === true;
  }

  render() {
    document.querySelector(".modal-backdrop")?.remove();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop live-backdrop";
    backdrop.innerHTML = `
      <section class="modal live-class-modal" role="dialog" aria-modal="true" aria-label="Live classroom">
        <div class="modal-top">
          <div><h2>${this.role === "faculty" ? "Live classroom" : "Data Structures & Algorithms"}</h2><p>Joined as ${escapeHtml(this.user.name)} - ${this.role === "faculty" ? "Faculty" : "Student"}</p></div>
          <button class="modal-close" data-live-action="leave" aria-label="Leave classroom">x</button>
        </div>
        <div class="live-video-grid" id="live-video-grid">
          <article class="live-video-tile local-video-tile">
            <video id="local-video" autoplay playsinline muted></video>
            <span class="live-video-name">${escapeHtml(this.user.name)} (You)</span>
          </article>
          <div id="live-remote-tiles"></div>
        </div>
        <p class="live-status" id="live-status" role="status" aria-live="polite"></p>
        <div class="live-controls">
          ${this.role === "faculty" ? '<button class="button live-control" data-live-action="record">Start recording</button>' : ""}
          <button class="button live-control" data-live-action="microphone">Mute microphone</button>
          <button class="button live-control" data-live-action="camera">Turn camera off</button>
          <button class="button live-control live-leave" data-live-action="${this.role === "faculty" ? "end" : "leave"}">${this.role === "faculty" ? "End live class" : "Leave class"}</button>
        </div>
      </section>`;
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) this.leave();
    });
    backdrop.addEventListener("click", (event) => {
      const button = event.target.closest("[data-live-action]");
      if (!button) return;
      if (button.dataset.liveAction === "microphone") this.toggleTrack("audio", button);
      if (button.dataset.liveAction === "camera") this.toggleTrack("video", button);
      if (button.dataset.liveAction === "record") this.toggleRecording(button);
      if (button.dataset.liveAction === "leave") this.leave();
      if (button.dataset.liveAction === "end") this.end();
    });
    document.body.appendChild(backdrop);
    const localVideo = backdrop.querySelector("#local-video");
    localVideo.srcObject = this.localStream;
    localVideo.play().catch(() => {});
    this.setStatus(this.role === "faculty"
      ? "Live class started. Waiting for students..."
      : this.recordingActive
        ? "This class is being recorded. You can leave the class at any time."
        : "You have joined the live class.");
  }

  setStatus(message) {
    const status = document.querySelector("#live-status");
    if (status) status.textContent = message;
  }

  addDemoAttendee(student) {
    const container = document.querySelector("#live-remote-tiles");
    if (!container) return;
    const tile = document.createElement("article");
    tile.className = "live-video-tile demo-attendee-tile";
    const initials = student.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
    const avatar = document.createElement("span");
    avatar.className = "demo-attendee-avatar";
    avatar.textContent = initials;
    const details = document.createElement("span");
    details.className = "demo-attendee-details";
    const name = document.createElement("strong");
    name.textContent = student.name;
    const status = document.createElement("span");
    status.textContent = "Demo student - attending (camera and mic off)";
    details.append(name, status);
    tile.append(avatar, details);
    container.append(tile);
  }

  toggleTrack(kind, button) {
    const track = this.localStream?.getTracks().find((item) => item.kind === kind);
    if (!track) return;
    track.enabled = !track.enabled;
    button.textContent = kind === "audio"
      ? track.enabled ? "Mute microphone" : "Unmute microphone"
      : track.enabled ? "Turn camera off" : "Turn camera on";
    button.setAttribute("aria-pressed", String(!track.enabled));
  }

  createTile(peer) {
    const container = document.querySelector("#live-remote-tiles");
    if (!container) return null;
    const tile = document.createElement("article");
    tile.className = "live-video-tile";
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.controls = true;
    const label = document.createElement("span");
    label.className = "live-video-name";
    label.textContent = `${peer.name} - ${peer.role}`;
    tile.append(video, label);
    container.append(tile);
    const record = { tile, video, peer, connection: null, candidates: [] };
    this.peers.set(peer.id, record);
    return record;
  }

  connectToPeer(peer, shouldOffer) {
    if (this.closed || this.peers.has(peer.id)) return;
    const record = this.createTile(peer);
    if (!record) return;
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    record.connection = connection;
    for (const track of this.localStream.getTracks()) connection.addTrack(track, this.localStream);
    connection.onicecandidate = ({ candidate }) => {
      if (candidate) this.socket.emit("class:signal", { to: peer.id, candidate });
    };
    connection.ontrack = ({ streams, track }) => {
      if (streams[0]) {
        record.video.srcObject = streams[0];
        this.addRecordingAudio(streams[0]);
      } else {
        const stream = record.video.srcObject || new MediaStream();
        if (!stream.getTracks().some((existing) => existing.id === track.id)) stream.addTrack(track);
        record.video.srcObject = stream;
        this.addRecordingAudio(stream);
      }
      record.video.play().catch(() => {
        this.setStatus("Your browser blocked playback. Press play on the participant video to hear and see them.");
      });
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "failed") {
        this.setStatus("A participant connection failed. Check your network and try rejoining.");
      }
    };
    if (shouldOffer) {
      connection.createOffer()
        .then((offer) => connection.setLocalDescription(offer))
        .then(() => this.socket.emit("class:signal", { to: peer.id, description: connection.localDescription }))
        .catch((error) => this.setStatus(`Could not connect to ${peer.name}: ${error.message}`));
    }
  }

  toggleRecording(button) {
    if (this.recorder?.state === "recording") {
      this.stopRecording();
      button.disabled = true;
      button.textContent = "Saving recording...";
      return;
    }
    this.startRecording(button);
  }

  startRecording(button) {
    if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
      this.setStatus("This browser cannot record the live class. Try a current version of Chrome, Edge or Firefox.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      this.recordingCanvas = canvas;
      const context = canvas.getContext("2d");
      const draw = () => {
        if (!context) return;
        context.fillStyle = "#101827";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const videos = [
          { video: document.querySelector("#local-video"), name: `${this.user.name} (Faculty)` },
          ...Array.from(this.peers.values(), ({ video, peer }) => ({ video, name: peer.name })),
        ];
        const columns = Math.min(3, Math.ceil(Math.sqrt(videos.length)));
        const rows = Math.ceil(videos.length / columns);
        const tileWidth = canvas.width / columns;
        const tileHeight = canvas.height / rows;
        videos.forEach(({ video, name }, index) => {
          const x = (index % columns) * tileWidth;
          const y = Math.floor(index / columns) * tileHeight;
          if (video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const ratio = Math.min(tileWidth / video.videoWidth, tileHeight / video.videoHeight);
            const width = video.videoWidth * ratio;
            const height = video.videoHeight * ratio;
            context.drawImage(video, x + (tileWidth - width) / 2, y + (tileHeight - height) / 2, width, height);
          }
          context.fillStyle = "rgba(0, 0, 0, 0.65)";
          context.fillRect(x, y + tileHeight - 38, tileWidth, 38);
          context.fillStyle = "#fff";
          context.font = "20px sans-serif";
          context.fillText(name.slice(0, 80), x + 12, y + tileHeight - 13, tileWidth - 24);
        });
        this.recordingFrame = requestAnimationFrame(draw);
      };
      draw();

      const playback = document.createElement("video");
      const mimeTypes = [
        'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
        'video/webm;codecs="vp8,opus"',
        'video/mp4;codecs="avc1.42E01E"',
        'video/webm;codecs="vp8"',
      ];
      const mimeType = mimeTypes.find((candidate) =>
        MediaRecorder.isTypeSupported(candidate) && playback.canPlayType(candidate) !== "");
      if (!mimeType) throw new Error("This browser cannot record a video format it can play.");
      const recordsAudio = mimeType.includes("mp4a.40.2") || mimeType.includes("opus");

      const stream = canvas.captureStream(24);
      if (recordsAudio) {
        this.recordingAudioContext = new AudioContext();
        this.recordingAudioDestination = this.recordingAudioContext.createMediaStreamDestination();
        this.addRecordingAudio(this.localStream);
        for (const record of this.peers.values()) {
          if (record.video.srcObject) this.addRecordingAudio(record.video.srcObject);
        }
        for (const track of this.recordingAudioDestination.stream.getAudioTracks()) stream.addTrack(track);
      }
      this.recordingStream = stream;
      this.recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      this.recordingStartedAt = Date.now();
      this.recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) chunks.push(event.data);
      });
      this.recorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, { type: mimeType });
        this.cleanupRecording();
        void this.saveRecording(blob);
      }, { once: true });
      this.recorder.start();
      this.recordingActive = true;
      this.socket.emit("class:recording", true);
      button.textContent = "Stop recording";
      this.setStatus(recordsAudio
        ? "Recording started. Everyone in the class has been notified."
        : "Recording started without audio because this browser has no supported audio codec for its recording format. Everyone in the class has been notified.");
    } catch (error) {
      this.cleanupRecording();
      this.setStatus(`Could not start recording: ${error.message}`);
    }
  }

  addRecordingAudio(stream) {
    if (!this.recordingAudioContext || !this.recordingAudioDestination || !stream) return;
    if (this.recordingAudioSources.has(stream.id)) return;
    const audioTracks = stream.getAudioTracks().filter((track) => track.readyState === "live");
    if (audioTracks.length === 0) return;
    const audioStream = new MediaStream(audioTracks);
    const source = this.recordingAudioContext.createMediaStreamSource(audioStream);
    source.connect(this.recordingAudioDestination);
    this.recordingAudioSources.set(stream.id, source);
  }

  stopRecording() {
    if (!this.recorder || this.recorder.state !== "recording") return;
    this.recorder.stop();
    this.recordingActive = false;
    this.socket?.emit("class:recording", false);
  }

  cleanupRecording() {
    if (this.recordingFrame !== null) cancelAnimationFrame(this.recordingFrame);
    this.recordingFrame = null;
    this.recordingCanvas = null;
    this.recordingStream?.getTracks().forEach((track) => track.stop());
    this.recordingStream = null;
    for (const source of this.recordingAudioSources.values()) source.disconnect();
    this.recordingAudioSources.clear();
    this.recordingAudioContext?.close().catch((error) => this.setStatus(`Could not close the recording audio stream: ${error.message}`));
    this.recordingAudioContext = null;
    this.recordingAudioDestination = null;
  }

  async saveRecording(blob) {
    const button = document.querySelector("[data-live-action='record']");
    if (!blob.size) {
      this.cleanupRecording();
      if (button) {
        button.disabled = false;
        button.textContent = "Start recording";
      }
      this.setStatus("No recording data was produced.");
      return;
    }
    const title = `${this.user.name} - ${new Date().toLocaleString()}`;
    const duration = Math.max(1, Math.round((Date.now() - this.recordingStartedAt) / 1000));
    try {
      const query = new URLSearchParams({ title, duration });
      const response = await fetch(`/api/recordings?${query}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The recording could not be saved.");
      window.dispatchEvent(new CustomEvent("class-recording-saved", { detail: result.recording }));
      if (document.querySelector(".live-backdrop")) this.setStatus("Recording saved. Find it in Recordings and download it for offline viewing.");
    } catch (error) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `class-recording.${blob.type.startsWith("video/mp4") ? "mp4" : "webm"}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      window.dispatchEvent(new CustomEvent("class-recording-error", { detail: error.message }));
      if (document.querySelector(".live-backdrop")) this.setStatus(`Could not save the recording online. A local copy was downloaded: ${error.message}`);
    } finally {
      this.cleanupRecording();
      if (button) {
        button.disabled = false;
        button.textContent = "Start recording";
      }
    }
  }

  async receiveSignal({ from, description, candidate } = {}) {
    let record = this.peers.get(from);
    if (!record) {
      this.connectToPeer({ id: from, name: "Class participant", role: "participant" }, false);
      record = this.peers.get(from);
    }
    if (!record) return;
    try {
      if (description) {
        await record.connection.setRemoteDescription(description);
        for (const queuedCandidate of record.candidates.splice(0)) {
          await record.connection.addIceCandidate(queuedCandidate);
        }
        if (description.type === "offer") {
          await record.connection.setLocalDescription(await record.connection.createAnswer());
          this.socket.emit("class:signal", { to: from, description: record.connection.localDescription });
        }
      } else if (candidate) {
        if (record.connection.remoteDescription) await record.connection.addIceCandidate(candidate);
        else record.candidates.push(candidate);
      }
    } catch (error) {
      this.setStatus(`Could not establish a video connection: ${error.message}`);
    }
  }

  removePeer(id) {
    const record = this.peers.get(id);
    if (!record) return;
    record.connection.close();
    if (record.video.srcObject) this.recordingAudioSources.get(record.video.srcObject.id)?.disconnect();
    if (record.video.srcObject) this.recordingAudioSources.delete(record.video.srcObject.id);
    record.tile.remove();
    this.peers.delete(id);
  }

  stopMedia() {
    if (this.recorder?.state === "recording") this.stopRecording();
    for (const record of this.peers.values()) record.connection.close();
    this.peers.clear();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.socket?.disconnect();
    this.socket = null;
  }

  stop({ announce = true } = {}) {
    if (this.closed) return;
    this.closed = true;
    if (announce && this.role === "faculty" && this.socket?.connected) this.socket.emit("class:end");
    if (this.role === "faculty" && this.socket?.connected && this.recordingActive) {
      this.socket.emit("class:recording", false);
    }
    this.stopMedia();
    document.querySelector(".live-backdrop")?.remove();
    if (activeClass === this) activeClass = null;
  }

  leave() {
    this.stop();
    this.onClose("You left the live classroom.");
  }

  end() {
    this.stop();
    this.onClose("You ended the live classroom.");
  }
}

let activeClass = null;

export async function joinLiveClass(role, user, onClose) {
  if (activeClass) throw new Error("You are already in a live classroom.");
  const liveClass = new LiveClass(role, user, onClose);
  activeClass = liveClass;
  try {
    await liveClass.start();
  } catch (error) {
    liveClass.stop();
    activeClass = null;
    throw error;
  }
}

export function leaveLiveClass() {
  if (!activeClass) return;
  activeClass.stop();
  activeClass = null;
}
