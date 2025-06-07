/**
 * Enhanced Dashboard JavaScript - Version 2.0
 * Advanced features for NarraTIVE PTSD Therapy Platform
 */

class EnhancedDashboard {
    constructor() {
        this.version = '2.0';
        this.initialized = false;
        this.realTimeUpdates = true;
        this.notifications = [];
        this.currentTheme = localStorage.getItem('dashboard-theme') || 'light';
        
        this.init();
    }

    async init() {
        console.log(`🚀 Enhanced Dashboard v${this.version} initializing...`);
        
        // Initialize core components
        this.setupEventListeners();
        this.initializeTooltips();
        this.setupKeyboardShortcuts();
        this.initializeTheme();
        this.startRealTimeUpdates();
        this.loadInitialData();
        
        // Initialize enhanced features
        this.initializeAnimations();
        this.setupPerformanceMonitoring();
        this.initializeServiceWorker();
        
        this.initialized = true;
        console.log('✅ Enhanced Dashboard initialized successfully');
        
        // Show welcome notification
        this.showNotification('ברוכים הבאים למערכת NarraTIVE המשודרגת!', 'success');
    }

    setupEventListeners() {
        // Window events
        window.addEventListener('load', () => this.handlePageLoad());
        window.addEventListener('resize', debounce(() => this.handleResize(), 250));
        window.addEventListener('scroll', throttle(() => this.handleScroll(), 100));
        
        // Custom events
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        document.addEventListener('online', () => this.handleOnlineStatus(true));
        document.addEventListener('offline', () => this.handleOnlineStatus(false));
        
        // Form enhancements
        this.enhanceAllForms();
        
        // Navigation enhancements
        this.enhanceNavigation();
    }

    initializeTooltips() {
        // Enhanced tooltip system
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            let tooltip;
            
            element.addEventListener('mouseenter', (e) => {
                const text = e.target.getAttribute('data-tooltip');
                tooltip = this.createTooltip(text, e.target);
                document.body.appendChild(tooltip);
                
                // Position tooltip
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
                
                // Animate in
                setTimeout(() => tooltip.classList.add('visible'), 10);
            });
            
            element.addEventListener('mouseleave', () => {
                if (tooltip) {
                    tooltip.classList.remove('visible');
                    setTimeout(() => tooltip.remove(), 200);
                }
            });
        });
    }

    createTooltip(text, target) {
        const tooltip = document.createElement('div');
        tooltip.className = 'enhanced-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: var(--bg-sidebar);
            color: white;
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            font-weight: 500;
            white-space: nowrap;
            z-index: 10000;
            opacity: 0;
            transform: translateY(5px);
            transition: all var(--transition-fast);
            box-shadow: var(--shadow-lg);
            pointer-events: none;
        `;
        
        return tooltip;
    }

    setupKeyboardShortcuts() {
        const shortcuts = {
            'ctrl+k': () => this.focusSearch(),
            'ctrl+d': () => this.toggleTheme(),
            'ctrl+shift+n': () => this.createNewPatient(),
            'ctrl+shift+s': () => this.createNewStory(),
            'ctrl+shift+a': () => this.openAnalytics(),
            'escape': () => this.closeModal(),
            'ctrl+shift+?': () => this.showKeyboardShortcuts()
        };

        document.addEventListener('keydown', (e) => {
            const key = this.getKeyCombo(e);
            if (shortcuts[key]) {
                e.preventDefault();
                shortcuts[key]();
            }
        });
    }

    getKeyCombo(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        if (e.metaKey) parts.push('meta');
        
        const key = e.key.toLowerCase();
        if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
            parts.push(key);
        }
        
        return parts.join('+');
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Add theme toggle button if not exists
        if (!document.querySelector('.theme-toggle')) {
            this.createThemeToggle();
        }
    }

    createThemeToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle btn btn-ghost btn-sm';
        toggle.innerHTML = `<i class="bi ${this.currentTheme === 'dark' ? 'bi-sun' : 'bi-moon'}"></i>`;
        toggle.setAttribute('data-tooltip', 'החלף מצב תצוגה');
        toggle.onclick = () => this.toggleTheme();
        
        // Add to top bar
        const topBar = document.querySelector('.top-bar-actions');
        if (topBar) {
            topBar.appendChild(toggle);
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('dashboard-theme', this.currentTheme);
        
        // Update toggle icon
        const toggle = document.querySelector('.theme-toggle i');
        if (toggle) {
            toggle.className = `bi ${this.currentTheme === 'dark' ? 'bi-sun' : 'bi-moon'}`;
        }
        
        this.showNotification(`מצב ${this.currentTheme === 'dark' ? 'כהה' : 'בהיר'} הופעל`, 'info');
    }

    startRealTimeUpdates() {
        if (!this.realTimeUpdates) return;
        
        // Update stats every 30 seconds
        setInterval(() => {
            this.updateLiveStats();
        }, 30000);
        
        // Check for notifications every 15 seconds
        setInterval(() => {
            this.checkForNotifications();
        }, 15000);
        
        // Update time displays every minute
        setInterval(() => {
            this.updateTimeDisplays();
        }, 60000);
    }

    async loadInitialData() {
        try {
            // Load patient data
            const patientsData = await this.fetchWithRetry('/api/dashboard/patients');
            this.updatePatientStats(patientsData);
            
            // Load session data
            const sessionsData = await this.fetchWithRetry('/api/dashboard/sessions');
            this.updateSessionStats(sessionsData);
            
            // Load recent activity
            const activityData = await this.fetchWithRetry('/api/dashboard/activity');
            this.updateActivityFeed(activityData);
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('שגיאה בטעינת נתונים', 'error');
        }
    }

    async fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }

    updateLiveStats() {
        // Simulate real-time updates
        const elements = {
            livePatientCount: document.getElementById('livePatientCount'),
            qualityScore: document.getElementById('qualityScore'),
            todayProgress: document.getElementById('todayProgress'),
            emergencyAlerts: document.getElementById('emergencyAlerts')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                this.animateValue(element, this.generateRealisticValue(key));
            }
        });
    }

    generateRealisticValue(type) {
        const baseValues = {
            livePatientCount: 24,
            qualityScore: 8.7,
            todayProgress: 6,
            emergencyAlerts: 2
        };
        
        const base = baseValues[type] || 0;
        const variation = type === 'qualityScore' ? 0.1 : 1;
        
        return Math.max(0, base + (Math.random() - 0.5) * variation);
    }

    animateValue(element, targetValue) {
        const currentValue = parseFloat(element.textContent) || 0;
        const increment = (targetValue - currentValue) / 20;
        let current = currentValue;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
                current = targetValue;
                clearInterval(timer);
            }
            
            element.textContent = typeof targetValue === 'number' && targetValue % 1 !== 0 
                ? current.toFixed(1) 
                : Math.round(current);
        }, 50);
    }

    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `enhanced-notification ${type}`;
        
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi ${icons[type] || icons.info}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="bi bi-x"></i>
            </button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--${type === 'error' ? 'warning' : type === 'success' ? 'success' : 'primary'}-color);
            border-radius: var(--radius-lg);
            padding: var(--space-md) var(--space-lg);
            box-shadow: var(--shadow-xl);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-md);
            max-width: 400px;
            transform: translateX(100%);
            transition: transform var(--transition-normal);
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
        
        return notification;
    }

    initializeAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Observe all cards and stats
        document.querySelectorAll('.card, .stat-card-enhanced').forEach(el => {
            observer.observe(el);
        });
    }

    setupPerformanceMonitoring() {
        if ('performance' in window) {
            // Monitor page load performance
            window.addEventListener('load', () => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
                
                console.log(`📊 Page load time: ${loadTime.toFixed(2)}ms`);
                
                if (loadTime > 3000) {
                    console.warn('⚠️ Slow page load detected');
                }
            });
        }
    }

    initializeServiceWorker() {
        if ('serviceWorker' in navigator && location.protocol === 'https:') {
            navigator.serviceWorker.register('/static/sw.js')
                .then(registration => {
                    console.log('🔧 Service Worker registered:', registration.scope);
                })
                .catch(error => {
                    console.log('❌ Service Worker registration failed:', error);
                });
        }
    }

    // Quick action functions
    focusSearch() {
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    createNewPatient() {
        window.location.href = '/dashboard/patients/add';
    }

    createNewStory() {
        window.location.href = '/dashboard/stories/create';
    }

    openAnalytics() {
        window.location.href = '/dashboard/analytics';
    }

    closeModal() {
        const modal = document.querySelector('.modal.show, .overlay.visible');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show', 'visible');
        }
    }

    showKeyboardShortcuts() {
        const shortcuts = `
            <div class="shortcuts-modal">
                <h3>קיצורי מקלדת</h3>
                <div class="shortcuts-grid">
                    <div class="shortcut-item">
                        <kbd>Ctrl + K</kbd>
                        <span>חיפוש</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl + D</kbd>
                        <span>החלפת מצב תצוגה</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl + Shift + N</kbd>
                        <span>מטופל חדש</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl + Shift + S</kbd>
                        <span>סיפור חדש</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl + Shift + A</kbd>
                        <span>ניתוח נתונים</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Escape</kbd>
                        <span>סגירת חלון</span>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(shortcuts);
    }

    showModal(content) {
        const modal = document.createElement('div');
        modal.className = 'enhanced-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: var(--bg-primary);
                border-radius: var(--radius-2xl);
                padding: var(--space-2xl);
                max-width: 500px;
                width: 90%;
                box-shadow: var(--shadow-xl);
                transform: scale(0.9);
                transition: transform var(--transition-normal);
            ">
                ${content}
                <button class="btn btn-primary" onclick="this.closest('.enhanced-modal').remove()" style="margin-top: var(--space-lg);">
                    סגור
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.querySelector('div').style.transform = 'scale(1)';
        }, 10);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Utility functions
    handlePageLoad() {
        // Hide loading screen if exists
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => loadingScreen.remove(), 500);
            }, 1000);
        }
    }

    handleResize() {
        // Responsive adjustments
        console.log('🔄 Window resized, adjusting layout...');
    }

    handleScroll() {
        // Show/hide scroll to top button
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const fab = document.getElementById('scrollToTop');
        
        if (fab) {
            fab.style.display = scrollTop > 300 ? 'flex' : 'none';
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.realTimeUpdates = false;
        } else {
            this.realTimeUpdates = true;
            this.loadInitialData(); // Refresh data when tab becomes visible
        }
    }

    handleOnlineStatus(isOnline) {
        const message = isOnline ? 'חיבור לאינטרנט הוחזר' : 'אין חיבור לאינטרנט';
        const type = isOnline ? 'success' : 'warning';
        this.showNotification(message, type);
    }

    enhanceAllForms() {
        document.querySelectorAll('form').forEach(form => {
            this.enhanceForm(form);
        });
    }

    enhanceForm(form) {
        // Add real-time validation
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', debounce(() => this.validateField(input), 500));
        });
    }

    validateField(field) {
        // Basic validation logic
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        const isValid = !isRequired || value !== '';
        
        field.classList.toggle('is-valid', isValid);
        field.classList.toggle('is-invalid', !isValid);
    }

    enhanceNavigation() {
        // Add active state management
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.sidebar-nav a');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }

    async checkForNotifications() {
        // Simulate checking for new notifications
        if (Math.random() > 0.9) { // 10% chance
            this.showNotification('התראה חדשה התקבלה', 'info');
        }
    }

    updateTimeDisplays() {
        document.querySelectorAll('[data-time]').forEach(element => {
            const time = element.getAttribute('data-time');
            element.textContent = this.formatRelativeTime(new Date(time));
        });
    }

    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'עכשיו';
        if (minutes < 60) return `לפני ${minutes} דקות`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `לפני ${hours} שעות`;
        
        const days = Math.floor(hours / 24);
        return `לפני ${days} ימים`;
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Enhanced CSS styles
const enhancedStyles = `
    .enhanced-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    .enhanced-notification {
        font-family: var(--font-family-hebrew);
    }
    
    .enhanced-notification .notification-content {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }
    
    .enhanced-notification .notification-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: var(--space-xs);
        border-radius: var(--radius-sm);
        transition: background var(--transition-fast);
    }
    
    .enhanced-notification .notification-close:hover {
        background: rgba(0, 0, 0, 0.1);
    }
    
    .shortcuts-modal h3 {
        margin: 0 0 var(--space-lg) 0;
        text-align: center;
        color: var(--text-primary);
    }
    
    .shortcuts-grid {
        display: grid;
        gap: var(--space-md);
    }
    
    .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-sm);
        background: var(--bg-subtle);
        border-radius: var(--radius-md);
    }
    
    .shortcut-item kbd {
        background: var(--bg-primary);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: var(--radius-sm);
        padding: var(--space-xs) var(--space-sm);
        font-family: monospace;
        font-size: 0.85rem;
    }
    
    .animate-in {
        animation: slideInUp 0.6s ease-out;
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .is-valid {
        border-color: var(--success-color) !important;
        box-shadow: 0 0 0 0.2rem rgba(34, 197, 94, 0.25) !important;
    }
    
    .is-invalid {
        border-color: var(--warning-color) !important;
        box-shadow: 0 0 0 0.2rem rgba(239, 68, 68, 0.25) !important;
    }
    
    @media (max-width: 768px) {
        .enhanced-notification {
            right: 10px !important;
            left: 10px !important;
            max-width: none !important;
        }
    }
`;

// Inject enhanced styles
const styleSheet = document.createElement('style');
styleSheet.textContent = enhancedStyles;
document.head.appendChild(styleSheet);

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.enhancedDashboard = new EnhancedDashboard();
    });
} else {
    window.enhancedDashboard = new EnhancedDashboard();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedDashboard, debounce, throttle };
}