import tkinter as tk
from tkinter import ttk, messagebox, filedialog, simpledialog
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import seaborn as sns
import os
import re

# Constantes para estilo (apariencia más moderna)
FONT_DEFAULT = ("Arial", 10)
FONT_HEADING = ("Arial", 12, "bold")
PADDING = 10

class MassLoadingAnalyzer:
    def __init__(self, root):
        self.root = root
        self.root.title("🔬 Electrode Mass Loading Analyzer - Pro")
        self.root.geometry("1000x700")
        
        # Intentar aplicar un tema moderno de ttk (como 'clam' o 'alt')
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TLabel', font=FONT_DEFAULT)
        style.configure('TButton', font=FONT_DEFAULT)
        style.configure('TCheckbutton', font=FONT_DEFAULT)
        
        # Global variables (Kept as per user request to maintain existing calculation logic)
        self.disk_diameter_mm = tk.DoubleVar(value=12.0)
        self.bare_foil_weight_mg = tk.DoubleVar(value=2.0)
        # List of dicts: {'name': str, 'length_mm': float, ...}
        self.foils_data = []  
        self.current_foil = None
        
        # For live stats display in Analysis tab
        self.stats_text_var = tk.StringVar(value="Select a foil and click 'Calculate Stats'.")

        # Main interface with tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True, padx=PADDING, pady=PADDING)

        # Tab 1: General Parameters
        self.tab_general = self._create_general_parameters_tab()
        self.notebook.add(self.tab_general, text='⚙ General Parameters')

        # Tab 2: Foil Data
        self.tab_foils = self._create_foil_data_tab()
        self.notebook.add(self.tab_foils, text='📊 Foil Data Management')

        # Tab 3: Analysis and Report
        self.tab_analysis = self._create_analysis_tab()
        self.notebook.add(self.tab_analysis, text='📈 Analysis & Report')
        
        # Initial status update
        self.update_foil_list()

    def _create_general_parameters_tab(self):
        tab = ttk.Frame(self.notebook, padding=PADDING)
        
        # Use LabelFrame for a sectioned look
        param_frame = ttk.LabelFrame(tab, text="Global Measurement Parameters", padding=PADDING)
        param_frame.pack(padx=PADDING, pady=PADDING, fill='x')

        ttk.Label(param_frame, text="Disk Diameter (mm):", font=FONT_DEFAULT).grid(row=0, column=0, padx=PADDING, pady=5, sticky='w')
        entry_diameter = ttk.Entry(param_frame, textvariable=self.disk_diameter_mm, width=15)
        entry_diameter.grid(row=0, column=1, padx=PADDING, pady=5, sticky='ew')
        
        ttk.Label(param_frame, text="Avg. Bare Foil Weight per Disk (mg):", font=FONT_DEFAULT).grid(row=1, column=0, padx=PADDING, pady=5, sticky='w')
        entry_weight = ttk.Entry(param_frame, textvariable=self.bare_foil_weight_mg, width=15)
        entry_weight.grid(row=1, column=1, padx=PADDING, pady=5, sticky='ew')
        
        # Add a quick validation check/button
        ttk.Button(param_frame, text="Validate Params", command=self.validate_parameters).grid(row=2, column=0, columnspan=2, padx=PADDING, pady=10)

        # Configure column weights for resizing
        param_frame.grid_columnconfigure(1, weight=1)
        
        return tab

    def _create_foil_data_tab(self):
        tab = ttk.Frame(self.notebook, padding=PADDING)

        # Use PanedWindow for resizable sections
        pane = ttk.PanedWindow(tab, orient=tk.VERTICAL)
        pane.pack(fill='both', expand=True)

        # Top Frame: Foil List
        list_frame = ttk.LabelFrame(tab, text="Foil List", padding=PADDING)
        pane.add(list_frame, weight=3) # Takes up most space

        self.foil_listbox = tk.Listbox(list_frame, height=10, width=120, font=FONT_DEFAULT, selectmode=tk.SINGLE)
        self.foil_listbox.pack(fill='both', expand=True, side=tk.LEFT)
        self.foil_listbox.bind('<<ListboxSelect>>', self.display_selected_foil_stats)

        # Add a scrollbar
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.foil_listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill="y")
        self.foil_listbox.config(yscrollcommand=scrollbar.set)

        # Bottom Frame: Controls and Quick Stats
        control_frame = ttk.Frame(tab, padding=PADDING)
        pane.add(control_frame, weight=1)

        # Left: Buttons
        button_frame = ttk.LabelFrame(control_frame, text="Actions", padding=PADDING)
        button_frame.pack(side=tk.LEFT, padx=PADDING, fill='y')
        
        ttk.Button(button_frame, text="➕ Add New Foil", command=self.add_foil).pack(fill='x', pady=5)
        ttk.Button(button_frame, text="📝 Edit Selected Foil", command=self.edit_foil).pack(fill='x', pady=5)
        ttk.Button(button_frame, text="❌ Delete Selected Foil", command=self.delete_foil).pack(fill='x', pady=5)
        ttk.Separator(button_frame, orient='horizontal').pack(fill='x', pady=5)
        ttk.Button(button_frame, text="📥 Import Data from CSV", command=self.import_csv).pack(fill='x', pady=5)
        
        # Right: Quick Stats (empty for now, filled on selection)
        self.stats_frame = ttk.LabelFrame(control_frame, text="Selected Foil Quick Statistics", padding=PADDING)
        self.stats_frame.pack(side=tk.LEFT, padx=PADDING, fill='both', expand=True)
        ttk.Label(self.stats_frame, text="Select a foil above for details.", font=FONT_DEFAULT).pack(padx=PADDING, pady=PADDING)


        return tab
    
    def _create_analysis_tab(self):
        tab = ttk.Frame(self.notebook, padding=PADDING)
        
        # Frame for buttons
        button_frame = ttk.Frame(tab, padding=PADDING)
        button_frame.pack(fill='x', pady=PADDING)
        
        ttk.Button(button_frame, text="📄 Generate Professional PDF Report", command=self.generate_report).pack(side=tk.LEFT, padx=10)
        ttk.Button(button_frame, text="💾 Export All Data to Excel (.xlsx)", command=self.export_excel).pack(side=tk.LEFT, padx=10)
        
        ttk.Separator(tab, orient='horizontal').pack(fill='x', pady=10)
        
        # Frame for Stats/Conclusions preview
        stats_preview_frame = ttk.LabelFrame(tab, text="Analysis Conclusions Preview (Last Selected Foil)", padding=PADDING)
        stats_preview_frame.pack(fill='both', expand=True, padx=PADDING, pady=PADDING)

        # Text widget for displaying detailed conclusions (ScrolledText would be better, but we stick to built-ins)
        # Using a Label and StringVar for simplicity/conciseness, but a scrolled Text widget is more 'Pro'
        ttk.Label(stats_preview_frame, textvariable=self.stats_text_var, justify=tk.LEFT, wraplength=700, font=FONT_DEFAULT).pack(fill='both', expand=True, padx=5, pady=5)
        
        # Button to re-calculate stats for current selection
        ttk.Button(stats_preview_frame, text="Calculate Stats for Selected Foil", command=lambda: self.display_selected_foil_stats(None, detailed=True)).pack(pady=5)

        return tab

    # --- Core Application Logic (Modified for Rigor and Robustness) ---

    def validate_parameters(self):
        """Validate general parameters and update status."""
        try:
            diameter = self.disk_diameter_mm.get()
            bare_weight = self.bare_foil_weight_mg.get()
            
            if diameter <= 0:
                messagebox.showerror("Error", "Disk diameter must be positive.")
                return False
            if bare_weight <= 0: # Changed from < 0 to <= 0 as bare foil must have a weight
                messagebox.showerror("Error", "Bare foil weight must be positive.")
                return False
            
            messagebox.showinfo("Validation Success", "General parameters are valid.")
            return True
        except tk.TclError:
            messagebox.showerror("Error", "Please enter valid numbers for parameters.")
            return False

    def add_foil(self):
        self.current_foil = None
        self.open_foil_window(is_new=True)

    def edit_foil(self):
        selected = self.foil_listbox.curselection()
        if not selected:
            messagebox.showwarning("Warning", "Select a foil to edit.")
            return
        index = selected[0]
        self.current_foil = self.foils_data[index]
        self.open_foil_window(is_new=False)

    def delete_foil(self):
        selected = self.foil_listbox.curselection()
        if not selected:
            messagebox.showwarning("Warning", "Select a foil to delete.")
            return
        index = selected[0]
        foil_name = self.foils_data[index]['name']
        if messagebox.askyesno("Confirm Deletion", f"Are you sure you want to delete foil '{foil_name}'?"):
            del self.foils_data[index]
            self.update_foil_list()
            self.display_selected_foil_stats(None) # Clear stats

    def update_foil_list(self):
        self.foil_listbox.delete(0, tk.END)
        for i, foil in enumerate(self.foils_data):
            # Added Batch ID to display
            batch_id = foil.get('batch_id', 'N/A')
            display_text = f"[{i+1}] {foil['name']} (Batch:{batch_id}) - L:{foil['length_mm']}mm, W:{foil['width_mm']}mm, Sec:{foil['num_sections']}, Pos:{foil['num_positions']}"
            self.foil_listbox.insert(tk.END, display_text)

    def display_selected_foil_stats(self, event, detailed=False):
        """Displays quick stats on the Foil Data tab, or detailed on the Analysis tab."""
        selected = self.foil_listbox.curselection()
        
        # Clear/Reset views
        for widget in self.stats_frame.winfo_children():
            widget.destroy()
        if not detailed: # Only clear stats_text_var if not explicitly calculating detailed stats
             self.stats_text_var.set("Select a foil and click 'Calculate Stats'.")

        if not selected:
            ttk.Label(self.stats_frame, text="No foil selected.", font=FONT_DEFAULT).pack(padx=PADDING, pady=PADDING)
            return

        foil = self.foils_data[selected[0]]
        
        try:
            mass_df = self.calculate_mass_loading(foil['weights'])
            # MODIFICACIÓN: Desempaquetar los nuevos valores estadísticos
            mean, sd, cv, iqr, skewness = self.generate_stats(mass_df)
            
            # --- Quick Stats for Foil Data Tab ---
            if not detailed:
                ttk.Label(self.stats_frame, text=f"**{foil['name']}** Quick Stats:", font=FONT_HEADING).grid(row=0, column=0, columnspan=2, sticky='w', pady=5)
                
                ttk.Label(self.stats_frame, text="Mean Loading:").grid(row=1, column=0, sticky='w', padx=5)
                ttk.Label(self.stats_frame, text=f"{mean:.2f} mg/cm²", font=FONT_HEADING).grid(row=1, column=1, sticky='w', padx=5)

                ttk.Label(self.stats_frame, text="Std Dev:").grid(row=2, column=0, sticky='w', padx=5)
                ttk.Label(self.stats_frame, text=f"{sd:.2f} mg/cm²").grid(row=2, column=1, sticky='w', padx=5)

                ttk.Label(self.stats_frame, text="CV:").grid(row=3, column=0, sticky='w', padx=5)
                ttk.Label(self.stats_frame, text=f"{cv:.2f}%", foreground='green' if cv < 7 else 'orange' if cv < 12 else 'red').grid(row=3, column=1, sticky='w', padx=5)

            # --- Detailed Stats for Analysis Tab ---
            else:
                # MODIFICACIÓN: Pasar IQR y Skewness a las conclusiones
                conclusions = self.generate_conclusions(mean, sd, cv, iqr, skewness)
                self.stats_text_var.set(f"Detailed Analysis for **{foil['name']}** (Batch ID: {foil.get('batch_id', 'N/A')}):\n\n{conclusions}")
                messagebox.showinfo("Stats Calculated", f"Detailed statistics for '{foil['name']}' updated in the Analysis tab.")

        except Exception as e:
            error_msg = f"Error calculating stats: {e}"
            if detailed:
                self.stats_text_var.set(error_msg)
            else:
                ttk.Label(self.stats_frame, text=error_msg, foreground='red').pack(padx=PADDING, pady=PADDING)

    def calculate_mass_loading(self, weights_df):
        area_cm2 = np.pi * (self.disk_diameter_mm.get() / 20) ** 2
        # Use .copy() to prevent SettingWithCopyWarning if weights_df is a slice
        # Mantiene la lógica original con bare_foil_weight_mg
        mass_loading = (weights_df.copy() - self.bare_foil_weight_mg.get()) / area_cm2
        return mass_loading

    def generate_stats(self, mass_df):
        """Calcula estadísticas clave incluyendo IQR y Skewness."""
        values = mass_df.values.flatten()
        mean = values.mean()
        sd = values.std()
        cv = (sd / mean) * 100 if mean != 0 else 0
        
        # Nuevas Métricas de Rigor Estadístico:
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1
        skewness = pd.Series(values).skew()
        
        return mean, sd, cv, iqr, skewness

    def generate_conclusions(self, mean, sd, cv, iqr, skewness, is_total=False):
        """Genera conclusiones incluyendo la evaluación de asimetría."""
        conclusions = []
        conclusions.append("--- KEY STATISTICS ---")
        conclusions.append(f"Mean Mass Loading: **{mean:.2f} mg/cm²**")
        conclusions.append(f"Standard Deviation: **{sd:.2f} mg/cm²**")
        conclusions.append(f"Coefficient of Variation (CV): **{cv:.2f}%**")
        conclusions.append(f"Interquartile Range (IQR): **{iqr:.2f} mg/cm²**")
        conclusions.append(f"Skewness (Asimetría): **{skewness:.2f}**") # Nuevo

        
        conclusions.append("\n--- UNIFORMITY ASSESSMENT (CV) ---")
        if cv < 3:
            conclusions.append("✅ **Excellent uniformity (CV < 3%)**. Indica un proceso de recubrimiento altamente estable.")
        elif cv < 7:
            conclusions.append("👍 **Good uniformity (CV < 7%)**. La consistencia del proceso es alta.")
        elif cv < 12:
            conclusions.append("⚠️ **Acceptable uniformity (CV < 12%)**. Se recomienda optimización del proceso para reducir la variación.")
        else:
            conclusions.append("❌ **Poor uniformity (CV > 12%)**. Variación significativa. Revisión obligatoria del proceso.")

        conclusions.append("\n--- DISTRIBUTION ASSESSMENT (SKEWNESS) ---")
        if abs(skewness) < 0.2:
            conclusions.append("✅ **Distribución Simétrica**. Excelente balance en la uniformidad.")
        elif skewness > 0.2:
            conclusions.append("⚠️ **Asimetría Positiva**. La carga másica tiende a tener valores altos ocasionales (sesgo a la derecha).")
        else:
            conclusions.append("⚠️ **Asimetría Negativa**. La carga másica tiende a tener valores bajos ocasionales (sesgo a la izquierda).")

        if is_total:
            conclusions.append("\nEste análisis general cubre todas las láminas medidas, mostrando la consistencia agregada.")
        
        return "\n".join(conclusions)
    
    # --- Modificaciones en open_foil_window y save_foil ---
    
    def open_foil_window(self, is_new):
        foil_window = tk.Toplevel(self.root)
        foil_window.title("Foil Data Editor - " + ("New" if is_new else self.current_foil['name']))
        # Increased initial size for better viewing of the grid
        foil_window.geometry("1400x750") 

        # Default values (as in original code)
        DEFAULT_LENGTH = 400.0
        DEFAULT_WIDTH = 200.0
        DEFAULT_SECTIONS = 1
        DEFAULT_POSITIONS = 9
        DEFAULT_DISK_POSITION = 'Center'

        # Variables
        name_var = tk.StringVar(value=self.current_foil['name'] if not is_new and self.current_foil else "")
        length_mm_var = tk.DoubleVar(value=self.current_foil['length_mm'] if not is_new and self.current_foil else DEFAULT_LENGTH)
        width_mm_var = tk.DoubleVar(value=self.current_foil['width_mm'] if not is_new and self.current_foil else DEFAULT_WIDTH)
        num_sections_var = tk.IntVar(value=self.current_foil['num_sections'] if not is_new and self.current_foil else DEFAULT_SECTIONS)
        num_positions_var = tk.IntVar(value=self.current_foil['num_positions'] if not is_new and self.current_foil else DEFAULT_POSITIONS)
        disk_position_var = tk.StringVar(value=self.current_foil.get('disk_position', DEFAULT_DISK_POSITION) if not is_new and self.current_foil else DEFAULT_DISK_POSITION)
        
        # MODIFICACIÓN: Nueva variable para Batch ID (Trazabilidad)
        batch_id_var = tk.StringVar(value=self.current_foil.get('batch_id', "") if not is_new and self.current_foil else "")


        # Top Inputs Frame (LabelFrame for better grouping)
        input_frame = ttk.LabelFrame(foil_window, text="Foil/Sample Geometry and Discretization", padding=PADDING)
        input_frame.pack(side=tk.TOP, fill=tk.X, padx=PADDING, pady=PADDING)

        # Group 1: General Info
        info_frame = ttk.Frame(input_frame)
        info_frame.pack(side=tk.LEFT, padx=PADDING)
        
        ttk.Label(info_frame, text="Foil Name:").grid(row=0, column=0, padx=5, sticky='e')
        ttk.Entry(info_frame, textvariable=name_var, width=20).grid(row=0, column=1)
        
        # MODIFICACIÓN: Añadir Batch ID
        ttk.Label(info_frame, text="Batch ID (Lote):").grid(row=1, column=0, padx=5, sticky='e')
        ttk.Entry(info_frame, textvariable=batch_id_var, width=20).grid(row=1, column=1)

        ttk.Label(info_frame, text="Disk Position in Cell:").grid(row=2, column=0, padx=5, sticky='e') # Row changed
        disk_positions = ['Left', 'Center', 'Right']
        ttk.Combobox(info_frame, textvariable=disk_position_var, values=disk_positions, state="readonly", width=17).grid(row=2, column=1) # Row changed

        # Group 2: Dimensions
        dim_frame = ttk.Frame(input_frame)
        dim_frame.pack(side=tk.LEFT, padx=PADDING * 2)

        ttk.Label(dim_frame, text="Length (mm):").grid(row=0, column=0, padx=5, sticky='e')
        ttk.Entry(dim_frame, textvariable=length_mm_var, width=15).grid(row=0, column=1)

        ttk.Label(dim_frame, text="Width (mm):").grid(row=1, column=0, padx=5, sticky='e')
        ttk.Entry(dim_frame, textvariable=width_mm_var, width=15).grid(row=1, column=1)

        # Group 3: Discretization
        disc_frame = ttk.Frame(input_frame)
        disc_frame.pack(side=tk.LEFT, padx=PADDING * 2)

        ttk.Label(disc_frame, text="Sections (Longitudinal):").grid(row=0, column=0, padx=5, sticky='e')
        ttk.Entry(disc_frame, textvariable=num_sections_var, width=10).grid(row=0, column=1)

        ttk.Label(disc_frame, text="Positions (Transversal):").grid(row=1, column=0, padx=5, sticky='e')
        ttk.Entry(disc_frame, textvariable=num_positions_var, width=10).grid(row=1, column=1)
        
        # Action Buttons
        button_frame = ttk.Frame(input_frame)
        button_frame.pack(side=tk.RIGHT, padx=PADDING)
        
        # Save Button (Placed prominently)
        ttk.Button(button_frame, text="✅ Save Foil Data", command=self.save_foil).pack(pady=5, fill='x')
        # Update/Render Button
        ttk.Button(button_frame, text="🔄 Update Grid & Render", command=self.create_grid_and_render).pack(pady=5, fill='x')


        # Main Frame: Left for weights grid, Right for canvas (PanedWindow is better for this)
        main_pane = ttk.PanedWindow(foil_window, orient=tk.HORIZONTAL)
        main_pane.pack(fill=tk.BOTH, expand=True, padx=PADDING, pady=PADDING)

        # Left: Weights Grid (inside a ScrolledFrame, if available, but using Frame + Scrollbar)
        weights_scrolled_frame = ttk.Frame(main_pane)
        main_pane.add(weights_scrolled_frame, weight=1)

        # Create a Canvas and Scrollbar for the Grid
        grid_canvas = tk.Canvas(weights_scrolled_frame)
        grid_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        v_scrollbar = ttk.Scrollbar(weights_scrolled_frame, orient=tk.VERTICAL, command=grid_canvas.yview)
        v_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        grid_canvas.configure(yscrollcommand=v_scrollbar.set)
        
        h_scrollbar = ttk.Scrollbar(weights_scrolled_frame, orient=tk.HORIZONTAL, command=grid_canvas.xview)
        h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)
        grid_canvas.configure(xscrollcommand=h_scrollbar.set)
        
        # Frame that holds the actual grid (inside the canvas)
        self.weights_frame = ttk.Frame(grid_canvas, padding=(0, 0, 5, 5)) 
        grid_canvas.create_window((0, 0), window=self.weights_frame, anchor="nw")
        
        # Right: Canvas for rendering
        canvas_frame = ttk.LabelFrame(main_pane, text="Foil Visualization and Disk Location", padding=PADDING)
        main_pane.add(canvas_frame, weight=1)
        
        self.canvas = tk.Canvas(canvas_frame, bg="#F0F0F0", width=600, height=400) # Lighter background
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self.entries = []
        self.highlights = []  # List of highlight IDs on canvas
        
        # Bind events to update scrolling region
        self.weights_frame.bind("<Configure>", lambda e: grid_canvas.configure(scrollregion=grid_canvas.bbox("all")))
        grid_canvas.bind('<Configure>', lambda e: self.create_grid_and_render(force_render=True))

        # Re-assign variables to self for use in helper functions
        self.name_var = name_var
        self.length_mm_var = length_mm_var
        self.width_mm_var = width_mm_var
        self.num_sections_var = num_sections_var
        self.num_positions_var = num_positions_var
        self.disk_position_var = disk_position_var
        self.batch_id_var = batch_id_var # MODIFICACIÓN: Asignar nueva variable
        self.is_new = is_new

        # Initial call - force update size before render
        foil_window.update_idletasks() 
        self.create_grid_and_render(force_render=True)
        
        # Keep references to prevent garbage collection
        self.grid_canvas = grid_canvas 
        self.foil_window = foil_window

    def get_offset_multiplier(self, position_str):
        if position_str == 'Left': return (0.15, 0.5) 
        if position_str == 'Right': return (0.85, 0.5) 
        return (0.5, 0.5) # Center

    def create_grid_and_render(self, force_render=False):
        # Clear grid and canvas
        for widget in self.weights_frame.winfo_children():
            widget.destroy()
        self.canvas.delete("all")
        self.entries = []
        self.highlights = []

        try:
            num_sections = self.num_sections_var.get()
            num_positions = self.num_positions_var.get()
            foil_length = self.length_mm_var.get()
            foil_width = self.width_mm_var.get()
            foil_name = self.name_var.get()
            disk_pos_str = self.disk_position_var.get()
            
            if num_sections <= 0 or num_positions <= 0:
                 messagebox.showerror("Error", "Number of sections and positions must be > 0.")
                 return

        except tk.TclError:
            messagebox.showerror("Error", "Enter valid numbers for dimensions/sections/positions.")
            return

        # Render foil on canvas (Original Logic)
        canvas_width = self.canvas.winfo_width() or 600
        canvas_height = self.canvas.winfo_height() or 400
        
        scale_x = (canvas_width * 0.8) / max(foil_length, 1)  
        scale_y = (canvas_height * 0.8) / max(foil_width, 1)
        scale = min(scale_x, scale_y) 

        rect_width = foil_length * scale
        rect_height = foil_width * scale
        x0 = (canvas_width - rect_width) / 2
        y0 = (canvas_height - rect_height) / 2

        self.canvas.create_rectangle(x0, y0, x0 + rect_width, y0 + rect_height, fill="#DCDCDC", outline="#696969", width=2)

        # Measurement labels (more subtle)
        self.canvas.create_text(x0 + rect_width / 2, y0 - 15, text=f"L: {foil_length:.1f} mm", font=("Arial", 9))
        self.canvas.create_text(x0 - 15, y0 + rect_height / 2, text=f"W: {foil_width:.1f} mm", font=("Arial", 9), angle=90)
        
        self.canvas.create_text(x0 + rect_width / 2, y0 + rect_height + 20, text=f"Sample: {foil_name} (Disk: {disk_pos_str})", font=("Arial", 11, "bold"))

        # Draw holes (circles) and grid
        section_step = rect_width / num_sections
        position_step = rect_height / num_positions

        disk_radius = self.disk_diameter_mm.get() / 2 * scale * 0.5  # Aesthetic adjustment
        dx_mult, dy_mult = self.get_offset_multiplier(disk_pos_str)
        
        # Draw grid lines
        for i in range(1, num_sections):
            self.canvas.create_line(x0 + i * section_step, y0, x0 + i * section_step, y0 + rect_height, dash=(3, 1), fill="#A9A9A9")
        for j in range(1, num_positions):
            self.canvas.create_line(x0, y0 + j * position_step, x0 + rect_width, y0 + j * position_step, dash=(3, 1), fill="#A9A9A9")

        for i in range(num_sections): # Longitudinal Sections
            ttk.Label(self.weights_frame, text=f"Sec {i+1}", font=FONT_DEFAULT).grid(row=i+1, column=0, padx=5, sticky="e")
            row_entries = []
            for j in range(num_positions): # Transversal Positions
                if i == 0:
                    ttk.Label(self.weights_frame, text=f"Pos {j+1}", font=FONT_DEFAULT).grid(row=0, column=j+1, padx=5, sticky='s')
                entry = ttk.Entry(self.weights_frame, width=10)
                entry.grid(row=i+1, column=j+1, padx=2, pady=2)
                
                # Pre-fill weights if editing and sizes match previous data
                if not self.is_new and self.current_foil and i < self.current_foil['num_sections'] and j < self.current_foil['num_positions']:
                    try:
                        weight_value = self.current_foil['weights'].iloc[i, j]
                        if pd.notna(weight_value):
                            entry.insert(0, str(weight_value))
                    except IndexError:
                        pass

                # Bind focus for highlighting (uses original highlight_disk logic)
                entry.bind("<FocusIn>", lambda e, ii=i, jj=j: self.highlight_disk(ii, jj))
                row_entries.append(entry)

                cx = x0 + i * section_step + section_step * dx_mult
                cy = y0 + j * position_step + position_step * dy_mult
                
                # Draw disk circle (hole)
                self.canvas.create_oval(cx - disk_radius, cy - disk_radius, cx + disk_radius, cy + disk_radius, 
                                        fill="white", outline="#333333", width=1)
                
                # Add highlight circle (hidden)
                self.highlights.append((i, j, self.canvas.create_oval(cx - disk_radius - 2, cy - disk_radius - 2, 
                                                                    cx + disk_radius + 2, cy + disk_radius + 2, 
                                                                    outline="red", width=3, state="hidden")))

            self.entries.append(row_entries)
        
        # Update scrolling region
        self.weights_frame.update_idletasks()
        self.grid_canvas.configure(scrollregion=self.grid_canvas.bbox("all"))

    def highlight_disk(self, sec, pos):
        # Hide all highlights
        for i, j, hid in self.highlights:
            self.canvas.itemconfig(hid, state="hidden")
        # Show the current one
        for i, j, hid in self.highlights:
            if i == sec and j == pos:
                self.canvas.itemconfig(hid, state="normal")
                break

    def save_foil(self):
        try:
            name = self.name_var.get().strip()
            batch_id = self.batch_id_var.get().strip() # MODIFICACIÓN: Capturar Batch ID
            length_mm = self.length_mm_var.get()
            width_mm = self.width_mm_var.get()
            num_sections = self.num_sections_var.get()
            num_positions = self.num_positions_var.get()
            disk_position = self.disk_position_var.get()
            
            if not name:
                messagebox.showerror("Error", "Foil name is required.")
                return
            
            # MODIFICACIÓN: Validación de Robustez 1 - Batch ID obligatorio
            if not batch_id:
                messagebox.showerror("Error", "Batch ID is required for full traceability.")
                return
            
            if num_sections <= 0 or num_positions <= 0 or length_mm <= 0 or width_mm <= 0:
                 messagebox.showerror("Error", "All dimensions must be valid and positive numbers.")
                 return
                 
            weights = np.zeros((num_sections, num_positions))
            bare_weight = self.bare_foil_weight_mg.get() # Peso de la lámina base (global)
            
            for i in range(num_sections):
                for j in range(num_positions):
                    val = self.entries[i][j].get().strip()
                    weight_val = float(val) if val else 0.0

                    # MODIFICACIÓN: Validación de Robustez 2 - Peso medido > Peso de la lámina base
                    if weight_val <= bare_weight:
                        messagebox.showerror("Error de Validación", f"El peso medido en Sec {i+1}, Pos {j+1} ({weight_val:.3f} mg) debe ser mayor que el Peso Promedio de la Lámina Base ({bare_weight:.3f} mg). Verifique el valor o ajuste el parámetro global.")
                        return # Detiene el guardado

                    weights[i, j] = weight_val
            
            df_weights = pd.DataFrame(weights, 
                                      index=[f"Sec {k+1}" for k in range(num_sections)], 
                                      columns=[f"Pos {m+1}" for m in range(num_positions)])

            foil_data = {'name': name, 'length_mm': length_mm, 'width_mm': width_mm, 
                         'num_sections': num_sections, 'num_positions': num_positions, 
                         'disk_position': disk_position, 'weights': df_weights,
                         'batch_id': batch_id} # MODIFICACIÓN: Guardar Batch ID
            
            if self.is_new:
                self.foils_data.append(foil_data)
            else:
                self.current_foil.update(foil_data)
            
            self.update_foil_list()
            self.foil_window.destroy()
        except ValueError:
            messagebox.showerror("Error", "Enter valid numbers in the weights grid.")
        except Exception as e:
            messagebox.showerror("Error", f"An unexpected error occurred: {e}")

    def import_csv(self):
        file_path = filedialog.askopenfilename(filetypes=[("CSV files", "*.csv")])
        if file_path:
            try:
                df = pd.read_csv(file_path, index_col=0)
                name = os.path.basename(file_path).split('.')[0]
                num_sections, num_positions = df.shape
                
                # MODIFICACIÓN: Solicitar Batch ID en importación
                batch_id = simpledialog.askstring("Input", f"Enter Batch ID for {name} (Required):", parent=self.root)
                length_mm = simpledialog.askfloat("Input", f"Enter Length (mm) for {name}:", initialvalue=400.0, parent=self.root)
                width_mm = simpledialog.askfloat("Input", f"Enter Width (mm) for {name}:", initialvalue=200.0, parent=self.root)
                disk_position = 'Center' 

                if length_mm is None or width_mm is None or not batch_id:
                    messagebox.showwarning("Import Cancelled", "Missing required data (Batch ID or dimensions) for imported foil.")
                    return
                
                # Validación de Robustez para el peso: comprueba que al menos un valor es mayor que el peso base
                if not (df.values > self.bare_foil_weight_mg.get()).any():
                    if messagebox.askyesno("Warning", "Imported weights seem to be less than or equal to the average bare foil weight. This will result in zero or negative mass loading. Import anyway?"):
                        pass # Continúa si el usuario lo confirma
                    else:
                        return


                self.foils_data.append({'name': name, 'length_mm': length_mm, 'width_mm': width_mm, 
                                        'num_sections': num_sections, 'num_positions': num_positions, 
                                        'disk_position': disk_position, 'weights': df,
                                        'batch_id': batch_id}) # MODIFICACIÓN: Guardar Batch ID
                self.update_foil_list()
                messagebox.showinfo("Success", f"Foil '{name}' imported successfully.")
            except Exception as e:
                messagebox.showerror("Error", f"Could not import: {e}")


    def generate_report(self):
        if not self.foils_data:
            messagebox.showwarning("Warning", "Add at least one foil.")
            return

        file_path = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF files", "*.pdf")])
        if not file_path:
            return

        try:
            with PdfPages(file_path) as pdf:
                # Cover Page
                fig, ax = plt.subplots(figsize=(8.5, 11))
                ax.text(0.5, 0.7, "PROFESSIONAL ELECTRODE MASS LOADING ANALYSIS REPORT", 
                        ha='center', va='center', fontsize=18, weight='bold')
                ax.text(0.5, 0.4, f"Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}", 
                        ha='center', va='center', fontsize=12)
                ax.axis('off')
                pdf.savefig(fig)
                plt.close(fig)

                # Analysis Per Foil
                all_mass_dfs = []
                for foil in self.foils_data:
                    mass_df = self.calculate_mass_loading(foil['weights'])
                    renamed_df = mass_df.rename(index=lambda x: f"{x} ({foil['name']})")
                    all_mass_dfs.append(renamed_df)

                    # MODIFICACIÓN: Desempaquetar los 5 valores (Rigor Estadístico)
                    mean, sd, cv, iqr, skewness = self.generate_stats(mass_df)
                    conclusions = self.generate_conclusions(mean, sd, cv, iqr, skewness)

                    # 1. Heatmap (% Deviation from Mean) - Único Mapa por Foil (Mejor indicador de Uniformidad)
                    deviation_df = ((mass_df - mean) / mean) * 100 
                    
                    fig, ax = plt.subplots(figsize=(10, 6))
                    # Aplicar profesionalización: linewidths=0.0 y linecolor='none' para que los colores se fundan
                    sns.heatmap(deviation_df, annot=True, cmap='coolwarm', ax=ax, fmt=".1f", center=0, 
                                cbar_kws={'label': 'Deviation from Mean (%)', 'orientation': 'vertical'},
                                linewidths=0.0, linecolor='none', annot_kws={"size": 10}) 

                    ax.set_title(f"Mass Loading Uniformity - Foil: {foil['name']} (% Deviation from Mean)", fontsize=14, weight='bold')
                    ax.set_xlabel("Transversal Positions")
                    ax.set_ylabel("Longitudinal Sections")
                    plt.tight_layout()
                    pdf.savefig(fig)
                    plt.close(fig)
                    
                    # Statistics Page - MODIFICACIÓN: Incluir Batch ID
                    fig, ax = plt.subplots(figsize=(8.5, 11))
                    ax.text(0.1, 0.9, f"STATISTICS REPORT: {foil['name']} (Batch ID: {foil.get('batch_id', 'N/A')})\n\n{conclusions.replace('**', '')}", 
                            va='top', fontsize=12, wrap=True, fontfamily='monospace')
                    ax.axis('off')
                    pdf.savefig(fig)
                    plt.close(fig)

                # Total Analysis (if multiple foils)
                if len(self.foils_data) > 1:
                    try:
                        total_mass_df = pd.concat(all_mass_dfs, axis=0)
                        # MODIFICACIÓN: Desempaquetar 5 valores para el total
                        mean, sd, cv, iqr, skewness = self.generate_stats(total_mass_df)
                        conclusions = self.generate_conclusions(mean, sd, cv, iqr, skewness, is_total=True)

                        # Total Heatmap - Único Mapa Agregado
                        fig, ax = plt.subplots(figsize=(10, max(6, len(total_mass_df)/4))) 
                        # Aplicar profesionalización: linewidths=0.0 y linecolor='none'
                        sns.heatmap(total_mass_df, annot=True, cmap='viridis', ax=ax, fmt=".2f", # Usar 'viridis' para el total
                                    cbar_kws={'label': 'Mass Loading (mg/cm²)'},
                                    linewidths=0.0, linecolor='none', annot_kws={"size": 8})

                        ax.set_title("Aggregated Mass Loading Heatmap (All Foils)", fontsize=14, weight='bold')
                        ax.set_xlabel("Transversal Positions")
                        ax.set_ylabel("Section (Foil Name)")
                        plt.tight_layout()
                        pdf.savefig(fig)
                        plt.close(fig)

                        # Total Statistics
                        fig, ax = plt.subplots(figsize=(8.5, 11))
                        ax.text(0.1, 0.9, f"AGGREGATED STATISTICS REPORT\n\n{conclusions.replace('**', '')}", 
                                va='top', fontsize=12, wrap=True, fontfamily='monospace')
                        ax.axis('off')
                        pdf.savefig(fig)
                        plt.close(fig)
                        
                    except ValueError as e:
                        fig, ax = plt.subplots(figsize=(8.5, 11))
                        ax.text(0.1, 0.9, f"AGGEGRATED ANALYSIS ERROR:\n\nTotal analysis not possible: Foils have different numbers of transversal positions.\nError: {e}", va='top', fontsize=12, wrap=True, color='red')
                        ax.axis('off')
                        pdf.savefig(fig)
                        plt.close(fig)

            messagebox.showinfo("Success", f"Professional Report saved to: {file_path}")
            
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred during report generation: {e}")

    def sanitize_sheet_name(self, name):
        """Sanitize sheet name for Excel (max 31 chars, no special chars) - Original logic retained."""
        invalid_chars = r'[\\/*?[\]:]'
        sanitized = re.sub(invalid_chars, '', name)
        
        if len(sanitized) > 31:
            sanitized = sanitized[:28] + "..."
            
        return sanitized

    def export_excel(self):
        if not self.foils_data:
            messagebox.showwarning("Warning", "Add at least one foil to export data.")
            return

        if not self.validate_parameters():
            return

        file_path = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Excel files", "*.xlsx")])
        if not file_path:
            return

        try:
            with pd.ExcelWriter(file_path, engine='xlsxwriter') as writer:
                # 1. Sheet for General Parameters
                general_data = {
                    'Parameter': ['Disk Diameter (mm)', 'Bare Foil Weight per Disk (mg)'],
                    'Value': [self.disk_diameter_mm.get(), self.bare_foil_weight_mg.get()]
                }
                pd.DataFrame(general_data).to_excel(writer, sheet_name=self.sanitize_sheet_name('Parameters'), index=False)
                
                summary_data = []
                used_sheet_names = set(['Parameters'])
                
                for i, foil in enumerate(self.foils_data):
                    foil_name = foil['name'] if foil['name'] else f'Foil_{i+1}'
                    mass_df = self.calculate_mass_loading(foil['weights'])
                    # MODIFICACIÓN: Desempaquetar los 5 valores
                    mean, sd, cv, iqr, skewness = self.generate_stats(mass_df)
                    
                    # Create unique sheet names
                    weights_sheet_name = self.sanitize_sheet_name(f'{foil_name}_Weights')
                    loading_sheet_name = self.sanitize_sheet_name(f'{foil_name}_Loading')
                    
                    # Simple unique-name generator
                    counter = 1
                    while weights_sheet_name in used_sheet_names:
                        weights_sheet_name = self.sanitize_sheet_name(f'{foil_name}_Weights_{counter}')
                        counter += 1
                    used_sheet_names.add(weights_sheet_name)
                    
                    counter = 1
                    while loading_sheet_name in used_sheet_names:
                        loading_sheet_name = self.sanitize_sheet_name(f'{foil_name}_Loading_{counter}')
                        counter += 1
                    used_sheet_names.add(loading_sheet_name)
                    
                    foil['weights'].to_excel(writer, sheet_name=weights_sheet_name)
                    mass_df.to_excel(writer, sheet_name=loading_sheet_name)
                    
                    summary_data.append({
                        'Foil Name': foil_name, 'Length (mm)': foil['length_mm'], 'Width (mm)': foil['width_mm'],
                        'Sections (Long)': foil['num_sections'], 'Positions (Trans)': foil['num_positions'], 
                        'Disk Position': foil['disk_position'], 'Batch ID': foil.get('batch_id', 'N/A'), # MODIFICACIÓN: Añadir Batch ID
                        'Mean Mass Loading (mg/cm2)': mean,
                        'SD Mass Loading (mg/cm2)': sd, 'CV (%)': cv,
                        'IQR (mg/cm2)': iqr, 'Skewness': skewness, # MODIFICACIÓN: Añadir nuevas métricas
                    })

                # 3. Summary Sheet with Statistics
                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name=self.sanitize_sheet_name('Summary Stats'), index=False)
                
                # 4. Total Mass Loading (if possible)
                if len(self.foils_data) > 1:
                    try:
                        first_positions = self.foils_data[0]['weights'].shape[1]
                        all_same_positions = all(f['weights'].shape[1] == first_positions for f in self.foils_data)
                        
                        if all_same_positions:
                            all_mass_dfs = [self.calculate_mass_loading(f['weights']).rename(index=lambda x: f"{x} ({f['name']})") for f in self.foils_data]
                            total_mass_df = pd.concat(all_mass_dfs, axis=0)
                            total_mass_df.to_excel(writer, sheet_name=self.sanitize_sheet_name('TOTAL_Loading'))
                            
                            # MODIFICACIÓN: Añadir Total Stats
                            mean, sd, cv, iqr, skewness = self.generate_stats(total_mass_df)
                            total_stats_data = {
                                'Statistic': ['Mean Mass Loading (mg/cm2)', 'SD Mass Loading (mg/cm2)', 'CV (%)', 'IQR (mg/cm2)', 'Skewness'],
                                'Value': [mean, sd, cv, iqr, skewness]
                            }
                            pd.DataFrame(total_stats_data).to_excel(writer, sheet_name=self.sanitize_sheet_name('TOTAL_Stats'), index=False)
                        else:
                            note_df = pd.DataFrame({'Note': ['Total mass loading sheet not created: Foils have different transversal positions.']})
                            note_df.to_excel(writer, sheet_name=self.sanitize_sheet_name('Total_Note'), index=False)
                    except Exception as e:
                        error_df = pd.DataFrame({'Error': [f'Could not create total mass loading: {str(e)}']})
                        error_df.to_excel(writer, sheet_name=self.sanitize_sheet_name('Total_Error'), index=False)

            messagebox.showinfo("Success", f"Data exported to: {file_path}")
            
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred during Excel export: {e}")


if __name__ == "__main__":
    root = tk.Tk()
    root.bind('<Configure>', lambda e: root.geometry(root.geometry())) 
    # Try to load a nicer theme if available (e.g., 'clam' or 'alt')
    try:
        root.tk.call('lappend', 'auto_path', 'themes') # Assumes themes folder is present
        root.tk.call('package', 'require', 'awthemes')
        ttk.Style().theme_use('awdark') # A common dark theme
    except:
        pass # Stick to default theme if custom ones fail
    app = MassLoadingAnalyzer(root)
    root.mainloop()