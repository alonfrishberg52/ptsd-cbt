// patient.js

function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0];
    return parts[0][0] + (parts[1][0] || '');
}

function getStatusBadge(status) {
    if (status === 'active') return '<span class="badge badge-green">פעיל</span>';
    if (status === 'pending') return '<span class="badge badge-yellow">ממתין</span>';
    if (status === 'archived') return '<span class="badge badge-blue">בארכיון</span>';
    return '<span class="badge badge-red">לא ידוע</span>';
}

document.addEventListener('DOMContentLoaded', function() {
    let patientsData = [];
    let sortField = 'name';
    let sortAsc = true;

    // Fetch and render patients
    const patientTable = document.getElementById('patient-list');
    if (patientTable) {
        fetch('/api/patients')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    patientsData = data.patients;
                    renderPatientTable();
                }
            });
    }

    function renderPatientTable() {
        let filtered = patientsData;
        const searchVal = (document.getElementById('search-patient')?.value || '').toLowerCase();
        const filterVal = document.getElementById('filter-status')?.value || 'all';
        if (searchVal) {
            filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(searchVal));
        }
        if (filterVal !== 'all') {
            filtered = filtered.filter(p => (p.status || 'active') === filterVal);
        }
        filtered = filtered.sort((a, b) => {
            let aVal = a[sortField] || '';
            let bVal = b[sortField] || '';
            if (sortField === 'name') {
                aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase();
            }
            if (aVal < bVal) return sortAsc ? -1 : 1;
            if (aVal > bVal) return sortAsc ? 1 : -1;
            return 0;
        });
        patientTable.innerHTML = '';
        filtered.forEach(patient => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="avatar">${getInitials(patient.name)}</span> ${patient.name}</td>
                <td>${getStatusBadge(patient.status || 'active')}</td>
                <td>${(patient.triggers || []).map(t => t.name).join(', ')}</td>
                <td>${patient.last_activity || '-'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" title="הצג" data-id="${patient.patient_id}"><i class="fa fa-eye"></i></button>
                    <button class="btn btn-secondary btn-sm" title="ערוך"><i class="fa fa-pen"></i></button>
                    <button class="btn btn-secondary btn-sm" title="הודעה"><i class="fa fa-envelope"></i></button>
                </td>
            `;
            tr.querySelector('.fa-eye').parentElement.onclick = function(e) {
                e.stopPropagation();
                window.location.href = `/dashboard/patients?detail=${patient.patient_id}`;
            };
            tr.onclick = function(e) {
                if (!e.target.closest('button')) {
                    window.location.href = `/dashboard/patients?detail=${patient.patient_id}`;
                }
            };
            patientTable.appendChild(tr);
        });
    }

    // Search/filter/sort controls
    document.getElementById('search-patient')?.addEventListener('input', renderPatientTable);
    document.getElementById('filter-status')?.addEventListener('change', renderPatientTable);
    document.querySelectorAll('.patient-table th.sortable').forEach((th, idx) => {
        th.onclick = function() {
            const fields = ['name', 'status', null, 'last_activity'];
            if (fields[idx]) {
                if (sortField === fields[idx]) sortAsc = !sortAsc;
                else { sortField = fields[idx]; sortAsc = true; }
                renderPatientTable();
            }
        };
    });

    // Patient Detail: Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(tc => tc.style.display = 'none');
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).style.display = '';
        });
    });

    // Patient Detail: Load details if detail param in URL
    const urlParams = new URLSearchParams(window.location.search);
    const detailId = urlParams.get('detail');
    if (detailId && document.getElementById('patient-name')) {
        fetch(`/api/patients/${detailId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    renderPatientDetail(data.patient);
                }
            });
    }
    function renderPatientDetail(patient) {
        document.getElementById('patient-name').innerHTML = `<span class="avatar">${getInitials(patient.name)}</span> ${patient.name}`;
        document.getElementById('patient-triggers').textContent = (patient.triggers || []).map(t => t.name).join(', ');
        document.getElementById('patient-coping').textContent = (patient.coping_toolkit || []).join(', ');
        document.getElementById('patient-goals').textContent = patient.goals || '-';
        document.getElementById('patient-language').textContent = patient.language || '-';
        document.getElementById('patient-culture').textContent = patient.culture || '-';
    }
}); 