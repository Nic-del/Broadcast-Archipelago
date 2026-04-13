# BroadCast Archipelago - Notification System

Ce système est un outil de notification premium conçu pour les sessions **Archipelago Multiworld**. Il permet d'afficher en temps réel les objets envoyés et reçus durant votre partie avec une esthétique soignée et moderne.

## 🛠️ Comment ça marche ?

Le système repose sur trois composants principaux qui travaillent ensemble :

### 1. Le Control Center (`BroadCast-Archipelago.pyw`)

C'est le "cerveau" visuel. Cette interface vous permet de :

- Configurer vos informations de connexion (Serveur, Slot, Mot de passe).
- Choisir sur quel écran afficher les notifications.
- Ajuster la taille et la position exacte de la fenêtre de broadcast.
- Choisir le mode de filtrage (voir tous les objets ou seulement les vôtres).

### 2. Le Bridge (`broadcast/bridge.py`)

C'est un composant invisible qui tourne en arrière-plan :

- Il maintient la connexion avec le serveur **Archipelago**.
- Il traduit les messages techniques du serveur en notifications lisibles (ex: "Link a envoyé une Épée Master à Zelda").
- Il distribue ces informations à la partie visuelle via un serveur WebSocket local.

### 3. L'App de Broadcast (`broadcast-app`)

C'est la couche visuelle (développée en Vite + Electron) :

- Elle reçoit les données du Bridge.
- Elle affiche des notifications élégantes avec des animations fluides.
- Elle est optimisée pour être transparente et s'intégrer parfaitement par-dessus votre jeu ou dans **OBS**.

---

## ⚙️ Installation

Avant de lancer le système pour la première fois, vous devez installer les dépendances nécessaires. Des scripts automatisés sont fournis pour vous faciliter la tâche :

1.  **`INSTALLATION.bat`** : Lance l'installation complète. C'est le script à utiliser pour une première installation.
2.  **`INSTALL_PYTHON_ONLY.bat`** : Installe uniquement les bibliothèques Python (`websockets`, `psutil`). _Nécessite Python 3.12 installé._
3.  **`INSTALL_NODE_ONLY.bat`** : Installe uniquement les modules Node.js pour l'interface visuelle. _Nécessite Node.js installé._

---

## 🚀 Utilisation

### Mode Standard (Interface de Contrôle)

1.  **Lancement** : Exécutez le fichier `BroadCast-Archipelago.pyw`.
2.  **Configuration** :
    - Entrez l'adresse du serveur (ex: `archipelago.gg:38210`).
    - Entrez votre nom de Slot (joueur).
    - Réglez la position de la fenêtre (prévisualisée sur le petit rectangle noir).
3.  **Démarrage** : Cliquez sur **START SYSTEM**.
    - Les processus nécessaires vont se lancer automatiquement.
    - Une fenêtre de broadcast apparaîtra sur l'écran sélectionné.

### Mode Rapide (Headless)

Une fois que vous avez configuré vos informations une première fois via le Control Center, vous n'êtes plus obligé de passer par lui.

- Vous pouvez lancer directement le fichier **`Start_CLI.bat`**.
- Cela lancera le système en arrière-plan en utilisant vos derniers réglages sauvegardés dans `broadcast_settings.json`.
- C'est idéal pour un démarrage instantané une fois que tout est bien réglé.

---

## 🎭 Modes de Tracking

- **All Items** : Affiche absolument tout ce qui se passe dans le Multiworld (Idéal pour les commentateurs ou le chaos).
- **My Items** : Affiche uniquement les objets que vous envoyez ou que vous recevez.
- **OBS Mode** : Optimisé pour les streamers. Vous pouvez intégrer l'URL suivante dans OBS comme "Source Navigateur" pour un rendu professionnel :
  `http://localhost:5173/?mode=obs`

---

## 📝 Configuration Requise

- **Python 3.12** (pour le Bridge et le Launcher).
- **Node.js** (pour le moteur de rendu visuel).
- Les dépendances installées via les scripts `.bat` fournis dans le dossier.
