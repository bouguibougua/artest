# Escalier blanc animé en réalité augmentée

Ce projet utilise les trois fichiers NFT existants dans `assets/` et ne nécessite aucun `.glb`.

- `index.html` : caméra AR.js, marqueur NFT et commandes.
- `script.js` : escalier blanc en 3D et personnage blanc animé.
- `style.css` : interface.

## Tester

Depuis le dossier du projet : `python3 -m http.server 8000`, puis `http://localhost:8000` sur le même ordinateur. Sur téléphone, utiliser GitHub Pages en HTTPS (ou une configuration HTTPS locale). Afficher `assets/image-reference.png` sur un autre écran.

## Repère et réglages

L'escalier et le personnage partagent un seul groupe local enfant du marqueur NFT. AR.js place le plan de l'image en XZ, avec Y comme normale au marqueur. Les formes et le parcours sont définis en pixels dans un plan de dessin XY (X vers la droite, Y calculé depuis `H - yImage`), puis le groupe partagé reçoit une rotation de `-90°` autour de X pour les convertir en XZ. L'échelle convertit les pixels en millimètres (`25,4 / DPI`), en utilisant le DPI transmis par AR.js (72 par défaut). La profondeur du modèle devient ainsi un décalage selon la normale du marqueur. Cette rotation est appliquée une seule fois à l'ensemble, pas indépendamment aux marches et au personnage. En mode aperçu, la rotation est remise à zéro pour afficher le dessin face à la caméra.

Le bouton « Réglages » permet de déplacer l'ensemble, de changer l'échelle et la vitesse. Les décalages de l'interface restent exprimés en pixels et sont convertis vers les unités du marqueur. Le dessin des marches et le parcours sont définis par `points` et `route` dans `script.js`. Le parcours commence au niveau du personnage dessiné sur l'image, puis le personnage 3D continue sur l'escalier vers la droite. Les coordonnées de départ de `route` règlent cette superposition.

La reconnaissance NFT dépend de l'image et des conditions d'éclairage. Le rendu n'a pas été testé sur un téléphone réel.

## Animation

Le personnage est généré en Three.js, entièrement blanc. `WALKER_SCALE` est le facteur global demandé (1,3) ; `WALKER_GEOMETRY_SCALE` adapte les dimensions locales pour que le personnage conserve une taille cohérente avec l'image. Il marche sur les paliers, puis traverse chaque contremarche avec préparation, impulsion, montée, descente et réception. `JUMP_HEIGHT` règle la hauteur du saut, `FOOT_CLEARANCE` l'alignement vertical des pieds et `STAIR_DEPTH` la profondeur des marches. Après une courte pause au sommet, la boucle repart du bas si « Recommencer automatiquement » est activé.

La détection lance l'animation. Une perte NFT la met en pause ; lorsque l'image est retrouvée, elle reprend. Les fichiers `escalier.fset`, `escalier.fset3` et `escalier.iset` restent inchangés.
