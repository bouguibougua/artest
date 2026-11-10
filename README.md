# Projet AR Escalier

Application AR.js avec suivi d'image NFT et bonhomme 3D procédural. Aucun GLB requis.

## Démarrage
1. Héberger l'ensemble du dossier via HTTPS (GitHub Pages) ; ne pas ouvrir index.html directement depuis le Finder.
2. Sur téléphone, ouvrir le lien et autoriser la caméra.
3. Scanner **la même image** que celle utilisée pour générer les fichiers NFT (image-reference.png).
4. Cliquer sur Réglages et activer « Afficher le tracé de calibrage » si le parcours n'est pas aligné.
5. Ajuster décalages X/Y et échelle du parcours. Les positions sont une approximation initiale.

## Important
- Les fichiers `escalier.fset`, `escalier.fset3`, `escalier.iset` doivent rester ensemble.
- Le suivi NFT d'AR.js dépend de la qualité de l'image, de la lumière, du navigateur et de la version des scripts.
- Le système suit un parcours **2,5D sur le plan de l'image**, et non des marches 3D réelles.
- Le personnage bouge de façon procédurale, sans squelette GLB. Les montées verticales du dessin sont suivies par translation, pas par une simulation physique de marche.
- La position exacte dans le repère NFT ne peut pas être garantie sans un test caméra sur l'appareil cible.
- Si le parcours apparaît inversé verticalement, activer « Inverser l'axe vertical ».
- Si le site ne charge pas, vérifier les erreurs dans la console du navigateur et que les fichiers ne renvoient pas de 404.
