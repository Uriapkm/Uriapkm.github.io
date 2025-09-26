
#include <EEPROM.h>

const int pHPin = A0;           // pH meter Analog output to Arduino Analog Input 0
const float samplingInterval = 1000; // Sample every second

// EEPROM addresses for storing calibration data
const int EEPROM_pH4_ADDR = 0;  // 4 bytes for pH 4 voltage
const int EEPROM_pH7_ADDR = 4;  // 4 bytes for pH 7 voltage

// Calibration values
float pH4Voltage = 3.018;  // Default voltage for pH 4 solution
float pH7Voltage = 2.636;  // Default voltage for pH 7 solution

// State variables
bool calibrationMode = false;
String inputString = "";
bool stringComplete = false;

void setup() {
    Serial.begin(9600);
    inputString.reserve(20);
    loadCalibrationData();
    Serial.println("pH Meter Ready");
}

void loop() {
    if (stringComplete) {
        processCommand(inputString);
        inputString = "";
        stringComplete = false;
    }
    
    // Regular pH reading if not in calibration mode
    if (!calibrationMode) {
        float pHValue = readpH();
        Serial.print("PH:");
        Serial.println(pHValue, 2);
        delay(samplingInterval);
    }
}

void serialEvent() {
    while (Serial.available()) {
        char inChar = (char)Serial.read();
        if (inChar == '\n') {
            stringComplete = true;
        } else {
            inputString += inChar;
        }
    }
}

float readpH() {
    // Take multiple readings for stability
    float voltage = 0;
    for(int i = 0; i < 10; i++) {
        voltage += analogRead(pHPin) * (5.0 / 1024.0);
        delay(10);
    }
    voltage = voltage / 10;
    
    // Convert voltage to pH using two-point calibration
    float slope = (7.0 - 4.0) / (pH7Voltage - pH4Voltage);
    float intercept = 7.0 - (slope * pH7Voltage);
    
    return slope * voltage + intercept;
}

void processCommand(String command) {
    command.trim();
    command.toUpperCase();
    
    if (command.startsWith("CAL")) {
        int commaIndex = command.indexOf(',');
        if (commaIndex != -1) {
            String phValue = command.substring(commaIndex + 1);
            startCalibration(phValue.toFloat());
        }
    }
    else if (command == "READ") {
        float ph = readpH();
        Serial.print("Current pH: ");
        Serial.println(ph, 2);
    }
    else if (command == "RESET") {
        resetCalibration();
        Serial.println("Calibration reset to defaults");
    }
}

void startCalibration(float targetPH) {
    if (targetPH != 4.0 && targetPH != 7.0) {
        Serial.println("Error: Calibration only supported for pH 4.0 and 7.0");
        return;
    }
    
    Serial.print("Starting calibration for pH ");
    Serial.println(targetPH);
    Serial.println("Place probe in solution and wait for reading to stabilize...");
    
    delay(2000);  // Give user time to place probe
    
    // Take average of multiple readings
    float voltage = 0;
    for(int i = 0; i < 20; i++) {
        voltage += analogRead(pHPin) * (5.0 / 1024.0);
        delay(200);
    }
    voltage = voltage / 20;
    
    if (targetPH == 4.0) {
        pH4Voltage = voltage;
        EEPROM_writeFloat(EEPROM_pH4_ADDR, voltage);
    } else {
        pH7Voltage = voltage;
        EEPROM_writeFloat(EEPROM_pH7_ADDR, voltage);
    }
    
    Serial.println("Calibration complete!");
    Serial.print("Voltage at pH ");
    Serial.print(targetPH);
    Serial.print(": ");
    Serial.println(voltage, 3);
}

void loadCalibrationData() {
    float pH4 = EEPROM_readFloat(EEPROM_pH4_ADDR);
    float pH7 = EEPROM_readFloat(EEPROM_pH7_ADDR);
    
    // Only use EEPROM values if they seem valid
    if (pH4 > 0 && pH4 < 5) pH4Voltage = pH4;
    if (pH7 > 0 && pH7 < 5) pH7Voltage = pH7;
}

void resetCalibration() {
    pH4Voltage = 3.018;  // Default values
    pH7Voltage = 2.636;
    EEPROM_writeFloat(EEPROM_pH4_ADDR, pH4Voltage);
    EEPROM_writeFloat(EEPROM_pH7_ADDR, pH7Voltage);
}

void EEPROM_writeFloat(int addr, float val) {
    byte* p = (byte*)&val;
    for(int i = 0; i < 4; i++)
        EEPROM.write(addr + i, p[i]);
}

float EEPROM_readFloat(int addr) {
    float val;
    byte* p = (byte*)&val;
    for(int i = 0; i < 4; i++)
        p[i] = EEPROM.read(addr + i);
    return val;
}
