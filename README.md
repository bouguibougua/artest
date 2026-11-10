# Escalier AR — version de diagnostic

Cette version réutilise les **trois fichiers NFT originaux fournis**, renommés `escalier.fset`, `escalier.fset3`, `escalier.iset`. Ils ne sont pas recalculés : leur présence ne garantit pas que le dessin soit assez riche pour être reconnu.

## Test
1. Ouvrir un terminal dans ce dossier : `python3 -m http.server 8000`.
2. Ouvrir `http://localhost:8000` sur l’ordinateur, ou publier sur GitHub Pages pour tester sur smartphone (HTTPS requis).
3. Autoriser la caméra. Montrer l'image **image-reference.png**, entière, depuis un autre écran ou imprimée, bien éclairée.
4. Cliquer sur **Animation** pour lancer l'aperçu du bonhomme sans marqueur ; cliquer sur **Mode AR** pour revenir au suivi de l'image.
5. Cliquer **Diagnostic** : vérifier que les trois fichiers indiquent OK. Si aucun événement `Image reconnue` n'arrive malgré cela, le problème est vraisemblablement la qualité des descripteurs ou le manque de détails de l'image.
6. Après détection, l'illustration `assets/archer.png` apparaît en haut à gauche de la scène AR, pendant que le personnage continue son parcours. Garder l'image de référence visible pour maintenir le suivi.
7. Le tracé et le personnage sont une **première approximation** à calibrer après détection. Utiliser les curseurs pour ajuster.

## Important
Le dessin à grandes zones uniformes peut être difficile pour le suivi NFT. Si le suivi échoue, créer un **marqueur .patt avec bordure** (méthode différente), ou une nouvelle image plus riche en détails puis régénérer les trois descripteurs.
