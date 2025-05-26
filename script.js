const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

// Set up MediaPipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
faceMesh.onResults(onResults);

// 🔓 Request camera access and bind it to the <video> tag
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    videoElement.play();
  } catch (err) {
    alert("📷 Could not access the webcam.");
    console.error(err);
  }
}

initCamera();

document.getElementById('capture').addEventListener('click', async () => {
  await faceMesh.send({ image: videoElement });
});

document.getElementById('download').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'editorial_collage.png';
  link.href = canvasElement.toDataURL('image/png');
  link.click();
});

function onResults(results) {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    alert("😢 No face detected.");
    return;
  }

  const landmarks = results.multiFaceLandmarks[0];
  const w = videoElement.videoWidth;
  const h = videoElement.videoHeight;

  canvasElement.width = w;
  canvasElement.height = h;
  canvasCtx.clearRect(0, 0, w, h);
  canvasCtx.drawImage(videoElement, 0, 0, w, h);

  const regions = {
    left_eye: [33, 133, 160, 159, 158, 157, 173],
    right_eye: [362, 263, 387, 386, 385, 384, 398],
    nose: [2, 98, 327, 195, 5, 4, 1],
    mouth: [13, 14, 87, 178, 317, 402, 318],
    forehead: [10, 338, 297, 68, 104],
    chin: [152, 200, 427, 425, 199, 400, 379],
    left_cheek: [50, 101, 234, 93, 205, 117],
    right_cheek: [280, 347, 454, 330, 425, 356],
    jawline_left: [234, 127, 93, 132],
    jawline_right: [454, 356, 330, 323],
    temples: [67, 69, 109, 108, 151, 45, 276, 283, 282, 423],
  };

  const tiles = [];

  for (const [region, indices] of Object.entries(regions)) {
    const { x1, y1, x2, y2 } = getRegionBounds(landmarks, indices, w, h);
    const width = x2 - x1;
    const height = y2 - y1;

    const numTiles = ['forehead', 'chin', 'jawline_left', 'jawline_right', 'temples'].includes(region) ? 5 : 3;

    for (let i = 0; i < numTiles; i++) {
      const scale = 0.6 + Math.random() * 0.5;
      const tW = Math.floor(width * scale);
      const tH = Math.floor(height * scale);

      const dx = Math.floor((Math.random() - 0.5) * 40);
      const dy = Math.floor((Math.random() - 0.5) * 40);

      const srcX = clamp(x1, 0, w - tW);
      const srcY = clamp(y1, 0, h - tH);
      const dstX = clamp(x1 + dx, 0, w - tW);
      const dstY = clamp(y1 + dy, 0, h - tH);

      const imageData = canvasCtx.getImageData(srcX, srcY, tW, tH);
      tiles.push({ area: tW * tH, x: dstX, y: dstY, w: tW, h: tH, imageData });
    }
  }

  tiles.sort((a, b) => b.area - a.area);
  for (const tile of tiles) {
    canvasCtx.putImageData(tile.imageData, tile.x, tile.y);
  }
}

function getRegionBounds(landmarks, indices, w, h) {
  const xs = indices.map(i => Math.floor(landmarks[i].x * w));
  const ys = indices.map(i => Math.floor(landmarks[i].y * h));
  const x1 = clamp(Math.min(...xs), 0, w);
  const y1 = clamp(Math.min(...ys), 0, h);
  const x2 = clamp(Math.max(...xs), 0, w);
  const y2 = clamp(Math.max(...ys), 0, h);
  return { x1, y1, x2, y2 };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(val, max));
}
