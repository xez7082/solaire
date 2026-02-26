# ☀️ Solaire Card (HACS)

Une carte Home Assistant personnalisée pour la gestion de l'énergie solaire, avec un design néon "Cyber" et un éditeur visuel intégré. Cette carte permet de centraliser vos flux photovoltaïques, vos batteries et votre consommation réseau.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

## ✨ Caractéristiques
- **Éditeur Visuel** : Plus besoin de modifier le YAML pour changer vos capteurs ou vos couleurs.
- **Design Néon** : Bordures luminescentes et transparence optimisée.
- **Flux Énergétiques** : Visualisation en temps réel de la puissance (W).
- **Compatible HACS** : Installation et mise à jour simplifiées.

## 🛠 Dépendances requises
Pour un rendu optimal, il est fortement recommandé d'installer également ces cartes via HACS :
* `layout-card` (pour la structure en grille)
* `card-mod` (pour les effets CSS avancés)

## 🚀 Installation

### Méthode 1 : Via HACS (Recommandé)
1. Ouvrez **HACS** dans votre Home Assistant.
2. Cliquez sur les **3 points** en haut à droite > **Dépôts personnalisés**.
3. Collez l'URL de votre dépôt GitHub : `https://github.com/VOTRE_NOM/solaire`.
4. Sélectionnez la catégorie **Plugin (Lovelace)**.
5. Cliquez sur **Ajouter**, puis installez la carte "Solaire Card".
6. **Redémarrez** votre interface (ou videz le cache du navigateur).

### Méthode 2 : Manuelle
1. Téléchargez le fichier `dist/solaire-card.js`.
2. Placez-le dans votre dossier `www/community/solaire/`.
3. Ajoutez la ressource dans vos paramètres Dashboard : `/local/community/solaire/solaire-card.js`.

## ⚙️ Configuration (Éditeur Visuel)
Une fois installée, ajoutez une nouvelle carte à votre tableau de bord et recherchez **"Solaire Card"**. Vous pourrez configurer directement :
- Vos entités de production (Maison, Spa, IBC).
- La couleur des bordures (ex: `#00ffff`).
- La vitesse des animations de flux.

## 📄 Exemple de code (Manuel)
Si vous préférez utiliser l'éditeur YAML :
```yaml
type: custom:solaire-card
sensor_pv1: sensor.beem_maison_puissance
border_color: "#00ffff"
animation_speed: 0.5
