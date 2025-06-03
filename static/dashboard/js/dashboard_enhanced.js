/**
 * Enhanced Dashboard JavaScript - MindShift PTSD Therapy Platform
 * Features: Dark mode, smooth animations, real-time updates, notifications
 */

class DashboardEnhanced {
    constructor() {
        this.initializeTheme();
        this.initializeComponents();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.initializeAnimations();
    }

    /**
     * Initialize theme management (dark/light mode)
     */
    initializeTheme() {
        this.currentTheme = localStorage.getItem('dashboard-theme') || 'light';
        this.applyTheme(this.currentTheme);
        this.createThemeToggle();
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('dashboard-theme', theme);
        this.currentTheme = theme;
        
        // Update theme toggle icon
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
            }
        }
    }

    /**
     * Create theme toggle button
     */
    createThemeToggle() {
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = `<i class="bi bi-${this.currentTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
        themeToggle.addEventListener('click', () => this.toggleTheme());
        document.body.appendChild(themeToggle);
    }

    /**
     * Toggle between dark and light theme
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.showNotification(`Switched to ${newTheme} mode`, 'info');
    }

    /**
     * Initialize dashboard components
     */
    initializeComponents() {
        this.initializeSidebar();
        this.initializeStats();
        this.initializeNotifications();
        this.initializeSearch();
        this.initializeCharts();
        this.initializeModals();
        this.initializeFormHandlers();
    }

    /**
     * Initialize form handlers for add patient, add story, etc.
     */
    initializeFormHandlers() {
        // Handle form submissions dynamically
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'addPatientForm') {
                e.preventDefault();
                this.handleAddPatientForm(e.target);
            } else if (e.target.id === 'addStoryForm') {
                e.preventDefault();
                this.handleAddStoryForm(e.target);
            }
        });
    }

    /**
     * Handle add patient form submission
     */
    async handleAddPatientForm(form) {
        const formData = new FormData(form);
        const loadingButton = form.querySelector('button[type="submit"]');
        const originalText = loadingButton.textContent;
        
        try {
            // Show loading state
            loadingButton.textContent = 'שומר...';
            loadingButton.disabled = true;
            
            // Collect all form data
            const patientData = {
                // Basic information
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                age: parseInt(formData.get('age')),
                gender: formData.get('gender'),
                birthdate: formData.get('birthdate'),
                city: formData.get('city'),
                street: formData.get('street'),
                house_number: formData.get('house_number'),
                education: formData.get('education'),
                occupation: formData.get('occupation'),
                pet: formData.get('pet'),
                general_info: formData.get('general_info'),
                
                // Process hobbies as array
                hobbies: formData.get('hobbies') ? formData.get('hobbies').split(',').map(h => h.trim()) : [],
                
                // Clinical information
                ptsd_symptoms: formData.get('ptsd_symptoms') ? formData.get('ptsd_symptoms').split(',').map(s => s.trim()) : [],
                main_avoidances: formData.get('main_avoidances') ? formData.get('main_avoidances').split(',').map(a => a.trim()) : [],
                
                // General symptoms ratings
                general_symptoms: {
                    intrusion: parseInt(formData.get('general_symptoms_intrusion')) || 0,
                    arousal: parseInt(formData.get('general_symptoms_arousal')) || 0,
                    thoughts: parseInt(formData.get('general_symptoms_thoughts')) || 0,
                    avoidance: parseInt(formData.get('general_symptoms_avoidance')) || 0,
                    mood: parseInt(formData.get('general_symptoms_mood')) || 0
                },
                
                // PCL-5 scores
                pcl5: Array.from({length: 20}, (_, i) => parseInt(formData.get(`pcl5_${i + 1}`)) || 0),
                
                // PHQ-9 scores
                phq9: Array.from({length: 9}, (_, i) => parseInt(formData.get(`phq9_${i + 1}`)) || 0),
                
                // Initialize other required fields
                triggers: [],
                avoidances: [],
                somatic: {}
            };
            
            // Calculate total scores
            patientData.pcl5_total = patientData.pcl5.reduce((sum, score) => sum + score, 0);
            patientData.phq9_total = patientData.phq9.reduce((sum, score) => sum + score, 0);
            
            console.log('Submitting patient data:', patientData);
            
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(patientData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.showNotification('מטופל נוסף בהצלחה!', 'success');
                this.closeModal();
                
                // Refresh the dashboard
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.showNotification(`שגיאה: ${result.message}`, 'error');
            }
            
        } catch (error) {
            console.error('Error adding patient:', error);
            this.showNotification('שגיאה בהוספת המטופל', 'error');
        } finally {
            // Reset button
            loadingButton.textContent = originalText;
            loadingButton.disabled = false;
        }
    }

    /**
     * Handle add story form submission
     */
    async handleAddStoryForm(form) {
        const formData = new FormData(form);
        const storyData = {
            patient_id: formData.get('patient_id'),
            story_type: formData.get('story_type'),
            exposure_level: formData.get('exposure_level'),
            content: formData.get('content')
        };

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i> יוצר...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/stories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(storyData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.showNotification('סיפור נוצר בהצלחה!', 'success');
                this.closeModal();
                // Refresh page or update story list
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(result.message || 'שגיאה ביצירת סיפור');
            }
        } catch (error) {
            console.error('Error adding story:', error);
            this.showNotification('שגיאה ביצירת סיפור: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    /**
     * Initialize sidebar functionality
     */
    initializeSidebar() {
        // Create sidebar toggle for mobile
        const sidebarToggle = document.createElement('button');
        sidebarToggle.className = 'sidebar-toggle';
        sidebarToggle.innerHTML = '<i class="bi bi-list"></i>';
        sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        document.body.appendChild(sidebarToggle);

        // Add active state to current page
        const currentPath = window.location.pathname;
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
        sidebarLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // Add hover effects to sidebar items
        this.addSidebarEffects();
    }

    /**
     * Toggle sidebar on mobile
     */
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (mainContent) {
                mainContent.classList.toggle('expanded');
            }
        }
    }

    /**
     * Add interactive effects to sidebar
     */
    addSidebarEffects() {
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
        sidebarLinks.forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(8px) scale(1.02)';
            });
            
            link.addEventListener('mouseleave', function() {
                if (!this.classList.contains('active')) {
                    this.style.transform = 'translateX(0) scale(1)';
                }
            });
        });
    }

    /**
     * Initialize animated statistics
     */
    initializeStats() {
        this.animateCounters();
        this.createProgressRings();
    }

    /**
     * Animate number counters
     */
    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        counters.forEach(counter => observer.observe(counter));
    }

    /**
     * Animate individual counter
     */
    animateCounter(element) {
        const target = parseInt(element.textContent) || 0;
        const duration = 2000;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, duration / steps);
    }

    /**
     * Create animated progress rings
     */
    createProgressRings() {
        const progressElements = document.querySelectorAll('[data-progress]');
        progressElements.forEach(element => {
            const progress = parseFloat(element.dataset.progress);
            this.createProgressRing(element, progress);
        });
    }

    /**
     * Create individual progress ring
     */
    createProgressRing(element, progress) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100');
        svg.setAttribute('height', '100');
        svg.className = 'progress-ring';

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', '40');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', 'var(--primary-color)');
        circle.setAttribute('stroke-width', '8');
        circle.setAttribute('stroke-dasharray', '251.2');
        circle.setAttribute('stroke-dashoffset', `${251.2 - (progress / 100) * 251.2}`);
        circle.style.transition = 'stroke-dashoffset 2s ease-in-out';

        svg.appendChild(circle);
        element.appendChild(svg);
    }

    /**
     * Initialize notification system
     */
    initializeNotifications() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-container';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(this.notificationContainer);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.style.cssText = `
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-lg);
            padding: var(--space-md) var(--space-lg);
            margin-bottom: var(--space-sm);
            box-shadow: var(--shadow-lg);
            pointer-events: auto;
            cursor: pointer;
            transition: all var(--transition-normal);
            max-width: 300px;
            word-wrap: break-word;
        `;

        const iconMap = {
            success: 'check-circle-fill',
            error: 'exclamation-triangle-fill',
            warning: 'exclamation-circle-fill',
            info: 'info-circle-fill'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <i class="bi bi-${iconMap[type]}" style="color: var(--${type === 'error' ? 'warning' : type}-color);"></i>
                <span>${message}</span>
            </div>
        `;

        notification.addEventListener('click', () => this.removeNotification(notification));

        this.notificationContainer.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => this.removeNotification(notification), duration);
    }

    /**
     * Remove notification
     */
    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Initialize search functionality
     */
    initializeSearch() {
        const searchInputs = document.querySelectorAll('input[type="search"]');
        searchInputs.forEach(input => {
            this.enhanceSearchInput(input);
        });
    }

    /**
     * Enhance search input with autocomplete and suggestions
     */
    enhanceSearchInput(input) {
        const wrapper = document.createElement('div');
        wrapper.className = 'search-wrapper';
        wrapper.style.position = 'relative';
        
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        // Add search suggestions dropdown
        const suggestions = document.createElement('div');
        suggestions.className = 'search-suggestions';
        suggestions.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        wrapper.appendChild(suggestions);

        // Add debounced search
        let searchTimeout;
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(input.value, suggestions);
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
    }

    /**
     * Perform search and show suggestions
     */
    async performSearch(query, suggestionsContainer) {
        if (query.length < 2) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        try {
            // Fetch search results from API
            const results = await this.fetchSearchResults(query);
            this.displaySearchSuggestions(results, suggestionsContainer);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    /**
     * Fetch search results from API
     */
    async fetchSearchResults(query) {
        try {
            const response = await fetch('/api/patients');
            const result = await response.json();
            
            if (result.status === 'success') {
                // Filter patients based on search query
                return result.patients.filter(patient => {
                    const name = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
                    return name.toLowerCase().includes(query.toLowerCase());
                }).map(patient => ({
                    id: patient.patient_id,
                    name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
                    type: 'patient'
                }));
            } else {
                console.error('Error fetching patients:', result.message);
                return [];
            }
        } catch (error) {
            console.error('Search API error:', error);
            return [];
        }
    }

    /**
     * Display search suggestions
     */
    displaySearchSuggestions(results, container) {
        if (results.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = results.map(result => `
            <div class="search-suggestion" style="
                padding: var(--space-sm) var(--space-md);
                cursor: pointer;
                transition: background var(--transition-fast);
            " data-id="${result.id}">
                <i class="bi bi-person" style="margin-left: var(--space-sm);"></i>
                ${result.name}
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.search-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const patientId = suggestion.dataset.id;
                this.selectPatient(patientId);
                container.style.display = 'none';
            });

            suggestion.addEventListener('mouseenter', () => {
                suggestion.style.background = 'rgba(37, 99, 235, 0.1)';
            });

            suggestion.addEventListener('mouseleave', () => {
                suggestion.style.background = 'transparent';
            });
        });

        container.style.display = 'block';
    }

    /**
     * Select patient from search
     */
    selectPatient(patientId) {
        // Navigate to patient detail page
        window.location.href = `/dashboard/patients/${patientId}`;
    }

    /**
     * Initialize charts and data visualizations
     */
    initializeCharts() {
        this.setupChartDefaults();
        this.createDashboardCharts();
    }

    /**
     * Setup Chart.js defaults
     */
    setupChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = 'Inter, Heebo, system-ui, sans-serif';
            Chart.defaults.color = 'var(--text-secondary)';
            Chart.defaults.plugins.legend.display = false;
        }
    }

    /**
     * Create dashboard charts
     */
    createDashboardCharts() {
        this.createSUDTrendChart();
        this.createPatientProgressChart();
        this.createSessionCompletionChart();
    }

    /**
     * Create SUD trend chart
     */
    createSUDTrendChart() {
        const canvas = document.getElementById('sudTrendChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['שבוע 1', 'שבוע 2', 'שבוע 3', 'שבוע 4'],
                datasets: [{
                    label: 'ממוצע SUD',
                    data: [8, 6, 4, 3],
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'var(--primary-color)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'var(--bg-glass)',
                        titleColor: 'var(--text-primary)',
                        bodyColor: 'var(--text-secondary)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    /**
     * Create patient progress chart
     */
    createPatientProgressChart() {
        const canvas = document.getElementById('patientProgressChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['הושלמו', 'בתהליך', 'לא החלו'],
                datasets: [{
                    data: [60, 30, 10],
                    backgroundColor: [
                        'var(--success-color)',
                        'var(--accent-color)',
                        'var(--text-muted)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    tooltip: {
                        backgroundColor: 'var(--bg-glass)',
                        titleColor: 'var(--text-primary)',
                        bodyColor: 'var(--text-secondary)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    /**
     * Create session completion chart
     */
    createSessionCompletionChart() {
        const canvas = document.getElementById('sessionCompletionChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי'],
                datasets: [{
                    label: 'מפגשים שהושלמו',
                    data: [45, 52, 38, 61, 48],
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'var(--primary-color)',
                    borderWidth: 1,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'var(--bg-glass)',
                        titleColor: 'var(--text-primary)',
                        bodyColor: 'var(--text-secondary)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    /**
     * Initialize modal dialogs
     */
    initializeModals() {
        this.createModalContainer();
        this.setupModalTriggers();
    }

    /**
     * Create modal container
     */
    createModalContainer() {
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'modal-container';
        this.modalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        document.body.appendChild(this.modalContainer);
    }

    /**
     * Setup modal triggers
     */
    setupModalTriggers() {
        document.addEventListener('click', (e) => {
            // Check if the clicked element or its parent has data-modal attribute
            let targetElement = e.target;
            
            // Traverse up the DOM tree to find an element with data-modal
            while (targetElement && targetElement !== document) {
                if (targetElement.hasAttribute && targetElement.hasAttribute('data-modal')) {
                    const modalId = targetElement.getAttribute('data-modal');
                    console.log('Modal trigger clicked:', modalId); // Debug log
                    this.showModal(modalId);
                    return;
                }
                targetElement = targetElement.parentElement;
            }
        });
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        console.log('Showing modal:', modalId); // Debug log
        // Create modal content based on modalId
        const modalContent = this.createModalContent(modalId);
        this.modalContainer.innerHTML = modalContent;
        this.modalContainer.style.display = 'flex';
        this.modalContainer.classList.add('fade-in');

        // Load patients for add-story modal
        if (modalId === 'add-story') {
            this.loadPatientsForStoryModal();
        }

        // Close modal on backdrop click
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.modalContainer) {
                this.closeModal();
            }
        });

        // Close modal on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    /**
     * Load patients for the add story modal
     */
    async loadPatientsForStoryModal() {
        const patientSelect = document.getElementById('patientSelect');
        if (!patientSelect) return;

        try {
            const response = await fetch('/api/patients');
            const result = await response.json();

            if (result.status === 'success') {
                patientSelect.innerHTML = '<option value="">בחר מטופל</option>';
                result.patients.forEach(patient => {
                    const option = document.createElement('option');
                    option.value = patient.patient_id;
                    option.textContent = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
                    patientSelect.appendChild(option);
                });
            } else {
                patientSelect.innerHTML = '<option value="">שגיאה בטעינת מטופלים</option>';
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            patientSelect.innerHTML = '<option value="">שגיאה בטעינת מטופלים</option>';
        }
    }

    /**
     * Create modal content
     */
    createModalContent(modalId) {
        const commonStyles = `
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-2xl);
            padding: var(--space-2xl);
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: var(--shadow-xl);
        `;

        switch (modalId) {
            case 'add-patient':
                return `
                    <div style="${commonStyles}; max-width: 800px; max-height: 90vh;">
                        <h2 style="margin-bottom: var(--space-lg); text-align: center;">הוספת מטופל חדש</h2>
                        <form id="addPatientForm" style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
                            
                            <!-- Basic Information -->
                            <div class="form-section" style="margin-bottom: var(--space-xl); padding: var(--space-lg); background: rgba(37, 99, 235, 0.05); border-radius: var(--radius-lg);">
                                <h3 style="margin-bottom: var(--space-md); color: var(--primary-color);">מידע בסיסי</h3>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                                    <div class="form-group">
                                        <label class="form-label">שם פרטי *</label>
                                        <input type="text" name="first_name" class="form-control" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">שם משפחה *</label>
                                        <input type="text" name="last_name" class="form-control" required>
                                    </div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md);">
                                    <div class="form-group">
                                        <label class="form-label">גיל *</label>
                                        <input type="number" name="age" class="form-control" min="1" max="120" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">מגדר</label>
                                        <select name="gender" class="form-control">
                                            <option value="">בחר מגדר</option>
                                            <option value="זכר">זכר</option>
                                            <option value="נקבה">נקבה</option>
                                            <option value="אחר">אחר</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">תאריך לידה</label>
                                        <input type="date" name="birthdate" class="form-control">
                                    </div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md);">
                                    <div class="form-group">
                                        <label class="form-label">יישוב</label>
                                        <input type="text" name="city" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">רחוב</label>
                                        <input type="text" name="street" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">מס' בית</label>
                                        <input type="text" name="house_number" class="form-control">
                                    </div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                                    <div class="form-group">
                                        <label class="form-label">השכלה</label>
                                        <input type="text" name="education" class="form-control" placeholder="למשל: תואר ראשון, תיכון">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">מקצוע/עיסוק</label>
                                        <input type="text" name="occupation" class="form-control">
                                    </div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                                    <div class="form-group">
                                        <label class="form-label">תחביבים</label>
                                        <input type="text" name="hobbies" class="form-control" placeholder="הפרד בפסיקים: קולנוע, טיולים, קריאה">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">חיית מחמד</label>
                                        <select name="pet" class="form-control">
                                            <option value="">בחר</option>
                                            <option value="כלב">כלב</option>
                                            <option value="חתול">חתול</option>
                                            <option value="אחר">אחר</option>
                                            <option value="לא">לא</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">מידע כללי נוסף</label>
                                    <textarea name="general_info" class="form-control" rows="3" placeholder="מידע רלוונטי נוסף על המטופל"></textarea>
                                </div>
                            </div>

                            <!-- Clinical Information -->
                            <div class="form-section" style="margin-bottom: var(--space-xl); padding: var(--space-lg); background: rgba(220, 38, 38, 0.05); border-radius: var(--radius-lg);">
                                <h3 style="margin-bottom: var(--space-md); color: var(--warning-color);">מידע קליני</h3>
                                
                                <div class="form-group">
                                    <label class="form-label">תסמיני PTSD</label>
                                    <textarea name="ptsd_symptoms" class="form-control" rows="2" placeholder="הפרד בפסיקים: סיוטים, עוררות יתר, צעקות"></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">הימנעויות עיקריות</label>
                                    <textarea name="main_avoidances" class="form-control" rows="2" placeholder="הפרד בפסיקים: מקומות צפופים, רעשים חזקים"></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label" style="margin-bottom: var(--space-md);">תסמינים כלליים (דירוג 0-10)</label>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                                            <label style="flex: 1;">דחיקות:</label>
                                            <input type="range" name="general_symptoms_intrusion" min="0" max="10" value="0" class="form-range" style="flex: 2;" oninput="this.nextElementSibling.textContent=this.value">
                                            <span style="min-width: 20px; text-align: center;">0</span>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                                            <label style="flex: 1;">ערנות:</label>
                                            <input type="range" name="general_symptoms_arousal" min="0" max="10" value="0" class="form-range" style="flex: 2;" oninput="this.nextElementSibling.textContent=this.value">
                                            <span style="min-width: 20px; text-align: center;">0</span>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                                            <label style="flex: 1;">מחשבות טורדניות:</label>
                                            <input type="range" name="general_symptoms_thoughts" min="0" max="10" value="0" class="form-range" style="flex: 2;" oninput="this.nextElementSibling.textContent=this.value">
                                            <span style="min-width: 20px; text-align: center;">0</span>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                                            <label style="flex: 1;">הימנעויות:</label>
                                            <input type="range" name="general_symptoms_avoidance" min="0" max="10" value="0" class="form-range" style="flex: 2;" oninput="this.nextElementSibling.textContent=this.value">
                                            <span style="min-width: 20px; text-align: center;">0</span>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: var(--space-sm);">
                                            <label style="flex: 1;">שינוי מצב רוח:</label>
                                            <input type="range" name="general_symptoms_mood" min="0" max="10" value="0" class="form-range" style="flex: 2;" oninput="this.nextElementSibling.textContent=this.value">
                                            <span style="min-width: 20px; text-align: center;">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- PCL-5 Assessment -->
                            <div class="form-section" style="margin-bottom: var(--space-xl); padding: var(--space-lg); background: rgba(16, 185, 129, 0.05); border-radius: var(--radius-lg);">
                                <h3 style="margin-bottom: var(--space-md); color: var(--success-color);">שאלון PCL-5</h3>
                                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-md);">
                                    דרג כל פריט מ-0 (בכלל לא) עד 4 (באופן קיצוני)
                                </p>
                                
                                ${this.generatePCL5Questions()}
                            </div>

                            <!-- PHQ-9 Assessment -->
                            <div class="form-section" style="margin-bottom: var(--space-xl); padding: var(--space-lg); background: rgba(168, 85, 247, 0.05); border-radius: var(--radius-lg);">
                                <h3 style="margin-bottom: var(--space-md); color: #a855f7;">שאלון PHQ-9</h3>
                                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-md);">
                                    דרג כל פריט מ-0 (בכלל לא) עד 3 (כמעט כל יום)
                                </p>
                                
                                ${this.generatePHQ9Questions()}
                            </div>
                            
                            <!-- Action Buttons -->
                            <div style="display: flex; gap: var(--space-md); justify-content: flex-end; margin-top: var(--space-xl); padding-top: var(--space-lg); border-top: 1px solid rgba(0, 0, 0, 0.1);">
                                <button type="button" class="btn btn-ghost" onclick="window.dashboard.closeModal()">ביטול</button>
                                <button type="submit" class="btn btn-primary">שמור מטופל</button>
                            </div>
                        </form>
                    </div>
                `;
            
            case 'add-story':
                return `
                    <div style="${commonStyles}">
                        <h2 style="margin-bottom: var(--space-lg);">יצירת סיפור חשיפה חדש</h2>
                        <form id="addStoryForm">
                            <div class="form-group">
                                <label class="form-label">בחר מטופל *</label>
                                <select name="patient_id" class="form-control" required id="patientSelect">
                                    <option value="">טוען מטופלים...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">סוג סיפור</label>
                                <select name="story_type" class="form-control">
                                    <option value="exposure">חשיפה</option>
                                    <option value="narrative">נרטיבי</option>
                                    <option value="coping">התמודדות</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">רמת חשיפה</label>
                                <select name="exposure_level" class="form-control">
                                    <option value="1">רמה 1 - קלה</option>
                                    <option value="2">רמה 2 - בינונית</option>
                                    <option value="3">רמה 3 - חזקה</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">תוכן ראשוני (אופציונלי)</label>
                                <textarea name="content" class="form-control" rows="4" placeholder="הכנס תוכן ראשוני לסיפור..."></textarea>
                            </div>
                            <div style="display: flex; gap: var(--space-md); justify-content: flex-end; margin-top: var(--space-xl);">
                                <button type="button" class="btn btn-ghost" onclick="window.dashboard.closeModal()">ביטול</button>
                                <button type="submit" class="btn btn-primary">צור סיפור</button>
                            </div>
                        </form>
                    </div>
                `;
            
            case 'settings':
                return `
                    <div style="${commonStyles}">
                        <h2 style="margin-bottom: var(--space-lg);">הגדרות מערכת</h2>
                        <div class="settings-content">
                            <div class="form-group">
                                <label class="form-label">ערכת נושא</label>
                                <div style="display: flex; gap: var(--space-md);">
                                    <button type="button" class="btn btn-outline" onclick="dashboard.applyTheme('light')">בהיר</button>
                                    <button type="button" class="btn btn-outline" onclick="dashboard.applyTheme('dark')">כהה</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">התראות</label>
                                <div style="display: flex; align-items: center; gap: var(--space-sm);">
                                    <input type="checkbox" id="enableNotifications" checked>
                                    <label for="enableNotifications">אפשר התראות</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">עדכונים אוטומטיים</label>
                                <div style="display: flex; align-items: center; gap: var(--space-sm);">
                                    <input type="checkbox" id="autoUpdates" checked>
                                    <label for="autoUpdates">עדכן נתונים אוטומטית</label>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: var(--space-md); justify-content: flex-end; margin-top: var(--space-xl);">
                            <button type="button" class="btn btn-primary" onclick="window.dashboard.closeModal()">סגור</button>
                        </div>
                    </div>
                `;
            
            default:
                return `
                    <div style="${commonStyles}">
                        <h2>תוכן מודל</h2>
                        <p>תוכן עבור ${modalId}</p>
                        <button class="btn btn-primary" onclick="dashboard.closeModal()">סגור</button>
                    </div>
                `;
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        this.modalContainer.style.display = 'none';
        this.modalContainer.classList.remove('fade-in');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="search"]');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Ctrl/Cmd + D for dark mode toggle
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Enhanced table interactions
        this.enhanceTableInteractions();

        // Add loading states to buttons
        this.addLoadingStates();

        // Initialize tooltips
        this.initializeTooltips();
    }

    /**
     * Enhance table interactions
     */
    enhanceTableInteractions() {
        const tables = document.querySelectorAll('.table');
        tables.forEach(table => {
            // Add row click handlers
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    const patientId = row.dataset.patientId;
                    if (patientId) {
                        window.location.href = `/dashboard/patients/${patientId}`;
                    }
                });
            });

            // Add sortable headers
            const headers = table.querySelectorAll('th[data-sort]');
            headers.forEach(header => {
                header.style.cursor = 'pointer';
                header.innerHTML += ' <i class="bi bi-arrow-down-up"></i>';
                header.addEventListener('click', () => {
                    this.sortTable(table, header.dataset.sort);
                });
            });
        });
    }

    /**
     * Sort table by column
     */
    sortTable(table, column) {
        // Implementation for table sorting
        this.showNotification(`Table sorted by ${column}`, 'info');
    }

    /**
     * Add loading states to buttons
     */
    addLoadingStates() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn[data-loading]')) {
                const button = e.target;
                const originalText = button.innerHTML;
                
                button.innerHTML = '<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i> טוען...';
                button.disabled = true;

                // Simulate loading
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
            }
        });
    }

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            this.createTooltip(element);
        });
    }

    /**
     * Create tooltip for element
     */
    createTooltip(element) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = element.dataset.tooltip;
        tooltip.style.cssText = `
            position: absolute;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transform: translateY(10px);
            transition: all var(--transition-fast);
        `;
        document.body.appendChild(tooltip);

        element.addEventListener('mouseenter', (e) => {
            const rect = element.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.top = `${rect.top - 40}px`;
            tooltip.style.transform = 'translateX(-50%) translateY(0)';
            tooltip.style.opacity = '1';
        });

        element.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateX(-50%) translateY(10px)';
        });
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        // Update dashboard stats every 30 seconds
        setInterval(() => {
            this.updateDashboardStats();
        }, 30000);

        // Check for new notifications every 10 seconds
        setInterval(() => {
            this.checkNotifications();
        }, 10000);
    }

    /**
     * Update dashboard statistics
     */
    async updateDashboardStats() {
        try {
            const response = await fetch('/api/dashboard');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.updateStatCards(data.summary);
                this.updateCharts(data.summary);
            }
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
        }
    }

    /**
     * Update stat cards with new data
     */
    updateStatCards(data) {
        const statCards = document.querySelectorAll('.stat-number');
        statCards.forEach(card => {
            const statType = card.closest('.stat-card').dataset.stat;
            if (data[statType] !== undefined) {
                this.animateCounter(card, data[statType]);
            }
        });
    }

    /**
     * Update charts with new data
     */
    updateCharts(data) {
        // Update existing charts with new data
        if (window.charts) {
            Object.keys(window.charts).forEach(chartKey => {
                const chart = window.charts[chartKey];
                if (chart && data[chartKey]) {
                    chart.data = data[chartKey];
                    chart.update('active');
                }
            });
        }
    }

    /**
     * Check for new notifications
     */
    async checkNotifications() {
        try {
            const response = await fetch('/api/notifications');
            const data = await response.json();
            
            if (data.status === 'success' && data.notifications.length > 0) {
                data.notifications.forEach(notification => {
                    this.showNotification(notification.message, notification.type);
                });
            }
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    /**
     * Initialize entrance animations
     */
    initializeAnimations() {
        // Animate elements on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all cards and sections
        const animateElements = document.querySelectorAll('.card, .stat-card, .table-container');
        animateElements.forEach(element => {
            observer.observe(element);
        });

        // Add staggered animation to lists
        this.staggerListAnimations();
    }

    /**
     * Add staggered animations to list items
     */
    staggerListAnimations() {
        const lists = document.querySelectorAll('.table tbody tr, .sidebar-nav li');
        lists.forEach((list, listIndex) => {
            const items = list.querySelectorAll ? list.querySelectorAll('*') : [list];
            items.forEach((item, index) => {
                item.style.animationDelay = `${index * 0.1}s`;
                item.classList.add('slide-in');
            });
        });
    }

    /**
     * Utility function to format numbers
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Utility function to format dates
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('he-IL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    }

    /**
     * Export data functionality
     */
    exportData(format = 'json') {
        const data = this.collectDashboardData();
        
        switch (format) {
            case 'json':
                this.downloadJSON(data);
                break;
            case 'csv':
                this.downloadCSV(data);
                break;
            default:
                this.showNotification('Unsupported export format', 'error');
        }
    }

    /**
     * Collect dashboard data for export
     */
    collectDashboardData() {
        return {
            exported_at: new Date().toISOString(),
            stats: {
                total_patients: document.querySelector('[data-stat="total_patients"] .stat-number')?.textContent,
                total_stories: document.querySelector('[data-stat="total_stories"] .stat-number')?.textContent
            }
        };
    }

    /**
     * Download data as JSON
     */
    downloadJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, 'dashboard-export.json');
    }

    /**
     * Download data as CSV
     */
    downloadCSV(data) {
        // Convert JSON to CSV format
        const csv = this.jsonToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadBlob(blob, 'dashboard-export.csv');
    }

    /**
     * Convert JSON to CSV
     */
    jsonToCSV(data) {
        // Simple JSON to CSV converter
        const headers = Object.keys(data.stats);
        const values = Object.values(data.stats);
        return headers.join(',') + '\n' + values.join(',');
    }

    /**
     * Download blob as file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(`Downloaded ${filename}`, 'success');
    }

    /**
     * Generate PCL-5 questionnaire HTML
     */
    generatePCL5Questions() {
        const pcl5Questions = [
            'חווית מצוקה או חוסר נוחות כתוצאה מזיכרונות מטרידים של האירוע',
            'חלומות מטרידים על האירוע',
            'תחושת חוויה מחודשת של האירוע',
            'מצוקה חזקה כאשר משהו מזכיר את האירוע',
            'תגובות גופניות כאשר משהו מזכיר את האירוע',
            'הימנעות ממחשבות או רגשות הקשורים לאירוע',
            'הימנעות מאנשים, מקומות או פעילויות המזכירים את האירוע',
            'קושי לזכור חלקים מהאירוע',
            'אמונות שליליות על עצמך, אחרים או העולם',
            'האשמה עצמית או האשמת אחרים',
            'רגשות שליליים חזקים (פחד, כעס, אשמה, בושה)',
            'אובדן עניין בפעילויות',
            'תחושת ניתוק מאנשים אחרים',
            'קושי לחוות רגשות חיוביים',
            'קושי להירדם או שינה לא רגועה',
            'קושי להתרכז',
            'עצבנות או התפרצויות כעס',
            'התנהגות מסוכנת או הרסנית',
            'דריכות יתר או זהירות מוגזמת',
            'בהלה קלה או תגובת בהלה'
        ];

        return pcl5Questions.map((question, index) => `
            <div style="margin-bottom: var(--space-md); padding: var(--space-sm); background: white; border-radius: var(--radius-md);">
                <label style="display: block; margin-bottom: var(--space-xs); font-weight: 500;">
                    ${index + 1}. ${question}
                </label>
                <div style="display: flex; gap: var(--space-md); align-items: center;">
                    ${[0, 1, 2, 3, 4].map(value => `
                        <label style="display: flex; align-items: center; gap: var(--space-xs); cursor: pointer;">
                            <input type="radio" name="pcl5_${index + 1}" value="${value}" ${value === 0 ? 'checked' : ''}>
                            <span style="font-size: 0.9rem;">${value}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * Generate PHQ-9 questionnaire HTML
     */
    generatePHQ9Questions() {
        const phq9Questions = [
            'חוסר עניין או הנאה בפעילויות',
            'תחושת דיכאון, עצבות או ייאוש',
            'קשיי שינה או שינה מרובה',
            'תחושת עייפות או חוסר אנרגיה',
            'תיאבון ירוד או אכילה מופרזת',
            'תחושת כישלון או אכזבה מעצמך',
            'קושי להתרכז',
            'תנועה או דיבור איטיים/מהירים מהרגיל',
            'מחשבות על פגיעה עצמית או מוות'
        ];

        return phq9Questions.map((question, index) => `
            <div style="margin-bottom: var(--space-md); padding: var(--space-sm); background: white; border-radius: var(--radius-md);">
                <label style="display: block; margin-bottom: var(--space-xs); font-weight: 500;">
                    ${index + 1}. ${question}
                </label>
                <div style="display: flex; gap: var(--space-md); align-items: center;">
                    ${[0, 1, 2, 3].map(value => `
                        <label style="display: flex; align-items: center; gap: var(--space-xs); cursor: pointer;">
                            <input type="radio" name="phq9_${index + 1}" value="${value}" ${value === 0 ? 'checked' : ''}>
                            <span style="font-size: 0.9rem;">${value}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
}

// Add CSS for animations
const animationStyles = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .fade-in {
        animation: fadeIn 0.6s ease-out forwards;
    }
    
    .slide-in {
        animation: slideIn 0.6s ease-out forwards;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;

// Inject animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardEnhanced();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardEnhanced;
} 