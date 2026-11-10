/*
 * AR Escalier — aucun fichier GLB nécessaire.
 * IMPORTANT : les points ci-dessous sont une première approximation du dessin.
 * Le suivi NFT a son propre repère : ajuster X/Y/échelle sur le téléphone.
 * La trajectoire suit les segments blancs comme une animation 2,5D collée à l'image.
 */
(() => {
  'use strict';
  const W = 1616, H = 1540;
  // Coordonnées de l'image (origine en haut à gauche).
  // Points horizontaux et montées successives, approximés d'après la capture.
  const points = [
    [70, 1275], [330, 1275], [330, 1100],
    [605, 1100], [605, 910], [890, 910],
    [890, 730], [1180, 730], [1180, 550], [1510, 550]
  ];
  const defaults = { offsetX: 0, offsetY: 0, pathScale: 1, figureScale: 1, speed: 1, flipY: false, showPath: false };
  const config = { ...defaults };
  const $ = id => document.getElementById(id);
  const marker = $('image-marker');
  const plane = $('drawing-plane');
  const status = $('status');
  const loading = $('loading');
  const THREE = AFRAME.THREE;
  let detected = false, paused = false, progress = 0, lastTime = null, elapsedDone = 0;
  let figure, legs = [], arms = [], guide;
  const segments = points.slice(1).map((p, i) => {
    const a = points[i];
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  });
  const total = segments.reduce((a, b) => a + b, 0);

  // Converts image pixel coordinates into the AR NFT coordinate frame.
  // In the default configuration, +Y is toward the top of the image.
  function pointToLocal(p) {
    const y = config.flipY ? p[1] : H - p[1];
    return new THREE.Vector3(
      (p[0] * config.pathScale) + config.offsetX,
      (y * config.pathScale) + config.offsetY,
      1.5 // Slightly above the image plane to avoid z-fighting.
    );
  }
  function getPoint(distance) {
    let remaining = Math.min(total, Math.max(0, distance));
    for (let i = 0; i < segments.length; i++) {
      if (remaining <= segments[i] || i === segments.length - 1) {
        const t = segments[i] ? remaining / segments[i] : 0;
        return {
          point: [points[i][0] + (points[i + 1][0] - points[i][0]) * t,
                  points[i][1] + (points[i + 1][1] - points[i][1]) * t],
          vertical: Math.abs(points[i + 1][1] - points[i][1]) > 1
        };
      }
      remaining -= segments[i];
    }
    return { point: points[points.length - 1], vertical: false };
  }
  function material() { return new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }); }
  function box(parent, w, h, d, x, y, z, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function createFigure() {
    const root = new THREE.Group();
    const mat = material();
    // Figure is oriented in the plane of the printed drawing.
    // Unit size is in NFT/image pixel coordinates.
    const torso = box(root, 22, 33, 9, 0, 39, 0, mat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(12, 16, 12), mat);
    head.position.set(0, 71, 0);
    root.add(head);
    for (const side of [-1, 1]) {
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 16, 50, 0);
      box(armPivot, 7, 27, 8, 0, -13, 0, mat);
      root.add(armPivot); arms.push(armPivot);
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 6, 24, 0);
      box(legPivot, 8, 24, 8, 0, -12, 0, mat);
      root.add(legPivot); legs.push(legPivot);
    }
    root.scale.setScalar(config.figureScale);
    plane.object3D.add(root);
    return root;
  }
  function rebuildGuide() {
    if (guide) { plane.object3D.remove(guide); guide.geometry.dispose(); guide.material.dispose(); guide = null; }
    if (!config.showPath) return;
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(pointToLocal));
    const mat = new THREE.LineBasicMaterial({ color: 0xffd166, linewidth: 2, depthTest: false });
    guide = new THREE.Line(geometry, mat);
    guide.renderOrder = 5;
    plane.object3D.add(guide);
  }
  function render(time) {
    const info = getPoint(progress);
    figure.position.copy(pointToLocal(info.point));
    figure.scale.setScalar(config.figureScale);
    // Animation procédurale des bras et jambes, accélérée pendant les déplacements.
    const moving = detected && !paused && progress < total;
    const phase = time * 0.012 * config.speed;
    const swing = moving ? Math.sin(phase) * 0.48 : 0;
    legs[0].rotation.z = swing;
    legs[1].rotation.z = -swing;
    arms[0].rotation.z = -swing * 0.65;
    arms[1].rotation.z = swing * 0.65;
    // Small upward bob; on vertical steps the figure moves upward in image space.
    figure.position.y += moving ? Math.abs(Math.sin(phase)) * 1.4 : 0;
  }
  function animate(time) {
    requestAnimationFrame(animate);
    if (lastTime === null) lastTime = time;
    const dt = Math.min((time - lastTime) / 1000, 0.08);
    lastTime = time;
    if (figure && detected && !paused && progress < total) {
      progress = Math.min(total, progress + dt * 190 * config.speed);
      if (progress >= total) {
        elapsedDone = time;
        status.textContent = 'Bravo ! Le bonhomme est arrivé en haut.';
      }
    }
    if (figure) render(time);
  }
  function syncControls() {
    const fields = [
      ['offset-x', 'offsetX'], ['offset-y', 'offsetY'], ['path-scale', 'pathScale'],
      ['figure-scale', 'figureScale'], ['speed', 'speed']
    ];
    fields.forEach(([id, key]) => {
      $(id).value = config[key];
      $(id + '-value').textContent = config[key];
      $(id).addEventListener('input', e => {
        config[key] = Number(e.target.value);
        $(id + '-value').textContent = config[key];
        rebuildGuide();
      });
    });
    for (const [id, key] of [['flip-y', 'flipY'], ['show-path', 'showPath']]) {
      $(id).checked = config[key];
      $(id).addEventListener('change', e => { config[key] = e.target.checked; rebuildGuide(); });
    }
  }
  function init() {
    figure = createFigure();
    syncControls();
    rebuildGuide();
    $('restart').addEventListener('click', () => { progress = 0; paused = false; $('pause').textContent = 'Pause'; status.textContent = detected ? 'Le bonhomme monte les escaliers.' : 'Vise l’image des escaliers avec la caméra.'; });
    $('pause').addEventListener('click', () => { paused = !paused; $('pause').textContent = paused ? 'Reprendre' : 'Pause'; });
    $('settings-toggle').addEventListener('click', () => { $('settings').hidden = !$('settings').hidden; });
    $('reset-settings').addEventListener('click', () => {
      Object.assign(config, defaults);
      for (const [id, key] of [['offset-x','offsetX'],['offset-y','offsetY'],['path-scale','pathScale'],['figure-scale','figureScale'],['speed','speed']]) {
        $(id).value = config[key]; $(id + '-value').textContent = config[key];
      }
      $('flip-y').checked = false; $('show-path').checked = false;
      rebuildGuide();
    });
    marker.addEventListener('markerFound', () => {
      detected = true;
      status.textContent = progress >= total ? 'Bravo ! Le bonhomme est arrivé en haut.' : 'Image détectée : le bonhomme monte !';
      loading.style.display = 'none';
    });
    marker.addEventListener('markerLost', () => {
      detected = false;
      status.textContent = 'Image perdue : replace-la dans le champ de la caméra.';
    });
    marker.addEventListener('arjs-nft-loaded', () => { loading.style.display = 'none'; });
    // Fallback: loading event may be emitted on the scene or not at all.
    const scene = document.querySelector('a-scene');
    scene.addEventListener('loaded', () => { loading.style.display = 'none'; });
    requestAnimationFrame(animate);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
