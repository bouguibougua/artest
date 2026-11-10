(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const THREE = AFRAME.THREE;
  const W = 1616, H = 1540; // Taille exacte de assets/image-reference.png
  const marker = $('marker');
  const scene = document.querySelector('a-scene');
  const walkerMaterial = new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
  const stairMaterial = new THREE.MeshBasicMaterial({color:0xffa52f,side:THREE.DoubleSide});
  // Positions en pixels dans l'image originale (origine : coin supérieur gauche).
  // Les paliers sont horizontaux, les contremarches verticales.
  const points = [
    [75,1280],[310,1280],[310,1110],[515,1110],
    [515,900],[735,900],[735,740],[975,740],
    [975,580],[1200,580],[1200,460],[1510,460]
  ];
  const route = [
    [100,1280],[280,1280],[335,1110],[490,1110],
    [540,900],[710,900],[760,740],[950,740],
    [1000,580],[1170,580],[1230,460],[1480,460]
  ];
  let sceneRoot, walker, leftLeg, rightLeg, leftArm, rightArm;
  let tracked = false, animationStarted = false, paused = false, distance = 0, lastTime = 0, finished = false;
  const JUMP_HEIGHT = 95; // hauteur du saut entre deux marches (pixels NFT)
  const WALKER_SCALE = 1.28 * 6;
  const lengths = route.slice(1).map((p,i)=>Math.hypot(p[0]-route[i][0],p[1]-route[i][1]));
  const total = lengths.reduce((a,b)=>a+b,0);
  function log(msg){ $('status').textContent=msg; console.log('[AR escalier]',msg); $('log').textContent += msg+'\n'; }
  function addBox(parent,w,h,d,x,y,z,material=walkerMaterial){
    const obj = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    obj.position.set(x,y,z); parent.add(obj); return obj;
  }
  function addBall(parent,r,x,y,z){
    const obj = new THREE.Mesh(new THREE.SphereGeometry(r,16,12),walkerMaterial);
    obj.position.set(x,y,z); parent.add(obj); return obj;
  }
  function createStaircase(parent){
    const stairs = new THREE.Group(); parent.add(stairs);
    for(let i=0;i<points.length-1;i++){
      const a=points[i], b=points[i+1];
      const x=(a[0]+b[0])/2, y=H-(a[1]+b[1])/2;
      if(a[1]===b[1]) addBox(stairs,Math.abs(b[0]-a[0])+14,16,24,x,y,3,stairMaterial);
      else addBox(stairs,16,Math.abs(b[1]-a[1])+14,24,x,y,3,stairMaterial);
    }
    return stairs;
  }
  function createWalker(parent){
    // Dessiné dans le plan XY du NFT, devant les marches (+Z).
    const root = new THREE.Group(); parent.add(root);
    addBall(root,19,0,101,0); // tête blanche
    addBox(root,19,55,17,0,64,0); // torse blanc
    for(const side of [-1,1]){
      const arm = new THREE.Group(); arm.position.set(side*15,83,0); root.add(arm);
      addBox(arm,9,42,10,0,-21,0);
      const leg = new THREE.Group(); leg.position.set(side*8,38,0); root.add(leg);
      addBox(leg,10,38,12,0,-19,0);
      addBox(leg,20,8,14,side*4,-37,3);
      if(side===-1){leftArm=arm;leftLeg=leg;}else{rightArm=arm;rightLeg=leg;}
    }
    root.scale.setScalar(WALKER_SCALE);
    return root;
  }
  function pathAt(d){
    let remaining = Math.max(0,Math.min(total,d));
    for(let i=0;i<lengths.length;i++){
      const len=lengths[i];
      if(remaining<=len || i===lengths.length-1){
        const t=len?remaining/len:0;
        return {x:route[i][0]+(route[i+1][0]-route[i][0])*t,
                y:route[i][1]+(route[i+1][1]-route[i][1])*t,
                jump:i%2===1, t};
      }
      remaining-=len;
    }
    const last=route[route.length-1];
    return {x:last[0],y:last[1],jump:false,t:1};
  }
  function render(now){
    requestAnimationFrame(render);
    const dt=lastTime?Math.min((now-lastTime)/1000,0.06):0; lastTime=now;
    if(!sceneRoot || !walker)return;
    const preview=$('preview').checked;
    const active=tracked || animationStarted || preview;
    sceneRoot.visible=active;
    const scale=Number($('size').value);
    if(preview){
      const previewScale=0.0022*scale;
      sceneRoot.position.set(
        (Number($('dx').value)-W/2)*previewScale,
        (Number($('dy').value)-H/2)*previewScale-0.18,
        -4
      );
      sceneRoot.scale.setScalar(previewScale);
    }else{
      sceneRoot.position.set(Number($('dx').value),Number($('dy').value),0);
      sceneRoot.scale.setScalar(scale);
    }
    const walking=active && !paused && !finished;
    if(walking){
      distance+=dt*170*Number($('speed').value);
      if(distance>=total){
        if($('loop').checked)distance=0;
        else {distance=total;finished=true;log('Arrivé en haut des escaliers !');}
      }
    }
    const p=pathAt(distance);
    // L'origine du bonhomme correspond à ses pieds.
    // Saut en arc sur chaque transition vers la marche suivante.
    // La parabole vaut 0 au départ et à l’arrivée : atterrissage net sur le palier.
    const jumpOffset=p.jump ? JUMP_HEIGHT*4*p.t*(1-p.t) : 0;
    walker.position.set(p.x,H-p.y+8+jumpOffset,65);
    const phase=distance/22;
    const swing=walking?(p.jump ? 0.25 : Math.sin(phase)*0.48):0;
    // Rotation Z : les bras/jambes bougent dans le plan de l'image.
    leftLeg.rotation.z=swing;rightLeg.rotation.z=-swing;
    leftArm.rotation.z=-swing*0.8;rightArm.rotation.z=swing*0.8;
    if(walking && !p.jump) walker.position.y+=Math.abs(Math.sin(phase))*3;
    // Pendant le saut, les jambes se replient légèrement.
    if(p.jump && walking){
      leftLeg.rotation.z=-0.38;rightLeg.rotation.z=0.38;
      leftArm.rotation.z=0.55;rightArm.rotation.z=-0.55;
    }
  }
  function init(){
    sceneRoot=new THREE.Group();marker.object3D.add(sceneRoot);
    createStaircase(sceneRoot);walker=createWalker(sceneRoot);
    sceneRoot.visible=false;
    $('restart').onclick=()=>{distance=0;finished=false;paused=false;$('pause').textContent='Pause';log('Animation relancée');};
    $('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Reprendre':'Pause';};
    $('animation').onclick=()=>{
      const preview=$('preview');
      preview.checked=!preview.checked;
      if(preview.checked){
        distance=0;finished=false;paused=false;
        scene.object3D.add(sceneRoot);
        $('pause').textContent='Pause';
        $('animation').textContent='Arrêter animation';
        log('Aperçu de l’animation lancé');
      }else{
        marker.object3D.add(sceneRoot);
        $('animation').textContent='Animation';
        log(tracked?'Aperçu arrêté : suivi AR actif':'Aperçu de l’animation arrêté');
      }
    };
    $('preview').addEventListener('change',()=>{
      const preview=$('preview').checked;
      (preview?scene.object3D:marker.object3D).add(sceneRoot);
      $('animation').textContent=preview?'Arrêter animation':'Animation';
    });
    $('debug').onclick=()=>{$('panel').hidden=!$('panel').hidden;};
    marker.addEventListener('markerFound',()=>{
      const firstDetection=!animationStarted;
      tracked=true;
      if(firstDetection){
        animationStarted=true;
        distance=0;
        finished=false;
        paused=false;
        $('pause').textContent='Pause';
      }
      if($('preview').checked){
        $('preview').checked=false;
        marker.object3D.add(sceneRoot);
        $('animation').textContent='Animation';
      }
      log('Image détectée : escalier et personnage visibles, animation lancée');
    });
    marker.addEventListener('markerLost',()=>{
      tracked=false;
      log(animationStarted
        ? 'Image momentanément perdue : animation continue'
        : 'Image perdue : en attente de détection');
    });
    marker.addEventListener('arjs-nft-loaded',()=>log('NFT chargé : filme l’image des escaliers'));
    window.addEventListener('error',e=>log('Erreur : '+e.message));
    requestAnimationFrame(render);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
