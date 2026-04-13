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
AP_VERSION = {"major": 0, "minor": 6, "build": 6, "class": "Version"}

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
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get("type") == "clear_history":
                    await broadcast_to_ui({"type": "clear_history"})
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
        self.my_alias = slot # Will be updated on connect

    async def connect(self):
        protocols = [f"wss://{self.raw_server}", f"ws://{self.raw_server}"]
        for url in protocols:
            print(f"Connecting to {url}...", flush=True)
            try:
                async with websockets.connect(url, origin="http://localhost", ping_interval=20, ping_timeout=20) as ws:
                    print(f"Connected to {url}!", flush=True)
                    self.ws = ws
                    await self.listen()
            except Exception as e:
                # Silently catch and retry connection
                pass
        await asyncio.sleep(5)
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
                    await self.identify(self.available_games[0] if self.available_games else "")
                elif cmd == "DataPackage":
                    data = packet.get("data", {})
                    for game, game_data in data.get("games", {}).items():
                        mapping = {str(v): k for k, v in game_data.get("item_name_to_id", {}).items()}
                        self.item_maps[game] = mapping
                elif cmd == "ConnectionRefused":
                    if "InvalidGame" in packet.get("errors", []) and self.current_game_index < len(self.available_games) - 1:
                        self.current_game_index += 1
                        await self.identify(self.available_games[self.current_game_index])
                elif cmd == "Connected":
                    print(f"SUCCESS! Connected as {self.slot}", flush=True)
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
                    
                    await broadcast_to_ui({"type": "notification", "event": "normal", "text": f"Connected to AP as {self.slot}"})
                elif cmd == "PrintJSON":
                    await self.handle_print_json(packet)

    async def handle_print_json(self, packet):
        msg_type = packet.get("type", "Unknown")
        # Do not display hints as notifications
        if msg_type == "Hint":
            return
            
        parts = packet.get("data", [])
        if msg_type in ["ItemSend", "ItemReceive"] or any(p.get("type") in ["item_id", "item_name"] for p in parts):
            item_name, p_from, p_to, item_class = "", "Someone", self.my_alias, 1
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True)
    parser.add_argument("--slot", required=True)
    parser.add_argument("--password")
    parser.add_argument("--port", type=int, default=8089)
    parser.add_argument("--mode", default="all", choices=["all", "personal"])
    args = parser.parse_args()
    
    # NEW: Cleanup port before starting
    kill_port(args.port)
    
    print(f"\n--- Bridge Starting ({args.mode} mode) ---", flush=True)
    async with websockets.serve(register_ui, "localhost", args.port):
        ap_client = ArchipelagoClient(args.server, args.slot, args.password, args.mode)
        await ap_client.connect()

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: print("\nStopped.")
