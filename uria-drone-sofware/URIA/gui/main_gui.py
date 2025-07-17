import os
import json
from PyQt5.QtWidgets import (
    QApplication, QWidget, QLabel, QVBoxLayout,
    QHBoxLayout, QGroupBox, QPushButton, QLineEdit,
    QMessageBox, QFileDialog, QSlider, QGridLayout, QSizePolicy
)
from PyQt5.QtCore import Qt, QProcess, QTimer
from PyQt5.QtGui import QPixmap, QPalette, QColor, QFont, QDoubleValidator

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

        # Temporizador para preview
        self.preview_timer = QTimer(self)
        self.preview_timer.setSingleShot(True)
        self.preview_timer.timeout.connect(self.generar_preview)

        # Colecciones de widgets
        self.sliders = {}
        self.text_inputs = {}

        self.init_ui()
        self.apply_style()
        self.generar_preview()

    def init_ui(self):
        main_layout = QHBoxLayout(self)

        # Panel de controles
        controls_box = QGroupBox("Configuración del chasis")
        grid = QGridLayout()
        row = 0
        for key, val in self.params.items():
            # Slider
            slider = QSlider(Qt.Horizontal)
            mi, ma = self.param_ranges[key]
            slider.setRange(int(mi*10), int(ma*10))
            slider.setValue(int(val*10))
            slider.valueChanged.connect(lambda v, k=key: self.safe_slider_change(k, v))
            self.sliders[key] = slider

            # Texto
            text = QLineEdit(f"{val:.2f}")
            validator = QDoubleValidator(mi, ma, 2, text)
            text.setValidator(validator)
            text.editingFinished.connect(lambda k=key: self.safe_text_change(k))
            text.setMaximumWidth(60)
            self.text_inputs[key] = text

            # Etiqueta
            label = QLabel(key.replace('_',' ').capitalize())
            grid.addWidget(label, row, 0)
            grid.addWidget(slider, row, 1)
            grid.addWidget(text, row, 2)
            row += 1
        controls_box.setLayout(grid)

        # Panel de archivos y acciones
        actions_box = QGroupBox("Salida y acciones")
        vbox = QVBoxLayout()
        # Nombre de archivo
        hfile = QHBoxLayout()
        hfile.addWidget(QLabel("Nombre STL:"))
        self.filename_input = QLineEdit()
        self.filename_input.setPlaceholderText("sin .stl")
        hfile.addWidget(self.filename_input)
        vbox.addLayout(hfile)
        # Botones
        hbtn = QHBoxLayout()
        for name, func in [("Generar STL", self.generar_stl), ("Guardar JSON", self.generar_json), ("Vista previa", self.generar_preview)]:
            btn = QPushButton(name)
            btn.clicked.connect(func)
            hbtn.addWidget(btn)
        vbox.addLayout(hbtn)
        actions_box.setLayout(vbox)

        # Panel derecho: vista previa
        preview_box = QGroupBox("Vista previa")
        pbox = QVBoxLayout()
        self.preview_label = QLabel()
        self.preview_label.setAlignment(Qt.AlignCenter)
        self.preview_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        pbox.addWidget(self.preview_label)
        preview_box.setLayout(pbox)

        main_layout.addWidget(controls_box, 2)
        main_layout.addWidget(actions_box, 1)
        main_layout.addWidget(preview_box, 3)

    def apply_style(self):
        pal = QPalette()
        pal.setColor(QPalette.Window, QColor('#EFEFEF'))
        pal.setColor(QPalette.Button, QColor('#888888'))
        pal.setColor(QPalette.ButtonText, QColor('#FFFFFF'))
        pal.setColor(QPalette.Base, QColor('#FFFFFF'))
        pal.setColor(QPalette.Text, QColor('#333333'))
        self.setPalette(pal)
        self.setStyleSheet("""
            QGroupBox { border: 1px solid #999; border-radius: 8px; margin-top:10px; background:#FFF; }
            QGroupBox::title { subcontrol-position: top left; padding:0 8px; font-weight:bold; }
            QLabel { font-size:10pt; }
            QSlider::groove:horizontal { height:6px; background:#CCC; border-radius:3px; }
            QSlider::handle:horizontal { background:#555; width:12px; margin:-3px 0; border-radius:6px; }
            QPushButton { background:#555; border:none; color:#FFF; border-radius:5px; padding:5px 10px; }
            QPushButton:hover { background:#444; }
            QLineEdit { border:1px solid #CCC; border-radius:4px; padding:3px; background:#FFF; }
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
        self.preview_timer.start(5000)

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
