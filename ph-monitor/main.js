class PHMonitor {
    constructor() {
        this.serialPort = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.isLogging = false;
        this.logInterval = null;
        this.startTime = null;
        
        // Data storage
        this.phData = [];
        this.timeData = [];
        this.displayData = [];
        this.displayTime = [];
        this.calibrationPoints = [];
        
        // Calibration
        this.slope = 1.0;
        this.offset = 0.0;
        
        // Chart
        this.chart = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupChart();
        this.loadTheme();
        this.updateUI();
        
        // Check if Web Serial API is supported
        if (!('serial' in navigator)) {
            this.showNotification('Web Serial API not supported in this browser. Please use Chrome, Edge, or Opera.', 'error');
            document.getElementById('connectBtn').disabled = true;
        }
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.closest('.tab-button').dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Connection controls
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.connect();
        });

        document.getElementById('disconnectBtn').addEventListener('click', () => {
            this.disconnect();
        });

        document.getElementById('refreshPortsBtn').addEventListener('click', () => {
            this.refreshPorts();
        });

        // Copy Arduino code
        document.getElementById('copyCodeBtn').addEventListener('click', () => {
            this.copyArduinoCode();
        });

        // Logging controls
        document.getElementById('startLoggingBtn').addEventListener('click', () => {
            this.startLogging();
        });

        document.getElementById('stopLoggingBtn').addEventListener('click', () => {
            this.stopLogging();
        });

        // Calibration controls
        document.getElementById('addCalPointBtn').addEventListener('click', () => {
            this.addCalibrationPoint();
        });

        document.getElementById('resetCalBtn').addEventListener('click', () => {
            this.resetCalibration();
        });

        // Data export
        document.getElementById('exportCSVBtn').addEventListener('click', (e) => {
            this.exportData(e.target.dataset.format);
        });
        document.getElementById('exportExcelBtn').addEventListener('click', (e) => {
            this.exportData(e.target.dataset.format);
        });

        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.clearData();
        });

        // Auto-refresh ports when connection tab is selected
        document.querySelector('[data-tab="connection"]').addEventListener('click', () => {
            setTimeout(() => this.refreshPorts(), 100);
        });
    }

    setupChart() {
        const data = [{
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines+markers',
            name: 'pH Data',
            line: {
                color: '#4a90e2',
                width: 3
            },
            marker: {
                color: '#4a90e2',
                size: 8
            }
        }];

        const layout = {
            title: {
                text: 'pH vs Time',
                font: { size: 18, color: '#212121' }
            },
            xaxis: {
                title: 'Time (s)',
                gridcolor: '#e5e7eb',
                zerolinecolor: '#e5e7eb'
            },
            yaxis: {
                title: 'pH',
                range: [0, 14],
                gridcolor: '#e5e7eb',
                zerolinecolor: '#e5e7eb'
            },
            plot_bgcolor: '#ffffff',
            paper_bgcolor: '#ffffff',
            font: { color: '#212121' },
            margin: { t: 50, r: 50, b: 50, l: 50 },
            showlegend: false
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
            displaylogo: false
        };

        this.chart = Plotly.newPlot('phChart', data, layout, config);
    }

    updateChartTheme() {
        const isDark = document.documentElement.dataset.theme === 'dark';
        const layout = {
            title: {
                font: { color: isDark ? '#ffffff' : '#212121' }
            },
            xaxis: {
                gridcolor: isDark ? '#374151' : '#e5e7eb',
                zerolinecolor: isDark ? '#374151' : '#e5e7eb',
                color: isDark ? '#ffffff' : '#212121'
            },
            yaxis: {
                gridcolor: isDark ? '#374151' : '#e5e7eb',
                zerolinecolor: isDark ? '#374151' : '#e5e7eb',
                color: isDark ? '#ffffff' : '#212121'
            },
            plot_bgcolor: isDark ? '#1E1E1E' : '#ffffff',
            paper_bgcolor: isDark ? '#1E1E1E' : '#ffffff',
            font: { color: isDark ? '#ffffff' : '#212121' }
        };

        Plotly.relayout('phChart', layout);
    }

    async refreshPorts() {
        try {
            const ports = await navigator.serial.getPorts();
            const portSelect = document.getElementById('portSelect');
            
            // Clear existing options except the first one
            while (portSelect.children.length > 1) {
                portSelect.removeChild(portSelect.lastChild);
            }

            if (ports.length === 0) {
                // Try to request permission for new ports
                try {
                    const port = await navigator.serial.requestPort();
                    const option = document.createElement('option');
                    option.value = 'request';
                    option.textContent = 'Request Port Access...';
                    portSelect.appendChild(option);
                } catch (error) {
                    console.log('User cancelled port selection');
                }
            } else {
                ports.forEach((port, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `Port ${index + 1}`;
                    portSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error refreshing ports:', error);
            this.showNotification('Error refreshing ports: ' + error.message, 'error');
        }
    }

    async connect() {
        try {
            this.updateStatus('connecting', 'Connecting...');
            
            let port;
            const portSelect = document.getElementById('portSelect');
            
            if (portSelect.value === 'request' || portSelect.value === '') {
                port = await navigator.serial.requestPort();
            } else {
                const ports = await navigator.serial.getPorts();
                port = ports[parseInt(portSelect.value)];
            }

            if (!port) {
                throw new Error('No port selected');
            }

            await port.open({ baudRate: 9600 });
            
            this.serialPort = port;
            this.writer = port.writable.getWriter();
            this.reader = port.readable.getReader();
            
            this.isConnected = true;
            this.updateStatus('connected', 'Connected');
            this.updateUI();
            
            // Start reading data
            this.startReading();
            
            // Send initial READ command to test connection
            await this.sendCommand('READ\n');
            
            this.showNotification('Successfully connected to pH meter!', 'success');
            
        } catch (error) {
            console.error('Connection error:', error);
            this.updateStatus('disconnected', 'Connection failed');
            this.showNotification('Failed to connect: ' + error.message, 'error');
        }
    }

    async disconnect() {
        try {
            this.isConnected = false;
            this.stopLogging(); // Stop logging if active
            
            if (this.reader) {
                await this.reader.cancel();
                this.reader.releaseLock();
                this.reader = null;
            }
            
            if (this.writer) {
                await this.writer.close();
                this.writer.releaseLock();
                this.writer = null;
            }
            
            if (this.serialPort) {
                await this.serialPort.close();
                this.serialPort = null;
            }
            
            this.updateStatus('disconnected', 'Disconnected');
            this.updateUI();
            
            this.showNotification('Disconnected from pH meter', 'warning');
            
        } catch (error) {
            console.error('Disconnect error:', error);
            this.showNotification('Error during disconnect: ' + error.message, 'error');
        }
    }

    async startReading() {
        try {
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (this.isConnected && this.reader) {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                for (const line of lines) {
                    this.processSerialData(line.trim());
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Reading error:', error);
                this.showNotification('Error reading from device: ' + error.message, 'error');
                this.disconnect();
            }
        }
    }

    processSerialData(line) {
        // Parse PH:value format
        const match = line.match(/PH:([\d.]+)/);
        if (match) {
            const rawPH = parseFloat(match[1]);
            this.processPHReading(rawPH);
        }
    }

    processPHReading(rawPH) {
        // 1. Apply calibration
        const calibratedPH = this.slope * rawPH + this.offset;
        
        // 2. Update current reading in the UI
        document.getElementById('currentPH').textContent = calibratedPH.toFixed(2);
        document.getElementById('rawPH').textContent = rawPH.toFixed(2);
        document.getElementById('calibratedPH').textContent = calibratedPH.toFixed(2);
        document.getElementById('currentRaw').textContent = rawPH.toFixed(2);
        document.getElementById('readingStatus').textContent = `Last reading: pH ${calibratedPH.toFixed(2)}`;
        
        // 3. Store data and calculate time ONLY if logging is active
        if (this.isLogging) {
            const currentTime = Date.now();
            
            // this.startTime is reset in startLogging()
            if (!this.startTime) {
                this.startTime = currentTime;
            }
            
            const elapsedTime = (currentTime - this.startTime) / 1000;
            
            this.phData.push(calibratedPH);
            this.timeData.push(elapsedTime);
            this.displayData.push(calibratedPH);
            this.displayTime.push(elapsedTime);
            
            // Keep only last 100 points for display
            if (this.displayData.length > 100) {
                this.displayData.shift();
                this.displayTime.shift();
            }
            
            this.updateChart();
            this.updateDataTable();
            this.updateStatistics();
            this.updateExportUI();
        }
    }

    async sendCommand(command) {
        if (this.writer) {
            const encoder = new TextEncoder();
            await this.writer.write(encoder.encode(command));
        }
    }

    startLogging() {
        const interval = parseFloat(document.getElementById('intervalInput').value);
        if (interval <= 0 || isNaN(interval)) {
            this.showNotification('Interval must be a positive number of seconds.', 'error');
            return;
        }

        // 1. Clear any previous interval to avoid multiple executions
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }

        this.isLogging = true;

        // 2. Reset data and time
        this.phData = [];
        this.timeData = [];
        this.displayData = [];
        this.displayTime = [];
        this.startTime = Date.now(); // Reset base time

        // 3. Function to send READ command and handle data
        const sendReadCommand = async () => {
            if (this.isConnected && this.isLogging) {
                await this.sendCommand('READ\n');
            } else {
                // Stop logging if disconnected or logging stopped
                this.stopLogging();
            }
        };

        // 4. Send first command immediately
        sendReadCommand();

        // 5. Set up interval to send READ commands and align data
        this.logInterval = setInterval(() => {
            sendReadCommand();
        }, interval * 1000);

        this.updateUI();
        this.showNotification(`Started logging with ${interval}s interval`, 'success');
        
        // Add notification about live export capability
        setTimeout(() => {
            this.showNotification('You can export data at any time, even while logging is active!', 'info');
        }, 2000);
    }

    stopLogging() {
        this.isLogging = false;
        
        // Clear the interval to stop READ calls
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
        
        this.updateUI();
        this.showNotification('Stopped logging', 'warning');
    }

    addCalibrationPoint() {
        const measuredPH = parseFloat(document.getElementById('measuredPH').value);
        const actualPH = parseFloat(document.getElementById('actualPH').value);
        
        if (isNaN(measuredPH) || isNaN(actualPH)) {
            this.showNotification('Please enter valid pH values', 'error');
            return;
        }
        
        if (measuredPH < 0 || measuredPH > 14 || actualPH < 0 || actualPH > 14) {
            this.showNotification('pH values must be between 0 and 14', 'error');
            return;
        }
        
        this.calibrationPoints.push({ measured: measuredPH, actual: actualPH });
        this.computeCalibration();
        this.updateCalibrationTable();
        this.updateCalibrationUI();
        
        // Clear inputs
        document.getElementById('measuredPH').value = '';
        document.getElementById('actualPH').value = '';
        
        this.showNotification('Calibration point added', 'success');
    }

    computeCalibration() {
        if (this.calibrationPoints.length === 0) {
            this.slope = 1.0;
            this.offset = 0.0;
            return;
        }
        
        if (this.calibrationPoints.length === 1) {
            const point = this.calibrationPoints[0];
            this.slope = 1.0;
            this.offset = point.actual - point.measured;
            return;
        }
        
        // Linear regression for multiple points
        const n = this.calibrationPoints.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        for (const point of this.calibrationPoints) {
            sumX += point.measured;
            sumY += point.actual;
            sumXY += point.measured * point.actual;
            sumXX += point.measured * point.measured;
        }
        
        this.slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        this.offset = (sumY - this.slope * sumX) / n;
    }

    resetCalibration() {
        this.calibrationPoints = [];
        this.slope = 1.0;
        this.offset = 0.0;
        this.updateCalibrationTable();
        this.updateCalibrationUI();
        this.showNotification('Calibration reset', 'warning');
    }

    updateCalibrationTable() {
        const tbody = document.getElementById('calibrationTableBody');
        
        if (this.calibrationPoints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #6b7280;">No calibration points added</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.calibrationPoints.map((point, index) => `
            <tr>
                <td>${point.measured.toFixed(2)}</td>
                <td>${point.actual.toFixed(2)}</td>
                <td>
                    <button onclick="phMonitor.removeCalibrationPoint(${index})" style="background: var(--error-color); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    removeCalibrationPoint(index) {
        this.calibrationPoints.splice(index, 1);
        this.computeCalibration();
        this.updateCalibrationTable();
        this.updateCalibrationUI();
        this.showNotification('Calibration point removed', 'warning');
    }

    updateCalibrationUI() {
        document.getElementById('calPointsCount').textContent = this.calibrationPoints.length;
        document.getElementById('calSlope').textContent = this.slope.toFixed(3);
        document.getElementById('calOffset').textContent = this.offset.toFixed(3);
    }

    updateChart() {
        if (this.displayData.length === 0) return;
        
        const data = [{
            x: this.displayTime,
            y: this.displayData,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'pH Data',
            line: { color: '#4a90e2', width: 3 },
            marker: { color: '#4a90e2', size: 8 }
        }];
        
        Plotly.redraw('phChart');
        Plotly.restyle('phChart', {
            x: [this.displayTime],
            y: [this.displayData]
        }, [0]);
    }

    updateDataTable() {
        const tbody = document.getElementById('dataTableBody');
        
        if (this.phData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #6b7280;">No data recorded</td></tr>';
            return;
        }
        
        // Show only last 20 entries for performance
        const startIndex = Math.max(0, this.phData.length - 20);
        const html = this.phData.slice(startIndex).map((ph, index) => {
            const actualIndex = startIndex + index;
            const rawValue = (ph - this.offset) / this.slope; // Calculate raw value from calibrated
            return `
                <tr>
                    <td>${this.timeData[actualIndex].toFixed(1)}</td>
                    <td>${rawValue.toFixed(2)}</td>
                    <td>${ph.toFixed(2)}</td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
    }

    updateStatistics() {
        if (this.phData.length === 0) {
            document.getElementById('avgPH').textContent = '--';
            document.getElementById('minPH').textContent = '--';
            document.getElementById('maxPH').textContent = '--';
            document.getElementById('phRange').textContent = '--';
            document.getElementById('duration').textContent = '0.0s';
            return;
        }
        
        const avg = this.phData.reduce((a, b) => a + b, 0) / this.phData.length;
        const min = Math.min(...this.phData);
        const max = Math.max(...this.phData);
        const range = max - min;
        const duration = this.timeData.length > 0 ? Math.max(...this.timeData) : 0;
        
        document.getElementById('avgPH').textContent = avg.toFixed(2);
        document.getElementById('minPH').textContent = min.toFixed(2);
        document.getElementById('maxPH').textContent = max.toFixed(2);
        document.getElementById('phRange').textContent = range.toFixed(2);
        document.getElementById('duration').textContent = duration.toFixed(1) + 's';
        
        // Update measurement count
        document.getElementById('measurementCount').textContent = this.phData.length;
        document.getElementById('totalMeasurements').textContent = this.phData.length;
        document.getElementById('exportTotalMeasurements').textContent = this.phData.length;
    }

    updateExportUI() {
        const hasData = this.phData.length > 0;
        const isLogging = this.isLogging;
        
        document.getElementById('exportCSVBtn').disabled = !hasData;
        document.getElementById('exportExcelBtn').disabled = !hasData;
        
        // Update export button text to indicate live data capability
        if (isLogging && hasData) {
            document.getElementById('exportCSVBtn').innerHTML = '<i class="fas fa-file-csv"></i> Export Live CSV';
            document.getElementById('exportExcelBtn').innerHTML = '<i class="fas fa-file-excel"></i> Export Live Excel';
        } else {
            document.getElementById('exportCSVBtn').innerHTML = '<i class="fas fa-file-csv"></i> CSV';
            document.getElementById('exportExcelBtn').innerHTML = '<i class="fas fa-file-excel"></i> Excel';
        }
    }

    async exportData(format) {
        // Allow export even if logging is active - use current data state
        const currentData = [...this.phData];
        const currentTime = [...this.timeData];
        
        if (currentData.length === 0) {
            this.showNotification('No data to export', 'warning');
            return;
        }

        const now = new Date();
        const filenamePrefix = `ph_measurements_${now.toISOString().split('T')[0].replace(/-/g, '')}_${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;

        // Prepare data for export using current snapshot
        const avg = currentData.reduce((a, b) => a + b, 0) / currentData.length;
        const min = Math.min(...currentData);
        const max = Math.max(...currentData);
        const range = max - min;
        const duration = currentTime.length > 0 ? Math.max(...currentTime) : 0;

        if (format === 'csv') {
            const dataSheetData = [
                ["pH Measurement Data"],
                [`Date: ${now.toLocaleDateString()}`],
                [`Time: ${now.toLocaleTimeString()}`],
                [`Export Status: ${this.isLogging ? 'LIVE DATA - Logging Active' : 'Completed Dataset'}`],
                [],
                ["Statistics"],
                ["Number of Measurements", currentData.length],
                ["Average pH", avg.toFixed(2)],
                ["Minimum pH", min.toFixed(2)],
                ["Maximum pH", max.toFixed(2)],
                ["pH Range", range.toFixed(2)],
                ["Total Duration (s)", duration.toFixed(1)],
                ["Logging Status", this.isLogging ? "Active" : "Stopped"],
                ["Calibration Slope", this.slope.toFixed(3)],
                ["Calibration Offset", this.offset.toFixed(3)],
                [],
                ["Measurements"],
                ["Time (seconds)", "Raw pH", "Calibrated pH"]
            ];

            for (let i = 0; i < currentData.length; i++) {
                const rawValue = (currentData[i] - this.offset) / this.slope;
                dataSheetData.push([
                    currentTime[i].toFixed(1), 
                    rawValue.toFixed(2),
                    currentData[i].toFixed(2)
                ]);
            }

            const csvContent = dataSheetData.map(e => e.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filenamePrefix}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            const statusMsg = this.isLogging 
                ? `Live data exported to ${filenamePrefix}.csv (${currentData.length} points)`
                : `Data exported to ${filenamePrefix}.csv`;
            this.showNotification(statusMsg, 'success');
        } else if (format === 'xlsx') {
            try {
                // Create workbook using SheetJS
                const wb = XLSX.utils.book_new();

                // Create main data sheet
                const dataSheetData = [
                    ["pH Measurement Data"],
                    [`Date: ${now.toLocaleDateString()}`],
                    [`Time: ${now.toLocaleTimeString()}`],
                    [`Export Status: ${this.isLogging ? 'LIVE DATA - Logging Active' : 'Completed Dataset'}`],
                    [],
                    ["Statistics"],
                    ["Number of Measurements", currentData.length],
                    ["Average pH", avg.toFixed(2)],
                    ["Minimum pH", min.toFixed(2)],
                    ["Maximum pH", max.toFixed(2)],
                    ["pH Range", range.toFixed(2)],
                    ["Total Duration (s)", duration.toFixed(1)],
                    ["Logging Status", this.isLogging ? "Active" : "Stopped"],
                    ["Calibration Slope", this.slope.toFixed(3)],
                    ["Calibration Offset", this.offset.toFixed(3)],
                    [],
                    ["Measurements"],
                    ["Time (seconds)", "Raw pH", "Calibrated pH"]
                ];

                // Add measurement data
                for (let i = 0; i < currentData.length; i++) {
                    const rawValue = (currentData[i] - this.offset) / this.slope;
                    dataSheetData.push([
                        currentTime[i].toFixed(1), 
                        rawValue.toFixed(2),
                        currentData[i].toFixed(2)
                    ]);
                }

                const dataSheet = XLSX.utils.aoa_to_sheet(dataSheetData);
                XLSX.utils.book_append_sheet(wb, dataSheet, "pH Measurements");

                // Create chart data sheet with clean data for easy charting
                const chartData = [["Time (s)", "Calibrated pH"]];
                for (let i = 0; i < currentData.length; i++) {
                    chartData.push([currentTime[i], currentData[i]]);
                }

                const chartSheet = XLSX.utils.aoa_to_sheet(chartData);
                XLSX.utils.book_append_sheet(wb, chartSheet, "Chart Data");

                // Generate and download Excel file
                const fileName = `${filenamePrefix}.xlsx`;
                XLSX.writeFile(wb, fileName);
                
                const statusMsg = this.isLogging 
                    ? `Live data exported to ${fileName} (${currentData.length} points)`
                    : `Data exported to ${fileName}`;
                this.showNotification(statusMsg, 'success');
                
            } catch (error) {
                console.error('Error exporting to Excel:', error);
                this.showNotification('Error exporting to Excel. Please try again.', 'error');
            }
        }

        // Update last export time
        document.getElementById('lastExport').textContent = now.toLocaleTimeString();
        
        // Add export annotation if logging is active
        if (this.isLogging) {
            this.showNotification(`Export completed while logging continues...`, 'info');
        }
    }

    clearData() {
        if (this.phData.length === 0) {
            this.showNotification('No data to clear', 'warning');
            return;
        }
        
        if (confirm('Are you sure you want to clear all measurement data?')) {
            this.phData = [];
            this.timeData = [];
            this.displayData = [];
            this.displayTime = [];
            this.startTime = null;
            
            this.updateChart();
            this.updateDataTable();
            this.updateStatistics();
            this.updateExportUI();
            
            this.showNotification('All data cleared', 'warning');
        }
    }

    copyArduinoCode() {
        const code = `
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
`;
        
        navigator.clipboard.writeText(code).then(() => {
            this.showNotification('Arduino code copied to clipboard', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy code', 'error');
        });
    }

    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
        
        // Refresh chart if switching to monitor tab
        if (tabId === 'monitor' && this.chart) {
            setTimeout(() => {
                this.updateChart();
                this.updateChartTheme();
            }, 100);
        }
    }

    updateStatus(status, text) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = `status-indicator status-${status}`;
        statusText.textContent = text;
    }

    updateUI() {
        const isConnected = this.isConnected;
        const isLogging = this.isLogging;
        const hasData = this.phData.length > 0;
        
        // Connection controls
        document.getElementById('connectBtn').disabled = isConnected;
        document.getElementById('disconnectBtn').disabled = !isConnected;
        document.getElementById('portSelect').disabled = isConnected;
        
        // Logging controls
        document.getElementById('startLoggingBtn').disabled = !isConnected || isLogging;
        document.getElementById('stopLoggingBtn').disabled = !isLogging;
        document.getElementById('intervalInput').disabled = isLogging;
        
        // Calibration controls
        document.getElementById('addCalPointBtn').disabled = !isConnected;
        document.getElementById('resetCalBtn').disabled = this.calibrationPoints.length === 0;
        
        // Data export
        document.getElementById('exportCSVBtn').disabled = !hasData;
        document.getElementById('exportExcelBtn').disabled = !hasData; 
        document.getElementById('clearDataBtn').disabled = !hasData;
        
        // Logging status
        document.getElementById('loggingStatus').textContent = isLogging ? 'Running' : 'Stopped';
        
        // Update export UI
        this.updateExportUI();
        
        // Update data points count
        document.getElementById('dataPointsCount').textContent = this.phData.length;
        document.getElementById('exportTotalMeasurements').textContent = this.phData.length;
    }

    toggleTheme() {
        const isDark = document.documentElement.dataset.theme === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        document.documentElement.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        this.updateChartTheme();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.dataset.theme = savedTheme;
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Initialize the application
const phMonitor = new PHMonitor();

// Handle page visibility changes to pause/resume reading
document.addEventListener('visibilitychange', () => {
    if (document.hidden && phMonitor.isConnected) {
        // Optionally pause reading when tab is not visible
    } else if (!document.hidden && phMonitor.isConnected) {
        // Resume reading when tab becomes visible
    }
});