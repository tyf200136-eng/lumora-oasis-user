/* ============================================================
   عارض الجزيرة 3D المشترك - واحة لومورا
   يُستدعى بـ initIslandViewer('containerId', { small: true/false })
   ============================================================ */

function buildPlaceholderIsland(THREE) {
  const group = new THREE.Group();
  const textureLoader = new THREE.TextureLoader();

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

  // ماتيريال أساسي غامق لجوانب المبنى/اللوحة اللي ما فيها إعلان
  function bodyMat() {
    return new THREE.MeshStandardMaterial({
      color: 0x0a0818, emissive: 0x0f2540, emissiveIntensity: 0.4
    });
  }

  // ماتيريال يحمّل صورة إعلان حقيقية (Texture) بدل اللون الفلات
  function adFaceMat(imageUrl) {
    const texture = textureLoader.load(imageUrl);
    texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;
    return new THREE.MeshStandardMaterial({
      map: texture, emissive: 0x111111, emissiveIntensity: 0.15, roughness: 0.55
    });
  }

  // يبني صندوق (مبنى أو لوحة) بحيث الوجه الأمامي (+Z و -Z) يعرض صورة الإعلان،
  // وباقي الأوجه تبقى غامقة عادية. ترتيب أوجه BoxGeometry: [+X,-X,+Y,-Y,+Z,-Z]
  function createAdBox(width, height, depth, imageUrl) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const side = bodyMat();
    const front = adFaceMat(imageUrl);
    const materials = [side, side, side, side, front, front];
    return new THREE.Mesh(geo, materials);
  }

  // صور بوسترات طولية (Portrait) لواجهات المباني الطويلة
  const buildingAdImages = [
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=800&fit=crop&q=70',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=800&fit=crop&q=70',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=800&fit=crop&q=70',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=800&fit=crop&q=70',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=800&fit=crop&q=70'
  ];

  // صور عرضية (Landscape) للوحات الموزعة على الحواف
  const billboardAdImages = [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=450&fit=crop&q=70',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&h=450&fit=crop&q=70',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=450&fit=crop&q=70',
    'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=800&h=450&fit=crop&q=70',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=450&fit=crop&q=70',
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=450&fit=crop&q=70'
  ];

  let buildingIndex = 0;
  for (let i = -2; i <= 2; i++) {
    const h = 1.5 + Math.abs(i) * -0.4 + 2.2;
    const imageUrl = buildingAdImages[buildingIndex % buildingAdImages.length];
    buildingIndex++;
    const b = createAdBox(0.8, h, 0.8, imageUrl);
    b.position.set(i * 0.9, h / 2 + 0.2, -3.2);
    group.add(b);
  }
  window.LUMORA_BILLBOARD_IMAGES = billboardAdImages;
  // لوحات صغيرة على الحواف - تفاعلية للنقر، بصور عرضية
  const boardPositions = [
    [-3.6, -1.8], [-4.4, 0.4], [-3.2, 2.4],
    [3.6, -1.8], [4.4, 0.4], [3.2, 2.4]
  ];
  group.userData.clickableBoards = [];
  boardPositions.forEach((pos, idx) => {
    const imageUrl = billboardAdImages[idx % billboardAdImages.length];
    const board = createAdBox(0.9, 0.6, 0.08, imageUrl);
    board.position.set(pos[0], 0.9, pos[1]);
    board.lookAt(0, 0.9, 0);
    board.userData.adIndex = idx;
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
    const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
    pole.position.set(pos[0], 0.3, pos[1]);
    group.add(board);
    group.add(pole);
    group.userData.clickableBoards.push(board);
  });

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

  // النقر على لوحة إعلانية يودّي لصفحة التفاصيل (لو معرّفة)
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
        options.onBoardClick && options.onBoardClick(idx);
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