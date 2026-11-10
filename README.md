# Escalier blanc animé en réalité augmentée

Ce projet utilise les trois fichiers NFT existants dans `assets/` et ne nécessite aucun `.glb`.

- `index.html` : caméra AR.js, marqueur NFT et commandes.
- `script.js` : escalier blanc en 3D et personnage blanc animé.
- `style.css` : interface.

## Tester

Depuis le dossier du projet : `python3 -m http.server 8000`, puis `http://localhost:8000` sur le même ordinateur. Sur téléphone, utiliser GitHub Pages en HTTPS (ou une configuration HTTPS locale). Afficher `assets/image-reference.png` sur un autre écran.

## Réglages

Le bouton « Réglages » permet de déplacer l'ensemble, de changer l'échelle et la vitesse. Le dessin des marches et le parcours sont définis dans `points` et `route` dans `script.js`. Si le personnage est mal aligné, ajuster ces coordonnées.

La reconnaissance NFT dépend de l'image et des conditions d'éclairage. Le rendu n'a pas été testé sur un téléphone réel.

## Nouveauté : sauts
Le bonhomme est 28 % plus grand et saute en arc entre chaque palier. Réglages dans `script.js` : `WALKER_SCALE = 1.28` et `JUMP_HEIGHT = 95`. Les fichiers NFT sont inchangés.
