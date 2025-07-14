import sys
import FreeCAD
import Part

# Verifica argumentos
if len(sys.argv) < 3:
    print("Uso: freecadcmd generate_drone.py arm_length base_diameter")
    sys.exit(1)

# Obtiene parámetros
arm_length = float(sys.argv[1])
base_diameter = float(sys.argv[2])
thickness = 3.0

# Crea documento
doc = FreeCAD.newDocument()

# Placa base
base = doc.addObject("Part::Box", "Base")
base.Length = base_diameter
base.Width = base_diameter
base.Height = thickness

# Brazos
for i in range(4):
    arm = doc.addObject("Part::Cylinder", f"Arm{i}")
    arm.Radius = 5
    arm.Height = arm_length
    arm.Placement.Base = FreeCAD.Vector(i * 30, 0, thickness)  # Ajusta según diseño

# Recomputa y exporta STL
doc.recompute()
doc.exportObjects(doc.Objects, "output/URIA_Drone.stl", "STL")
FreeCAD.closeDocument(doc.Name)