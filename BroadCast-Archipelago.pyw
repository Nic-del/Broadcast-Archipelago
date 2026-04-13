import tkinter as tk
from tkinter import ttk, messagebox
import threading
import subprocess
import json
import os
import sys
import ctypes
from ctypes import wintypes

# Settings file path
SETTINGS_FILE = "broadcast_settings.json"

def save_settings(settings):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=4)

def load_settings():
    defaults = {
        "server": "archipelago.gg:", "slot": "", "password": "", "mode": "all",
        "win_w": 400, "win_h": 600, "win_x": -1, "win_y": -1
    }
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                defaults.update(data)
        except: pass
    return defaults

def get_monitors():
    monitors = []
    def callback(hMonitor, hdcMonitor, lprcMonitor, dwData):
        rect = lprcMonitor.contents
        monitors.append({
            'x': rect.left,
            'y': rect.top,
            'width': rect.right - rect.left,
            'height': rect.bottom - rect.top
        })
        return True
    MonitorEnumProc = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HMONITOR, wintypes.HDC, ctypes.POINTER(wintypes.RECT), wintypes.LPARAM)
    ctypes.windll.user32.EnumDisplayMonitors(None, None, MonitorEnumProc(callback), 0)
    return monitors

class BroadcastLauncherApp:
    def __init__(self, root):
        self.root = root
        self.root.title("BroadCast Archipelago - Control Center")
        self.root.geometry("450x850") # Added height for preview
        self.root.resizable(False, False)
        self.root.configure(bg="#121214")
        
        self.settings = load_settings()
        self.is_running = False
        self.procs = []
        self.monitors = get_monitors()
        
        # Determine initial monitor
        self.current_monitor_idx = self.settings.get("display_index", 0)
        if self.current_monitor_idx >= len(self.monitors) or self.current_monitor_idx < 0:
            self.current_monitor_idx = 0
            
        m = self.monitors[self.current_monitor_idx]
        self.screen_w = m['width']
        self.screen_h = m['height']
        self.screen_offset_x = m['x']
        self.screen_offset_y = m['y']
        
        # UI Elements
        tk.Label(root, text="BROADCAST CONTROL", bg="#121214", fg="#af99ef", font=("Segoe UI", 16, "bold")).pack(pady=15)

        main_frame = tk.Frame(root, bg="#121214")
        main_frame.pack(fill="both", expand=True, padx=30)

        def create_label(text):
            return tk.Label(main_frame, text=text, bg="#121214", fg="#aaaaaa", font=("Segoe UI", 9))

        def create_entry(val, width=40):
            e = tk.Entry(main_frame, width=width, bg="#1e1e22", fg="white", insertbackground="white", border=0)
            e.insert(0, str(val))
            e.bind("<KeyRelease>", lambda e: self.update_preview())
            return e

        # --- AP SECTION ---
        create_label("Server Address").pack(anchor="w")
        self.server_entry = create_entry(self.settings["server"])
        self.server_entry.pack(pady=5, fill="x", ipady=5)

        create_label("Player Slot Name").pack(anchor="w")
        self.slot_entry = create_entry(self.settings["slot"])
        self.slot_entry.pack(pady=5, fill="x", ipady=5)

        create_label("Server Password (optional)").pack(anchor="w")
        self.pass_entry = create_entry(self.settings["password"])
        self.pass_entry.config(show="*")
        self.pass_entry.pack(pady=5, fill="x", ipady=5)
 
        # --- SCREEN SELECTION ---
        create_label("Target Display").pack(anchor="w")
        self.monitor_var = tk.StringVar()
        self.monitor_select = ttk.Combobox(main_frame, textvariable=self.monitor_var, state="readonly")
        monitor_labels = [f"Display {i+1} ({m['width']}x{m['height']})" for i, m in enumerate(self.monitors)]
        self.monitor_select['values'] = monitor_labels
        self.monitor_select.current(self.current_monitor_idx)
        self.monitor_select.bind("<<ComboboxSelected>>", self.on_monitor_change)
        self.monitor_select.pack(pady=5, fill="x")

        # --- PREVIEW SECTION ---
        tk.Label(main_frame, text="SCREEN PREVIEW", bg="#121214", fg="#6d8be8", font=("Segoe UI", 10, "bold")).pack(pady=(15, 5), anchor="w")
        
        # Mini Canvas for Screen
        self.canvas_w = 300
        self.canvas_h = (self.canvas_w * self.screen_h) // self.screen_w
        self.preview_canvas = tk.Canvas(main_frame, width=self.canvas_w, height=self.canvas_h, bg="#000000", highlightthickness=1, highlightbackground="#333333")
        self.preview_canvas.pack(pady=10)
        
        # --- WINDOW SECTION ---
        dim_frame = tk.Frame(main_frame, bg="#121214")
        dim_frame.pack(fill="x")
        
        left_f = tk.Frame(dim_frame, bg="#121214"); left_f.pack(side="left", fill="x", expand=True)
        create_label("Width (px)").pack(anchor="w", in_=left_f)
        self.win_w = create_entry(self.settings["win_w"], width=15); self.win_w.pack(pady=5, anchor="w", in_=left_f, ipady=3)

        right_f = tk.Frame(dim_frame, bg="#121214"); right_f.pack(side="left", fill="x", expand=True)
        create_label("Height (px)").pack(anchor="w", in_=right_f)
        self.win_h = create_entry(self.settings["win_h"], width=15); self.win_h.pack(pady=5, anchor="w", in_=right_f, ipady=3)

        pos_frame = tk.Frame(main_frame, bg="#121214")
        pos_frame.pack(fill="x")

        left_p = tk.Frame(pos_frame, bg="#121214"); left_p.pack(side="left", fill="x", expand=True)
        create_label("X Pos (-1 = auto)").pack(anchor="w", in_=left_p)
        self.win_x = create_entry(self.settings["win_x"], width=15); self.win_x.pack(pady=5, anchor="w", in_=left_p, ipady=3)

        right_p = tk.Frame(pos_frame, bg="#121214"); right_p.pack(side="left", fill="x", expand=True)
        create_label("Y Pos (-1 = auto)").pack(anchor="w", in_=right_p)
        self.win_y = create_entry(self.settings["win_y"], width=15); self.win_y.pack(pady=5, anchor="w", in_=right_p, ipady=3)

        # Mode Selection
        create_label("Tracking Mode").pack(anchor="w", pady=(10, 0))
        self.mode_var = tk.StringVar(value=self.settings.get("mode", "all"))
        mode_frame = tk.Frame(main_frame, bg="#121214"); mode_frame.pack(pady=5)
        tk.Radiobutton(mode_frame, text="All Items", variable=self.mode_var, value="all", bg="#121214", fg="white", selectcolor="#121214").pack(side="left", padx=10)
        tk.Radiobutton(mode_frame, text="My Items", variable=self.mode_var, value="personal", bg="#121214", fg="white", selectcolor="#121214").pack(side="left", padx=10)
        tk.Radiobutton(mode_frame, text="OBS Mode", variable=self.mode_var, value="obs", bg="#121214", fg="white", selectcolor="#121214").pack(side="left", padx=10)
        # Added OBS Mode which uses All Items + launches browser source

        # Action Button
        self.btn_text = tk.StringVar(value="START SYSTEM")
        self.start_btn = tk.Button(root, textvariable=self.btn_text, command=self.toggle_system, bg="#af99ef", fg="#121214", font=("Segoe UI", 12, "bold"), width=20, border=0, cursor="hand2")
        self.start_btn.pack(pady=20)

        self.status_label = tk.Label(root, text="Status: Ready", bg="#121214", fg="#6d8be8", font=("Segoe UI", 9))
        self.status_label.pack(pady=(0, 5))

        tk.Button(root, text="RESET ALL HISTORY", command=self.trigger_clear_history, bg="#121214", fg="#ff5555", font=("Segoe UI", 8, "bold"), border=0, cursor="hand2").pack(pady=(0, 15))

        self.update_preview()

    def on_monitor_change(self, event=None):
        self.current_monitor_idx = self.monitor_select.current()
        m = self.monitors[self.current_monitor_idx]
        self.screen_w = m['width']
        self.screen_h = m['height']
        self.screen_offset_x = m['x']
        self.screen_offset_y = m['y']
        
        # Automatically move the coordinates to the new monitor (bottom right corner)
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

        # Update canvas aspect ratio
        self.canvas_h = (self.canvas_w * self.screen_h) // self.screen_w
        self.preview_canvas.config(height=self.canvas_h)
        self.update_preview()

    def update_preview(self):
        try:
            w = int(self.win_w.get())
            h = int(self.win_h.get())
            x = int(self.win_x.get())
            y = int(self.win_y.get())

            if x == -1: x = self.screen_w - w - 20
            if y == -1: y = self.screen_h - h - 20
 
            # Positions in preview are relative to the selected monitor's origin
            # But the 'x' and 'y' in settings are global coordinates
            rel_x = x - self.screen_offset_x
            rel_y = y - self.screen_offset_y

            # Scale to canvas
            scale_x = self.canvas_w / self.screen_w
            scale_y = self.canvas_h / self.screen_h
 
            pv_x = rel_x * scale_x
            pv_y = rel_y * scale_y
            pv_w = w * scale_x
            pv_h = h * scale_y

            self.preview_canvas.delete("all")
            
            # Draw warning border if out of bounds (relative to this screen)
            color = "#af99ef"
            if rel_x < 0 or rel_y < 0 or (rel_x + w) > self.screen_w or (rel_y + h) > self.screen_h:
                color = "#ff5555" # Red warning
            
            self.preview_canvas.create_rectangle(pv_x, pv_y, pv_x + pv_w, pv_y + pv_h, fill=color, outline="white", stipple="gray50")
            self.preview_canvas.create_text(self.canvas_w/2, self.canvas_h/2, text=f"{self.screen_w}x{self.screen_h}", fill="#333333", font=("Arial", 8))
            
        except: pass

    def trigger_clear_history(self):
        if not self.is_running:
            messagebox.showinfo("Info", "System must be running to clear history on all pages.")
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
        self.status_label.config(text="Status: History Cleared Everywhere!", fg="#ff5555")

    def toggle_system(self):
        if not self.is_running: self.start_system()
        else: self.stop_system()

    def start_system(self):
        try:
            self.settings = {
                "server": self.server_entry.get(), "slot": self.slot_entry.get(),
                "password": self.pass_entry.get(), "mode": self.mode_var.get(),
                "win_w": int(self.win_w.get()), "win_h": int(self.win_h.get()),
                "win_x": int(self.win_x.get()), "win_y": int(self.win_y.get()),
                "display_index": self.current_monitor_idx
            }
        except:
            messagebox.showerror("Error", "Invalid numbers.")
            return

        save_settings(self.settings)
        if not self.settings["server"] or not self.settings["slot"]:
            messagebox.showerror("Error", "Fill Server and Slot.")
            return

        # NEW: Force cleanup of any previous session leftovers
        self.stop_system() 

        self.is_running = True
        self.btn_text.set("STOP SYSTEM")
        self.start_btn.configure(bg="#ff5555")
        self.status_label.config(text="Status: Launching processes...", fg="#00eeee")
        threading.Thread(target=self.launch_background_tasks, daemon=True).start()

    def launch_background_tasks(self):
        # We store procs to kill them specifically by PID
        # Start Dev Server for OBS Page (if needed, but without opening browser)
        self.procs.append(subprocess.Popen(["cmd", "/c", "npx vite --no-open"], cwd="broadcast-app", shell=True))
        
        # Determine bridge mode (obs mode uses 'all' filtering)
        bridge_mode = "all" if self.settings["mode"] in ["all", "obs"] else "personal"
        
        # Use py -3.12 to ensure the correct version is used
        bridge_cmd = ["py", "-3.12", "-u", "broadcast/bridge.py", "--server", self.settings["server"], "--slot", self.settings["slot"], "--mode", bridge_mode]
        if self.settings["password"]: bridge_cmd.extend(["--password", self.settings["password"]])
        self.procs.append(subprocess.Popen(bridge_cmd))
        
        # OBS Mode logic: We don't open the browser automatically anymore as requested
        # Users will manually use the URL in OBS as a browser source
        
        import time
        for i in range(2, 0, -1):
            if not self.is_running: return
            self.status_label.config(text=f"Status: Overlay in {i}s...")
            time.sleep(1)
        
        self.procs.append(subprocess.Popen(["cmd", "/c", "npm run overlay"], cwd="broadcast-app", shell=True))
        self.status_label.config(text="Status: Fully Operational", fg="#55ff55")

    def stop_system(self):
        self.status_label.config(text="Status: Stopping...", fg="#ffaa00")
        self.root.update()

        # Kill tracked processes specifically
        for p in self.procs:
            try:
                # /T kills child processes too, /F is force
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
            except: pass
        self.procs = []

        # Extra safety for common orphans
        os.system("taskkill /F /IM node.exe /T >nul 2>&1")
        os.system("taskkill /F /IM electron.exe /T >nul 2>&1")
        
        self.is_running = False
        self.btn_text.set("START SYSTEM")
        self.start_btn.configure(bg="#af99ef")
        self.status_label.config(text="Status: Stopped", fg="#6d8be8")

if __name__ == "__main__":
    root = tk.Tk()
    app = BroadcastLauncherApp(root)
    root.mainloop()
