# Publier Pixel Coloriage Kids (Google Play et Amazon Appstore)

L'app Android est une coquille Capacitor autour du site (`public/`). La version des stores
(`dist-store/`, produite par `npm run build:store`) n'inclut **pas** les dessins de personnages
sous licence (Pokémon, Minecraft, Star Wars, jeux vidéo) : seuls les dessins originaux y sont.

## 1. Construire l'app (automatique)

Le workflow GitHub **Android** (`.github/workflows/android.yml`) construit l'app à chaque push sur `main`,
à chaque PR et sur demande (onglet *Actions* → *Android* → *Run workflow*). L'artefact
`pixel-coloriage-1.0.N` (onglet *Actions*, en bas de l'exécution) contient :

| Fichier | Usage |
|---|---|
| `pixel-coloriage-release.aab` | Google Play (Android App Bundle) |
| `pixel-coloriage-release.apk` | Amazon Appstore |
| `pixel-coloriage-debug.apk` | Essai direct sur une tablette (installer le fichier) |

Les versions *release* ne sont signées que si les secrets ci-dessous existent.

## 2. Clé de signature (une seule fois, à garder précieusement)

Sur un ordinateur avec Java :

```sh
keytool -genkey -v -keystore pixel-coloriage.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pixelcoloriage
base64 -w0 pixel-coloriage.jks > keystore.txt      # macOS : base64 -i pixel-coloriage.jks -o keystore.txt
```

Dans GitHub → *Settings* → *Secrets and variables* → *Actions*, créer :

- `KEYSTORE_BASE64` : le contenu de `keystore.txt`
- `KEYSTORE_PASSWORD` : le mot de passe du keystore
- `KEY_ALIAS` : `pixelcoloriage`
- `KEY_PASSWORD` : le mot de passe de la clé

⚠️ Sauvegarder `pixel-coloriage.jks` et les mots de passe hors de l'ordinateur : sans eux, impossible
de publier une mise à jour sur Amazon (Google Play peut gérer la clé via *Play App Signing*, recommandé).

Numéro de version : chaque envoi doit avoir un `versionCode` plus grand. Le workflow utilise
le numéro d'exécution GitHub (`versionCode` N, version `1.0.N`), qui augmente tout seul.

## 3. Google Play

1. Compte développeur : https://play.google.com/console (25 $ US, une fois). Les comptes personnels
   récents doivent faire un **test fermé avec 12 testeurs pendant 14 jours** avant la production.
2. *Créer une application* : nom **Pixel Coloriage Kids**, langue français (Canada), Jeu, Gratuit.
3. *Contenu de l'application* :
   - **Public cible** : 5 ans et moins + 6-8 ans → l'app entre dans le programme **Familles**.
   - **Politique de confidentialité** : https://colorbynumber.filsduchrist16.workers.dev/confidentialite.html
   - **Sécurité des données** : *aucune donnée collectée ni partagée* (aucune permission, pas d'Internet).
   - **Annonces** : non. **Classification du contenu** : questionnaire IARC → « Tout le monde ».
   - Catégorie : *Jeux → Éducatif* (ou *Puzzle*), balises *Coloriage*, *Enfants*.
4. *Fiche du Play Store* : textes dans `store/fiche-fr.md` et `store/listing-en.md`, images :
   - icône `store/icon-512.png`, bannière `store/feature-1024x500.png`
   - captures `store/captures/telephone-*.png` et `tablette-*.png`
5. *Tests → Test fermé* : téléverser `pixel-coloriage-release.aab`, puis production après la période de test.

L'identifiant `com.pixelcoloriage.kids` est définitif une fois publié.

## 4. Amazon Appstore (tablettes Fire)

1. Compte gratuit : https://developer.amazon.com
2. *Add new app* → Android → même nom, catégorie *Games → Educational*.
3. Téléverser `pixel-coloriage-release.apk` (signé avec la même clé que ci-dessus).
4. *Content rating* : pas de violence, pas de collecte de données ; cocher *Kids* (« designed for children »).
5. Mêmes textes, icône 512, captures (Amazon accepte 1280×800 → `tablette-*.png`) et URL de confidentialité.

## 5. Régénérer les images

```sh
npm run build:store
(cd public && python3 -m http.server 8765 &)      # pour les icônes
(cd dist-store && python3 -m http.server 8766 &)  # pour les captures
node tools/store/assets.js        # icônes, splash Android, bannière
node tools/store/screenshots.js   # captures téléphone et tablette
```

## 6. Essai local

`npm run android:sync` puis ouvrir `android/` dans Android Studio (▶︎ sur une tablette branchée).
