(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const marker = $('marker');
  const plane = $('image-plane');
  const status = $('status');
  const details = $('details');
  const log = $('log');
  const THREE = AFRAME.THREE;
  const W = 1616;
  const H = 1540;
  const path = [
    [75, 1280], [310, 1280], [310, 1110], [515, 1110],
    [515, 900], [735, 900], [735, 740], [975, 740],
    [975, 580], [1200, 580], [1200, 460], [1510, 460]
  ];
  const lengths = path.slice(1).map((point, index) =>
    Math.hypot(point[0] - path[index][0], point[1] - path[index][1])
  );
  const totalLength = lengths.reduce((sum, segment) => sum + segment, 0);

  let detected = false;
  let paused = false;
  let progress = 0;
  let figure;
  let body;
  let legs = [];
  let arms = [];
  let eyes = [];
  let guide = null;
  let artwork = null;
  let lastFrame = 0;
  let ready = false;
  let lostTimer = null;
  function note(message) {
    console.log('[AR Escalier]', message);
    log.textContent += `${message}\n`;
    log.scrollTop = log.scrollHeight;
  }

  function setStatus(message) {
    status.textContent = message;
    note(message);
  }

  async function checkAssets() {
    let ok = true;
    for (const extension of ['fset', 'fset3', 'iset']) {
      try {
        const response = await fetch(`assets/escalier.${extension}`, { cache: 'no-store' });
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        note(`${extension} : OK (${response.headers.get('content-length') || '?'} octets)`);
      } catch (error) {
        ok = false;
        note(`${extension} : ERREUR ${error.message}`);
      }
    }
    details.textContent = ok
      ? 'Fichiers NFT accessibles. Cherche le dessin entier, bien éclairé.'
      : 'Erreur de fichiers NFT : ouvrir Diagnostic.';
    return ok;
  }

  function ellipsoid(parent, x, y, z, sx, sy, sz, material, segments = 20) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, segments, Math.max(12, segments - 4)),
      material
    );
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }

  function makeFigure() {
    const root = new THREE.Group();
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x15233c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(22, 32), shadowMaterial);
    shadow.scale.set(1.45, 0.38, 1);
    shadow.position.set(0, 1, -2);
    root.add(shadow);

    const skin = new THREE.MeshBasicMaterial({ color: 0xffc28f });
    const shirt = new THREE.MeshBasicMaterial({ color: 0x19b8a6 });
    const shirtLight = new THREE.MeshBasicMaterial({ color: 0x7ef1d4 });
    const shorts = new THREE.MeshBasicMaterial({ color: 0xf27b52 });
    const shoes = new THREE.MeshBasicMaterial({ color: 0x273b63 });
    const hair = new THREE.MeshBasicMaterial({ color: 0x44332f });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupil = new THREE.MeshBasicMaterial({ color: 0x202c42 });
    const bag = new THREE.MeshBasicMaterial({ color: 0x7256d9 });

    body = new THREE.Group();
    root.add(body);

    ellipsoid(body, 0, 29, -7, 10, 14, 5, bag);
    ellipsoid(body, 0, 35, 0, 13, 17, 9, shirt);
    ellipsoid(body, 0, 23, 8, 8, 3, 2, shirtLight, 16);
    ellipsoid(body, 0, 49, 0, 5, 5, 5, skin);
    ellipsoid(body, 0, 63, 0, 11, 12, 10, skin, 24);
    ellipsoid(body, 0, 71, -1, 11, 6, 10, hair, 24);
    ellipsoid(body, -8, 65, 2, 4, 5, 4, hair, 16);
    for (const side of [-1, 1]) {
      ellipsoid(body, side * 4, 64, 9, 2.4, 2.8, 1.4, white, 16);
      eyes.push(ellipsoid(body, side * 4 + 0.5, 64, 10.1, 1.1, 1.5, 0.8, pupil, 12));
    }

    const legsGroup = new THREE.Group();
    root.add(legsGroup);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 6, 12, 0);
      ellipsoid(leg, 0, -8, 0, 5.2, 10, 5, shorts);

      const shin = new THREE.Group();
      shin.position.y = -16;
      ellipsoid(shin, 0, -8, 0, 4.2, 9, 4.2, skin);
      ellipsoid(shin, 2, -17, 2, 8, 4.5, 5, shoes);
      ellipsoid(shin, 5, -17, 4, 3, 1.5, 1.4, shirtLight, 12);
      leg.add(shin);
      leg.userData.shin = shin;
      legsGroup.add(leg);
      legs.push(leg);
    }

    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 13, 43, 0);
      ellipsoid(arm, 0, -8, 0, 4.5, 10, 4.5, shirt);
      const forearm = new THREE.Group();
      forearm.position.y = -16;
      ellipsoid(forearm, 0, -7, 0, 3.7, 8, 3.7, skin);
      ellipsoid(forearm, 0, -15, 0, 4, 4, 4, skin, 16);
      arm.add(forearm);
      arm.userData.forearm = forearm;
      body.add(arm);
      arms.push(arm);
    }

    plane.object3D.add(root);
    return root;
  }

  function loadArtwork() {
    new THREE.TextureLoader().load(
      'assets/archer.png',
      texture => {
        texture.encoding = THREE.sRGBEncoding;
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false
        });
        artwork = new THREE.Mesh(new THREE.PlaneGeometry(820, 553), material);
        artwork.position.set(-285, 420, 30);
        artwork.renderOrder = 200;
        artwork.visible = detected;
        plane.object3D.add(artwork);
        note('Illustration chargée : archer.png');
      },
      undefined,
      error => {
        note(`ERREUR image : ${error.message || 'impossible de charger assets/archer.png'}`);
      }
    );
  }

  function coords(point) {
    return new THREE.Vector3(
      point[0] - W / 2 + Number($('dx').value),
      H / 2 - point[1] + Number($('dy').value),
      10
    );
  }

  function routeAt(distance) {
    let remaining = distance;
    for (let index = 0; index < lengths.length; index++) {
      if (remaining <= lengths[index] || index === lengths.length - 1) {
        const amount = Math.min(1, remaining / lengths[index]);
        const start = path[index];
        const end = path[index + 1];
        const position = [
          start[0] + (end[0] - start[0]) * amount,
          start[1] + (end[1] - start[1]) * amount
        ];
        return position;
      }
      remaining -= lengths[index];
    }
    return path[path.length - 1];
  }

  function updateGuide() {
    if (guide) {
      plane.object3D.remove(guide);
      guide.geometry.dispose();
      guide.material.dispose();
      guide = null;
    }
    if (!$('guide').checked) return;
    guide = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(path.map(coords)),
      new THREE.LineBasicMaterial({ color: 0xffd54a, depthTest: false })
    );
    guide.renderOrder = 100;
    plane.object3D.add(guide);
  }

  function tick(time) {
    requestAnimationFrame(tick);
    const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.08) : 0;
    lastFrame = time;
    const moving = detected && !paused && progress < totalLength;

    if (moving) {
      progress = Math.min(totalLength, progress + delta * 160 * Number($('speed').value));
      if (progress === totalLength) setStatus('Arrivé en haut !');
    }
    if (!figure) return;

    const size = Number($('size').value);
    figure.position.copy(coords(routeAt(progress)));
    figure.position.y += 25 * size;
    figure.scale.setScalar(size);

    const cycle = time * 0.012 * Number($('speed').value);
    const stride = moving ? Math.sin(cycle) : 0;
    const bounce = moving ? Math.abs(Math.sin(cycle)) * 3 : Math.sin(time * 0.002) * 0.8;
    body.position.y = bounce;
    legs[0].rotation.z = stride * 0.62;
    legs[1].rotation.z = -stride * 0.62;
    legs[0].userData.shin.rotation.z = Math.max(0, -stride) * 0.55;
    legs[1].userData.shin.rotation.z = Math.max(0, stride) * 0.55;
    arms[0].rotation.z = -stride * 0.55;
    arms[1].rotation.z = stride * 0.55;
    arms[0].userData.forearm.rotation.z = -0.18 + Math.max(0, stride) * 0.35;
    arms[1].userData.forearm.rotation.z = 0.18 - Math.max(0, -stride) * 0.35;
    const blink = Math.sin(time * 0.0017) > 0.995 ? 0.15 : 1;
    eyes.forEach(eye => { eye.scale.y = blink * 1.5; });
  }

  function init() {
    figure = makeFigure();
    $('restart').onclick = () => {
      progress = 0;
      paused = false;
      $('pause').textContent = 'Pause';
      setStatus(detected ? 'Animation relancée' : 'Présente le dessin à la caméra');
    };
    $('pause').onclick = () => {
      paused = !paused;
      $('pause').textContent = paused ? 'Reprendre' : 'Pause';
    };
    $('debug').onclick = () => { $('panel').hidden = !$('panel').hidden; };
    for (const id of ['dx', 'dy', 'guide']) $(id).addEventListener('input', updateGuide);

    marker.addEventListener('markerFound', () => {
      clearTimeout(lostTimer);
      detected = true;
      if (artwork) artwork.visible = true;
      if (progress >= totalLength) progress = 0;
      setStatus('Image reconnue ! L’illustration apparaît et le bonhomme monte.');
    });
    marker.addEventListener('markerLost', () => {
      clearTimeout(lostTimer);
      lostTimer = setTimeout(() => {
        detected = false;
        if (artwork) artwork.visible = false;
        setStatus('Image perdue : recadre le dessin.');
      }, 900);
    });
    marker.addEventListener('arjs-nft-loaded', () => {
      ready = true;
      note('Descripteurs NFT chargés par AR.js');
      details.textContent = 'NFT chargé. Présente le dessin en entier.';
    });

    window.addEventListener('error', event => note(`ERREUR JS : ${event.message}`));
    window.addEventListener('unhandledrejection', event => note(`ERREUR : ${String(event.reason)}`));
    loadArtwork();
    checkAssets().then(ok => {
      if (ok && !ready) setStatus('Fichiers trouvés. Attente du chargement NFT et de la détection.');
      else if (!ok) setStatus('Fichiers manquants : ouvre Diagnostic');
    });
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
