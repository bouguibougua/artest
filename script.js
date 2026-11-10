(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const THREE = AFRAME.THREE;
  const W = 1616, H = 1540; // Taille exacte de assets/image-reference.png
  let pixelToMarkerUnit = 25.4/72; // AR.js exprime les dimensions NFT en millimètres.
  const AR_IMAGE_ROTATION_X = -Math.PI/2; // Convertit le plan de dessin XY vers le plan NFT XZ d'AR.js.
  const marker = $('marker');
  const scene = document.querySelector('a-scene');
  const walkerMaterial = new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
  const stairMaterial = new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
  // Positions en pixels dans l'image originale (origine : coin supérieur gauche).
  // Les paliers sont horizontaux, les contremarches verticales.
  const points = [
    [75,1280],[310,1280],[310,1110],[515,1110],
    [515,900],[735,900],[735,740],[975,740],
    [975,580],[1200,580],[1200,460],[1510,460]
  ];
  const route = [
    [390,1090],[490,1090],
    [540,880],[710,880],[760,720],[950,720],
    [1000,560],[1170,560],[1230,440],[1480,440]
  ];
  let sceneRoot, walker, leftLeg, rightLeg, leftArm, rightArm;
  let tracked = false, animationStarted = false, paused = false, distance = 0, lastTime = 0, finished = false;
  let loopPause = 0;
  const JUMP_HEIGHT = 95;
  const JUMP_PREPARATION_END = 0.12;
  const JUMP_LANDING_START = 0.86;
  const LANDING_PAUSE = 0.75;
  const FOOT_CLEARANCE = 11;
  const STAIR_DEPTH = 80;
  const STAIR_DEPTH_CENTER = STAIR_DEPTH/2;
  const WALKER_SCALE = 1.3;
  const WALKER_GEOMETRY_SCALE = 5.6;
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
      if(a[1]===b[1]) addBox(stairs,Math.abs(b[0]-a[0])+14,16,STAIR_DEPTH,x,y,STAIR_DEPTH_CENTER,stairMaterial);
      else addBox(stairs,16,Math.abs(b[1]-a[1])+14,STAIR_DEPTH,x,y,STAIR_DEPTH_CENTER,stairMaterial);
    }
    return stairs;
  }
  function createWalker(parent){
    // Le dessin est construit en XY, puis converti avec son groupe parent vers le plan XZ du NFT.
    const root = new THREE.Group(); parent.add(root);
    const figure = new THREE.Group(); root.add(figure);
    figure.scale.setScalar(WALKER_GEOMETRY_SCALE);
    addBall(figure,11,0,108,0); // tête blanche
    addBall(figure,3,10,108,0); // regarde vers la droite de l'image
    addBox(figure,40,49,17,0,66,0); // torse blanc
    for(const side of [-1,1]){
      const arm = new THREE.Group(); arm.position.set(side*15,83,0); figure.add(arm);
      addBox(arm,9,42,10,0,-21,0);
      const leg = new THREE.Group(); leg.position.set(side*8,38,0); figure.add(leg);
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
        const start=route[i], end=route[i+1];
        const jump=end[1]<start[1];
        if(!jump){
          return {
            x:start[0]+(end[0]-start[0])*t,
            y:start[1]+(end[1]-start[1])*t,
            phase:'walk',
            t
          };
        }
        if(t<JUMP_PREPARATION_END){
          return {
            x:start[0],
            y:start[1],
            phase:'prepare',
            lift:0,
            crouch:12*Math.sin(Math.PI*t/JUMP_PREPARATION_END),
            t
          };
        }
        if(t<JUMP_LANDING_START){
          const flight=(t-JUMP_PREPARATION_END)/(JUMP_LANDING_START-JUMP_PREPARATION_END);
          const eased=flight*flight*(3-2*flight);
          const phase=flight<0.08?'impulse':flight<0.5?'ascent':'descent';
          return {
            x:start[0]+(end[0]-start[0])*eased,
            y:start[1]+(end[1]-start[1])*eased,
            phase,
            lift:JUMP_HEIGHT*Math.sin(Math.PI*flight),
            crouch:0,
            t
          };
        }
        const landing=(t-JUMP_LANDING_START)/(1-JUMP_LANDING_START);
        return {
          x:end[0],
          y:end[1],
          phase:'land',
          lift:10*Math.sin(Math.PI*landing),
          crouch:0,
          t
        };
      }
      remaining-=len;
    }
    const last=route[route.length-1];
    return {x:last[0],y:last[1],phase:'walk',t:1};
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
      sceneRoot.position.set(
        Number($('dx').value)*pixelToMarkerUnit,
        0,
        -Number($('dy').value)*pixelToMarkerUnit
      );
      sceneRoot.scale.setScalar(scale*pixelToMarkerUnit);
    }
    const walking=(tracked || preview) && !paused && !finished;
    if(walking){
      distance+=dt*170*Number($('speed').value);
      if(distance>=total){
        distance=total;
        finished=true;
        loopPause=$('loop').checked?LANDING_PAUSE:0;
        if(!$('loop').checked)log('Arrivé en haut des escaliers !');
      }
    }else if((tracked || preview) && !paused && finished && loopPause>0){
      loopPause=Math.max(0,loopPause-dt);
      if(loopPause===0){
        distance=0;
        finished=false;
      }
    }
    const p=pathAt(distance);
    walker.position.set(p.x,H-p.y+FOOT_CLEARANCE+(p.lift||0)-(p.crouch||0),STAIR_DEPTH_CENTER+22);
    const phase=distance/22;
    if(walking && p.phase==='prepare'){
      leftLeg.rotation.z=-0.3;rightLeg.rotation.z=0.3;
      leftArm.rotation.z=0.55;rightArm.rotation.z=-0.55;
    }else if(walking && p.phase==='impulse'){
      leftLeg.rotation.z=0.28;rightLeg.rotation.z=-0.28;
      leftArm.rotation.z=-0.72;rightArm.rotation.z=0.72;
    }else if(walking && p.phase==='ascent'){
      const flight=(p.t-JUMP_PREPARATION_END)/(JUMP_LANDING_START-JUMP_PREPARATION_END);
      const tuck=Math.sin(Math.PI*flight);
      leftLeg.rotation.z=-0.48*tuck;rightLeg.rotation.z=0.48*tuck;
      leftArm.rotation.z=0.6;rightArm.rotation.z=-0.6;
    }else if(walking && p.phase==='descent'){
      leftLeg.rotation.z=0.25;rightLeg.rotation.z=-0.25;
      leftArm.rotation.z=0.25;rightArm.rotation.z=-0.25;
    }else if(walking && p.phase==='land'){
      const landing=(p.t-JUMP_LANDING_START)/(1-JUMP_LANDING_START);
      const settle=1-landing;
      leftLeg.rotation.z=-0.12*settle;rightLeg.rotation.z=0.12*settle;
      leftArm.rotation.z=0.18*settle;rightArm.rotation.z=-0.18*settle;
    }else{
      const swing=walking?Math.sin(phase)*0.48:0;
      leftLeg.rotation.z=swing;rightLeg.rotation.z=-swing;
      leftArm.rotation.z=-swing*0.8;rightArm.rotation.z=swing*0.8;
    }
  }
  function init(){
    sceneRoot=new THREE.Group();marker.object3D.add(sceneRoot);
    sceneRoot.rotation.set(AR_IMAGE_ROTATION_X,0,0);
    createStaircase(sceneRoot);walker=createWalker(sceneRoot);
    sceneRoot.visible=false;
    $('restart').onclick=()=>{
      distance=0;finished=false;loopPause=0;paused=false;
      $('pause').textContent='Pause';
      log('Animation relancée');
    };
    $('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Reprendre':'Pause';};
    $('animation').onclick=()=>{
      const preview=$('preview');
      preview.checked=!preview.checked;
      if(preview.checked){
        distance=0;finished=false;loopPause=0;paused=false;
        scene.object3D.add(sceneRoot);
        sceneRoot.rotation.set(0,0,0);
        $('pause').textContent='Pause';
        $('animation').textContent='Arrêter animation';
        $('animation').setAttribute('aria-pressed','true');
        log('Aperçu de l’animation lancé');
      }else{
        marker.object3D.add(sceneRoot);
        sceneRoot.rotation.set(AR_IMAGE_ROTATION_X,0,0);
        $('animation').textContent='Animation';
        $('animation').setAttribute('aria-pressed','false');
        log(tracked?'Aperçu arrêté : suivi AR actif':'Aperçu de l’animation arrêté');
      }
    };
    $('preview').addEventListener('change',()=>{
      const preview=$('preview').checked;
      (preview?scene.object3D:marker.object3D).add(sceneRoot);
      sceneRoot.rotation.set(preview?0:AR_IMAGE_ROTATION_X,0,0);
      $('animation').textContent=preview?'Arrêter animation':'Animation';
      $('animation').setAttribute('aria-pressed',String(preview));
    });
    $('debug').onclick=()=>{$('panel').hidden=!$('panel').hidden;};
    marker.addEventListener('markerFound',()=>{
      const firstDetection=!animationStarted;
      tracked=true;
      if(firstDetection){
        animationStarted=true;
        distance=0;finished=false;loopPause=0;paused=false;
        $('pause').textContent='Pause';
      }
      if($('preview').checked){
        $('preview').checked=false;
        marker.object3D.add(sceneRoot);
        sceneRoot.rotation.set(AR_IMAGE_ROTATION_X,0,0);
        $('animation').textContent='Animation';
        $('animation').setAttribute('aria-pressed','false');
      }
      log(firstDetection
        ? 'Image détectée : animation lancée dans le sens de l’escalier'
        : 'Image retrouvée : animation reprise');
    });
    marker.addEventListener('markerLost',()=>{
      tracked=false;
      log(animationStarted
        ? 'Image perdue : animation en pause, en attente de reprise'
        : 'Image perdue : en attente de détection');
    });
    marker.addEventListener('arjs-nft-loaded',()=>log('NFT chargé : filme l’image des escaliers'));
    window.addEventListener('arjs-nft-init-data',event=>{
      const dpi=Number(event.detail?.dpi);
      if(Number.isFinite(dpi)&&dpi>0)pixelToMarkerUnit=25.4/dpi;
    });
    window.addEventListener('error',e=>log('Erreur : '+e.message));
    requestAnimationFrame(render);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
