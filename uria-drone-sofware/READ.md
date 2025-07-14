# URIA Drone Software 🚁

**Herramienta de personalización de drones para misiones militares**

Este software permite la modificación en vivo del diseño de un frame de dron, adaptándolo a diferentes tipos de misiones militares de forma fácil y permitiendo su impresión 3D para personalización en primera línea.

---

## 🚀 Características

* **Interfaz Gráfica de Usuario (GUI):** Desarrollada con Python y PyQt.
* **Ajustes Paramétricos:** Sliders para controlar:
    * Longitud de los brazos (100-200 mm)
    * Diámetro de la placa base (100-150 mm)
    * Grosor de las piezas (2-5 mm)
* **Vista 3D en Tiempo Real:** Integración con FreeCAD para visualización instantánea de los cambios.
* **Exportación STL:** Botón para guardar el diseño personalizado como archivo STL, listo para impresión 3D.

---

## 🛠️ Tecnologías Utilizadas

* **Python:** Lenguaje de programación principal.
* **PyQt6:** Para la construcción de la Interfaz Gráfica de Usuario.
* **FreeCAD (API de Python):** Como motor de diseño paramétrico 3D.

---

## 📦 Instalación y Configuración

Sigue estos pasos para poner en marcha el proyecto en tu máquina local.

1.  **Clonar el Repositorio:**
    ```bash
    git clone [https://github.com/Uriapkm/Uriapkm.github.io.git](https://github.com/Uriapkm/Uriapkm.github.io.git)
    cd Uriapkm.github.io/uria-drone-sofware
    ```
    (Asegúrate de cambiar `Uriapkm/Uriapkm.github.io.git` por la URL real de tu repositorio si es diferente).

2.  **Crear y Activar Entorno Virtual:**
    Es altamente recomendable usar un entorno virtual para gestionar las dependencias.
    ```bash
    python -m venv venv
    ```
    * Para activar en **Windows (CMD)**:
        ```bash
        venv\Scripts\activate
        ```
    * Para activar en **Windows (PowerShell)**:
        ```bash
        .\venv\Scripts\Activate.ps1
        ```

3.  **Instalar Dependencias de Python:**
    Con el entorno virtual activado:
    ```bash
    pip install PyQt6
    # pip install -r requirements.txt (futuro: si creas este archivo)
    ```

4.  **Instalar FreeCAD:**
    Descarga e instala FreeCAD desde su sitio web oficial: [https://www.freecad.org/](https://www.freecad.org/)
    *(**Nota:** Es posible que necesites configurar tu `PYTHONPATH` para que los módulos de FreeCAD sean accesibles para tu script de Python. Esto se detallará en futuras actualizaciones del README si es necesario).*

---

## 🏃 Cómo Ejecutar el Software

1.  Asegúrate de que tu entorno virtual esté activado.
2.  Navega a la carpeta principal del proyecto (donde se encuentra `main_drone_app.py`).
3.  Ejecuta el script principal:
    ```bash
    python main_drone_app.py
    ```

---

## 💡 Uso

(Esta sección se completará a medida que el software avance)
* Ajusta los sliders para modificar el diseño del dron.
* Observa los cambios en la