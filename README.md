# 🚀 BroadCast Archipelago - Universal Premium Overlay

BroadCast Archipelago est un outil de notification haut de gamme conçu pour les sessions **Archipelago Multiworld**. Il affiche en temps réel les objets envoyés et reçus avec une esthétique moderne, fluide et entièrement personnalisable.

---

## ✨ Nouvelles Fonctionnalités (v1.0.4)

### 👥 Filtrage Intelligent & Suivi par Joueur
- **Mode Filtered** : Marre du spam dans les gros Multiworlds ? Sélectionnez précisément les joueurs que vous souhaitez "suivre".
- **Tracked Players** : Gérez votre liste de suivi directement depuis l'overlay ou via le lanceur.
- **Réduction du Bruit** : Filtrez les notifications pour ne voir que ce qui compte pour vous ou votre groupe.

### ⚙️ Panneau de Contrôle In-Overlay
- **Réglages en Direct** : Plus besoin de relancer l'app ! Changez votre mode de synchronisation (**Global**, **Personal**, **Filtered**) via l'icône d'engrenage sur l'overlay.
- **Double Synchro** : Configurez des modes différents pour votre **Overlay Bureau** et votre **Source Navigateur OBS**.
- **Gestion des Slots** : Changez de profil (Slot) instantanément sans déconnexion manuelle.

---

## 🐧 Spécificités Linux & Steam Deck (Bazzite)
Cette édition est optimisée pour les distributions Linux, y compris les systèmes immuables comme **Bazzite** ou **SteamOS** :
- 🏗️ **Mode Hybride** : Support du serveur OBS via Python natif si Node.js n'est pas disponible.
- 🛡️ **Sandbox Bypass** : Pré-configuré avec `--no-sandbox` pour éviter les erreurs de SUID sur Linux.
- 📦 **AppImage Support** : Détection automatique des builds AppImage pour une installation sans dépendances.

---

## 🛠️ Architecture du Système

1.  **Control Center (`BroadCast-Archipelago.py`)** : L'interface de configuration visuelle pour positionner l'overlay et régler la connexion.
2.  **The Bridge (`broadcast/bridge.py`)** : Le cœur du système qui maintient la connexion avec le serveur Archipelago et gère le filtrage des données.
3.  **Broadcast App (`broadcast-app`)** : La couche visuelle (Vite + React + Framer Motion) offrant des animations fluides à 60 FPS.

---

## ⚙️ Installation

### Windows
1. Lancez `INSTALLATION.bat` pour installer Python et les dépendances Node.js.
2. Utilisez `BroadCast-Archipelago.py` pour configurer vos accès.

### Linux / Steam Deck
1. Donnez les permissions d'exécution : `chmod +x INSTALLATION.sh`
2. Lancez `./INSTALLATION.sh`.
3. Lancez le système avec `python3 BroadCast-Archipelago.py`.

---

## 🚀 Utilisation Rapide

> [!TIP]
> **Mode Headless** : Une fois configuré, vous pouvez lancer le système instantanément sans interface de contrôle via :
> `python3 start_cli.py` (Linux) ou `start_cli.bat` (Windows).

### Modes de Synchronisation :
- **All Items (Global)** : Affiche absolument tout le trafic du Multiworld.
- **Filtered Items** : Affiche uniquement les objets des joueurs dans votre "Tracked List".
- **My Items (Personal)** : Affiche uniquement ce que vous envoyez ou recevez.

---

## 📝 Pré-requis
- **Python 3.12+**
- **Node.js 20+** (Recommandé pour l'overlay dynamique)
- **Visual C++ Redistributable** (Pour Windows)

---

<div align="center">
  <img width="400" alt="Capture d'écran 1" src="https://github.com/user-attachments/assets/0f35b070-1aed-45f5-8fd0-925cb91b2482" />
  <img width="300" alt="Capture d'écran 2" src="https://github.com/user-attachments/assets/2268cf3b-ff7b-4131-a49a-4ec43cd16164" />
</div>

