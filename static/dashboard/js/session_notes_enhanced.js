// Enhanced Session Notes Management System - Hebrew Version
class EnhancedSessionNotesEditor {
    constructor() {
        this.editor = document.getElementById('richTextEditor');
        this.patientSelect = document.getElementById('patientSelect');
        this.sessionSelect = document.getElementById('sessionSelect');
        this.sessionDateTime = document.getElementById('sessionDateTime');
        this.sessionLevel = document.getElementById('sessionLevel');
        this.saveBtn = document.getElementById('saveNotesBtn');
        this.clearBtn = document.getElementById('clearNotesBtn');
        this.saveAlert = document.getElementById('saveAlert');
        this.saveAlertText = document.getElementById('saveAlertText');
        
        // Filter elements
        this.searchNotes = document.getElementById('searchNotes');
        this.filterPatient = document.getElementById('filterPatient');
        this.filterLevel = document.getElementById('filterLevel');
        this.resetFilters = document.getElementById('resetFilters');
        this.notesTableBody = document.getElementById('notesTableBody');
        this.activeFilters = document.getElementById('activeFilters');
        this.filterBadges = document.getElementById('filterBadges');
        
        // Data storage
        this.patients = [];
        this.sessions = [];
        this.notes = [];
        this.currentNote = null;
        
        this.init();
    }

    async init() {
        // Load initial data
        await this.loadPatients();
        await this.loadSessions();
        await this.loadNotes();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set current date/time
        const now = new Date();
        this.sessionDateTime.value = now.toISOString().slice(0, 16);
        
        // Initial stats update
        this.updateStats();
        this.renderNotesTable();
    }

    setupEventListeners() {
        // Patient selection
        this.patientSelect.addEventListener('change', () => {
            this.onPatientChange();
        });

        // Session selection
        this.sessionSelect.addEventListener('change', () => {
            this.onSessionChange();
        });

        // Editor events
        this.editor.addEventListener('input', () => {
            this.updateStats();
            this.validateForm();
        });

        // Save and clear buttons
        this.saveBtn.addEventListener('click', () => {
            this.saveNote();
        });

        this.clearBtn.addEventListener('click', () => {
            this.clearForm();
        });

        // Filter events
        this.searchNotes.addEventListener('input', () => {
            this.renderNotesTable();
        });

        this.filterPatient.addEventListener('change', () => {
            this.updateActiveFilters();
            this.renderNotesTable();
        });

        this.filterLevel.addEventListener('change', () => {
            this.updateActiveFilters();
            this.renderNotesTable();
        });

        this.resetFilters.addEventListener('click', () => {
            this.resetAllFilters();
        });

        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.editor.innerHTML.trim() !== '' && this.patientSelect.value && this.sessionSelect.value) {
                this.autoSave();
            }
        }, 30000);

        // Tab change event
        document.getElementById('view-notes-tab').addEventListener('shown.bs.tab', () => {
            this.renderNotesTable();
        });
    }

    async loadPatients() {
        try {
            const response = await fetch('/api/patients');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.patients = data.patients;
                this.populatePatientSelects();
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            // Fallback to demo data with Hebrew names
            this.patients = [
                { patient_id: 'p1', name: 'אברהם כהן', age: 35 },
                { patient_id: 'p2', name: 'שרה לוי', age: 28 },
                { patient_id: 'p3', name: 'יעקב ישראלי', age: 42 }
            ];
            this.populatePatientSelects();
        }
    }

    async loadSessions() {
        try {
            // In a real app, this would fetch from /api/sessions
            // Demo sessions with Hebrew data
            this.sessions = [
                { id: 's1', patient_id: 'p1', date: '2024-01-15T10:00', status: 'הושלם', level: 'מתחיל' },
                { id: 's2', patient_id: 'p1', date: '2024-01-22T10:00', status: 'הושלם', level: 'בינוני' },
                { id: 's3', patient_id: 'p2', date: '2024-01-16T14:00', status: 'הושלם', level: 'מתחיל' },
                { id: 's4', patient_id: 'p2', date: '2024-01-23T14:00', status: 'מתוכנן', level: 'בינוני' },
                { id: 's5', patient_id: 'p3', date: '2024-01-17T09:00', status: 'הושלם', level: 'מתקדם' }
            ];
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }

    async loadNotes() {
        try {
            const response = await fetch('/api/session-notes/list/all');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.notes = data.notes || [];
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            // Demo notes with Hebrew content
            this.notes = [
                {
                    id: 'n1',
                    patient_id: 'p1',
                    session_id: 's1',
                    content: '<p>המטופל הראה התקדמות משמעותית בניהול טריגרים של חרדה. דנו באסטרטגיות התמודדות ותרגילי בית.</p>',
                    plain_text: 'המטופל הראה התקדמות משמעותית בניהול טריגרים של חרדה. דנו באסטרטגיות התמודדות ותרגילי בית.',
                    created_at: '2024-01-15T10:30:00',
                    word_count: 15,
                    char_count: 120,
                    session_level: 'מתחיל'
                },
                {
                    id: 'n2',
                    patient_id: 'p2',
                    session_id: 's3',
                    content: '<p>הערכה ראשונית הושלמה. המטופל מגיב היטב לגישת CBT. נמשיך עם טיפול חשיפה בפגישה הבאה.</p>',
                    plain_text: 'הערכה ראשונית הושלמה. המטופל מגיב היטב לגישת CBT. נמשיך עם טיפול חשיפה בפגישה הבאה.',
                    created_at: '2024-01-16T14:30:00',
                    word_count: 18,
                    char_count: 110,
                    session_level: 'מתחיל'
                }
            ];
        }
    }

    populatePatientSelects() {
        // Populate main patient select
        this.patientSelect.innerHTML = '<option value="">בחר מטופל...</option>';
        this.patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.patient_id;
            option.textContent = patient.name;
            this.patientSelect.appendChild(option);
        });

        // Populate filter patient select
        this.filterPatient.innerHTML = '<option value="">כל המטופלים</option>';
        this.patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.patient_id;
            option.textContent = patient.name;
            this.filterPatient.appendChild(option);
        });
    }

    onPatientChange() {
        const patientId = this.patientSelect.value;
        
        if (patientId) {
            this.populateSessionSelect(patientId);
            this.sessionSelect.disabled = false;
        } else {
            this.sessionSelect.innerHTML = '<option value="">בחר מטופל תחילה</option>';
            this.sessionSelect.disabled = true;
        }
        
        this.validateForm();
    }

    populateSessionSelect(patientId) {
        const patientSessions = this.sessions.filter(session => session.patient_id === patientId);
        
        this.sessionSelect.innerHTML = '<option value="">בחר פגישה...</option>';
        
        // Add existing sessions
        patientSessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            const date = new Date(session.date).toLocaleString('he-IL');
            option.textContent = `${date} - ${session.level} (${session.status})`;
            this.sessionSelect.appendChild(option);
        });
        
        // Add option for new session
        const newSessionOption = document.createElement('option');
        newSessionOption.value = 'new';
        newSessionOption.textContent = '+ פגישה חדשה';
        this.sessionSelect.appendChild(newSessionOption);
    }

    onSessionChange() {
        const sessionId = this.sessionSelect.value;
        
        if (sessionId === 'new') {
            // Show new session fields
            document.getElementById('newSessionFields').style.display = 'block';
        } else {
            // Hide new session fields
            document.getElementById('newSessionFields').style.display = 'none';
            
            // Load existing note if available
            if (sessionId) {
                this.loadExistingNote(sessionId);
            }
        }
        
        this.validateForm();
    }

    async loadExistingNote(sessionId) {
        const existingNote = this.notes.find(note => note.session_id === sessionId);
        
        if (existingNote) {
            this.editor.innerHTML = existingNote.content;
            this.currentNote = existingNote;
            this.updateStats();
            
            // Show info that note exists
            this.showAlert('רשומה קיימת נטענה לעריכה', 'info');
        } else {
            this.editor.innerHTML = '';
            this.currentNote = null;
            this.updateStats();
        }
    }

    validateForm() {
        const hasPatient = this.patientSelect.value !== '';
        const hasSession = this.sessionSelect.value !== '';
        const hasContent = this.editor.innerHTML.trim() !== '';
        const hasNewSessionData = this.sessionSelect.value === 'new' ? 
            (this.sessionDateTime.value !== '' && this.sessionLevel.value !== '') : true;
        
        this.saveBtn.disabled = !(hasPatient && hasSession && hasContent && hasNewSessionData);
    }

    updateStats() {
        const text = this.getPlainText();
        const words = text.match(/\S+/g)?.length || 0;
        const chars = text.length || 0;
        const charsNoSpace = text.replace(/\s/g, '').length || 0;
        const paragraphs = text.split('\n').filter(p => p.trim() !== '').length || 0;

        document.getElementById('wordCount').textContent = words;
        document.getElementById('charCount').textContent = chars;
        document.getElementById('charNoSpaceCount').textContent = charsNoSpace;
        document.getElementById('paragraphCount').textContent = paragraphs;
    }

    getPlainText() {
        return this.editor.textContent || this.editor.innerText || '';
    }

    async saveNote() {
        const noteData = {
            patient_id: this.patientSelect.value,
            session_id: this.sessionSelect.value,
            content: this.editor.innerHTML,
            plain_text: this.getPlainText(),
            word_count: document.getElementById('wordCount').textContent,
            char_count: document.getElementById('charCount').textContent
        };

        // If creating new session, add session data
        if (this.sessionSelect.value === 'new') {
            noteData.session_date = this.sessionDateTime.value;
            noteData.session_level = this.sessionLevel.value;
        }

        try {
            const response = await fetch('/api/session-notes/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(noteData)
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showAlert(`רשומה ${result.action === 'created' ? 'נוצרה' : 'עודכנה'} בהצלחה!`, 'success');
                
                // Reload notes and update table
                await this.loadNotes();
                this.renderNotesTable();
                
                // Clear form if it was a new note
                if (!this.currentNote) {
                    this.clearForm();
                }
            } else {
                this.showAlert('שגיאה בשמירת הרשומה: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            this.showAlert('שגיאה בשמירת הרשומה. אנא נסה שוב.', 'danger');
        }
    }

    autoSave() {
        // Auto-save logic (similar to save but silent)
        const noteData = {
            patient_id: this.patientSelect.value,
            session_id: this.sessionSelect.value,
            content: this.editor.innerHTML,
            plain_text: this.getPlainText(),
            auto_save: true
        };

        // Save to localStorage as backup
        localStorage.setItem('sessionNotesAutoSave', JSON.stringify(noteData));
        localStorage.setItem('sessionNotesAutoSaveTimestamp', new Date().toISOString());
    }

    clearForm() {
        this.editor.innerHTML = '';
        this.patientSelect.value = '';
        this.sessionSelect.innerHTML = '<option value="">בחר מטופל תחילה</option>';
        this.sessionSelect.disabled = true;
        this.sessionDateTime.value = new Date().toISOString().slice(0, 16);
        this.sessionLevel.value = '';
        document.getElementById('newSessionFields').style.display = 'none';
        this.currentNote = null;
        this.updateStats();
        this.validateForm();
    }

    showAlert(message, type = 'success') {
        this.saveAlert.className = `modern-alert alert-${type}`;
        this.saveAlertText.textContent = message;
        this.saveAlert.style.display = 'block';

        // Hide after 5 seconds
        setTimeout(() => {
            this.saveAlert.style.display = 'none';
        }, 5000);
    }

    // Filter and table management
    updateActiveFilters() {
        const hasFilters = this.filterPatient.value || this.filterLevel.value;
        
        if (hasFilters) {
            this.activeFilters.style.display = 'block';
            this.renderFilterBadges();
        } else {
            this.activeFilters.style.display = 'none';
        }
    }

    renderFilterBadges() {
        this.filterBadges.innerHTML = '';
        
        if (this.filterPatient.value) {
            const patient = this.patients.find(p => p.patient_id === this.filterPatient.value);
            const badge = this.createFilterBadge(`מטופל: ${patient?.name}`, () => {
                this.filterPatient.value = '';
                this.updateActiveFilters();
                this.renderNotesTable();
            });
            this.filterBadges.appendChild(badge);
        }
        
        if (this.filterLevel.value) {
            const badge = this.createFilterBadge(`רמה: ${this.filterLevel.value}`, () => {
                this.filterLevel.value = '';
                this.updateActiveFilters();
                this.renderNotesTable();
            });
            this.filterBadges.appendChild(badge);
        }
    }

    createFilterBadge(text, onRemove) {
        const badge = document.createElement('span');
        badge.className = 'filter-badge';
        badge.innerHTML = `
            ${text}
            <i class="bi bi-x remove-filter"></i>
        `;
        
        badge.querySelector('.remove-filter').addEventListener('click', onRemove);
        return badge;
    }

    resetAllFilters() {
        this.searchNotes.value = '';
        this.filterPatient.value = '';
        this.filterLevel.value = '';
        this.updateActiveFilters();
        this.renderNotesTable();
    }

    renderNotesTable() {
        const filteredNotes = this.getFilteredNotes();
        
        if (filteredNotes.length === 0) {
            this.notesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="empty-state">
                            <i class="bi bi-journal-x empty-icon"></i>
                            <p class="empty-text">לא נמצאו רשומות.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.notesTableBody.innerHTML = filteredNotes.map(note => {
            const patient = this.patients.find(p => p.patient_id === note.patient_id);
            const session = this.sessions.find(s => s.id === note.session_id);
            const preview = note.plain_text.length > 100 ? 
                note.plain_text.substring(0, 100) + '...' : note.plain_text;
            
            const levelBadgeClass = note.session_level === 'מתחיל' ? 'bg-secondary' : 
                                   note.session_level === 'בינוני' ? 'bg-warning' : 'bg-primary';
            
            return `
                <tr>
                    <td class="fw-medium">${patient?.name || 'מטופל לא ידוע'}</td>
                    <td>${session ? new Date(session.date).toLocaleDateString('he-IL') : 'פגישה לא ידועה'}</td>
                    <td><span class="badge ${levelBadgeClass}">${note.session_level || 'לא ידוע'}</span></td>
                    <td class="text-truncate d-none d-md-table-cell" style="max-width: 300px;">${preview}</td>
                    <td>${new Date(note.created_at).toLocaleDateString('he-IL')}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewNoteDetail('${note.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="editNote('${note.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getFilteredNotes() {
        let filtered = [...this.notes];
        
        // Search filter
        if (this.searchNotes.value) {
            const searchTerm = this.searchNotes.value.toLowerCase();
            filtered = filtered.filter(note => 
                note.plain_text.toLowerCase().includes(searchTerm) ||
                this.patients.find(p => p.patient_id === note.patient_id)?.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Patient filter
        if (this.filterPatient.value) {
            filtered = filtered.filter(note => note.patient_id === this.filterPatient.value);
        }
        
        // Level filter
        if (this.filterLevel.value) {
            filtered = filtered.filter(note => note.session_level === this.filterLevel.value);
        }
        
        return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Public methods for global access
    viewNoteDetail(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;
        
        const patient = this.patients.find(p => p.patient_id === note.patient_id);
        const session = this.sessions.find(s => s.id === note.session_id);
        
        document.getElementById('noteDetailContent').innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <h6 class="text-muted mb-1">מטופל</h6>
                    <p class="fw-medium">${patient?.name || 'לא ידוע'}</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted mb-1">תאריך פגישה</h6>
                    <p>${session ? new Date(session.date).toLocaleDateString('he-IL') : 'לא ידוע'}</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted mb-1">רמה</h6>
                    <span class="badge ${note.session_level === 'מתחיל' ? 'bg-secondary' : 
                                       note.session_level === 'בינוני' ? 'bg-warning' : 'bg-primary'}">${note.session_level || 'לא ידוע'}</span>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted mb-1">תאריך יצירה</h6>
                    <p>${new Date(note.created_at).toLocaleDateString('he-IL')}</p>
                </div>
            </div>
            
            <hr>
            
            <div>
                <h6 class="text-muted mb-3">תוכן הרשומה</h6>
                <div class="p-4 bg-light rounded">
                    ${note.content}
                </div>
            </div>
            
            <div class="mt-4 text-muted small">
                <div class="row text-center">
                    <div class="col-3">מילים: ${note.word_count}</div>
                    <div class="col-3">תווים: ${note.char_count}</div>
                    <div class="col-3">פסקאות: ${note.content.split('</p>').length - 1}</div>
                    <div class="col-3">נוצר: ${new Date(note.created_at).toLocaleTimeString('he-IL')}</div>
                </div>
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('noteDetailModal'));
        modal.show();
    }

    editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;
        
        // Switch to add note tab
        const addNoteTab = new bootstrap.Tab(document.getElementById('add-note-tab'));
        addNoteTab.show();
        
        // Populate form with note data
        this.patientSelect.value = note.patient_id;
        this.onPatientChange();
        
        setTimeout(() => {
            this.sessionSelect.value = note.session_id;
            this.onSessionChange();
            this.currentNote = note;
        }, 100);
    }
}

// Global functions for template buttons
function formatText(command) {
    document.execCommand(command, false, null);
    if (window.sessionNotesEditor) {
        window.sessionNotesEditor.updateStats();
        window.sessionNotesEditor.validateForm();
    }
}

function insertTemplate(templateType) {
    const templates = {
        assessment: `
<h4>הערכת פגישה</h4>
<p><strong>תאריך:</strong> ${new Date().toLocaleDateString('he-IL')}</p>
<p><strong>משך הפגישה:</strong> </p>

<h5>תסמינים נוכחיים</h5>
<ul>
    <li>רמת SUD (0-10): </li>
    <li>איכות שינה: </li>
    <li>רמת חרדה: </li>
    <li>מצב רוח: </li>
</ul>

<h5>מיקוד הפגישה</h5>
<p></p>

<h5>התערבויות שנעשו</h5>
<ul>
    <li></li>
</ul>

<h5>תגובת המטופל</h5>
<p></p>

<h5>תרגילי בית/צעדים הבאים</h5>
<p></p>
        `,
        progress: `
<h4>סקירת התקדמות</h4>
<p><strong>תאריך:</strong> ${new Date().toLocaleDateString('he-IL')}</p>

<h5>סקירת מטרות</h5>
<ul>
    <li><strong>מטרה 1:</strong> התקדמות: </li>
    <li><strong>מטרה 2:</strong> התקדמות: </li>
    <li><strong>מטרה 3:</strong> התקדמות: </li>
</ul>

<h5>מעקב תסמינים</h5>
<p><strong>ציוני SUD:</strong></p>
<ul>
    <li>פגישה קודמת: </li>
    <li>פגישה נוכחית: </li>
    <li>שינוי: </li>
</ul>

<h5>שינויים התנהגותיים</h5>
<p></p>

<h5>אתגרים</h5>
<p></p>

<h5>הצלחות</h5>
<p></p>
        `,
        homework: `
<h4>תרגיל בית</h4>
<p><strong>תאריך הקצאה:</strong> ${new Date().toLocaleDateString('he-IL')}</p>
<p><strong>תאריך יעד:</strong> </p>

<h5>פרטי התרגיל</h5>
<p></p>

<h5>הוראות</h5>
<ol>
    <li></li>
    <li></li>
    <li></li>
</ol>

<h5>תוצאות צפויות</h5>
<p></p>

<h5>משאבים נדרשים</h5>
<ul>
    <li></li>
</ul>

<h5>תוכנית מעקב</h5>
<p></p>
        `
    };

    if (templates[templateType] && window.sessionNotesEditor) {
        window.sessionNotesEditor.editor.innerHTML += templates[templateType];
        window.sessionNotesEditor.updateStats();
        window.sessionNotesEditor.validateForm();
        window.sessionNotesEditor.editor.focus();
    }
}

// Global functions for note actions
function viewNoteDetail(noteId) {
    if (window.sessionNotesEditor) {
        window.sessionNotesEditor.viewNoteDetail(noteId);
    }
}

function editNote(noteId) {
    if (window.sessionNotesEditor) {
        window.sessionNotesEditor.editNote(noteId);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.sessionNotesEditor = new EnhancedSessionNotesEditor();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 's':
                e.preventDefault();
                if (window.sessionNotesEditor && !window.sessionNotesEditor.saveBtn.disabled) {
                    window.sessionNotesEditor.saveNote();
                }
                break;
            case 'b':
                e.preventDefault();
                formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                formatText('italic');
                break;
            case 'u':
                e.preventDefault();
                formatText('underline');
                break;
        }
    }
}); 