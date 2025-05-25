document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/dashboard')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const s = data.summary;
                document.getElementById('stat-patients').textContent = s.total_patients;
                document.getElementById('stat-active-plans').textContent = s.active_plans;
                document.getElementById('stat-pending-stories').textContent = s.pending_stories;
                document.getElementById('stat-compliance-alerts').textContent = s.compliance_alerts;
                renderRecentActivity(s.recent_activity);
            }
        });

    // Fetch and render SUD feedback for demo (replace with real plan_id or patient_id as needed)
    const demoPlanId = sessionStorage.getItem('plan_id') || '';
    const demoPatientId = sessionStorage.getItem('patient_id') || '';
    if (demoPlanId || demoPatientId) {
        fetch(`/api/get-sud-feedback?${demoPlanId ? 'plan_id=' + demoPlanId : 'patient_id=' + demoPatientId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    const table = document.getElementById('sud-feedback-table').querySelector('tbody');
                    table.innerHTML = '';
                    data.feedback.forEach(fb => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${new Date(fb.timestamp).toLocaleString('he-IL')}</td>
                            <td>${fb.part_index}</td>
                            <td>${fb.sud_value}</td>
                            <td>${fb.therapist_note || ''}</td>
                        `;
                        table.appendChild(tr);
                    });
                }
            });
    }

    function renderRecentActivity(logs) {
        const table = document.getElementById('recent-activity-table');
        table.innerHTML = '';
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.timestamp ? new Date(log.timestamp).toLocaleString('he-IL') : '-'}</td>
                <td>${log.action || '-'}</td>
                <td>${log.details || '-'}</td>
            `;
            table.appendChild(tr);
        });
    }
}); 