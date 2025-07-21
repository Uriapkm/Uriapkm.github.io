import os
import json
from PyQt5.QtWidgets import (
    QApplication, QWidget, QLabel, QVBoxLayout, QTabWidget,
    QHBoxLayout, QGroupBox, QPushButton, QLineEdit,
    QMessageBox, QSlider, QGridLayout, QSizePolicy, QFrame
)
from PyQt5.QtCore import Qt, QProcess, QTimer
from PyQt5.QtGui import QPixmap, QPalette, QColor, QDoubleValidator, QFont

class ControlGroup(QGroupBox):
    def __init__(self, title, parent=None):
        super().__init__(title, parent)
        self.setStyleSheet("""
            QGroupBox {
                font-size: 13pt;
                font-weight: bold;
                padding: 15px;
                margin-top: 15px;
            }
            QGroupBox::title {
                subcontrol-position: top left;
                padding: 0 8px;
                color: #2c3e50;
            }
        """)

class URIA_GUI(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("URIA – Configurador Paramétrico")
        self.resize(1000, 700)

        # Definición de parámetros y rangos
        self.params = {
            "arm_length": 80.0,
            "arm_width": 10.0,
            "frame_thickness": 5.0,
            "body_length": 40.0,
            "body_width": 120.0,
            "corner_radius": 5.0,
            "motor_mount_diameter": 30.0,
            "motor_hole_spacing": 16.0,
            "motor_hole_diameter": 3.0,
            "fc_hole_spacing": 30.5,
            "fc_hole_diameter": 5.0,
            "slot_distance_from_center": 15.0,
            "slot_height": 10.0,
            "slot_width": 5.0
        }
        self.param_ranges = {
            "arm_length": (10,200),
            "arm_width": (5,50),
            "frame_thickness": (2,20),
            "body_length": (20,200),
            "body_width": (20,200),
            "corner_radius": (1,20),
            "motor_mount_diameter": (10,50),
            "motor_hole_spacing": (5,50),
            "motor_hole_diameter": (1,10),
            "fc_hole_spacing": (10,100),
            "fc_hole_diameter": (1,10),
            "slot_distance_from_center": (5,100),
            "slot_height": (5,50),
            "slot_width": (2,20)
        }

        # Rutas
        self.openscad_path = r"C:\Program Files\OpenSCAD\openscad.exe"
        self.scad_file = r"C:\Users\auria\OneDrive - CIC energiGUNE\Desktop\URIA\scripts\quadcopter_frame.scad"
        self.output_dir = r"C:\Users\auria\OneDrive - CIC energiGUNE\Desktop\URIA\stl_exports"
        self.logo_dir = r"C:\Users\auria\OneDrive - CIC energiGUNE\Desktop\Github\Uriapkm.github.io\uria-drone-sofware\URIA\assets\renders"
        self.company_logo_path = os.path.join(self.logo_dir, "logo.png")

        # Temporizador para preview
        self.preview_timer = QTimer(self)
        self.preview_timer.setSingleShot(True)
        self.preview_timer.timeout.connect(self.generar_preview)

        # Colecciones de widgets
        self.sliders = {}
        self.text_inputs = {}

        # Group parameters by category
        self.param_groups = {
            "Arms": ["arm_length", "arm_width"],
            "Frame": ["frame_thickness", "body_length", "body_width", "corner_radius"],
            "Motor Mount": ["motor_mount_diameter", "motor_hole_spacing", "motor_hole_diameter"],
            "Flight Controller": ["fc_hole_spacing", "fc_hole_diameter"],
            "Slots": ["slot_distance_from_center", "slot_height", "slot_width"]
        }

        self.init_ui()
        self.apply_style()
        self.generar_preview()

    def init_ui(self):
        main_layout = QHBoxLayout(self)
        main_layout.setSpacing(20)
        main_layout.setContentsMargins(20, 20, 20, 20)

        # Left panel with tabs
        left_panel = QVBoxLayout()
        tab_widget = QTabWidget()
        tab_widget.setFont(QFont("Segoe UI", 10))

        # Create tabs for parameter groups
        for group_name, param_list in self.param_groups.items():
            tab = QWidget()
            grid = QGridLayout(tab)
            grid.setSpacing(15)
            grid.setContentsMargins(15, 15, 15, 15)
            
            for row, param in enumerate(param_list):
                # Label
                label = QLabel(param.replace('_', ' ').title())
                label.setFont(QFont("Segoe UI", 11))
                grid.addWidget(label, row, 0)

                # Slider
                slider = QSlider(Qt.Horizontal)
                mi, ma = self.param_ranges[param]
                slider.setRange(int(mi*10), int(ma*10))
                slider.setValue(int(self.params[param]*10))
                slider.valueChanged.connect(lambda v, k=param: self.safe_slider_change(k, v))
                slider.setMinimumWidth(200)
                self.sliders[param] = slider
                grid.addWidget(slider, row, 1)

                # Text input
                text = QLineEdit(f"{self.params[param]:.2f}")
                validator = QDoubleValidator(mi, ma, 2, text)
                text.setValidator(validator)
                text.editingFinished.connect(lambda k=param: self.safe_text_change(k))
                text.setMaximumWidth(70)
                text.setFont(QFont("Segoe UI", 10))
                self.text_inputs[param] = text
                grid.addWidget(text, row, 2)

            tab_widget.addTab(tab, group_name)

        left_panel.addWidget(tab_widget)

        # Actions panel
        actions_group = ControlGroup("Export Options")
        actions_layout = QVBoxLayout()
        
        # Filename input
        file_layout = QHBoxLayout()
        file_label = QLabel("Output Name:")
        file_label.setFont(QFont("Segoe UI", 11))
        self.filename_input = QLineEdit()
        self.filename_input.setFont(QFont("Segoe UI", 10))
        self.filename_input.setPlaceholderText("Enter filename (without .stl)")
        file_layout.addWidget(file_label)
        file_layout.addWidget(self.filename_input)
        actions_layout.addLayout(file_layout)

        # Action buttons
        button_layout = QHBoxLayout()
        for name, func, color in [
            ("Generate STL", self.generar_stl, "#2980b9"),
            ("Save JSON", self.generar_json, "#27ae60"),
            ("Preview", self.generar_preview, "#e67e22")
        ]:
            btn = QPushButton(name)
            btn.setFont(QFont("Segoe UI", 10))
            btn.setStyleSheet(f"""
                QPushButton {{
                    background-color: {color};
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                }}
                QPushButton:hover {{
                    background-color: {color}dd;
                }}
            """)
            btn.clicked.connect(func)
            button_layout.addWidget(btn)
        
        actions_layout.addLayout(button_layout)
        actions_group.setLayout(actions_layout)
        left_panel.addWidget(actions_group)

        # Preview panel
        preview_group = ControlGroup("Preview")
        preview_layout = QVBoxLayout()
        
        # Logos
        logo_layout = QHBoxLayout()
        self.company_logo_label = QLabel()
        if os.path.exists(self.company_logo_path):
            company_pix = QPixmap(self.company_logo_path).scaled(150, 150, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self.company_logo_label.setPixmap(company_pix)
        logo_layout.addWidget(self.company_logo_label, alignment=Qt.AlignCenter)  # Changed to center alignment

        preview_layout.addLayout(logo_layout)
        
        # Preview image
        self.preview_label = QLabel("Click 'Preview' to generate preview")
        self.preview_label.setAlignment(Qt.AlignCenter)
        self.preview_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        preview_layout.addWidget(self.preview_label)
        
        preview_group.setLayout(preview_layout)

        # Add panels to main layout
        controls_container = QWidget()
        controls_container.setLayout(left_panel)
        controls_container.setMaximumWidth(500)
        
        main_layout.addWidget(controls_container)
        main_layout.addWidget(preview_group, stretch=2)

    def apply_style(self):
        self.setStyleSheet("""
            QWidget {
                background-color: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                                                stop:0 #1a1a1a, stop:1 #2d2d2d);
                font-family: 'Segoe UI';
                color: #ffffff;
            }
            QGroupBox {
                border: 2px solid rgba(61, 61, 61, 180);
                border-radius: 12px;
                padding: 15px;
                margin-top: 20px;
                background-color: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                                stop:0 #2a2a2a, stop:1 #232323);
            }
            QGroupBox::title {
                color: #ffffff;
                padding: 0 10px;
                subcontrol-position: top left;
                subcontrol-origin: margin;
                background-color: #1e1e1e;
            }
            QTabWidget::pane {
                border: 2px solid rgba(61, 61, 61, 180);
                border-radius: 12px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #2a2a2a, stop:1 #232323);
                top: -1px;
            }
            QTabBar::tab {
                padding: 10px 20px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #3d3d3d, stop:1 #2d2d2d);
                border: 1px solid rgba(61, 61, 61, 180);
                border-bottom: none;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                color: #808080;
            }
            QTabBar::tab:selected {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #0088ee, stop:1 #0066cc);
                color: white;
                border: none;
            }
            QTabBar::tab:hover:!selected {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #454545, stop:1 #3d3d3d);
                color: #ffffff;
            }
            QSlider::groove:horizontal {
                height: 6px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #454545, stop:1 #3d3d3d);
                border-radius: 3px;
            }
            QSlider::handle:horizontal {
                background: qradialgradient(cx:0.5, cy:0.5, radius:0.5, fx:0.5, fy:0.5,
                                          stop:0 #0098ff, stop:1 #007acc);
                width: 18px;
                height: 18px;
                margin: -6px 0;
                border-radius: 9px;
            }
            QSlider::handle:horizontal:hover {
                background: qradialgradient(cx:0.5, cy:0.5, radius:0.5, fx:0.5, fy:0.5,
                                          stop:0 #00a8ff, stop:1 #0088dd);
            }
            QLineEdit {
                padding: 8px;
                border: 2px solid rgba(61, 61, 61, 180);
                border-radius: 8px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #2a2a2a, stop:1 #232323);
                color: white;
                selection-background-color: #007acc;
            }
            QLineEdit:focus {
                border: 2px solid #007acc;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #2d2d2d, stop:1 #252525);
            }
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #0088ee, stop:1 #0066cc);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #0098ff, stop:1 #0077dd);
            }
            QPushButton:pressed {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                                          stop:0 #006bb3, stop:1 #005c99);
            }
            QLabel {
                color: #ffffff;
                background: transparent;
            }
            QScrollBar:vertical {
                border: none;
                background: #1e1e1e;
                width: 10px;
                border-radius: 5px;
            }
            QScrollBar::handle:vertical {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                                          stop:0 #454545, stop:1 #3d3d3d);
                border-radius: 5px;
                min-height: 20px;
            }
            QScrollBar::handle:vertical:hover {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                                          stop:0 #555555, stop:1 #4d4d4d);
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0px;
            }
            QMessageBox {
                background-color: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                                                stop:0 #2a2a2a, stop:1 #232323);
            }
            QMessageBox QPushButton {
                min-width: 80px;
            }
        """)

    def safe_slider_change(self, key, v):
        try:
            self.on_slider_change(key, v)
        except Exception as e:
            QMessageBox.warning(self, "Error interno", f"Error al ajustar {key}: {e}")

    def safe_text_change(self, key):
        try:
            self.on_text_change(key)
        except Exception as e:
            QMessageBox.warning(self, "Error interno", f"Error en texto {key}: {e}")

    def on_slider_change(self, key, v):
        val = v / 10.0
        self.params[key] = val
        self.text_inputs[key].setText(f"{val:.2f}")
        self.preview_timer.start(1000)

    def on_text_change(self, key):
        txt = self.text_inputs[key].text()
        val = float(txt)
        mi, ma = self.param_ranges[key]
        if mi <= val <= ma:
            self.params[key] = val
            slider = self.sliders[key]
            slider.blockSignals(True)
            slider.setValue(int(val*10))
            slider.blockSignals(False)
            self.preview_timer.start(5000)

    def generar_stl(self):
        if not os.path.exists(self.openscad_path):
            QMessageBox.critical(self, "Error", "OpenSCAD no encontrado.")
            return
        base = self.filename_input.text().strip() or "output"
        path = self.get_unique_filename(base, ".stl")
        os.makedirs(self.output_dir, exist_ok=True)
        defines = [f"-D {k}={v}" for k, v in self.params.items()]
        cmd = [self.openscad_path, "-o", path] + defines + [self.scad_file]
        proc = QProcess(self)
        proc.start(cmd[0], cmd[1:])
        proc.waitForFinished()
        if proc.exitCode() == 0:
            QMessageBox.information(self, "Éxito", f"STL generado en:\n{path}")
        else:
            QMessageBox.critical(self, "Error", proc.readAllStandardError().data().decode())

    def generar_json(self):
        base = self.filename_input.text().strip() or "output"
        path = self.get_unique_filename(base, ".json")
        os.makedirs(self.output_dir, exist_ok=True)
        try:
            with open(path, "w") as f:
                json.dump(self.params, f, indent=4)
            QMessageBox.information(self, "Éxito", f"JSON guardado en:\n{path}")
        except Exception as e:
            QMessageBox.critical(self, "Error JSON", str(e))

    def generar_preview(self):
        base = self.filename_input.text().strip() or "preview"
        png = os.path.join(self.output_dir, f"{base}_preview.png")
        os.makedirs(self.output_dir, exist_ok=True)
        defines = [f"-D {k}={v}" for k, v in self.params.items()]
        cmd = [self.openscad_path, "--imgsize=800,600", "--projection=perspective", "--render", "-o", png] + defines + [self.scad_file]
        proc = QProcess(self)
        proc.start(cmd[0], cmd[1:])
        proc.waitForFinished()
        if os.path.exists(png):
            pix = QPixmap(png).scaled(self.preview_label.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self.preview_label.setPixmap(pix)
        else:
            self.preview_label.setText("No disponible")

    def get_unique_filename(self, base, ext):
        fn = f"{base}{ext}"
        full = os.path.join(self.output_dir, fn)
        i = 1
        while os.path.exists(full):
            fn = f"{base} ({i}){ext}"
            full = os.path.join(self.output_dir, fn)
            i += 1
        return full

if __name__ == "__main__":
    import sys
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    gui = URIA_GUI()
    gui.show()
    sys.exit(app.exec_())