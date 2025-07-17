// Cuadro de Quadcóptero Paramétrico para URIA
// Versión actualizada: rectángulos huecos corregidos para intersección con brazos

// Parámetros ajustables
global_fn = 50;                 // Resolución uniforme para todos los círculos
arm_length = 80;               // Longitud del brazo desde el centro hasta el soporte del motor (mm)
arm_width = 10;                // Ancho de los brazos (mm)
frame_thickness = 5;           // Grosor del cuadro (mm)
body_length = 40;             // Longitud del cuerpo rectangular (mm)
body_width = 120;               // Ancho del cuerpo rectangular (mm)
corner_radius = 5;             // Radio para esquinas redondeadas del cuerpo central (mm)
motor_mount_diameter = 30;     // Diámetro de los soportes de motores (mm)
motor_hole_spacing = 16;       // Espaciado entre orificios de montaje del motor (mm)
motor_hole_diameter = 3;       // Diámetro de los orificios de montaje del motor (mm)
fc_hole_spacing = 30.5;        // Espaciado entre orificios de la controladora de vuelo (mm)
fc_hole_diameter = 5;          // Diámetro de los orificios de la controladora de vuelo (mm)
hole_distance = 8;            // Distancia desde el centro para los rectángulos huecos (mm)
hole_width = 4;               // Ancho de los rectángulos huecos (mm)
hole_height = 80;              // Altura de los rectángulos huecos (mm)
enable_auto_rotate = false;    // true para vista rotatoria automática

// Módulo: Rectángulo redondeado
module rounded_rect(length, width, radius) {
    minkowski() {
        square([length - 2*radius, width - 2*radius], center=true);
        circle(r=radius, $fn=global_fn);
    }
}

// Módulo: Brazos base en 2D
module base_arms_2d() {
    union() {
        for (angle = [0, 90, 180, 270]) {
            rotate([0, 0, angle])
                translate([0, -arm_width/2])
                    square([arm_length, arm_width]);
        }
    }
}

// Módulo: Forma 2D completa (cuerpo + brazos + soportes con rectángulos huecos)
module frame_2d_with_mounts() {
    difference() {
        union() {
            // Cuerpo central redondeado
            rotate([0, 0, 45])
                rounded_rect(body_length, body_width, corner_radius);
            // Brazos
            base_arms_2d();
            // Soportes de motor
            for (angle = [0, 90, 180, 270]) {
                rotate([0, 0, angle])
                    translate([arm_length, 0])
                        circle(d=motor_mount_diameter, $fn=global_fn);
            }
        }
        // Rectángulos huecos (slots) para cables
        rotate([0, 0, 45])
            union() {
                translate([hole_distance, 0]) square([hole_width, hole_height], center=true);
                translate([-hole_distance, 0]) square([hole_width, hole_height], center=true);
            }
    }
}

// Generación principal: extrusión y orificios
module final_frame_3d() {
    difference() {
        // Extrusión del contorno
        linear_extrude(height=frame_thickness)
            frame_2d_with_mounts();

        // Orificios de montaje de motores
        for (angle = [0, 90, 180, 270]) {
            rotate([0, 0, angle])
                translate([arm_length, 0, -1]) {
                    for (x = [-motor_hole_spacing/2, motor_hole_spacing/2])
                        for (y = [-motor_hole_spacing/2, motor_hole_spacing/2])
                            translate([x, y, 0])
                                cylinder(h=frame_thickness + 2, d=motor_hole_diameter, $fn=global_fn);
                }
        }

        // Orificios de la controladora de vuelo
        for (x = [-fc_hole_spacing/2, fc_hole_spacing/2])
            for (y = [-fc_hole_spacing/2, fc_hole_spacing/2])
                translate([x, y, -1])
                    cylinder(h=frame_thickness + 2, d=fc_hole_diameter, $fn=global_fn);
    }
}

// Llamada final
if (!enable_auto_rotate) {
    final_frame_3d();
} else {
    rotate_extrude(angle=360)
        translate([body_length/2 + arm_length/2, 0, 0])
            circle(d=1, $fn=4);
}