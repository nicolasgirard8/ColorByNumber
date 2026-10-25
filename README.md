# Coloriage Magique 🎨

Jeu de coloriage par numéros pour enfants, inspiré de *Color By Number*.
Choisis un dessin, sélectionne une couleur numérotée et touche les cases portant le même numéro jusqu'à révéler l'image.

## Fonctionnalités

- **Galerie** par thèmes : dinosaures, véhicules, espace, océan, aventure, pierres précieuses, Minecraft, Pokémon, Star Wars, jeux vidéo, animaux, nourriture, nature, objets, mandalas, et un onglet « Mes coloriages » (en cours et terminés).
- **197 dessins**, dont **16 pierres précieuses sans contour** (diamant, rubis, émeraude, saphir, améthyste, topaze, citrine, aigue-marine, quartz rose, péridot, grenat, tanzanite, tourmaline, perle, opale et un trésor qui les réunit), dont **51 scènes XXL plein écran** (64×48 ou 48×64 cases : dinosaures, camions de pompiers, monster trucks, fusées, requins, dragons, robots, super-héros, ninjas, pirates…), 64 grands dessins jeux vidéo (18 Minecraft, 12 Pokémon, 16 Star Wars, 18 autres dont Mario, Sonic, Kirby, Zelda et Fortnite, de 32×32 à 56×24), 20 pixel arts faits main, 8 mandalas générés et une quarantaine d'emojis convertis en pixel art (selon les polices de l'appareil).
- **Coloriage au doigt ou à la souris** : un appui colorie une case, un glissé déplace l'image ; garde le doigt appuyé un instant puis glisse pour colorier plusieurs cases d'un coup (un rond de la couleur choisie entoure alors le doigt).
- **Zoom** : pincement à deux doigts, molette, boutons ＋ / － / ⤢ ; un appui sur un dessin trop petit zoome directement dessus.
- Les cases de la couleur choisie sont **bien visibles** : bord de la vraie couleur, centre pâle qui pulse doucement, même dézoomé ; les autres cases s'estompent. Une couleur ne peut colorier que les cases de son propre numéro.
- **Palette** avec anneau de progression, coche ✓ et passage automatique à la couleur suivante.
- **Bonus** : 🔍 loupe pour trouver une case, 🪣 seau pour remplir une zone, 💣 bombe pour colorier autour. Chaque dessin terminé rapporte un seau et une bombe.
- **Profils** : « Qui joue ? » au démarrage, un avatar et un prénom par enfant ; chacun a sa progression, ses bonus et son album.
- **Fin de dessin** : confettis, ralenti du coloriage, puis **le dessin prend vie** selon son thème (le T-rex piétine et rugit, le camion vrombit, le requin nage dans les bulles, les pierres scintillent…) ; téléchargement de l'image en PNG.
- **Album d'autocollants** 📒 : chaque dessin terminé devient un autocollant, rangé par pages thématiques ; les dessins restants apparaissent en gris.
- **Tes photos** : transforme une photo en coloriage (taille et nombre de couleurs au choix).
- **Sauvegarde automatique** de la progression dans le navigateur (stockage protégé contre l'effacement automatique), sons synthétisés (désactivables), fonctionne **hors ligne** et s'installe comme une application (PWA).

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
| `public/js/games.js` | Dessins jeux vidéo, tracés avec un petit « pinceau » (formes, textures, contours, calques) ; les dessins générés sont gardés sur l'appareil |
| `public/js/gems.js` | Pierres précieuses : tailles brillant, à degrés, cristal, perle et opale |
| `public/js/scenes.js` | Scènes XXL : décors et personnages réutilisables (agrandis, retournés, recolorés) |
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
