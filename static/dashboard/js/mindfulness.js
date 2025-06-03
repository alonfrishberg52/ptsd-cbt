class MindfulnessApp {
    constructor() {
        this.breathingState = {
            isActive: false,
            phase: 'prepare', // prepare, inhale, hold, exhale
            count: 0,
            cycle: 1,
            totalCycles: 3
        };
        
        this.meditationState = {
            isActive: false,
            duration: 10, // minutes
            timeLeft: 600, // seconds
            type: 'mindfulness'
        };
        
        this.relaxationState = {
            currentTechnique: null,
            currentStep: 0,
            techniques: {
                'body-scan': {
                    title: 'סריקת גוף',
                    description: 'הרפיה מתקדמת של כל חלקי הגוף',
                    steps: [
                        'שב או שכב בתנוחה נוחה וסגור את עיניך',
                        'קח כמה נשימות עמוקות ורגועות',
                        'התמקד בכפות הרגליים והרגש כל תחושה',
                        'שחרר כל מתח בכפות הרגליים',
                        'המשך לעלות בגוף: רגליים, ירכיים, בטן',
                        'המשך לחזה, ידיים, כתפיים, צוואר ופנים',
                        'הרגש את כל הגוף רגוע ומשוחרר'
                    ]
                },
                'grounding': {
                    title: 'עיגון 5-4-3-2-1',
                    description: 'טכניקה להרגעה מהירה במצבי חרדה',
                    steps: [
                        'זהה 5 דברים שאתה רואה סביבך',
                        'זהה 4 דברים שאתה יכול לגעת בהם',
                        'זהה 3 דברים שאתה שומע',
                        'זהה 2 דברים שאתה מריח',
                        'זהה דבר אחד שאתה טועם'
                    ]
                },
                'safe-place': {
                    title: 'מקום בטוח',
                    description: 'הדמיה של מקום רגוע ובטוח',
                    steps: [
                        'סגור את עיניך וקח כמה נשימות עמוקות',
                        'דמיין מקום שבו אתה מרגיש בטוח ורגוע',
                        'שים לב לפרטים: צבעים, צלילים, ריחות',
                        'הרגש את התחושות הנעימות שהמקום מעורר',
                        'זכור שאתה יכול לחזור למקום הזה בכל עת'
                    ]
                }
            }
        };
        
        this.sessions = JSON.parse(localStorage.getItem('mindfulnessSessions') || '[]');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateProgressStats();
        this.createProgressChart();
        this.loadRecentSessions();
    }

    setupEventListeners() {
        // Breathing exercise
        document.getElementById('startBreathing').addEventListener('click', () => {
            this.toggleBreathing();
        });
        
        document.getElementById('resetBreathing').addEventListener('click', () => {
            this.resetBreathing();
        });

        // Meditation timer
        document.getElementById('startMeditation').addEventListener('click', () => {
            this.toggleMeditation();
        });
        
        document.getElementById('resetMeditation').addEventListener('click', () => {
            this.resetMeditation();
        });

        // Relaxation techniques
        document.querySelectorAll('.technique-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const technique = e.currentTarget.dataset.technique;
                this.startTechnique(technique);
            });
        });

        document.getElementById('nextStep').addEventListener('click', () => {
            this.nextTechniqueStep();
        });

        document.getElementById('prevStep').addEventListener('click', () => {
            this.prevTechniqueStep();
        });
    }

    // Breathing Exercise Methods
    toggleBreathing() {
        if (this.breathingState.isActive) {
            this.pauseBreathing();
        } else {
            this.startBreathing();
        }
    }

    startBreathing() {
        this.breathingState.isActive = true;
        this.breathingState.phase = 'inhale';
        this.breathingState.count = 4;
        
        const startBtn = document.getElementById('startBreathing');
        startBtn.innerHTML = '<i class="bi bi-pause me-2"></i>השהה';
        
        this.breathingInterval = setInterval(() => {
            this.updateBreathingCycle();
        }, 1000);
    }

    pauseBreathing() {
        this.breathingState.isActive = false;
        clearInterval(this.breathingInterval);
        
        const startBtn = document.getElementById('startBreathing');
        startBtn.innerHTML = '<i class="bi bi-play me-2"></i>המשך';
    }

    resetBreathing() {
        this.breathingState.isActive = false;
        this.breathingState.phase = 'prepare';
        this.breathingState.count = 4;
        this.breathingState.cycle = 1;
        
        clearInterval(this.breathingInterval);
        
        const startBtn = document.getElementById('startBreathing');
        startBtn.innerHTML = '<i class="bi bi-play me-2"></i>התחל';
        
        this.updateBreathingDisplay();
    }

    updateBreathingCycle() {
        this.breathingState.count--;
        
        if (this.breathingState.count <= 0) {
            switch (this.breathingState.phase) {
                case 'inhale':
                    this.breathingState.phase = 'hold';
                    this.breathingState.count = 7;
                    break;
                case 'hold':
                    this.breathingState.phase = 'exhale';
                    this.breathingState.count = 8;
                    break;
                case 'exhale':
                    this.breathingState.cycle++;
                    if (this.breathingState.cycle > this.breathingState.totalCycles) {
                        this.completeBreathing();
                        return;
                    }
                    this.breathingState.phase = 'inhale';
                    this.breathingState.count = 4;
                    break;
            }
        }
        
        this.updateBreathingDisplay();
    }

    updateBreathingDisplay() {
        const phaseElement = document.getElementById('breathingPhase');
        const countElement = document.getElementById('breathingCount');
        const cycleElement = document.getElementById('currentCycle');
        const circle = document.getElementById('breathingCircle');
        
        const phaseTexts = {
            prepare: 'התכונן',
            inhale: 'שאף',
            hold: 'החזק',
            exhale: 'נשוף'
        };
        
        phaseElement.textContent = phaseTexts[this.breathingState.phase];
        countElement.textContent = this.breathingState.count;
        cycleElement.textContent = this.breathingState.cycle;
        
        // Update circle animation
        circle.className = `breathing-circle ${this.breathingState.phase}`;
    }

    completeBreathing() {
        this.resetBreathing();
        this.saveSession('breathing', 5); // 5 minutes for breathing exercise
        this.showNotification('תרגיל הנשימה הושלם בהצלחה!', 'success');
    }

    // Meditation Timer Methods
    toggleMeditation() {
        if (this.meditationState.isActive) {
            this.pauseMeditation();
        } else {
            this.startMeditation();
        }
    }

    startMeditation() {
        const duration = parseInt(document.getElementById('meditationDuration').value);
        const type = document.getElementById('meditationType').value;
        
        this.meditationState.duration = duration;
        this.meditationState.timeLeft = duration * 60;
        this.meditationState.type = type;
        this.meditationState.isActive = true;
        
        // Hide settings, show timer
        document.getElementById('timerSettings').style.display = 'none';
        document.getElementById('timerDisplay').style.display = 'block';
        
        const startBtn = document.getElementById('startMeditation');
        startBtn.innerHTML = '<i class="bi bi-pause me-2"></i>השהה';
        
        this.meditationInterval = setInterval(() => {
            this.updateMeditationTimer();
        }, 1000);
        
        this.updateMeditationGuidance();
    }

    pauseMeditation() {
        this.meditationState.isActive = false;
        clearInterval(this.meditationInterval);
        
        const startBtn = document.getElementById('startMeditation');
        startBtn.innerHTML = '<i class="bi bi-play me-2"></i>המשך';
    }

    resetMeditation() {
        this.meditationState.isActive = false;
        clearInterval(this.meditationInterval);
        
        // Show settings, hide timer
        document.getElementById('timerSettings').style.display = 'block';
        document.getElementById('timerDisplay').style.display = 'none';
        
        const startBtn = document.getElementById('startMeditation');
        startBtn.innerHTML = '<i class="bi bi-play me-2"></i>התחל מדיטציה';
    }

    updateMeditationTimer() {
        this.meditationState.timeLeft--;
        
        if (this.meditationState.timeLeft <= 0) {
            this.completeMeditation();
            return;
        }
        
        this.updateMeditationDisplay();
    }

    updateMeditationDisplay() {
        const minutes = Math.floor(this.meditationState.timeLeft / 60);
        const seconds = this.meditationState.timeLeft % 60;
        
        document.getElementById('timerMinutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('timerSeconds').textContent = seconds.toString().padStart(2, '0');
        
        // Update progress
        const progress = ((this.meditationState.duration * 60 - this.meditationState.timeLeft) / (this.meditationState.duration * 60)) * 100;
        document.getElementById('timerProgress').style.width = progress + '%';
    }

    updateMeditationGuidance() {
        const guidanceTexts = {
            mindfulness: 'התמקד בנשימה שלך. שים לב לאוויר הנכנס והיוצא...',
            'body-scan': 'סרוק את גופך מכפות הרגליים ועד לראש...',
            'loving-kindness': 'שלח אהבה וחמלה לעצמך ולאחרים...',
            visualization: 'דמיין מקום שקט ורגוע...'
        };
        
        document.getElementById('meditationGuidance').textContent = guidanceTexts[this.meditationState.type];
    }

    completeMeditation() {
        this.resetMeditation();
        this.saveSession('meditation', this.meditationState.duration);
        this.showNotification('המדיטציה הושלמה בהצלחה!', 'success');
    }

    // Relaxation Techniques Methods
    startTechnique(techniqueKey) {
        this.relaxationState.currentTechnique = techniqueKey;
        this.relaxationState.currentStep = 0;
        
        const technique = this.relaxationState.techniques[techniqueKey];
        
        document.querySelector('.technique-selector').style.display = 'none';
        document.getElementById('techniqueGuide').style.display = 'block';
        
        document.getElementById('techniqueTitle').textContent = technique.title;
        document.getElementById('techniqueDescription').textContent = technique.description;
        
        this.updateTechniqueStep();
    }

    nextTechniqueStep() {
        const technique = this.relaxationState.techniques[this.relaxationState.currentTechnique];
        
        if (this.relaxationState.currentStep < technique.steps.length - 1) {
            this.relaxationState.currentStep++;
            this.updateTechniqueStep();
        } else {
            this.completeTechnique();
        }
    }

    prevTechniqueStep() {
        if (this.relaxationState.currentStep > 0) {
            this.relaxationState.currentStep--;
            this.updateTechniqueStep();
        }
    }

    updateTechniqueStep() {
        const technique = this.relaxationState.techniques[this.relaxationState.currentTechnique];
        const currentStep = this.relaxationState.currentStep;
        
        const stepsContainer = document.getElementById('techniqueSteps');
        stepsContainer.innerHTML = `
            <div class="technique-step active">
                <h6>שלב ${currentStep + 1}</h6>
                <p>${technique.steps[currentStep]}</p>
            </div>
        `;
        
        document.getElementById('stepCounter').textContent = `שלב ${currentStep + 1} מתוך ${technique.steps.length}`;
        
        // Update navigation buttons
        document.getElementById('prevStep').disabled = currentStep === 0;
        document.getElementById('nextStep').textContent = currentStep === technique.steps.length - 1 ? 'סיים' : 'הבא';
    }

    completeTechnique() {
        document.querySelector('.technique-selector').style.display = 'block';
        document.getElementById('techniqueGuide').style.display = 'none';
        
        this.saveSession('relaxation', 10); // 10 minutes for relaxation technique
        this.showNotification('טכניקת ההרפיה הושלמה בהצלחה!', 'success');
    }

    // Progress Tracking Methods
    saveSession(type, duration) {
        const session = {
            date: new Date().toISOString(),
            type: type,
            duration: duration,
            timestamp: Date.now()
        };
        
        this.sessions.push(session);
        localStorage.setItem('mindfulnessSessions', JSON.stringify(this.sessions));
        
        this.updateProgressStats();
        this.createProgressChart();
        this.loadRecentSessions();
    }

    updateProgressStats() {
        const thisWeek = this.getThisWeekSessions();
        
        const totalMinutes = thisWeek.reduce((sum, session) => sum + session.duration, 0);
        const sessionsCount = thisWeek.length;
        const longestSession = this.sessions.length > 0 ? Math.max(...this.sessions.map(s => s.duration)) : 0;
        const weeklyGoal = Math.min(Math.round((totalMinutes / 60) * 100), 100); // Goal: 1 hour per week
        
        document.getElementById('totalMinutes').textContent = totalMinutes;
        document.getElementById('sessionsThisWeek').textContent = sessionsCount;
        document.getElementById('longestSession').textContent = longestSession;
        document.getElementById('weeklyGoal').textContent = weeklyGoal + '%';
    }

    getThisWeekSessions() {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        weekStart.setHours(0, 0, 0, 0);
        
        return this.sessions.filter(session => {
            const sessionDate = new Date(session.date);
            return sessionDate >= weekStart;
        });
    }

    createProgressChart() {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.progressChart) {
            this.progressChart.destroy();
        }
        
        const last7Days = this.getLast7DaysData();
        
        this.progressChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7Days.labels,
                datasets: [{
                    label: 'דקות',
                    data: last7Days.data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
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
                        ticks: {
                            stepSize: 5
                        }
                    }
                }
            }
        });
    }

    getLast7DaysData() {
        const labels = [];
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const dayName = date.toLocaleDateString('he-IL', { weekday: 'short' });
            labels.push(dayName);
            
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            
            const dayMinutes = this.sessions
                .filter(session => {
                    const sessionDate = new Date(session.date);
                    return sessionDate >= dayStart && sessionDate <= dayEnd;
                })
                .reduce((sum, session) => sum + session.duration, 0);
            
            data.push(dayMinutes);
        }
        
        return { labels, data };
    }

    loadRecentSessions() {
        const recentSessions = this.sessions
            .slice(-5)
            .reverse();
        
        const sessionsList = document.getElementById('sessionsList');
        
        if (recentSessions.length === 0) {
            sessionsList.innerHTML = '<p class="text-center text-muted">אין מפגשים להצגה</p>';
            return;
        }
        
        sessionsList.innerHTML = recentSessions.map(session => {
            const date = new Date(session.date);
            const typeNames = {
                breathing: 'תרגיל נשימה',
                meditation: 'מדיטציה',
                relaxation: 'הרפיה'
            };
            
            return `
                <div class="session-item">
                    <div class="session-info">
                        <strong>${typeNames[session.type]}</strong>
                        <span>${session.duration} דקות</span>
                    </div>
                    <div class="session-date">
                        ${date.toLocaleDateString('he-IL')}
                    </div>
                </div>
            `;
        }).join('');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'info'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize the mindfulness app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MindfulnessApp();
}); 