let video;
let facemesh;
let handpose;
let predictions = [];
let handPredictions = [];
let circleIndex = 94;
let faceOverlayImage; // 用來存放圖片的變數

// preload 函數，用來載入圖片
function preload() {
  // 將檔名更新為 'catye.jpg'
  faceOverlayImage = loadImage('catye.jpg');
}

function setup() {
  createCanvas(640, 480).position(
    (windowWidth - 640) / 2,
    (windowHeight - 480) / 2
  );
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  facemesh = ml5.facemesh(video, modelReady);
  facemesh.on('predict', results => {
    predictions = results;
  });

  handpose = ml5.handpose(video, handModelReady);
  handpose.on('predict', results => {
    handPredictions = results;
  });

  imageMode(CENTER); // 讓 image() 函數以中心點定位圖片
}

function modelReady() {
  // 臉部模型載入完成
  console.log("Facemesh model ready!");
}

function handModelReady() {
  // 手部模型載入完成
  console.log("Handpose model ready!");
}

// 根據手部特徵判斷剪刀石頭布
function detectHandGesture(hand) {
  if (!hand || !hand.landmarks) return 'paper'; // 預設為布

  const tips = [8, 12, 16, 20]; // 食指、中指、無名指、小指的指尖索引
  let extended = 0;
  for (let i = 0; i < tips.length; i++) {
    // 檢查指尖的 y 座標是否比指關節的 y 座標更小 (螢幕座標系中，y 值越小越靠上)
    // [tips[i]] 是指尖, [tips[i] - 2] 是靠近手掌的指關節
    if (hand.landmarks[tips[i]][1] < hand.landmarks[tips[i] - 2][1]) {
      extended++;
    }
  }

  // 大拇指判斷 (4號點的 x 座標與 2號點的 x 座標比較)
  // 這裡假設手掌垂直，大拇指張開時 x 座標會比 2 號點更靠外 (取決於手是左手還是右手以及鏡像)
  // 為了簡化，我們假設手是鏡像的，所以 thumbExtended 為 true 表示大拇指伸出
  let thumbExtended = hand.landmarks[4][0] < hand.landmarks[3][0]; // 如果是鏡像，大拇指伸出時 x 座標會更小
  if (video.elt.style.transform === 'scaleX(-1)') { // 檢查是否有水平翻轉
      thumbExtended = hand.landmarks[4][0] > hand.landmarks[3][0];
  }


  // 剪刀: 食指和中指伸直 (extended == 2)，其他手指彎曲
  if (extended === 2 &&
      hand.landmarks[tips[0]][1] < hand.landmarks[tips[0] - 2][1] && // 食指伸直
      hand.landmarks[tips[1]][1] < hand.landmarks[tips[1] - 2][1] && // 中指伸直
      !(hand.landmarks[tips[2]][1] < hand.landmarks[tips[2] - 2][1]) && // 無名指彎曲
      !(hand.landmarks[tips[3]][1] < hand.landmarks[tips[3] - 2][1]) && // 小指彎曲
      !thumbExtended) { // 大拇指彎曲或收攏
    return 'scissors';
  }

  // 石頭: 所有手指彎曲 (extended == 0)
  if (extended === 0 && !thumbExtended) {
    return 'rock';
  }

  // 布: 所有手指伸直 (extended == 4)
  if (extended >= 3 && thumbExtended) { // 允許3-4指伸直，大拇指也伸直
    return 'paper';
  }

  return 'paper'; // 預設或無法判斷時為布
}

function draw() {
  // 鏡像翻轉影像，這樣攝影機畫面和你的動作是左右對應的
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();


  let gesture = 'paper'; // 預設手勢

  if (handPredictions.length > 0) {
    const hand = handPredictions[0]; // 通常只處理偵測到的第一隻手
    gesture = detectHandGesture(hand);

    // 可選：繪製手部關鍵點以供調試
    // drawHandKeypoints(hand);
  }

  if (predictions.length > 0) {
    const keypoints = predictions[0].scaledMesh;

    // 根據手勢決定圖片要附加到的臉部特徵點索引
    if (gesture === 'scissors') {
      circleIndex = 10;  // 通常是額頭中間靠上一點
    } else if (gesture === 'rock') {
      circleIndex = 152; // 通常是下巴尖端
    } else if (gesture === 'paper') {
      circleIndex = 1;   // 通常是鼻子尖端
    }

    // Facemesh 的座標是基於原始影像的，由於我們鏡像了 video，
    // 我們需要對 keypoints 的 x 座標進行轉換
    let x = width - keypoints[circleIndex][0];
    let y = keypoints[circleIndex][1];


    // 檢查圖片是否已成功載入
    if (faceOverlayImage) {
      // 設定圖片大小，例如 50x50 像素，您可以根據需要調整
      let imgWidth = 80;  // 稍微放大圖片試試
      let imgHeight = 80; // 稍微放大圖片試試

      image(faceOverlayImage, x, y, imgWidth, imgHeight);
    } else {
      // 如果圖片還沒載入完成或載入失敗
      console.log("Image 'catye.jpg' not loaded yet or failed to load.");
      fill(255, 0, 0, 150); // 用半透明紅色圓圈作提示
      noStroke();
      ellipse(x, y, 50, 50);
    }
  }

  // 顯示當前偵測到的手勢（可選，用於調試）
  fill(255);
  stroke(0);
  textSize(32);
  text(gesture, 10, 40);
}

// 可選的輔助函數：繪製手部關鍵點，方便調試手勢辨識
/*
function drawHandKeypoints(hand) {
  stroke(0, 255, 0);
  strokeWeight(2);
  for (let i = 0; i < hand.landmarks.length; i++) {
    const [x, y] = hand.landmarks[i];
    // 由於影像鏡像，手部關鍵點的 x 座標也需要轉換
    point(width - x, y);
  }
}
*/