# Escalier blanc animé en réalité augmentée

Ce projet utilise les trois fichiers NFT existants dans `assets/` et ne nécessite aucun `.glb`.

- `index.html` : caméra AR.js, marqueur NFT et commandes.
- `script.js` : escalier blanc en 3D et personnage blanc animé.
- `style.css` : interface.

## Tester

Depuis le dossier du projet : `python3 -m http.server 8000`, puis `http://localhost:8000` sur le même ordinateur. Sur téléphone, utiliser GitHub Pages en HTTPS (ou une configuration HTTPS locale). Afficher `assets/image-reference.png` sur un autre écran.

## Repère et réglages

L'escalier et le personnage partagent un seul groupe local au marqueur NFT. Le dessin est dans le plan XY : X augmente vers la droite de l'image, et Y vaut `H - yImage`, donc augmente vers le haut. La rotation `IMAGE_PLANE_ROTATION` est à `0` : aucune rotation distincte n'est appliquée à l'escalier ou au personnage. Le groupe reste enfant du marqueur, ce qui conserve son alignement quand la caméra bouge.

Le bouton « Réglages » permet de déplacer l'ensemble, de changer l'échelle et la vitesse. Le dessin des marches et le parcours sont définis par `points` et `route` dans `script.js`. Le parcours commence au niveau du personnage dessiné sur l'image, puis le personnage 3D continue sur l'escalier vers la droite. Les coordonnées de départ de `route` règlent cette superposition ; `WALKER_SCALE` et les dimensions de `createWalker` permettent d'ajuster sa silhouette.

La reconnaissance NFT dépend de l'image et des conditions d'éclairage. Le rendu n'a pas été testé sur un téléphone réel.

## Animation

Le personnage est généré en Three.js, entièrement blanc, et sa taille est réglée par `WALKER_SCALE`. Il marche sur les paliers, puis traverse chaque contremarche avec préparation, impulsion, montée, descente et réception. `JUMP_HEIGHT` règle la hauteur du saut, `FOOT_CLEARANCE` l'alignement vertical des pieds et `STAIR_DEPTH` la profondeur des marches. Après une courte pause au sommet, la boucle repart du bas si « Recommencer automatiquement » est activé.

La détection lance l'animation. Une perte NFT la met en pause ; lorsque l'image est retrouvée, elle reprend. Les fichiers `escalier.fset`, `escalier.fset3` et `escalier.iset` restent inchangés.
