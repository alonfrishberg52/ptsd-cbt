class WellnessTracker {
    constructor() {
        this.currentData = {
            mood: 7,
            anxiety: 4,
            sleepHours: 6.5,
            sleepQuality: 'good',
            energy: 6,
            activities: [],
            notes: ''
        };
        
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.loadTodayData();
        this.updateStats();
    }

    setupEventListeners() {
        // Mood slider
        const moodSlider = document.getElementById('moodSlider');
        const moodValue = document.getElementById('moodValue');
        
        if (moodSlider) {
            moodSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.currentData.mood = value;
                moodValue.textContent = value;
                this.updateMoodEmojis(value);
                this.updateCurrentMoodStat(value);
            });
        }

        // Anxiety slider
        const anxietySlider = document.getElementById('anxietySlider');
        const anxietyValue = document.getElementById('anxietyValue');
        
        if (anxietySlider) {
            anxietySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.currentData.anxiety = value;
                anxietyValue.textContent = value;
                this.updateAnxietyIndicators(value);
                this.updateCurrentAnxietyStat(value);
            });
        }

        // Mood emojis
        document.querySelectorAll('.mood-emoji').forEach(emoji => {
            emoji.addEventListener('click', (e) => {
                const value = parseInt(e.target.dataset.value);
                moodSlider.value = value;
                this.currentData.mood = value;
                moodValue.textContent = value;
                this.updateMoodEmojis(value);
                this.updateCurrentMoodStat(value);
            });
        });

        // Energy buttons
        document.querySelectorAll('.energy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = parseInt(e.target.dataset.value);
                this.currentData.energy = value;
                this.updateEnergyButtons(value);
                this.updateCurrentEnergyStat(value);
            });
        });

        // Sleep inputs
        const sleepHoursInput = document.getElementById('sleepHours');
        const sleepQualitySelect = document.getElementById('sleepQuality');
        
        if (sleepHoursInput) {
            sleepHoursInput.addEventListener('change', (e) => {
                this.currentData.sleepHours = parseFloat(e.target.value);
                this.updateCurrentSleepStat(this.currentData.sleepHours);
            });
        }

        if (sleepQualitySelect) {
            sleepQualitySelect.addEventListener('change', (e) => {
                this.currentData.sleepQuality = e.target.value;
            });
        }

        // Activity checkboxes
        document.querySelectorAll('.activity-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const activity = e.target.id;
                if (e.target.checked) {
                    if (!this.currentData.activities.includes(activity)) {
                        this.currentData.activities.push(activity);
                    }
                } else {
                    this.currentData.activities = this.currentData.activities.filter(a => a !== activity);
                }
            });
        });

        // Daily notes
        const dailyNotes = document.getElementById('dailyNotes');
        if (dailyNotes) {
            dailyNotes.addEventListener('input', (e) => {
                this.currentData.notes = e.target.value;
            });
        }

        // Save button
        const saveBtn = document.getElementById('saveDailyLog');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveDailyLog();
            });
        }

        // Clear button
        const clearBtn = document.getElementById('clearDailyLog');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearDailyLog();
            });
        }
    }

    updateMoodEmojis(value) {
        document.querySelectorAll('.mood-emoji').forEach(emoji => {
            emoji.classList.remove('active');
            const emojiValue = parseInt(emoji.dataset.value);
            if (emojiValue <= value) {
                emoji.classList.add('active');
            }
        });
    }

    updateAnxietyIndicators(value) {
        const indicators = document.querySelectorAll('.indicator');
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        if (value <= 3) {
            document.querySelector('.indicator.low').classList.add('active');
        } else if (value <= 6) {
            document.querySelector('.indicator.medium').classList.add('active');
        } else {
            document.querySelector('.indicator.high').classList.add('active');
        }
    }

    updateEnergyButtons(value) {
        document.querySelectorAll('.energy-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.value) === value) {
                btn.classList.add('active');
            }
        });
    }

    updateCurrentMoodStat(value) {
        const moodStat = document.getElementById('currentMood');
        if (moodStat) {
            moodStat.textContent = value;
        }
    }

    updateCurrentAnxietyStat(value) {
        const anxietyStat = document.getElementById('currentAnxiety');
        if (anxietyStat) {
            anxietyStat.textContent = value;
        }
    }

    updateCurrentSleepStat(hours) {
        const sleepStat = document.getElementById('sleepHours');
        if (sleepStat) {
            sleepStat.textContent = hours;
        }
    }

    updateCurrentEnergyStat(value) {
        const energyStat = document.getElementById('energyLevel');
        if (energyStat) {
            energyStat.textContent = value;
        }
    }

    updateStats() {
        // Update trend indicators based on historical data
        this.updateTrendIndicators();
    }

    updateTrendIndicators() {
        // Simulate trend calculations
        const trends = {
            mood: Math.random() > 0.5 ? 'positive' : 'negative',
            anxiety: Math.random() > 0.5 ? 'negative' : 'positive',
            sleep: 'neutral',
            energy: 'positive'
        };

        // Update trend displays
        Object.keys(trends).forEach(key => {
            const trendElement = document.querySelector(`.${key}-card .stat-trend`);
            if (trendElement) {
                trendElement.className = `stat-trend ${trends[key]}`;
            }
        });
    }

    initializeCharts() {
        this.createMoodChart();
        this.createAnxietyChart();
        this.createSleepChart();
        this.createActivitiesChart();
    }

    createMoodChart() {
        const ctx = document.getElementById('moodChart');
        if (!ctx) return;

        // Generate sample data for the last 30 days
        const labels = [];
        const data = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }));
            data.push(Math.floor(Math.random() * 4) + 5 + Math.sin(i / 5) * 2); // Simulate mood data
        }

        this.charts.mood = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'מצב רוח',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createAnxietyChart() {
        const ctx = document.getElementById('anxietyChart');
        if (!ctx) return;

        const labels = [];
        const data = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }));
            data.push(Math.floor(Math.random() * 4) + 3 + Math.cos(i / 7) * 2);
        }

        this.charts.anxiety = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'רמת חרדה',
                    data: data,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createSleepChart() {
        const ctx = document.getElementById('sleepChart');
        if (!ctx) return;

        const labels = [];
        const data = [];
        const today = new Date();
        
        for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }));
            data.push(Math.random() * 3 + 5.5); // 5.5-8.5 hours
        }

        this.charts.sleep = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'שעות שינה',
                    data: data,
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 12,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createActivitiesChart() {
        const ctx = document.getElementById('activitiesChart');
        if (!ctx) return;

        const activities = ['פעילות גופנית', 'מדיטציה', 'פעילות חברתית', 'טיפול', 'יצירה', 'זמן בטבע'];
        const data = activities.map(() => Math.floor(Math.random() * 7) + 1);

        this.charts.activities = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: activities,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#ef4444',
                        '#f59e0b',
                        '#10b981',
                        '#3b82f6',
                        '#8b5cf6',
                        '#06b6d4'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    async saveDailyLog() {
        try {
            const response = await fetch('/api/wellness/save-daily-log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: new Date().toISOString().split('T')[0],
                    ...this.currentData
                })
            });

            if (response.ok) {
                this.showNotification('הרישום היומי נשמר בהצלחה!', 'success');
                this.updateCharts();
            } else {
                throw new Error('Failed to save daily log');
            }
        } catch (error) {
            console.error('Error saving daily log:', error);
            this.showNotification('שגיאה בשמירת הרישום היומי', 'error');
        }
    }

    clearDailyLog() {
        if (confirm('האם אתה בטוח שברצונך לנקות את הרישום היומי?')) {
            // Reset form values
            document.getElementById('moodSlider').value = 5;
            document.getElementById('anxietySlider').value = 5;
            document.getElementById('sleepHours').value = 7;
            document.getElementById('sleepQuality').value = 'good';
            document.getElementById('dailyNotes').value = '';
            
            // Reset checkboxes
            document.querySelectorAll('.activity-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });

            // Reset current data
            this.currentData = {
                mood: 5,
                anxiety: 5,
                sleepHours: 7,
                sleepQuality: 'good',
                energy: 5,
                activities: [],
                notes: ''
            };

            // Update UI
            this.updateMoodEmojis(5);
            this.updateAnxietyIndicators(5);
            this.updateEnergyButtons(5);
            document.getElementById('moodValue').textContent = '5';
            document.getElementById('anxietyValue').textContent = '5';

            this.showNotification('הרישום היומי נוקה', 'info');
        }
    }

    async loadTodayData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/wellness/daily-log/${today}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    this.currentData = { ...this.currentData, ...data };
                    this.populateForm();
                }
            }
        } catch (error) {
            console.error('Error loading today data:', error);
        }
    }

    populateForm() {
        // Populate form with loaded data
        const moodSlider = document.getElementById('moodSlider');
        const anxietySlider = document.getElementById('anxietySlider');
        const sleepHours = document.getElementById('sleepHours');
        const sleepQuality = document.getElementById('sleepQuality');
        const dailyNotes = document.getElementById('dailyNotes');

        if (moodSlider) {
            moodSlider.value = this.currentData.mood;
            document.getElementById('moodValue').textContent = this.currentData.mood;
            this.updateMoodEmojis(this.currentData.mood);
        }

        if (anxietySlider) {
            anxietySlider.value = this.currentData.anxiety;
            document.getElementById('anxietyValue').textContent = this.currentData.anxiety;
            this.updateAnxietyIndicators(this.currentData.anxiety);
        }

        if (sleepHours) sleepHours.value = this.currentData.sleepHours;
        if (sleepQuality) sleepQuality.value = this.currentData.sleepQuality;
        if (dailyNotes) dailyNotes.value = this.currentData.notes;

        this.updateEnergyButtons(this.currentData.energy);

        // Check activity checkboxes
        this.currentData.activities.forEach(activity => {
            const checkbox = document.getElementById(activity);
            if (checkbox) checkbox.checked = true;
        });
    }

    updateCharts() {
        // Refresh charts with new data
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.update();
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize wellness tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WellnessTracker();
});

// Update date display
document.addEventListener('DOMContentLoaded', () => {
    const dateElements = document.querySelectorAll('.modern-card-header h5');
    dateElements.forEach(element => {
        if (element.textContent.includes('${new Date()')) {
            element.textContent = `רישום יומי - ${new Date().toLocaleDateString('he-IL')}`;
        }
    });
}); 