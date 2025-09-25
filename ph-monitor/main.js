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
        document.getElementById('exportCSVBtn').addEventListener('click', () => {
            this.exportCSV();
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
            this.isLogging = false;
            
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
            
            if (this.logInterval) {
                clearInterval(this.logInterval);
                this.logInterval = null;
            }
            
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
        const calibratedPH = this.slope * rawPH + this.offset;
        const currentTime = Date.now();
        
        if (!this.startTime) {
            this.startTime = currentTime;
        }
        
        const elapsedTime = (currentTime - this.startTime) / 1000;
        
        // Update current reading display
        document.getElementById('currentPH').textContent = calibratedPH.toFixed(2);
        document.getElementById('rawPH').textContent = rawPH.toFixed(2);
        document.getElementById('currentRaw').textContent = rawPH.toFixed(2);
        document.getElementById('readingStatus').textContent = `Last reading: pH ${calibratedPH.toFixed(2)}`;
        
        // Store data if logging
        if (this.isLogging) {
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
        if (interval <= 0) {
            this.showNotification('Interval must be greater than 0', 'error');
            return;
        }
        
        this.logInterval = interval;
        this.isLogging = true;
        
        // Clear previous data
        this.phData = [];
        this.timeData = [];
        this.displayData = [];
        this.displayTime = [];
        this.startTime = Date.now();
        
        this.logInterval = setInterval(async () => {
            if (this.isConnected) {
                await this.sendCommand('READ\n');
            }
        }, interval * 1000);
        
        this.updateUI();
        this.showNotification(`Started logging with ${interval}s interval`, 'success');
    }

    stopLogging() {
        this.isLogging = false;
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
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 dark:text-gray-400">No calibration points added</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.calibrationPoints.map((point, index) => `
            <tr>
                <td>${point.measured.toFixed(2)}</td>
                <td>${point.actual.toFixed(2)}</td>
                <td>
                    <button onclick="phMonitor.removeCalibrationPoint(${index})" class="text-red-500 hover:text-red-700">
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
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-gray-500 dark:text-gray-400">No data recorded</td></tr>';
            return;
        }
        
        // Show only last 20 entries for performance
        const startIndex = Math.max(0, this.phData.length - 20);
        const html = this.phData.slice(startIndex).map((ph, index) => {
            const actualIndex = startIndex + index;
            return `
                <tr>
                    <td>${this.timeData[actualIndex].toFixed(1)}</td>
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
        const duration = Math.max(...this.timeData);
        
        document.getElementById('avgPH').textContent = avg.toFixed(2);
        document.getElementById('minPH').textContent = min.toFixed(2);
        document.getElementById('maxPH').textContent = max.toFixed(2);
        document.getElementById('phRange').textContent = range.toFixed(2);
        document.getElementById('duration').textContent = duration.toFixed(1) + 's';
        
        // Update measurement count
        document.getElementById('measurementCount').textContent = this.phData.length;
        document.getElementById('totalMeasurements').textContent = this.phData.length;
    }

    exportCSV() {
        if (this.phData.length === 0) {
            this.showNotification('No data to export', 'warning');
            return;
        }
        
        const now = new Date();
        const filename = `ph_measurements_${now.toISOString().split('T')[0]}.csv`;
        
        let csvContent = 'pH Measurement Data\n';
        csvContent += `Date: ${now.toLocaleDateString()}\n\n`;
        
        // Statistics
        const avg = this.phData.reduce((a, b) => a + b, 0) / this.phData.length;
        const min = Math.min(...this.phData);
        const max = Math.max(...this.phData);
        const range = max - min;
        const duration = Math.max(...this.timeData);
        
        csvContent += 'Statistics\n';
        csvContent += `Number of Measurements,${this.phData.length}\n`;
        csvContent += `Average pH,${avg.toFixed(2)}\n`;
        csvContent += `Minimum pH,${min.toFixed(2)}\n`;
        csvContent += `Maximum pH,${max.toFixed(2)}\n`;
        csvContent += `pH Range,${range.toFixed(2)}\n`;
        csvContent += `Total Duration (s),${duration.toFixed(1)}\n\n`;
        
        // Data
        csvContent += 'Measurements\n';
        csvContent += 'Time (seconds),pH Value\n';
        
        for (let i = 0; i < this.phData.length; i++) {
            csvContent += `${this.timeData[i].toFixed(1)},${this.phData[i].toFixed(2)}\n`;
        }
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        
        document.getElementById('lastExport').textContent = now.toLocaleTimeString();
        this.showNotification(`Data exported to ${filename}`, 'success');
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
            
            this.showNotification('All data cleared', 'warning');
        }
    }

    copyArduinoCode() {
        const code = `void setup() {
  Serial.begin(9600);
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\\n');
    if (command == "READ") {
      int sum = 0;
      for(int i=0; i<10; i++) {
        sum += analogRead(A0);
        delay(10);
      }
      int sensorValue = sum / 10;
      float voltage = sensorValue * (5.0 / 1023.0);
      float phValue = 7.0 + (2.556 - voltage) / 0.185;
      Serial.print("PH:");
      Serial.println(phValue, 2);
    }
  }
  delay(100);
}}`;
        
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
        document.getElementById('clearDataBtn').disabled = !hasData;
        
        // Logging status
        document.getElementById('loggingStatus').textContent = isLogging ? 'Running' : 'Stopped';
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
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
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