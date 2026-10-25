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
python3 -m http.server 8000 --directory public
# puis ouvrir http://localhost:8000
```

Pour jouer sur tablette ou téléphone, ouvre le site publié puis utilise « Ajouter à l'écran d'accueil ».

## Déploiement sur Cloudflare

Le site est dans `public/` et `wrangler.jsonc` indique à Cloudflare de le servir tel quel (aucune compilation).

Projet **Workers** relié à GitHub (Workers Builds) :

- Dépôt : `nicolasgirard8/ColorByNumber`, branche de production `main`
- Commande de build : *(vide)*
- Commande de déploiement : `npx wrangler deploy`
- Le nom du projet Cloudflare doit être identique à `name` dans `wrangler.jsonc` (`colorbynumber`).

Projet **Pages** relié à GitHub :

- Framework : *None*, commande de build : *(vide)*
- Répertoire de sortie : `public`

Depuis un ordinateur : `npx wrangler deploy`.

`public/_headers` empêche la mise en cache de la page et du service worker pour que les mises à jour arrivent tout de suite.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `public/index.html` | Structure des écrans |
| `public/css/style.css` | Style |
| `public/js/art.js` | Dessins pixel art faits main |
| `public/js/generators.js` | Mandalas, conversion emoji / photo en grille numérotée |
| `public/js/audio.js` | Effets sonores |
| `public/js/app.js` | Galerie, jeu, gestes, sauvegarde, écran de fin |
| `public/sw.js`, `public/manifest.webmanifest` | Mode hors ligne et installation |
| `wrangler.jsonc`, `public/_headers` | Déploiement Cloudflare |

### Ajouter un dessin

Ajoute une entrée dans `public/js/art.js` : chaque lettre de `rows` est une couleur définie dans `colors`, `.` est une case vide.

```js
{
  id: 'coeur', name: 'Cœur', cat: 'objets',
  colors: { R: '#e53950', W: '#ffd6dc' },
  rows: ['.RR.RR.', 'RWRRRRR', '.RRRRR.', '..RRR..', '...R...'],
}
```
