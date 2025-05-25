// landing.js

document.addEventListener('DOMContentLoaded', function() {
    // Toast error helper
    function showToastError(msg) {
        const toast = document.getElementById('toast-error');
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            // Inline validation
            let valid = true;
            const name = profileForm.elements['name'];
            const age = profileForm.elements['age'];
            document.getElementById('error-name').textContent = '';
            document.getElementById('error-age').textContent = '';
            if (!name.value.trim()) {
                document.getElementById('error-name').textContent = 'נא להזין שם מלא';
                showToastError('נא להזין שם מלא');
                valid = false;
            }
            if (!age.value || isNaN(age.value) || age.value < 6 || age.value > 120) {
                document.getElementById('error-age').textContent = 'נא להזין גיל חוקי (6-120)';
                showToastError('נא להזין גיל חוקי (6-120)');
                valid = false;
            }
            if (!valid) return;
            // Show spinner
            const btn = profileForm.querySelector('button[type=submit]');
            const spinner = btn.querySelector('.spinner');
            spinner.style.display = 'inline-block';
            btn.disabled = true;
            const formData = new FormData(profileForm);
            const data = Object.fromEntries(formData.entries());
            try {
                const res = await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.status === 'success') {
                    window.location.href = '/pre-session';
                } else {
                    showToastError('שגיאה בשמירת הפרופיל: ' + result.message);
                }
            } catch (err) {
                showToastError('שגיאה בשליחת הפרופיל: ' + err);
            } finally {
                spinner.style.display = 'none';
                btn.disabled = false;
            }
        });
    }

    // SUD slider update
    const sudSlider = document.getElementById('sud-slider');
    const sudValue = document.getElementById('sud-value');
    if (sudSlider && sudValue) {
        sudSlider.addEventListener('input', function() {
            sudValue.textContent = sudSlider.value;
        });
    }

    // Start story button
    const startStoryBtn = document.getElementById('start-story-btn');
    if (startStoryBtn && sudSlider) {
        startStoryBtn.addEventListener('click', function() {
            // Save SUD to session/localStorage if needed
            localStorage.setItem('initial_sud', sudSlider.value);
            window.location.href = '/'; // Go to main story generator
        });
    }
}); 