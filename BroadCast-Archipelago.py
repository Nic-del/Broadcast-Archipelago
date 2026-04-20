import tkinter as tk
from tkinter import ttk, messagebox
import threading
import subprocess
import json
import os
import sys
import platform
import psutil

# Settings and Base Path
APP_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(APP_DIR, "broadcast_settings.json")

def save_settings(settings):
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings, f, indent=4)
    except Exception as e:
        print(f"Error saving settings: {e}")

def load_settings():
    defaults = {
        "server": "archipelago.gg:", "slot": "", "password": "", "mode": "all",
        "win_w": 400, "win_h": 600, "win_x": -1, "win_y": -1, "display_index": 0,
        "last_game": "", "multi_slots": "", "tracked_players": "",
        "sync_mode": "all", "obs_sync_mode": "all", "enable_overlay": True, "enable_obs": False
    }
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                # Legacy compatibility: if 'mode' exists but not 'sync_mode', use 'mode'
                if "mode" in data and "sync_mode" not in data:
                    data["sync_mode"] = data["mode"]
                # Ensure all default keys exist
                for k, v in defaults.items():
                    if k not in data: data[k] = v
                return data
        except: pass
    return defaults

def get_monitors():
    monitors = []
    try:
        from screeninfo import get_monitors as sm
        for m in sm():
            monitors.append({
                'x': m.x,
                'y': m.y,
                'width': m.width,
                'height': m.height
            })
    except Exception as e:
        print(f"Error using screeninfo: {e}")
        # Basic fallback for primary screen if screeninfo fails
        monitors = [{'x': 0, 'y': 0, 'width': 1920, 'height': 1080}]
    
    return monitors

def kill_port(port):
    """Forcefully kill any process using a specific TCP port on Linux/Unix."""
    try:
        # Using lsof to find PID
        cmd = f"lsof -t -i:{port}"
        pid = subprocess.check_output(cmd, shell=True).decode().strip()
        if pid:
            for p in pid.split('\n'):
                if int(p) != os.getpid():
                    print(f"Killing process {p} using port {port}")
                    subprocess.run(['kill', '-9', p], capture_output=True)
    except:
        # Fallback to fuser
        try:
            subprocess.run(['fuser', '-k', f'{port}/tcp'], capture_output=True)
        except: pass

class BroadcastLauncherApp:
    def create_dim_field(self, parent, label, val, row, col):
        f = tk.Frame(parent, bg="#0d0d0f")
        f.grid(row=row, column=col, sticky="ew", padx=2, pady=2)
        tk.Label(f, text=label, bg="#0d0d0f", fg="#555555", font=("Segoe UI", 8)).pack(side="left")
        e = tk.Entry(f, width=10, bg="#1a1a1c", fg="#ffffff", border=0, font=("Segoe UI", 9))
        e.insert(0, str(val))
        e.bind("<KeyRelease>", lambda e: self.update_preview())
        e.pack(side="right", padx=5)
        return e

    def __init__(self, root):
        self.root = root
        self.root.title("BroadCast Archipelago - Control Center (Linux)")
        self.root.geometry("850x640")
        self.root.resizable(False, False)
        self.root.configure(bg="#0d0d0f")
        
        self.settings = load_settings()
        self.is_running = False
        self.procs = []
        self.log_files = []
        self.monitors = get_monitors()
        
        # Ensure logs directory exists
        self.logs_dir = os.path.join(APP_DIR, "logs")
        if not os.path.exists(self.logs_dir):
            os.makedirs(self.logs_dir)
        self.drag_start_x = 0
        self.drag_start_y = 0
        
        # Determine initial monitor
        self.current_monitor_idx = self.settings.get("display_index", 0)
        if self.current_monitor_idx >= len(self.monitors) or self.current_monitor_idx < 0:
            self.current_monitor_idx = 0
            
        m = self.monitors[self.current_monitor_idx]
        self.screen_w = m['width']
        self.screen_h = m['height']
        self.screen_offset_x = m['x']
        self.screen_offset_y = m['y']
        
        # --- HEADER ---
        header = tk.Frame(root, bg="#121214", height=60)
        header.pack(fill="x", side="top")
        tk.Label(header, text="BROADCAST CENTER (LINUX)", bg="#121214", fg="#af99ef", font=("Segoe UI", 14, "bold")).pack(pady=15)

        # --- TWO COLUMN CONTAINER ---
        content_frame = tk.Frame(root, bg="#0d0d0f", padx=20, pady=10)
        content_frame.pack(fill="both", expand=True)

        left_pane = tk.Frame(content_frame, bg="#0d0d0f"); left_pane.pack(side="left", fill="both", expand=True, padx=(0, 20))
        right_pane = tk.Frame(content_frame, bg="#0d0d0f"); right_pane.pack(side="right", fill="both", expand=True)

        def create_label(text, parent=left_pane):
            return tk.Label(parent, text=text, bg="#0d0d0f", fg="#888888", font=("Segoe UI", 9))
            
        def create_entry(val, parent=left_pane, width=40):
            e = tk.Entry(parent, width=width, bg="#1a1a1c", fg="#ffffff", border=0, font=("Segoe UI", 10))
            e.insert(0, str(val))
            e.bind("<KeyRelease>", lambda e: self.update_preview())
            return e

        # --- LEFT PANE ---
        tk.Label(left_pane, text="CONNECTION & PROFILES", bg="#0d0d0f", fg="#6d8be8", font=("Segoe UI", 10, "bold")).pack(pady=(0, 10), anchor="w")
        create_label("Server Address").pack(anchor="w")
        self.server_entry = create_entry(self.settings["server"]); self.server_entry.pack(pady=(0, 10), fill="x", ipady=5)
        
        create_label("Player Slot Name").pack(anchor="w")
        self.slot_entry = create_entry(self.settings["slot"]); self.slot_entry.pack(pady=(0, 10), fill="x", ipady=5)
        
        create_label("Server Password (optional)").pack(anchor="w")
        self.pass_entry = create_entry(self.settings["password"]); self.pass_entry.config(show="*"); self.pass_entry.pack(pady=(0, 10), fill="x", ipady=5)
        
        create_label("Multi-Slots (Format: Slot1:Pass1, Slot2:Pass2)").pack(anchor="w")
        self.watched_entry = create_entry(self.settings.get("multi_slots", ""))
        self.watched_entry.pack(pady=(0, 10), fill="x", ipady=5)
        
        create_label("Tracked Players (Mode Filtered - Comma separated)").pack(anchor="w")
        self.tracked_entry = create_entry(self.settings.get("tracked_players", ""))
        self.tracked_entry.pack(pady=(0, 10), fill="x", ipady=5)

        # Sync Modes
        sync_container = tk.Frame(left_pane, bg="#0d0d0f"); sync_container.pack(fill="x", pady=(0, 10))
        
        # Overlay Mode
        ov_f = tk.Frame(sync_container, bg="#0d0d0f"); ov_f.pack(side="left", fill="x", expand=True)
        create_label("Overlay Sync", ov_f).pack(anchor="w")
        self.sync_var = tk.StringVar(value=self.settings.get("sync_mode", "personal"))
        tk.Radiobutton(ov_f, text="Personal", variable=self.sync_var, value="personal", bg="#0d0d0f", fg="white", selectcolor="#2a2a2c", border=0, font=("Segoe UI", 8)).pack(side="left")
        tk.Radiobutton(ov_f, text="Filtered", variable=self.sync_var, value="filtered", bg="#0d0d0f", fg="white", selectcolor="#2a2a2c", border=0, font=("Segoe UI", 8)).pack(side="left")
        tk.Radiobutton(ov_f, text="Global", variable=self.sync_var, value="all", bg="#0d0d0f", fg="white", selectcolor="#2a2a2c", border=0, font=("Segoe UI", 8)).pack(side="left")

        # OBS Mode
        obs_f = tk.Frame(sync_container, bg="#0d0d0f"); obs_f.pack(side="right", fill="x", expand=True)
        create_label("OBS Sync", obs_f).pack(anchor="w")
        self.obs_sync_var = tk.StringVar(value=self.settings.get("obs_sync_mode", "all"))
        tk.Radiobutton(obs_f, text="Personal", variable=self.obs_sync_var, value="personal", bg="#0d0d0f", fg="white", selectcolor="#2a2a2c", border=0, font=("Segoe UI", 8)).pack(side="left")
        tk.Radiobutton(obs_f, text="Filtered", variable=self.obs_sync_var, value="filtered", bg="#0d0d0f", fg="white", selectcolor="#2a2a2c", border=0, font=("Segoe UI", 8)).pack(side="left")
        tk.Radiobutton(obs_f, text="Global", variable=self.obs_sync_var, value="all", bg="#0d0d0f", fg="white", selectcolor="#2a2a2c", border=0, font=("Segoe UI", 8)).pack(side="left")

        # Output Features
        create_label("Output Features").pack(anchor="w")
        feat_f = tk.Frame(left_pane, bg="#0d0d0f"); feat_f.pack(fill="x", pady=(0, 10))
        self.use_overlay = tk.BooleanVar(value=self.settings.get("enable_overlay", True))
        self.use_obs = tk.BooleanVar(value=self.settings.get("enable_obs", False))
        tk.Checkbutton(feat_f, text="Desktop Overlay", variable=self.use_overlay, bg="#0d0d0f", fg="white", selectcolor="#2a2a2c", activebackground="#0d0d0f").pack(side="left", padx=5)
        tk.Checkbutton(feat_f, text="OBS Web Server", variable=self.use_obs, bg="#0d0d0f", fg="white", selectcolor="#2a2a2c", activebackground="#0d0d0f").pack(side="left", padx=5)

        # --- RIGHT PANE ---
        tk.Label(right_pane, text="WINDOW & PREVIEW", bg="#0d0d0f", fg="#6d8be8", font=("Segoe UI", 10, "bold")).pack(pady=(0, 10), anchor="w")
        
        create_label("Target Display", right_pane).pack(anchor="w")
        self.monitor_select = ttk.Combobox(right_pane, state="readonly", values=[f"Display {i+1} ({m['width']}x{m['height']})" for i, m in enumerate(self.monitors)])
        self.monitor_select.current(self.current_monitor_idx); self.monitor_select.bind("<<ComboboxSelected>>", self.on_monitor_change); self.monitor_select.pack(pady=(0, 10), fill="x")

        self.canvas_w = 340; self.canvas_h = (self.canvas_w * self.screen_h) // self.screen_w
        self.preview_canvas = tk.Canvas(right_pane, width=self.canvas_w, height=self.canvas_h, bg="#000000", highlightthickness=1, highlightbackground="#333333")
        self.preview_canvas.pack(pady=(0, 10)); self.preview_canvas.bind("<Button-1>", self.on_preview_click); self.preview_canvas.bind("<B1-Motion>", self.on_preview_drag); self.preview_canvas.bind("<ButtonRelease-1>", self.on_preview_release)

        dim_container = tk.Frame(right_pane, bg="#0d0d0f"); dim_container.pack(fill="x")
        self.win_w = self.create_dim_field(dim_container, "W", self.settings["win_w"], 0, 0)
        self.win_h = self.create_dim_field(dim_container, "H", self.settings["win_h"], 0, 1)
        self.win_x = self.create_dim_field(dim_container, "X", self.settings["win_x"], 1, 0)
        self.win_y = self.create_dim_field(dim_container, "Y", self.settings["win_y"], 1, 1)

        # --- FOOTER ---
        footer = tk.Frame(root, bg="#121214"); footer.pack(fill="x", side="bottom")
        self.status_label = tk.Label(footer, text="Status: Ready", bg="#121214", fg="#888888", font=("Segoe UI", 9))
        self.status_label.pack(pady=(10, 0))
        
        self.btn_text = tk.StringVar(value="START SYSTEM")
        self.start_btn = tk.Button(footer, textvariable=self.btn_text, command=self.toggle_system, bg="#af99ef", fg="#121214", font=("Segoe UI", 11, "bold"), width=30, border=0, cursor="hand2")
        self.start_btn.pack(pady=15)

        tool_frame = tk.Frame(root, bg="#0d0d0f"); tool_frame.pack(side="bottom", fill="x", pady=5)
        tk.Button(tool_frame, text="TEST MESSAGES", command=self.trigger_test_fill, bg="#0d0d0f", fg="#55ff55", font=("Segoe UI", 8), border=0, cursor="hand2").pack(side="left", padx=20)
        tk.Button(tool_frame, text="VIEW LOGS", command=self.open_logs_folder, bg="#0d0d0f", fg="#6d8be8", font=("Segoe UI", 8), border=0, cursor="hand2").pack(side="left")
        tk.Button(tool_frame, text="RESET HISTORY", command=self.trigger_clear_history, bg="#0d0d0f", fg="#ff5555", font=("Segoe UI", 8), border=0, cursor="hand2").pack(side="left", padx=20)
        tk.Button(tool_frame, text="🔍 DIAGNOSE", command=self.show_troubleshooting, bg="#0d0d0f", fg="#888888", font=("Segoe UI", 8), border=0, cursor="hand2").pack(side="right", padx=20)

        self.update_preview()

    def get_error_message(self, hex_code, p_name):
        # 0xc0000142 is 3221225794 unsigned, or -1073741502 signed
        msgs = {
            "3221225794": "DLL Init Failed. Try restarting your PC or checking and installing 'Visual C++ Redistributable'.",
            "3221225781": "Missing System DLL. Ensure you have the latest Windows Updates and C++ Runtimes.",
            "1": "Script Error. Python or Node modules are missing. Try running INSTALLATION.bat.",
            "9009": f"Command not found. Is {'Node.js' if 'Vite' in p_name or 'Overlay' in p_name else 'Python'} installed and in PATH?",
            "3": "Path not found. The app couldn't find the 'broadcast-app' folder.",
            "127": "Command not found (Linux/Unix).",
            "-1073741502": "DLL Init Failed. Try restarting your PC or checking and installing 'Visual C++ Redistributable'."
        }
        return msgs.get(str(hex_code), "Unknown error. Check logs or contact support.")

    def open_logs_folder(self):
        try:
            path = self.logs_dir
            if platform.system() == "Windows":
                 os.startfile(path)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
        except: pass

    def show_troubleshooting(self):
        msg = "--- Linux Common Fixes ---\n\n"
        msg += "1. Run './INSTALLATION.sh' to ensure all libraries are present.\n"
        msg += "2. Ensure Node.js (v20+) and Python (3.12) are installed.\n"
        msg += "3. For notifications to work, ensure 'python3' is in your PATH.\n"
        msg += "4. If UI doesn't appear, check logs for Electron/Node errors.\n"
        msg += "5. Fixed: Added '--no-sandbox' to prevent SUID helper errors.\n"
        msg += "6. Port 8089 is used for communication. Ensure it is free."

        messagebox.showinfo("Diagnostic Tool", msg)

    def on_monitor_change(self, event=None):
        self.current_monitor_idx = self.monitor_select.current()
        m = self.monitors[self.current_monitor_idx]
        self.screen_w = m['width']
        self.screen_h = m['height']
        self.screen_offset_x = m['x']
        self.screen_offset_y = m['y']
        
        try:
            w = int(self.win_w.get())
            h = int(self.win_h.get())
            new_x = self.screen_offset_x + self.screen_w - w - 20
            new_y = self.screen_offset_y + self.screen_h - h - 20
            
            self.win_x.delete(0, tk.END)
            self.win_x.insert(0, str(new_x))
            self.win_y.delete(0, tk.END)
            self.win_y.insert(0, str(new_y))
        except: pass

        self.canvas_h = (self.canvas_w * self.screen_h) // self.screen_w
        self.preview_canvas.config(height=self.canvas_h)
        self.update_preview()

    def on_preview_click(self, event):
        self.drag_start_x = event.x
        self.drag_start_y = event.y
        self.preview_canvas.config(cursor="fleur")

    def on_preview_release(self, event):
        self.preview_canvas.config(cursor="")

    def on_preview_drag(self, event):
        dx = event.x - self.drag_start_x
        dy = event.y - self.drag_start_y
        scale_x = self.screen_w / self.canvas_w
        scale_y = self.screen_h / self.canvas_h
        
        try:
            w = int(self.win_w.get())
            h = int(self.win_h.get())
            cur_x = int(self.win_x.get())
            cur_y = int(self.win_y.get())
            
            if cur_x == -1: cur_x = self.screen_offset_x + self.screen_w - w - 20
            if cur_y == -1: cur_y = self.screen_offset_y + self.screen_h - h - 20
            
            new_x = cur_x + int(dx * scale_x)
            new_y = cur_y + int(dy * scale_y)
            
            self.win_x.delete(0, tk.END)
            self.win_x.insert(0, str(new_x))
            self.win_y.delete(0, tk.END)
            self.win_y.insert(0, str(new_y))
            
            self.drag_start_x = event.x
            self.drag_start_y = event.y
            self.update_preview()
        except: pass

    def update_preview(self):
        try:
            w = int(self.win_w.get())
            h = int(self.win_h.get())
            x = int(self.win_x.get())
            y = int(self.win_y.get())

            if x == -1: calc_x = self.screen_offset_x + self.screen_w - w - 20
            else: calc_x = x
                
            if y == -1: calc_y = self.screen_offset_y + self.screen_h - h - 20
            else: calc_y = y
 
            rel_x = calc_x - self.screen_offset_x
            rel_y = calc_y - self.screen_offset_y

            scale_x = self.canvas_w / self.screen_w
            scale_y = self.canvas_h / self.screen_h
 
            pv_x = rel_x * scale_x
            pv_y = rel_y * scale_y
            pv_w = w * scale_x
            pv_h = h * scale_y

            self.preview_canvas.delete("all")
            color = "#af99ef"
            if rel_x < 0 or rel_y < 0 or (rel_x + w) > self.screen_w or (rel_y + h) > self.screen_h:
                color = "#ff5555"
            
            for i in range(0, self.canvas_w, 20):
                self.preview_canvas.create_line(i, 0, i, self.canvas_h, fill="#222222")
            for i in range(0, self.canvas_h, 20):
                self.preview_canvas.create_line(0, i, self.canvas_w, i, fill="#222222")

            self.preview_canvas.create_rectangle(pv_x, pv_y, pv_x + pv_w, pv_y + pv_h, fill=color, outline="white", stipple="gray50")
            self.preview_canvas.create_text(self.canvas_w/2, self.canvas_h/2, text=f"{self.screen_w}x{self.screen_h}", fill="#444444", font=("Segoe UI", 8))
            
        except Exception as e: pass

    def trigger_clear_history(self):
        if not self.is_running:
            messagebox.showinfo("Info", "System must be running to clear history.")
            return
        def send_clear_cmd():
            try:
                import asyncio
                import websockets
                async def send():
                    async with websockets.connect("ws://localhost:8089") as ws:
                        await ws.send(json.dumps({"type": "clear_history"}))
                asyncio.run(send())
            except: pass
        threading.Thread(target=send_clear_cmd, daemon=True).start()
        self.status_label.config(text="Status: History Cleared!", fg="#ff5555")

    def trigger_test_fill(self):
        if not self.is_running:
            messagebox.showinfo("Info", "System must be running to send test messages.")
            return
        def send_test_cmd():
            try:
                import asyncio
                import websockets
                async def send():
                    async with websockets.connect("ws://localhost:8089") as ws:
                        await ws.send(json.dumps({"type": "test_fill"}))
                asyncio.run(send())
            except: pass
        threading.Thread(target=send_test_cmd, daemon=True).start()
        self.status_label.config(text="Status: Test Messages Sent!", fg="#55ff55")

    def toggle_system(self):
        if not self.is_running: self.start_system()
        else: self.stop_system()

    def start_system(self):
        try:
            self.settings.update({
                "server": self.server_entry.get(), 
                "slot": self.slot_entry.get(),
                "password": self.pass_entry.get(), 
                "multi_slots": self.watched_entry.get(),
                "sync_mode": self.sync_var.get(),
                "obs_sync_mode": self.obs_sync_var.get(),
                "enable_overlay": self.use_overlay.get(),
                "enable_obs": self.use_obs.get(),
                "display_index": self.monitor_select.current(),
                "tracked_players": self.tracked_entry.get()
            })
            if self.use_overlay.get():
                self.settings.update({
                    "win_w": int(self.win_w.get() or 400),
                    "win_h": int(self.win_h.get() or 600),
                    "win_x": int(self.win_x.get() or 0),
                    "win_y": int(self.win_y.get() or 0)
                })
        except ValueError:
            messagebox.showerror("Error", "Window dimensions must be numbers.")
            return
        except Exception as e:
            messagebox.showerror("Error", f"Configuration error: {e}")
            return

        save_settings(self.settings)
        if not self.settings["server"] or not self.settings["slot"]:
            messagebox.showerror("Error", "Server and Slot are mandatory.")
            return

        self.stop_system() 
        self.status_label.config(text="Status: Cleaning up...", fg="#ffaa00")
        self.root.update()
        
        # Force delete dist folder to ensure we use latest dev code
        try:
            import shutil
            dist_to_clean = os.path.join(APP_DIR, "broadcast-app", "dist")
            if os.path.exists(dist_to_clean):
                shutil.rmtree(dist_to_clean)
        except: pass

        import time
        time.sleep(1) 
        
        kill_port(8089)
        if self.use_obs.get() or self.use_overlay.get():
            kill_port(5173) 

        self.is_running = True
        self.btn_text.set("STOP SYSTEM")
        self.start_btn.configure(bg="#ff5555", fg="white")
        self.status_label.config(text="Status: Launching...", fg="#00eeee")
        threading.Thread(target=self.launch_background_tasks, daemon=True).start()

    def launch_background_tasks(self):
        # On Linux, use python3
        py_cmd = "python3"
            
        def spawn_with_log(cmd, name, cwd=None):
            if cwd:
                cwd = os.path.join(APP_DIR, cwd)
            else:
                cwd = APP_DIR
            log_path = os.path.join(self.logs_dir, f"{name}.log")
            f = open(log_path, "w", encoding="utf-8")
            self.log_files.append(f)
            env = os.environ.copy()
            env["FORCE_COLOR"] = "0"
            env["NO_COLOR"] = "1"
            return subprocess.Popen(cmd, cwd=cwd, stdout=f, stderr=f, env=env)

        dist_path = os.path.join("broadcast-app", "dist")
        has_build = os.path.exists(dist_path) and os.path.exists(os.path.join(dist_path, "index.html"))
        
        if self.use_obs.get() or (self.use_overlay.get() and not has_build):
            spawn_with_log(["npx", "vite", "--no-open"], "vite", cwd="broadcast-app")
        
        # Determine bridge mode: If EITHER is 'all' or 'filtered', bridge must be 'all' to get the data
        bridge_mode = "all"
        if self.settings.get("sync_mode") == "personal" and self.settings.get("obs_sync_mode") == "personal":
            bridge_mode = "personal"
        
        bridge_script = os.path.join(APP_DIR, "broadcast", "bridge.py")
        bridge_cmd = [py_cmd, "-u", bridge_script, "--server", self.settings["server"], "--slot", self.settings["slot"], "--mode", bridge_mode]
        if self.settings["password"]: bridge_cmd.extend(["--password", self.settings["password"]])
        if self.settings.get("last_game"): bridge_cmd.extend(["--game", self.settings["last_game"]])
        if self.settings.get("multi_slots"): bridge_cmd.extend(["--multi", self.settings["multi_slots"]])
        
        tracked = self.settings.get("tracked_players", "").strip()
        if tracked: bridge_cmd.extend(["--tracked", tracked])
        
        try:
            self.procs.append(spawn_with_log(bridge_cmd, "bridge"))
        except Exception as e:
            messagebox.showerror("Error", f"Could not launch bridge: {e}")
            self.stop_system()
            return
        
        import time
        time.sleep(2)
        
        if self.use_overlay.get():
            # Added --no-sandbox to fix Chromium SUID sandbox error common on many Linux distros
            self.procs.append(spawn_with_log(["npm", "run", "overlay", "--", "--no-sandbox"], "overlay", cwd="broadcast-app"))
            self.status_label.config(text="Status: Overlay & Bridge Operational", fg="#55ff55")

        else:
            self.status_label.config(text="Status: Web Server & Bridge Operational", fg="#55ff55")
        
        while self.is_running:
            for p in list(self.procs):
                if p.poll() is not None and self.is_running:
                    p_args = p.args if hasattr(p, 'args') else []
                    p_name = "Unknown"
                    if any("bridge.py" in str(a) for a in p_args): p_name = "Bridge"
                    elif any("vite" in str(a) for a in p_args): p_name = "Vite Server"
                    elif any("overlay" in str(a) for a in p_args): p_name = "Overlay"
                    
                    hint = self.get_error_message(p.poll(), p_name)
                    self.status_label.config(text=f"Status: {p_name} Crashed! ({p.poll()})\n{hint}", fg="#ff5555", font=("Segoe UI", 8))
                    self.procs.remove(p) 
            time.sleep(2)

    def stop_system(self):
        if not self.is_running: return
        self.is_running = False
        self.status_label.config(text="Status: Stopping...", fg="#ffaa00")
        self.root.update()

        for p in self.procs:
            try:
                parent = psutil.Process(p.pid)
                for child in parent.children(recursive=True):
                    child.kill()
                parent.kill()
            except: pass
        self.procs = []
        
        for proc in psutil.process_iter(['name']):
            try:
                if proc.info['name'] in ['node', 'electron']:
                    proc.kill()
            except: pass
        
        for f in self.log_files:
            try: f.close()
            except: pass
        self.log_files = []
        
        self.btn_text.set("START SYSTEM")
        self.start_btn.configure(bg="#af99ef", fg="#121214")
        self.status_label.config(text="Status: Stopped", fg="#6d8be8")

if __name__ == "__main__":
    root = tk.Tk()
    app = BroadcastLauncherApp(root)
    root.mainloop()
