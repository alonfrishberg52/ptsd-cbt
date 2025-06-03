// Session Notes Rich Text Editor
class SessionNotesEditor {
    constructor() {
        this.editor = document.getElementById('richTextEditor');
        this.previewContent = document.getElementById('previewContent');
        this.saveBtn = document.getElementById('saveNotesBtn');
        this.lastSavedInfo = document.getElementById('lastSavedInfo');
        this.lastSavedText = document.getElementById('lastSavedText');
        
        this.init();
    }

    init() {
        // Set up event listeners
        this.editor.addEventListener('input', () => {
            this.updateStats();
            this.updatePreview();
        });

        this.saveBtn.addEventListener('click', () => {
            this.saveNotes();
        });

        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.editor.innerHTML.trim() !== '') {
                this.autoSave();
            }
        }, 30000);

        // Set current date/time
        const now = new Date();
        const dateInput = document.getElementById('sessionDate');
        dateInput.value = now.toISOString().slice(0, 16);

        // Load saved notes if any
        this.loadNotes();

        // Initial stats update
        this.updateStats();
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

    updatePreview() {
        const content = this.editor.innerHTML;
        if (content.trim() === '') {
            this.previewContent.innerHTML = '<p class="text-muted">No content to preview</p>';
        } else {
            this.previewContent.innerHTML = content;
        }
    }

    getPlainText() {
        return this.editor.textContent || this.editor.innerText || '';
    }

    formatText(command) {
        document.execCommand(command, false, null);
        this.editor.focus();
        this.updateStats();
        this.updatePreview();
    }

    insertTemplate(templateType) {
        const templates = {
            assessment: `
<h3>Session Assessment</h3>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Patient:</strong> </p>
<p><strong>Session Duration:</strong> </p>

<h4>Current Symptoms</h4>
<ul>
    <li>SUD Level (0-10): </li>
    <li>Sleep Quality: </li>
    <li>Anxiety Level: </li>
    <li>Mood: </li>
</ul>

<h4>Session Focus</h4>
<p></p>

<h4>Interventions Used</h4>
<ul>
    <li></li>
</ul>

<h4>Patient Response</h4>
<p></p>

<h4>Homework/Next Steps</h4>
<p></p>
            `,
            progress: `
<h3>Progress Review</h3>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h4>Goals Review</h4>
<ul>
    <li><strong>Goal 1:</strong> Progress: </li>
    <li><strong>Goal 2:</strong> Progress: </li>
    <li><strong>Goal 3:</strong> Progress: </li>
</ul>

<h4>Symptom Tracking</h4>
<p><strong>SUD Scores:</strong></p>
<ul>
    <li>Previous session: </li>
    <li>Current session: </li>
    <li>Change: </li>
</ul>

<h4>Behavioral Changes</h4>
<p></p>

<h4>Challenges</h4>
<p></p>

<h4>Successes</h4>
<p></p>
            `,
            homework: `
<h3>Homework Assignment</h3>
<p><strong>Date Assigned:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Due Date:</strong> </p>

<h4>Assignment Details</h4>
<p></p>

<h4>Instructions</h4>
<ol>
    <li></li>
    <li></li>
    <li></li>
</ol>

<h4>Expected Outcomes</h4>
<p></p>

<h4>Resources Needed</h4>
<ul>
    <li></li>
</ul>

<h4>Follow-up Plan</h4>
<p></p>
            `
        };

        if (templates[templateType]) {
            this.editor.innerHTML += templates[templateType];
            this.updateStats();
            this.updatePreview();
            this.editor.focus();
        }
    }

    saveNotes() {
        const notesData = {
            patient_id: document.getElementById('patientSelect').value,
            session_date: document.getElementById('sessionDate').value,
            content: this.editor.innerHTML,
            plain_text: this.getPlainText(),
            word_count: document.getElementById('wordCount').textContent,
            char_count: document.getElementById('charCount').textContent
        };

        // Save to localStorage for demo
        localStorage.setItem('sessionNotes', JSON.stringify(notesData));
        localStorage.setItem('sessionNotesTimestamp', new Date().toISOString());

        // In a real application, you would send this to your Flask backend
        this.sendToBackend(notesData);

        this.showSaveConfirmation();
    }

    autoSave() {
        const notesData = {
            patient_id: document.getElementById('patientSelect').value,
            session_date: document.getElementById('sessionDate').value,
            content: this.editor.innerHTML,
            plain_text: this.getPlainText(),
            auto_save: true
        };

        localStorage.setItem('sessionNotesAutoSave', JSON.stringify(notesData));
        localStorage.setItem('sessionNotesAutoSaveTimestamp', new Date().toISOString());
    }

    sendToBackend(notesData) {
        // Send to Flask backend
        fetch('/api/session-notes/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(notesData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Notes saved successfully:', data);
        })
        .catch(error => {
            console.error('Error saving notes:', error);
        });
    }

    loadNotes() {
        const savedNotes = localStorage.getItem('sessionNotes');
        const savedTimestamp = localStorage.getItem('sessionNotesTimestamp');

        if (savedNotes && savedTimestamp) {
            const notesData = JSON.parse(savedNotes);
            this.editor.innerHTML = notesData.content || '';
            
            if (notesData.patient_id) {
                document.getElementById('patientSelect').value = notesData.patient_id;
            }
            
            if (notesData.session_date) {
                document.getElementById('sessionDate').value = notesData.session_date;
            }

            this.updateStats();
            this.updatePreview();

            // Show last saved info
            const lastSaved = new Date(savedTimestamp);
            this.lastSavedText.textContent = `Last saved: ${lastSaved.toLocaleString()}`;
            this.lastSavedInfo.style.display = 'block';
        }
    }

    showSaveConfirmation() {
        const now = new Date();
        this.lastSavedText.textContent = `Notes saved successfully at ${now.toLocaleString()}`;
        this.lastSavedInfo.style.display = 'block';

        // Hide after 5 seconds
        setTimeout(() => {
            this.lastSavedInfo.style.display = 'none';
        }, 5000);
    }
}

// Global functions for toolbar buttons
function formatText(command) {
    if (window.sessionNotesEditor) {
        window.sessionNotesEditor.formatText(command);
    }
}

function insertTemplate(templateType) {
    if (window.sessionNotesEditor) {
        window.sessionNotesEditor.insertTemplate(templateType);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.sessionNotesEditor = new SessionNotesEditor();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 's':
                e.preventDefault();
                if (window.sessionNotesEditor) {
                    window.sessionNotesEditor.saveNotes();
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