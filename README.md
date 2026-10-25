# Coloriage Magique 🎨

Jeu de coloriage par numéros pour enfants, inspiré de *Color By Number*.
Choisis un dessin, sélectionne une couleur numérotée et touche les cases portant le même numéro jusqu'à révéler l'image.

## Fonctionnalités

- **Galerie** par thèmes : animaux, nourriture, nature, objets, mandalas, et un onglet « Mes coloriages » (en cours et terminés).
- **Plus de 60 dessins** : 20 pixel arts faits main, 8 mandalas générés et une quarantaine d'emojis convertis en pixel art (selon les polices de l'appareil).
- **Coloriage au doigt ou à la souris** : touche ou glisse pour colorier plusieurs cases d'un coup.
- **Zoom** : pincement à deux doigts, molette, boutons ＋ / － / ⤢ ; un appui sur un dessin trop petit zoome directement dessus.
- Les cases de la couleur choisie sont **mises en évidence** ; une mauvaise couleur reste visible en transparence avec son numéro.
- **Palette** avec anneau de progression, coche ✓ et passage automatique à la couleur suivante.
- **Bonus** : 🔍 loupe pour trouver une case, 🪣 seau pour remplir une zone, 💣 bombe pour colorier autour. Chaque dessin terminé rapporte un seau et une bombe.
- **Fin de dessin** : confettis, ralenti du coloriage et téléchargement de l'image en PNG.
- **Tes photos** : transforme une photo en coloriage (taille et nombre de couleurs au choix).
- **Sauvegarde automatique** de la progression dans le navigateur, sons synthétisés (désactivables), fonctionne **hors ligne** et s'installe comme une application (PWA).

## Lancer le jeu

Aucune installation ni compilation : ce sont des fichiers HTML/CSS/JS statiques.

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Pour jouer sur tablette ou téléphone, publie le dossier sur n'importe quel hébergement statique (GitHub Pages, Netlify…) puis utilise « Ajouter à l'écran d'accueil ».

## Organisation

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure des écrans |
| `css/style.css` | Style |
| `js/art.js` | Dessins pixel art faits main |
| `js/generators.js` | Mandalas, conversion emoji / photo en grille numérotée |
| `js/audio.js` | Effets sonores |
| `js/app.js` | Galerie, jeu, gestes, sauvegarde, écran de fin |
| `sw.js`, `manifest.webmanifest` | Mode hors ligne et installation |

### Ajouter un dessin

Ajoute une entrée dans `js/art.js` : chaque lettre de `rows` est une couleur définie dans `colors`, `.` est une case vide.

```js
{
  id: 'coeur', name: 'Cœur', cat: 'objets',
  colors: { R: '#e53950', W: '#ffd6dc' },
  rows: ['.RR.RR.', 'RWRRRRR', '.RRRRR.', '..RRR..', '...R...'],
}
```
