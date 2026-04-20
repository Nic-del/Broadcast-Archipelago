import asyncio
import json
import websockets
import argparse
import os
import sys
import logging

# Silence the noisy websockets handshake errors
logging.getLogger('websockets.server').setLevel(logging.CRITICAL)

# --- Archipelago Constants ---
AP_VERSION = {"major": 0, "minor": 6, "build": 7, "class": "Version"}

# OPTIMIZATION: Set low priority for this process to not impact the game
import platform
if platform.system() == "Windows":
    try:
        import psutil
        p = psutil.Process(os.getpid())
        p.nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
    except:
        # Fallback without psutil
        try:
            import win32api, win32process, win32con
            handle = win32api.OpenProcess(win32con.PROCESS_ALL_ACCESS, True, os.getpid())
            win32process.SetPriorityClass(handle, win32process.BELOW_NORMAL_PRIORITY_CLASS)
        except: pass

# --- Track connected UI clients ---
UI_CLIENTS = set()

async def register_ui(websocket):
    UI_CLIENTS.add(websocket)
    # Immediately send the current room state if we are already connected to AP
    if hasattr(websocket, 'ap_client'):
        c = websocket.ap_client
        # Load latest settings to sync the UI modes
        overlay_mode, obs_mode, tracked_players = "all", "all", []
        try:
            settings_path = "broadcast_settings.json"
            if os.path.exists(settings_path):
                with open(settings_path, "r") as f:
                    s = json.load(f)
                    overlay_mode = s.get("sync_mode", "all")
                    obs_mode = s.get("obs_sync_mode", "all")
                    tracked_str = s.get("tracked_players", "")
                    if tracked_str:
                        tracked_players = [p.strip() for p in tracked_str.split(",") if p.strip()]
        except: pass

        await websocket.send(json.dumps({
            "type": "room_info", 
            "players": list(c.player_names.values()),
            "current_player": c.my_alias,
            "profiles": list(c.profiles.keys()),
            "current_slot": c.slot,
            "overlay_sync_mode": overlay_mode,
            "obs_sync_mode": obs_mode,
            "tracked_players": tracked_players
        }))
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get("type") == "clear_history":
                    await broadcast_to_ui({"type": "clear_history"})
                elif data.get("type") == "notification":
                    await broadcast_to_ui(data)
                elif data.get("type") == "change_slot":
                    new_slot = data.get("slot")
                    if new_slot:
                        # Find the password for this slot if we have it
                        new_pass = websocket.ap_client.profiles.get(new_slot, "")
                        print(f"Switching to slot: {new_slot}")
                        if hasattr(websocket, 'ap_client'):
                            websocket.ap_client.slot = new_slot
                            websocket.ap_client.password = new_pass
                            websocket.ap_client.switching_slot = True
                            if websocket.ap_client.ws:
                                await websocket.ap_client.ws.close()
                elif data.get("type") == "change_player":
                    new_alias = data.get("player")
                    if new_alias:
                        # Find the slot ID for this alias if we can
                        # But mostly we just need the alias for filtering
                        print(f"Switching main player to: {new_alias}")
                        # We need access to the ArchipelagoClient instance to change its alias
                        # I'll pass it in register_ui or make it global
                        if hasattr(websocket, 'ap_client'):
                            websocket.ap_client.my_alias = new_alias
                            await broadcast_to_ui({"type": "notification", "event": "normal", "text": f"Tracking player: {new_alias}"})
                elif data.get("type") == "update_sync_mode":
                    target = data.get("target") # "overlay" or "obs"
                    new_mode = data.get("mode")
                    if target in ["overlay", "obs"] and new_mode in ["all", "personal", "filtered"]:
                        try:
                            settings_path = "broadcast_settings.json"
                            settings = {}
                            if os.path.exists(settings_path):
                                with open(settings_path, "r") as f:
                                    settings = json.load(f)
                            
                            key = "sync_mode" if target == "overlay" else "obs_sync_mode"
                            settings[key] = new_mode
                            
                            with open(settings_path, "w") as f:
                                json.dump(settings, f, indent=4)
                            
                            # Update ap_client if it's the bridge mode (overlay)
                            # Actually bridge always works in 'all' if needed, but we should notify others
                            await broadcast_to_ui({
                                "type": "room_info", 
                                "players": list(websocket.ap_client.player_names.values()),
                                "current_player": websocket.ap_client.my_alias,
                                "profiles": list(websocket.ap_client.profiles.keys()),
                                "current_slot": websocket.ap_client.slot,
                                "overlay_sync_mode": settings.get("sync_mode", "all"),
                                "obs_sync_mode": settings.get("obs_sync_mode", "all"),
                                "tracked_players": [p.strip() for p in settings.get("tracked_players", "").split(",") if p.strip()]
                            })
                        except Exception as e: print(f"Error updating sync mode: {e}")

                elif data.get("type") == "update_tracked_players":
                    players = data.get("players", [])
                    try:
                        settings_path = "broadcast_settings.json"
                        settings = {}
                        if os.path.exists(settings_path):
                            with open(settings_path, "r") as f:
                                settings = json.load(f)
                        
                        settings["tracked_players"] = ", ".join(players)
                        
                        with open(settings_path, "w") as f:
                            json.dump(settings, f, indent=4)
                        
                        await broadcast_to_ui({
                            "type": "room_info", 
                            "players": list(websocket.ap_client.player_names.values()),
                            "current_player": websocket.ap_client.my_alias,
                            "profiles": list(websocket.ap_client.profiles.keys()),
                            "current_slot": websocket.ap_client.slot,
                            "overlay_sync_mode": settings.get("sync_mode", "all"),
                            "obs_sync_mode": settings.get("obs_sync_mode", "all"),
                            "tracked_players": players
                        })
                    except Exception as e: print(f"Error updating tracked players: {e}")

                elif data.get("type") == "test_fill":
                    # Send 10 test notifications
                    
                    import random
                    items = [
                        ("Master Sword", 0), ("Mirror Shield", 1), ("50 Rupees", 2), 
                        ("Ice Trap", 3), ("Hookshot", 0), ("Bow", 0), 
                        ("Bomb Bag", 1), ("Empty Bottle", 1), ("Green Rupee", 2), ("Heart Container", 0)
                    ]
                    players = ["Link", "Zelda", "Ganon", "Saria", "Darunia", "Ruto"]
                    for i in range(10):
                        item, iclass = random.choice(items)
                        p1, p2 = random.sample(players, 2)
                        await broadcast_to_ui({
                            "type": "notification",
                            "event": "receive",
                            "item": f"Test {item}",
                            "from": p1,
                            "to": p2,
                            "class": iclass,
                            "is_mine": random.choice([True, False]),
                            "my_alias": p2,
                            "is_test": True
                        })
                        await asyncio.sleep(0.1)
            except: pass
    except: pass
    finally: UI_CLIENTS.remove(websocket)

async def broadcast_to_ui(message):
    log_msg = json.dumps(message) if isinstance(message, dict) else str(message)
    if UI_CLIENTS:
        for client in list(UI_CLIENTS):
            try: await client.send(log_msg)
            except: pass
    try:
        with open("broadcast/bridge_notifications.log", "a", encoding="utf-8") as f:
            f.write(log_msg + "\n")
    except: pass

class ArchipelagoClient:
    def __init__(self, server, slot, password=None, filter_mode="all"):
        self.raw_server = server.replace("ws://", "").replace("wss://", "")
        self.slot = slot
        self.password = password
        self.filter_mode = filter_mode # "all" or "personal"
        self.ws = None
        self.player_names = {}
        self.slot_to_game = {}
        self.item_maps = {}
        self.available_games = []
        self.current_game_index = 0
        self.my_alias = slot
        self.is_connected = False
        self.initial_game_hint = None
        self.profiles = {} # slot -> password
        self.switching_slot = False
        self.tracked_players = []

    async def connect(self):
        protocols = [f"wss://{self.raw_server}", f"ws://{self.raw_server}"]
        success = False
        for url in protocols:
            if success: break
            print(f"Connecting to {url}...", flush=True)
            try:
                # Archipelago DataPackages can be very large (>1MB), so we increase the max_size limit
                async with websockets.connect(url, origin="http://localhost", ping_interval=20, ping_timeout=20, max_size=None) as ws:
                    print(f"Connected to {url}!", flush=True)
                    self.ws = ws
                    self.is_connected = True
                    self.switching_slot = False
                    await self.listen()
                    success = True 
            except Exception as e:
                if self.switching_slot:
                    print(f"Switching slot to {self.slot}...")
                else:
                    print(f"Connection error or session ended: {e}", flush=True)
                self.is_connected = False
                if self.ws:
                    try: await self.ws.close()
                    except: pass
                self.ws = None
            
            if not success or self.switching_slot:
                wait_time = 1 if self.switching_slot else 5
                if not self.switching_slot: print(f"Reconnecting in {wait_time} seconds...", flush=True)
                await asyncio.sleep(wait_time)
                self.current_game_index = 0 
                await self.connect()

    async def identify(self, game_name=""):
        hello = [{
            "cmd": "Connect", "password": self.password, "game": game_name,
            "name": self.slot, "items_handling": 7, "uuid": "ArchipelagoBroadcastBridge",
            "tags": ["Tracker"], "version": AP_VERSION
        }]
        await self.ws.send(json.dumps(hello))

    async def listen(self):
        async for message in self.ws:
            packets = json.loads(message)
            for packet in packets:
                cmd = packet.get("cmd")
                if cmd == "RoomInfo":
                    self.available_games = packet.get("games", [])
                    await self.ws.send(json.dumps([{"cmd": "GetDataPackage"}]))
                    
                    # If we already have a cached game name (from args), try it first
                    initial_game = ""
                    if hasattr(self, 'initial_game_hint') and self.initial_game_hint in self.available_games:
                        initial_game = self.initial_game_hint
                        # Remove it from the list so we don't try it twice if it fails
                        self.available_games = [g for g in self.available_games if g != initial_game]
                        self.available_games.insert(0, initial_game) # Move to front
                    
                    await self.identify(self.available_games[0] if self.available_games else "")
                elif cmd == "DataPackage":
                    data = packet.get("data", {})
                    for game, game_data in data.get("games", {}).items():
                        mapping = {str(v): k for k, v in game_data.get("item_name_to_id", {}).items()}
                        self.item_maps[game] = mapping
                elif cmd == "ConnectionRefused":
                    errors = packet.get('errors', [])
                    if "InvalidGame" in errors and self.current_game_index < len(self.available_games) - 1:
                        # Silent hunt: don't print InvalidGame errors while we are still trying other games
                        self.current_game_index += 1
                        await self.identify(self.available_games[self.current_game_index])
                    else:
                        print(f"Connection refused: {errors}", flush=True)
                        # Other errors (InvalidPassword, IncompatibleVersion, etc)
                        await broadcast_to_ui({"type": "notification", "event": "error", "text": f"Connection Refused: {', '.join(errors)}"})
                elif cmd == "Connected":
                    # Find our own alias (the name we have on the server)
                    our_slot_id = packet.get("slot")
                    for p in packet.get("players", []):
                        alias = p["alias"]
                        self.player_names[str(p["slot"])] = alias
                        if p["slot"] == our_slot_id: self.my_alias = alias
                    
                    # Store game mapping for each slot
                    slot_info = packet.get("slot_info", {})
                    for s_id, info in slot_info.items():
                        self.slot_to_game[str(s_id)] = info.get("game", "Unknown")
                    
                    my_game = self.slot_to_game.get(str(our_slot_id), "Unknown")
                    print(f"SUCCESS! Connected as {self.slot} (Game: {my_game})", flush=True)
                    
                    # Load latest sync modes
                    ov_mode, ob_mode = "all", "all"
                    try:
                        settings_path = "broadcast_settings.json"
                        if os.path.exists(settings_path):
                            with open(settings_path, "r") as f:
                                s = json.load(f)
                                ov_mode = s.get("sync_mode", "all")
                                ob_mode = s.get("obs_sync_mode", "all")
                    except: pass

                    # Send full player list and profiles to UI
                    await broadcast_to_ui({
                        "type": "room_info", 
                        "players": list(self.player_names.values()),
                        "current_player": self.my_alias,
                        "profiles": list(self.profiles.keys()),
                        "current_slot": self.slot,
                        "overlay_sync_mode": ov_mode,
                        "obs_sync_mode": ob_mode,
                        "tracked_players": self.tracked_players
                    })
                    
                    await broadcast_to_ui({"type": "notification", "event": "normal", "text": f"Connected to AP as {self.slot} ({my_game})"})
                    
                    # Cache the successful game name in settings
                    try:
                        settings_path = "broadcast_settings.json"
                        if os.path.exists(settings_path):
                            with open(settings_path, "r") as f:
                                settings = json.load(f)
                            settings["last_game"] = my_game
                            with open(settings_path, "w") as f:
                                json.dump(settings, f, indent=4)
                    except: pass
                elif cmd == "PrintJSON":
                    await self.handle_print_json(packet)

    async def handle_print_json(self, packet):
        msg_type = packet.get("type", "Unknown")
        # Do not display hints as notifications
        if msg_type == "Hint":
            return
            
        parts = packet.get("data", [])
        if msg_type in ["ItemSend", "ItemReceive"] or any(p.get("type") in ["item_id", "item_name"] for p in parts):
            item_name, p_from, p_to, item_class = "", "Someone", "Someone", 1
            found_players = []
            for part in parts:
                p_type, text = part.get("type"), part.get("text", "")
                if p_type == "item_id":
                    # Smart lookup: find the game name for the specific player listed in the item part
                    target_player_id = str(part.get("player", ""))
                    target_game = self.slot_to_game.get(target_player_id)
                    
                    if target_game and target_game in self.item_maps:
                        item_name = self.item_maps[target_game].get(text)
                    
                    # Fallback if specific lookup failed
                    if not item_name:
                        for game in self.item_maps:
                            if text in self.item_maps[game]:
                                item_name = self.item_maps[game][text]
                                break
                    
                    if not item_name:
                        item_name = f"Item {text}"
                    
                    flags = part.get("flags", 0)
                    item_class = 0 if flags & 1 else (1 if flags & 2 else (3 if flags & 4 else 2))
                elif p_type == "item_name": item_name = text
                elif p_type == "player_id":
                    p_name = self.player_names.get(str(text), f"Player {text}")
                    found_players.append(p_name)
            
            # Use explicit packet data where available for accurate sender/receiver
            item_data = packet.get("item", {})
            if isinstance(item_data, dict) and "player" in item_data:
                p_from = self.player_names.get(str(item_data["player"]), "Someone")
            elif len(found_players) >= 1:
                p_from = found_players[0]

            recv_col = packet.get("receiving")
            if recv_col:
                p_to = self.player_names.get(str(recv_col), "Someone")
            elif len(found_players) >= 2:
                p_to = found_players[1]
            elif len(found_players) == 1:
                p_to = found_players[0] # Finding their own item

            # --- FILTER LOGIC ---
            if self.filter_mode == "personal":
                # Only show if we are the sender OR the receiver
                if self.my_alias != p_from and self.my_alias != p_to:
                    return # Skip this item

            # --- SMART ROLE DETECTION ---
            is_me_receiving = (p_to == self.my_alias)
            is_me_sending = (p_from == self.my_alias)

            if is_me_receiving:
                event = "receive"
            elif is_me_sending:
                event = "send"
            else:
                event = "receive" if msg_type == "ItemReceive" else "send"

            await broadcast_to_ui({
                "type": "notification", 
                "event": event, 
                "item": item_name, 
                "from": p_from, 
                "to": p_to, 
                "class": item_class,
                "is_mine": (is_me_receiving or is_me_sending),
                "my_alias": self.my_alias, # Send current alias to UI
                "raw_data": packet # Add raw data for UI debugging
            })

def kill_port(port):
    """Forcefully close any process using the specified port on Windows."""
    import subprocess
    import os
    try:
        # Find the PID using the port
        cmd = f"netstat -ano | findstr LISTENING | findstr :{port}"
        output = subprocess.check_output(cmd, shell=True).decode()
        for line in output.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and parts[1].endswith(f":{port}"):
                pid = parts[-1]
                if int(pid) != os.getpid():
                    print(f"Closing existing bridge on port {port} (PID {pid})...")
                    subprocess.run(["taskkill", "/F", "/T", "/PID", pid], capture_output=True)
    except Exception: pass

async def main():
    # ... (args parsing) ...
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True)
    parser.add_argument("--slot", required=True)
    parser.add_argument("--password")
    parser.add_argument("--port", type=int, default=8089)
    parser.add_argument("--mode", default="all", choices=["all", "personal"])
    parser.add_argument("--game") # Optional hinted game
    parser.add_argument("--multi") # Comma separated multi-slots (Slot:Pass)
    parser.add_argument("--tracked") # Comma separated tracked players
    args = parser.parse_args()
    
    kill_port(args.port)
    
    ap_client = ArchipelagoClient(args.server, args.slot, args.password, args.mode)
    if args.game: ap_client.initial_game_hint = args.game
    if args.multi:
        parts = [p.strip() for p in args.multi.split(",") if p.strip()]
        for p in parts:
            if ":" in p:
                s, pw = p.split(":", 1)
                ap_client.profiles[s.strip()] = pw.strip()
            else:
                ap_client.profiles[p.strip()] = ""
        # Ensure our main slot is in the profiles too
        if args.slot not in ap_client.profiles:
            ap_client.profiles[args.slot] = args.password or ""
    
    if args.tracked:
        ap_client.tracked_players = [p.strip() for p in args.tracked.split(",") if p.strip()]
    
    # Define the websocket handler to have access to the client
    async def bridge_handler(websocket):
        websocket.ap_client = ap_client
        await register_ui(websocket)

    print(f"\n--- Bridge Starting ({args.mode} mode) ---", flush=True)
    async with websockets.serve(bridge_handler, "localhost", args.port):
        await ap_client.connect()

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: print("\nStopped.")
