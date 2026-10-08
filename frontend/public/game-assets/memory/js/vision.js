/**
 * Vision & Hand Gesture Recognition Module
 * Uses MediaPipe Hands + Canvas for high-FPS, zero-lag in-browser OpenCV HUD
 * Recognizes digits 0 <= X <= 9:
 *   - 0: Fist (0 extended fingers)
 *   - 1 - 5: 1 to 5 extended fingers on primary hand
 *   - 6 - 9: Open hand (5) + 1-4 fingers on second hand (or sum across both hands = 6..9)
 */

class VisionEngine {
  constructor() {
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.camera = null;
    this.hands = null;
    this.isRunning = false;
    this.generation = 0;

    // Gesture state
    this.currentDigit = null;
    this.lastDetectedDigit = null;
    this.stableStartTime = null;
    this.holdThreshold = 1000; // 1.0s hold to confirm
    this.holdProgress = 0.0;

    // Callback when gesture is locked
    this.onDigitLocked = null;
    this.onFrameUpdate = null;

    // Landmark indices
    this.TIP_IDS = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
    this.PIP_IDS = [2, 6, 10, 14, 18];
    this.recentDetections = [];
  }

  async init(videoEl, canvasEl) {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.canvasCtx = canvasEl.getContext("2d");
    if (this.hands) return true;

    if (!this.handsReady)
      this.handsReady = (async () => {
        if (!window.Hands)
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            const timer = setTimeout(() => {
              script.remove();
              reject(
                new Error("Hand tracker download timed out. Please retry."),
              );
            }, 15000);
            script.src =
              "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
            script.crossOrigin = "anonymous";
            script.onload = () => {
              clearTimeout(timer);
              resolve();
            };
            script.onerror = () => {
              clearTimeout(timer);
              script.remove();
              reject(
                new Error(
                  "Hand tracker could not load. Check your connection and retry.",
                ),
              );
            };
            document.head.appendChild(script);
          });
        this.hands = new window.Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.6,
        });

        this.hands.onResults((results) => this.processResults(results));
      })().catch((error) => {
        this.handsReady = null;
        throw error;
      });
    // Camera permission may take longer than the parallel library request.
    this.handsReady.catch(() => {});
    return true;
  }

  async startCamera() {
    if (this.isRunning) return true;
    const generation = ++this.generation;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      if (generation !== this.generation) return false;

      this.canvasElement.width = this.videoElement.videoWidth || 640;
      this.canvasElement.height = this.videoElement.videoHeight || 480;

      await this.handsReady;
      if (generation !== this.generation) return false;
      this.isRunning = true;
      await this.hands.send({ image: this.videoElement });
      if (generation !== this.generation) return false;

      // Processing loop via requestAnimationFrame
      const loop = async () => {
        if (!this.isRunning || generation !== this.generation) return;
        if (this.videoElement.readyState >= 2) {
          try {
            await this.hands.send({ image: this.videoElement });
          } catch (err) {
            if (generation !== this.generation) return;
            this.stopCamera();
            window.app.showToast(
              "Hand tracking stopped. Check your camera and reload the arena. Hand gestures are required.",
              "error",
            );
            return;
          }
        }
        if (this.isRunning && generation === this.generation)
          requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      return true;
    } catch (err) {
      if (generation !== this.generation) return false;
      console.error("Camera access error:", err);
      this.stopCamera();
      window.app.showToast(
        "Camera unavailable. Allow camera access in browser settings. Only hand gestures are accepted.",
        "error",
      );
      return false;
    }
  }

  stopCamera() {
    this.generation++;
    this.isRunning = false;
    this.currentDigit = null;
    this.lastDetectedDigit = null;
    this.stableStartTime = null;
    this.holdProgress = 0;
    this.recentDetections = [];
    if (this.videoElement && this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach((track) => track.stop());
      this.videoElement.srcObject = null;
    }
    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height,
      );
    }
  }

  smoothDetection(digit) {
    if (digit === null) {
      this.recentDetections = [];
      return null;
    }
    this.recentDetections.push(digit);
    if (this.recentDetections.length > 3) {
      this.recentDetections.shift();
    }
    const counts = {};
    for (const d of this.recentDetections) {
      counts[d] = (counts[d] || 0) + 1;
    }
    let best = digit;
    let maxCount = 0;
    for (const [d, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        best = Number(d);
      }
    }
    return best;
  }

  countFingers(landmarks, handedness) {
    const fingers = [];
    const isRightHand = handedness === "Right";

    // 1. Thumb: Multi-factor robust detection
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    const indexMcp = landmarks[5];
    const wrist = landmarks[0];

    const distTipToWrist = Math.hypot(
      thumbTip.x - wrist.x,
      thumbTip.y - wrist.y,
    );
    const distMcpToWrist = Math.hypot(
      thumbMcp.x - wrist.x,
      thumbMcp.y - wrist.y,
    );
    const distTipToIndexMcp = Math.hypot(
      thumbTip.x - indexMcp.x,
      thumbTip.y - indexMcp.y,
    );
    const distIpToIndexMcp = Math.hypot(
      thumbIp.x - indexMcp.x,
      thumbIp.y - indexMcp.y,
    );

    const isExtendedFromPalm = distTipToWrist > distMcpToWrist * 1.15;
    const isSeparatedFromHand = distTipToIndexMcp > distIpToIndexMcp * 1.08;
    const dirCheck = isRightHand
      ? thumbTip.x < thumbIp.x
      : thumbTip.x > thumbIp.x;

    if (dirCheck && (isExtendedFromPalm || isSeparatedFromHand)) {
      fingers.push(1);
    } else {
      fingers.push(0);
    }

    // 2. Index, Middle, Ring, Pinky
    // Tip must be above PIP joint and MCP joint
    for (let i = 1; i < 5; i++) {
      const tip = landmarks[this.TIP_IDS[i]];
      const pip = landmarks[this.PIP_IDS[i]];
      const mcp = landmarks[this.PIP_IDS[i] - 1];
      if (tip.y < pip.y && tip.y < mcp.y) {
        fingers.push(1);
      } else {
        fingers.push(0);
      }
    }

    const count = fingers.reduce((a, b) => a + b, 0);
    return { count, fingers };
  }

  processResults(results) {
    if (!this.isRunning) return;

    const ctx = this.canvasCtx;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    // Draw video frame to canvas
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(results.image, 0, 0, w, h);

    let rawDigit = null;
    let handDetails = [];
    let totalExtended = 0;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      results.multiHandLandmarks.forEach((landmarks, idx) => {
        const handLabel = results.multiHandedness[idx]?.label || "Hand";
        const { count, fingers } = this.countFingers(landmarks, handLabel);
        totalExtended += count;
        handDetails.push({ label: handLabel, count });

        // Draw OpenCV cybernetic landmarks & connections
        this.drawHandMesh(ctx, landmarks, w, h);
      });

      // Bound digit between 0 and 9
      // Ten fingers are not the digit nine.
      rawDigit = totalExtended <= 9 ? totalExtended : null;
    }

    ctx.restore();

    const detectedDigit = this.smoothDetection(rawDigit);
    this.currentDigit = detectedDigit;

    // Stability / Hold Detection
    const now = Date.now();
    if (detectedDigit !== null) {
      if (detectedDigit === this.lastDetectedDigit) {
        if (!this.stableStartTime) {
          this.stableStartTime = now;
        }
        const elapsed = now - this.stableStartTime;
        this.holdProgress = Math.min(elapsed / this.holdThreshold, 1.0);

        if (elapsed >= this.holdThreshold) {
          // Trigger lock-in!
          if (this.onDigitLocked) {
            const locked = detectedDigit;
            this.stableStartTime = null;
            this.lastDetectedDigit = null;
            this.holdProgress = 0.0;
            this.onDigitLocked(locked);
          }
        }
      } else {
        this.lastDetectedDigit = detectedDigit;
        this.stableStartTime = now;
        this.holdProgress = 0.0;
      }
    } else {
      this.lastDetectedDigit = null;
      this.stableStartTime = null;
      this.holdProgress = 0.0;
    }

    // Frame update callback for UI HUD
    if (this.onFrameUpdate) {
      this.onFrameUpdate({
        detectedDigit,
        handDetails,
        totalExtended,
        holdProgress: this.holdProgress,
      });
    }
  }

  drawHandMesh(ctx, landmarks, w, h) {
    // MediaPipe Hand connection lines
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // Thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // Index
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12], // Middle
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16], // Ring
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // Pinky
      [5, 9],
      [9, 13],
      [13, 17],
      [0, 17], // Palm
    ];

    // Draw skeletal connections
    ctx.strokeStyle = "#00f5d4";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#00f5d4";
    ctx.shadowBlur = 8;

    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    });

    // Draw landmark joints
    landmarks.forEach((p, index) => {
      ctx.beginPath();
      ctx.arc(
        p.x * w,
        p.y * h,
        this.TIP_IDS.includes(index) ? 6 : 4,
        0,
        2 * Math.PI,
      );
      ctx.fillStyle = this.TIP_IDS.includes(index) ? "#ff007f" : "#7928ca";
      ctx.shadowColor = "#ff007f";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    });

    ctx.shadowBlur = 0; // Reset
  }
}

window.visionEngine = new VisionEngine();
