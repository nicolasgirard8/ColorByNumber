# Pixel Coloriage Kids 🎨

Jeu de coloriage par numéros pour enfants, inspiré de *Color By Number*.
Choisis un dessin, sélectionne une couleur numérotée et touche les cases portant le même numéro jusqu'à révéler l'image.

## Fonctionnalités

- **Galerie** par thèmes : dinosaures, véhicules, police, soccer, hockey, animaux, espace, océan, aventure, et un onglet « Mes coloriages » (en cours et terminés).
- **34 grands dessins originaux** de 80 à 100 cases de côté, tous au même niveau de qualité : style dessin animé, contour noir d'une case, grands yeux brillants, couleurs franches (8 à 18 numéros).
- **Coloriage au doigt ou à la souris** : un appui colorie une case, un glissé déplace l'image ; garde le doigt appuyé un instant puis glisse pour colorier plusieurs cases d'un coup (un rond de la couleur choisie entoure alors le doigt).
- **Zoom** : pincement à deux doigts, molette, boutons ＋ / － / ⤢ ; un appui sur un dessin trop petit zoome directement dessus.
- Les cases de la couleur choisie sont **bien visibles** : bord de la vraie couleur, centre pâle qui pulse doucement, même dézoomé ; les autres cases s'estompent. Une couleur ne peut colorier que les cases de son propre numéro.
- **Palette** avec anneau de progression, coche ✓ et passage automatique à la couleur suivante.
- **Bonus** : 🔍 loupe pour trouver une case, 🪣 seau pour remplir une zone, 💣 bombe pour colorier autour. Chaque dessin terminé rapporte un seau et une bombe.
- **Profils** : « Qui joue ? » au démarrage, un avatar et un prénom par enfant ; chacun a sa progression, ses bonus et son album.
- **Fin de dessin** : confettis, ralenti du coloriage, puis **le dessin prend vie** selon son thème (le T-rex piétine et rugit, le camion vrombit, le requin nage dans les bulles, les pierres scintillent…) ; téléchargement de l'image en PNG.
- **Album d'autocollants** 📒 : chaque dessin terminé devient un autocollant, rangé par pages thématiques ; les dessins restants apparaissent en gris.
- **Tes images** : transforme une image enregistrée sur la tablette en coloriage. Style « Dessin » (fond retiré, contour noir : idéal pour un dessin trouvé sur le web, pour usage privé) ou « Photo » (toute l'image), taille et nombre de couleurs au choix.
- **Sauvegarde automatique** de la progression dans le navigateur (stockage protégé contre l'effacement automatique), sons synthétisés (désactivables), fonctionne **hors ligne** et s'installe comme une application (PWA).

## Qualité des images

- **Exigence** : aucun dessin en dessous de la qualité des images importées (le lézard feuille, le petit hockeyeur). Les anciens petits pixel arts, scènes, pierres, mandalas et emojis ont été retirés, ainsi que les personnages de marques (Pokémon, Star Wars, Minecraft, jeux vidéo).
- **Dessins vectoriels** `tools/sprites/hq-*.svg` : personnages originaux dessinés à la main en SVG (traits `#1b1b22`, couleurs plates, ombre peinte à la main en `data-noshade="1"`), convertis en grilles par `tools/sprites/build.js` : trait d'une case sans coins doublés, contour extérieur net, couleurs réunies.
- **Images importées** `tools/sprites/ia-*.svg` (`data-raster`) : illustrations PNG/JPG converties (fond retiré, couleurs regroupées, traits noirs gardés).
- **Peu de cases isolées** ; un dessin déjà terminé reste terminé quand son image est améliorée ; un dessin en cours garde les cases encore justes.

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
| `public/js/sprites.js` | Dessins de la galerie (généré par `tools/sprites/build.js`, ne pas modifier à la main) |
| `public/js/generators.js` | Conversion d'images en grille numérotée (`Gen.convert`) |
| `public/js/audio.js` | Effets sonores |
| `public/js/app.js` | Galerie, jeu, gestes, sauvegarde, écran de fin |
| `public/sw.js`, `public/manifest.webmanifest` | Mode hors ligne et installation |
| `wrangler.jsonc`, `public/_headers` | Déploiement Cloudflare |

### Ajouter un dessin

Dessine un SVG `tools/sprites/hq-…svg` (traits `#1b1b22` de 4 d'épaisseur, couleurs plates, `data-noshade="1"`) avec `data-id`, `data-name`, `data-cat` et `data-size="100"` ; les sourires sont des formes pleines (une ligne seule disparaît en pixels). Ou importe une illustration : `tools/sprites/ia-…svg` avec `data-raster="images/…png"`. Puis, avec `python3 -m http.server 8765` lancé dans `public/` :

```bash
node tools/sprites/build.js --preview apercu.png hq-dragon   # aperçu
node tools/sprites/build.js                                  # régénère public/js/sprites.js
```

## App Android (Google Play, Amazon)

Le dossier `android/` est un projet Capacitor qui embarque la version « store » du site
(`npm run build:store` → `dist-store/`). Le workflow
GitHub *Android* produit l'AAB (Google Play) et l'APK (Amazon). Toutes les étapes de
publication sont dans [STORES.md](STORES.md).
