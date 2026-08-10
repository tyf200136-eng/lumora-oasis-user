/* ============================================================
   عارض الجزيرة 3D المشترك - واحة لومورا
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

  // ---- إعدادات العدد ---- (غيّر الأرقام بس لو تبي تزيد/تنقص)
  const BUILDING_COUNT = 25;
  const BILLBOARD_COUNT = 33;

  // مقاسات ثابتة (نفس مقاس المباني/اللوحات الأصلية الصغيرة)
  const BUILDING_WIDTH = 0.6, BUILDING_DEPTH = 0.4;
  const BUILDING_MIN_HEIGHT = 1.5, BUILDING_MAX_HEIGHT = 2.3;

  const BOARD_WIDTH = 0.9, BOARD_HEIGHT = 0.6, BOARD_DEPTH = 0.08;
  const POLE_HEIGHT = 0.5, POLE_X_OFFSET = BOARD_WIDTH * 0.32, POLE_RADIUS = 0.04;

  // نطاق التوزيع العشوائي (نصف قطر من مركز الجزيرة)
  const SCATTER_MIN_RADIUS = 1.0;
  const SCATTER_MAX_RADIUS = 4.6;
  const MIN_SPACING = 0.9; // أقل مسافة بين أي عنصرين عشان يقل التداخل

  const baseGeo = new THREE.BoxGeometry(10, 0.4, 10);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a6e, emissive: 0x150a3d, roughness: 0.4, metalness: 0.3
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.y = Math.PI / 4;
  group.add(base);

  const gridHelper = new THREE.GridHelper(9.8, 20, 0x8888ff, 0x4444aa);
  gridHelper.position.y = 0.21;
  gridHelper.rotation.y = Math.PI / 4;
  group.add(gridHelper);

  const edgeGeo = new THREE.BoxGeometry(10.3, 0.08, 10.3);
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

  function poleMat() {
    return new THREE.MeshStandardMaterial({ color: 0x0d0d14, roughness: 0.6, metalness: 0.2 });
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

  function createScreenBox(width, height, depth, imageUrl, imageAspect) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const side = bodyMat();
    const front = adFaceMat(imageUrl, width, height, imageAspect);
    const materials = [side, side, side, side, front, front];
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

  function attachEmbeddedScreens(parentMesh, parentWidth, parentHeight, parentDepth, imageUrl, imageAspect, clickableList, boardType, adIndex) {
    const size = fitScreenSize(parentWidth, parentHeight, imageAspect);

    const frontScreen = createScreenBox(size.width, size.height, SCREEN_THICKNESS, imageUrl, imageAspect);
    frontScreen.position.set(0, 0, parentDepth / 2 + SCREEN_THICKNESS / 2 + SCREEN_GAP);
    frontScreen.userData.boardType = boardType;
    frontScreen.userData.adIndex = adIndex;
    parentMesh.add(frontScreen);
    clickableList.push(frontScreen);

    const backScreen = createScreenBox(size.width, size.height, SCREEN_THICKNESS, imageUrl, imageAspect);
    backScreen.position.set(0, 0, -(parentDepth / 2 + SCREEN_THICKNESS / 2 + SCREEN_GAP));
    backScreen.rotation.y = Math.PI;
    backScreen.userData.boardType = boardType;
    backScreen.userData.adIndex = adIndex;
    parentMesh.add(backScreen);
    clickableList.push(backScreen);
  }

  // يبعثر "count" موقع عشوائي بمنطقة دائرية، ويحاول يبعد كل موقع عن الباقي
  // (عن المباني واللوحات سوا) عشان يقل التداخل، بدون ترتيب صفوف أو أقواس
  function scatterRandom(count, minRadius, maxRadius, minSpacing, occupied) {
    const positions = [];
    const maxAttempts = 40;
    for (let i = 0; i < count; i++) {
      let placed = null;
      for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        let ok = true;
        for (const p of occupied) {
          const dx = p.x - x, dz = p.z - z;
          if (Math.sqrt(dx * dx + dz * dz) < minSpacing) { ok = false; break; }
        }
        if (ok) placed = { x, z };
      }
      if (!placed) {
        // ما لقى مكان فاضي كفاية بعد كل المحاولات، يحطه عشوائي بأي حال
        const angle = Math.random() * Math.PI * 2;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        placed = { x: radius * Math.cos(angle), z: radius * Math.sin(angle) };
      }
      occupied.push(placed);
      positions.push(placed);
    }
    return positions;
  }

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

  group.userData.clickableBoards = [];

  // مواقع كل العناصر (مباني + لوحات) تتحسب سوا بنفس القائمة عشان
  // ما يتلاصقون مع بعض حتى لو نوعهم مختلف
  const occupiedPositions = [];

  // ---- المباني: مقاس ثابت صغير، طول عشوائي، مواقع عشوائية ----
  for (let i = 0; i < BUILDING_COUNT; i++) {
    const pos = scatterRandom(1, SCATTER_MIN_RADIUS, SCATTER_MAX_RADIUS, MIN_SPACING, occupiedPositions)[0];
    const h = BUILDING_MIN_HEIGHT + Math.random() * (BUILDING_MAX_HEIGHT - BUILDING_MIN_HEIGHT);
    const imageUrl = buildingAdImages[i % buildingAdImages.length];

    const buildingBody = createPlainBox(BUILDING_WIDTH, h, BUILDING_DEPTH);
    buildingBody.position.set(pos.x, h / 2 + 0.2, pos.z);
    buildingBody.lookAt(0, h / 2 + 0.2, 0);
    group.add(buildingBody);

    attachEmbeddedScreens(
      buildingBody, BUILDING_WIDTH, h, BUILDING_DEPTH,
      imageUrl, BUILDING_IMAGE_ASPECT,
      group.userData.clickableBoards, 'building', i % buildingAdImages.length
    );
  }

  // ---- اللوحات: مقاس ثابت صغير، مواقع عشوائية، كل وحدة على عمودين ----
  for (let idx = 0; idx < BILLBOARD_COUNT; idx++) {
    const pos = scatterRandom(1, SCATTER_MIN_RADIUS, SCATTER_MAX_RADIUS, MIN_SPACING, occupiedPositions)[0];
    const frameCenterY = POLE_HEIGHT + BOARD_HEIGHT / 2;
    const imageUrl = billboardAdImages[idx % billboardAdImages.length];

    const boardFrame = createPlainBox(BOARD_WIDTH, BOARD_HEIGHT, BOARD_DEPTH);
    boardFrame.position.set(pos.x, frameCenterY, pos.z);
    boardFrame.lookAt(0, frameCenterY, 0);
    group.add(boardFrame);

    attachEmbeddedScreens(
      boardFrame, BOARD_WIDTH, BOARD_HEIGHT, BOARD_DEPTH,
      imageUrl, BILLBOARD_IMAGE_ASPECT,
      group.userData.clickableBoards, 'billboard', idx % billboardAdImages.length
    );

    const poleLocalY = -(BOARD_HEIGHT / 2 + POLE_HEIGHT / 2);
    [-POLE_X_OFFSET, POLE_X_OFFSET].forEach((xOffset) => {
      const poleGeo = new THREE.CylinderGeometry(POLE_RADIUS, POLE_RADIUS * 1.15, POLE_HEIGHT, 8);
      const pole = new THREE.Mesh(poleGeo, poleMat());
      pole.position.set(xOffset, poleLocalY, 0);
      boardFrame.add(pole);
    });
  }

  return group;
}

function initIslandViewer(containerId, options) {
  options = options || {};
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.Fog(0x05030a, 20, 55);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x3a2a55, 1.2));
  const keyLight = new THREE.DirectionalLight(0x9fd8ff, 0.6);
  keyLight.position.set(8, 12, 6);
  scene.add(keyLight);
  const pinkPoint = new THREE.PointLight(0xff3fa4, 3, 30);
  pinkPoint.position.set(-6, 3, 6);
  scene.add(pinkPoint);
  const bluePoint = new THREE.PointLight(0x3fd0ff, 3, 30);
  bluePoint.position.set(6, 3, -6);
  scene.add(bluePoint);

  const island = buildPlaceholderIsland(THREE);
  scene.add(island);

  let cameraTheta = Math.PI / 4;
  let cameraPhi = options.small ? 0.85 : 1.0;
  let cameraDistance = options.small ? 13 : 16;

  const MIN_PHI = 0.25, MAX_PHI = 1.4;
  const MIN_DISTANCE = 6, MAX_DISTANCE = 30;

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