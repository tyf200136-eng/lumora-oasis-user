/* ============================================================
   عارض الجزيرة 3D - واحة لومورا (نسخة المستخدم)
   شبكة وحدات 1024 مربع: المباني (بصور المستخدم المتنوعة) تتجمّع
   بمنتصف الجزيرة على بلوكات 3×3، مع 4 أبراج معلم أطول بالنص
   بالضبط، والدبابيس (بصور اللوحات المتنوعة) تعبّي كل مربع فاضي
   يُستدعى بـ initIslandViewer('containerId', { small: true/false })
   ============================================================ */

function buildPlaceholderIsland(THREE) {
  const group = new THREE.Group();
  const textureLoader = new THREE.TextureLoader();

  const BUILDING_IMAGE_ASPECT = 1080 / 1920;
  const BILLBOARD_IMAGE_ASPECT = 1080 / 1080;
  const SCREEN_MARGIN_RATIO = 0.92;
  const SCREEN_THICKNESS = 0.05;
  const SCREEN_GAP = 0.015;

  // ---- إعدادات العدد ----
  const BUILDING_COUNT = 30;
  const PIN_COUNT = 400; // بدل ما تعبّي كل مربع فاضي، ناخذ عيّنة عشوائية موزّعة منها

  // ---- ارتفاع المباني: رُفعت عشان تبين كأبراج واضحة وسط الدبابيس
  // القصيرة (نسبة طول:عرض أوضح، مو شكل مكعّب) ----
  // ارتفاع اسمي بس لحساب نسبة القصّ الأولي لصور الشاشات (الارتفاع
  // الفعلي لكل مبنى يُحسب لاحقًا هرميًا حسب قربه من المركز)
  const BUILDING_MAX_HEIGHT = 5.5;
  const BUILDING_SCREEN_LIFT = 0.7;

  // ---- شبكة الوحدات (البيع/الاستثمار): نفس شبكة الـ 1024 مربع المرئية
  // بالضبط (19.6 × 19.6 مقسّمة 32×32) — كل مربع هنا يطابق حرفيًا مربع
  // الخطوط اللي تظهر فوق الأرضية. كل مبنى ياخذ بلوك 3×3 = 9 مربعات
  // متجاورة (أقرب بلوك فاضي لمركز الجزيرة يُستخدم أول، فتطلع المباني
  // ملتصقة قريبة من بعض بالنص تلقائيًا)، وكل دبوس ياخذ مربع واحد،
  // ويتوزّعون على كل مربع فاضي متبقي بعد ما تاخذ المباني بلوكاتها ----
  const PLACEMENT_ISLAND_SIZE = 19.6; // نفس حجم الشبكة المرئية بالضبط
  const PLACEMENT_DIVISIONS = 32;     // 32×32 = 1024 مربع (نفس الشبكة المرئية)
  const BUILDING_BLOCK_SIZE = 3;      // كل مبنى = بلوك 3×3 = 9 مربعات
  const PLACEMENT_CELL_SIZE = PLACEMENT_ISLAND_SIZE / PLACEMENT_DIVISIONS;

  // حجم جسم المبنى نفسه: نخليه يملأ تقريبًا مساحة الـ3×3 مربعات اللي
  // حاجزها (بدل ما يكون صغير ويسيب فراغ فاضي حواليه). هامش 0.85 يخلّي
  // فرجة بسيطة بين مبنى وجاره، مو يلزقون ببعض 100%
  const BUILDING_FOOTPRINT_MARGIN = 0.85;
  const BUILDING_FOOTPRINT = BUILDING_BLOCK_SIZE * PLACEMENT_CELL_SIZE * BUILDING_FOOTPRINT_MARGIN;
  const BUILDING_WIDTH = BUILDING_FOOTPRINT;
  const BUILDING_DEPTH = BUILDING_FOOTPRINT * (0.4 / 0.6); // نفس نسبة العرض:العمق الأصلية

  // ---- شكل الدبوس (بطاقة + ذيل مثلث، بصورة واحدة ثابتة) ----
  const PIN_DIAMETER = 0.55;
  const PIN_THICKNESS = 0.08;
  const PIN_TAIL_HEIGHT = 0.16;
  const PIN_TAIL_WIDTH_RATIO = 0.26;
  const GROUND_Y = 0.2;

  const baseGeo = new THREE.BoxGeometry(20, 0.4, 20);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a6e, emissive: 0x150a3d, roughness: 0.4, metalness: 0.3
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.y = Math.PI / 4;
  group.add(base);

  // 32×32 = 1024 مربع (فوق الألف)
  const gridHelper = new THREE.GridHelper(19.6, 32, 0x8888ff, 0x4444aa);
  gridHelper.position.y = 0.21;
  gridHelper.rotation.y = Math.PI / 4;
  group.add(gridHelper);

  const edgeGeo = new THREE.BoxGeometry(20.3, 0.08, 20.3);
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xff3fa4, emissive: 0xff3fa4, emissiveIntensity: 1.5
  });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.y = -0.15;
  edge.rotation.y = Math.PI / 4;
  group.add(edge);

  function bodyMat() {
    return new THREE.MeshStandardMaterial({
      color: 0x0a0818, emissive: 0x0f2540, emissiveIntensity: 0.4
    });
  }

  function adFaceMat(imageUrl, faceWidth, faceHeight, imageAspect) {
    const texture = textureLoader.load(imageUrl);
    texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const faceAspect = faceWidth / faceHeight;
    if (imageAspect > faceAspect) {
      const repeatX = faceAspect / imageAspect;
      texture.repeat.set(repeatX, 1);
      texture.offset.set((1 - repeatX) / 2, 0);
    } else {
      const repeatY = imageAspect / faceAspect;
      texture.repeat.set(1, repeatY);
      texture.offset.set(0, (1 - repeatY) / 2);
    }

    return new THREE.MeshStandardMaterial({
      map: texture, emissive: 0x111111, emissiveIntensity: 0.15, roughness: 0.55
    });
  }

  function createPlainBox(width, height, depth) {
    return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMat());
  }

  function createScreenBox(width, height, depth, photoMat) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const side = bodyMat();
    const materials = [side, side, side, side, photoMat, photoMat];
    return new THREE.Mesh(geo, materials);
  }

  function fitScreenSize(maxWidth, maxHeight, imageAspect) {
    const availW = maxWidth * SCREEN_MARGIN_RATIO;
    const availH = maxHeight * SCREEN_MARGIN_RATIO;
    let w = availW;
    let h = w / imageAspect;
    if (h > availH) {
      h = availH;
      w = h * imageAspect;
    }
    return { width: w, height: h };
  }

  function attachEmbeddedScreens(parentMesh, parentWidth, parentHeight, parentDepth, photoMat, imageAspect, clickableList, boardType, adIndex, liftFraction) {
    liftFraction = liftFraction || 0;
    const size = fitScreenSize(parentWidth, parentHeight, imageAspect);
    const freeSpace = (parentHeight - size.height) / 2;
    const verticalOffset = freeSpace * liftFraction;

    const frontScreen = createScreenBox(size.width, size.height, SCREEN_THICKNESS, photoMat);
    frontScreen.position.set(0, verticalOffset, parentDepth / 2 + SCREEN_THICKNESS / 2 + SCREEN_GAP);
    frontScreen.userData.boardType = boardType;
    frontScreen.userData.adIndex = adIndex;
    parentMesh.add(frontScreen);
    clickableList.push(frontScreen);

    const backScreen = createScreenBox(size.width, size.height, SCREEN_THICKNESS, photoMat);
    backScreen.position.set(0, verticalOffset, -(parentDepth / 2 + SCREEN_THICKNESS / 2 + SCREEN_GAP));
    backScreen.rotation.y = Math.PI;
    backScreen.userData.boardType = boardType;
    backScreen.userData.adIndex = adIndex;
    parentMesh.add(backScreen);
    clickableList.push(backScreen);
  }

  // يبني شبكة الوحدات كاملة (32×32)، كل خانة فيها موقعها العالمي بعد
  // تدويرها بنفس زاوية دوران الأرضية (45°) عشان تنحاذي صح على شكل
  // الماسة الفعلي، ومسافتها عن مركز الجزيرة (لترتيب الأقرب أول)
  function buildPlacementGrid(islandSize, divisions, rotationAngle) {
    const cellSize = islandSize / divisions;
    const half = islandSize / 2;
    const cosA = Math.cos(rotationAngle);
    const sinA = Math.sin(rotationAngle);
    const cells = [];
    for (let i = 0; i < divisions; i++) {
      const row = [];
      for (let j = 0; j < divisions; j++) {
        const localX = -half + cellSize * (i + 0.5);
        const localZ = -half + cellSize * (j + 0.5);
        const dist = Math.sqrt(localX * localX + localZ * localZ);
        const worldX = localX * cosA - localZ * sinA;
        const worldZ = localX * sinA + localZ * cosA;
        row.push({ x: worldX, z: worldZ, dist, occupied: false });
      }
      cells.push(row);
    }
    return cells;
  }

  // يجمع كل خانات "الزاوية العلوية" الممكنة لبلوك مبانٍ بحجم blockSize×blockSize
  // ويرتبها من الأقرب للمركز للأبعد، عشان أول مبنى ياخذ أقرب بلوك فاضي
  function collectBuildingAnchors(cells, divisions, blockSize) {
    const anchors = [];
    const half = Math.floor(blockSize / 2);
    for (let i = 0; i <= divisions - blockSize; i++) {
      for (let j = 0; j <= divisions - blockSize; j++) {
        anchors.push({ i, j, dist: cells[i + half][j + half].dist });
      }
    }
    anchors.sort((a, b) => a.dist - b.dist);
    return anchors;
  }

  // يتأكد إن كل خانات البلوك فاضية، ولو فاضية يشغلها ويرجّع موقع مركز
  // البلوك؛ لو أي خانة مشغولة يرجّع null (يعني هالبلوك مو متاح)
  function tryPlaceBlock(cells, anchor, blockSize) {
    for (let di = 0; di < blockSize; di++) {
      for (let dj = 0; dj < blockSize; dj++) {
        if (cells[anchor.i + di][anchor.j + dj].occupied) return null;
      }
    }
    for (let di = 0; di < blockSize; di++) {
      for (let dj = 0; dj < blockSize; dj++) {
        cells[anchor.i + di][anchor.j + dj].occupied = true;
      }
    }
    const half = Math.floor(blockSize / 2);
    const centerCell = cells[anchor.i + half][anchor.j + half];
    return { x: centerCell.x, z: centerCell.z };
  }

  // ---- ذيل الدبوس (نفس تصميم نسخة المعلن الأصلية) ----
  function createTailGeometry(width, height) {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -width / 2, height, 0,
       width / 2, height, 0,
       0, 0, 0
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }

  // ---- صور المستخدم المتنوعة (خمس صور للمباني، ست صور للدبابيس) ----
  const buildingAdImages = [
    'assets/PHOTO-2026-08-10-16-57-14.jpg',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1080&h=1920&fit=crop&q=70',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&h=1920&fit=crop&q=70',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=1080&h=1920&fit=crop&q=70',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&h=1920&fit=crop&q=70'
  ];

  const billboardAdImages = [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1080&h=1080&fit=crop&q=70',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1080&h=1080&fit=crop&q=70',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&h=1080&fit=crop&q=70',
    'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=1080&h=1080&fit=crop&q=70',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1080&h=1080&fit=crop&q=70',
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1080&h=1080&fit=crop&q=70'
  ];

  window.LUMORA_BUILDING_IMAGES = buildingAdImages;
  window.LUMORA_BILLBOARD_IMAGES = billboardAdImages;

  // كل صورة تتحمّل مرّة وحدة بس وتتشارك بين كل النسخ (بدل ما تنحمّل
  // من جديد لكل مبنى/دبوس على حدة — مهم جدًا هنا لأن الدبابيس ممكن
  // توصل لعدد كبير، فلازم نتفادى مئات طلبات الصورة المكررة)
  const buildingMats = buildingAdImages.map(url =>
    adFaceMat(url, BUILDING_WIDTH, BUILDING_MAX_HEIGHT, BUILDING_IMAGE_ASPECT)
  );
  const pinMats = billboardAdImages.map(url =>
    adFaceMat(url, PIN_DIAMETER, PIN_DIAMETER, BILLBOARD_IMAGE_ASPECT)
  );

  const sharedBodyMat = new THREE.MeshStandardMaterial({
    color: 0xf2f3fb, emissive: 0x24244a, emissiveIntensity: 0.3, roughness: 0.35, metalness: 0.1
  });
  const sharedTailGeo = createTailGeometry(PIN_DIAMETER * PIN_TAIL_WIDTH_RATIO, PIN_TAIL_HEIGHT);
  const discCenterY = PIN_TAIL_HEIGHT + PIN_DIAMETER / 2;

  function createPin(clickableList, photoMat, adIndex) {
    const pinGroup = new THREE.Group();

    const cardGeo = new THREE.BoxGeometry(PIN_DIAMETER, PIN_DIAMETER, PIN_THICKNESS);
    const card = new THREE.Mesh(cardGeo, [
      sharedBodyMat, sharedBodyMat, sharedBodyMat, sharedBodyMat, photoMat, photoMat
    ]);
    card.position.set(0, discCenterY, 0);
    card.userData.boardType = 'billboard';
    card.userData.adIndex = adIndex;
    pinGroup.add(card);
    clickableList.push(card);

    const tail = new THREE.Mesh(sharedTailGeo, sharedBodyMat);
    tail.position.set(0, 0, 0);
    pinGroup.add(tail);

    return pinGroup;
  }

  group.userData.clickableBoards = [];

  // ---- شبكة الوحدات كاملة (1024 مربع) ----
  const grid = buildPlacementGrid(PLACEMENT_ISLAND_SIZE, PLACEMENT_DIVISIONS, Math.PI / 4);

  // ---- 1) المباني: كل وحدة تاخذ أقرب بلوك 3×3 فاضي لمركز الجزيرة ----
  const buildingAnchors = collectBuildingAnchors(grid, PLACEMENT_DIVISIONS, BUILDING_BLOCK_SIZE);
  const buildingPositions = [];
  for (const anchor of buildingAnchors) {
    if (buildingPositions.length >= BUILDING_COUNT) break;
    const pos = tryPlaceBlock(grid, anchor, BUILDING_BLOCK_SIZE);
    if (pos) buildingPositions.push(pos);
  }

  // ---- ارتفاع المباني: هرمي متدرّج حسب القرب من المركز (مو عشوائي
  // بحت) — أطول مبنى دايمًا بالنص بالضبط، وكل ما ابتعدنا يقل الارتفاع
  // تدريجيًا. هذا يمنع أي مبنى قصير قدّام مبنى طويل يحجبه، لأن كل حلقة
  // أبعد عن المركز أقصر بشكل مضمون من الحلقة اللي قبلها (مع جيتر بسيط
  // جدًا للتنويع بدون ما يكسر الترتيب) ----
  const PEAK_HEIGHT = 9.5;   // أطول مبنى بالنص بالضبط
  const BASE_HEIGHT = 3.0;   // أقصر مبنى بحافة التجمّع
  const HEIGHT_GAMMA = 1.8;  // >1 يعطي قمة حادة بالنص وانحدار أهدأ للأطراف
  const HEIGHT_JITTER = 0.15; // تنويع بسيط جدًا، ما يكسر الترتيب الهرمي

  buildingPositions.forEach((pos, i) => {
    const t = buildingPositions.length > 1 ? i / (buildingPositions.length - 1) : 0;
    const baseH = BASE_HEIGHT + (PEAK_HEIGHT - BASE_HEIGHT) * Math.pow(1 - t, HEIGHT_GAMMA);
    const jitter = (Math.random() - 0.5) * 2 * HEIGHT_JITTER;
    const h = Math.max(BASE_HEIGHT * 0.9, baseH + jitter);
    const imgIndex = i % buildingMats.length;
    const photoMat = buildingMats[imgIndex];

    const buildingBody = createPlainBox(BUILDING_WIDTH, h, BUILDING_DEPTH);
    buildingBody.position.set(pos.x, h / 2 + 0.2, pos.z);
    buildingBody.lookAt(0, h / 2 + 0.2, 0);
    group.add(buildingBody);

    attachEmbeddedScreens(
      buildingBody, BUILDING_WIDTH, h, BUILDING_DEPTH,
      photoMat, BUILDING_IMAGE_ASPECT,
      group.userData.clickableBoards, 'building', imgIndex,
      BUILDING_SCREEN_LIFT
    );
  });

  // ---- 2) الدبابيس: عيّنة عشوائية موزّعة من المربعات الفاضية (مو
  // بالضرورة كل مربع)، عشان يطلع فيه فراغات طبيعية بين الدبابيس ----
  const freeCells = [];
  for (let i = 0; i < PLACEMENT_DIVISIONS; i++) {
    for (let j = 0; j < PLACEMENT_DIVISIONS; j++) {
      if (!grid[i][j].occupied) freeCells.push({ x: grid[i][j].x, z: grid[i][j].z });
    }
  }
  // خلط عشوائي (Fisher-Yates) ثم أخذ العدد المطلوب بس
  for (let i = freeCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [freeCells[i], freeCells[j]] = [freeCells[j], freeCells[i]];
  }
  const pinPositions = freeCells.slice(0, Math.min(PIN_COUNT, freeCells.length));

  pinPositions.forEach((pos, i) => {
    const imgIndex = i % pinMats.length;
    const pin = createPin(group.userData.clickableBoards, pinMats[imgIndex], imgIndex);
    pin.position.set(pos.x, GROUND_Y, pos.z);
    pin.lookAt(0, GROUND_Y, 0);
    group.add(pin);
  });

  // ---- إحصائية الوحدات (تقدر تربطها لاحقًا بنظام استثمار حقيقي) ----
  const TOTAL_CELLS = PLACEMENT_DIVISIONS * PLACEMENT_DIVISIONS;
  const BUILDING_CELLS_USED = buildingPositions.length * BUILDING_BLOCK_SIZE * BUILDING_BLOCK_SIZE;
  const PIN_CELLS_USED = pinPositions.length;
  const OCCUPIED_CELLS = BUILDING_CELLS_USED + PIN_CELLS_USED;
  const FREE_CELLS = TOTAL_CELLS - OCCUPIED_CELLS;

  window.LUMORA_GRID_STATS = {
    totalCells: TOTAL_CELLS,
    buildingCount: buildingPositions.length,
    cellsPerBuilding: BUILDING_BLOCK_SIZE * BUILDING_BLOCK_SIZE,
    buildingCellsUsed: BUILDING_CELLS_USED,
    pinCount: pinPositions.length,
    pinCellsUsed: PIN_CELLS_USED,
    occupiedCells: OCCUPIED_CELLS,
    freeCells: FREE_CELLS
  };

  console.log(
    'Lumora Oasis - إحصائية الوحدات:',
    'الإجمالي =', TOTAL_CELLS,
    '| مباني =', buildingPositions.length, '(', BUILDING_CELLS_USED, 'مربع )',
    '| دبابيس =', pinPositions.length, '(', PIN_CELLS_USED, 'مربع )',
    '| مشغول =', OCCUPIED_CELLS,
    '| فاضي =', FREE_CELLS
  );

  return group;
}

function initIslandViewer(containerId, options) {
  options = options || {};
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.Fog(0x05030a, 35, 100);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 300);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x30303a, 1.0));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(12, 20, 10);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
  fillLight.position.set(-10, 14, -8);
  scene.add(fillLight);
  // نفس مكان اللمبتين الأصليتين (اللي كانت وردي/أزرق)، بس بلون أبيض
  // محايد عشان تضيء جوانب المباني القريبة بدون ما تلوّن البوسترات
  const whitePointA = new THREE.PointLight(0xffffff, 2.5, 40);
  whitePointA.position.set(-8, 8, 8);
  scene.add(whitePointA);
  const whitePointB = new THREE.PointLight(0xffffff, 2.5, 40);
  whitePointB.position.set(8, 8, -8);
  scene.add(whitePointB);

  const island = buildPlaceholderIsland(THREE);
  scene.add(island);

  let cameraTheta = Math.PI / 4;
  let cameraPhi = options.small ? 0.85 : 1.0;
  let cameraDistance = options.small ? 27 : 34;

  const MIN_PHI = 0.25, MAX_PHI = 1.4;
  const MIN_DISTANCE = 10, MAX_DISTANCE = 60;

  let isDragging = false;
  let previousPointer = { x: 0, y: 0 };
  let activePointers = new Map();
  let lastPinchDistance = null;
  let didDrag = false;

  function updateCameraPosition() {
    const x = cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta);
    const y = cameraDistance * Math.cos(cameraPhi);
    const z = cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0.5, 0);
  }
  updateCameraPosition();

  function getPointerDistance() {
    const pts = Array.from(activePointers.values());
    if (pts.length < 2) return null;
    const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const hint = container.parentElement.querySelector('.island-hint');

  renderer.domElement.addEventListener('pointerdown', (e) => {
    renderer.domElement.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    didDrag = false;
    if (activePointers.size === 1) {
      isDragging = true;
      previousPointer = { x: e.clientX, y: e.clientY };
    } else if (activePointers.size === 2) {
      isDragging = false;
      lastPinchDistance = getPointerDistance();
    }
    if (hint) hint.style.opacity = '0';
    resetIdleTimer();
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      const dist = getPointerDistance();
      if (lastPinchDistance !== null && dist !== null) {
        const delta = dist - lastPinchDistance;
        cameraDistance -= delta * 0.03;
        cameraDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, cameraDistance));
      }
      lastPinchDistance = dist;
      updateCameraPosition();
      return;
    }
    if (!isDragging) return;
    const deltaX = e.clientX - previousPointer.x;
    const deltaY = e.clientY - previousPointer.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) didDrag = true;
    previousPointer = { x: e.clientX, y: e.clientY };
    cameraTheta -= deltaX * 0.006;
    cameraPhi -= deltaY * 0.006;
    cameraPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, cameraPhi));
    updateCameraPosition();
  });

  function endPointer(e) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) lastPinchDistance = null;
    if (activePointers.size === 0) isDragging = false;
  }
  renderer.domElement.addEventListener('pointerup', endPointer);
  renderer.domElement.addEventListener('pointercancel', endPointer);
  renderer.domElement.addEventListener('pointerleave', endPointer);

  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraDistance += e.deltaY * 0.01;
    cameraDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, cameraDistance));
    updateCameraPosition();
    if (hint) hint.style.opacity = '0';
  }, { passive: false });

  if (options.onBoardClick || options.onEmptyClick) {
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (didDrag) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(island.userData.clickableBoards || []);
      if (hits.length > 0) {
        const idx = hits[0].object.userData.adIndex;
        const type = hits[0].object.userData.boardType;
        options.onBoardClick && options.onBoardClick(idx, type);
      } else {
        options.onEmptyClick && options.onEmptyClick();
      }
    });
  }

  let idleTimer = null;
  let autoRotate = true;
  function resetIdleTimer() {
    autoRotate = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { autoRotate = true; }, 3000);
  }
  renderer.domElement.addEventListener('wheel', resetIdleTimer);

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) { cameraTheta += 0.0012; updateCameraPosition(); }
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}