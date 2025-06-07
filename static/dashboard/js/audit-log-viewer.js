// audit.js

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('audit-log-table').innerHTML = '<tr><td>2024-06-01</td><td>Plan Approved</td><td>Plan #123</td><td>Dr. Cohen</td></tr>';
    const searchInput = document.getElementById('search-audit');
    const filterSelect = document.getElementById('filter-audit-type');
    if (searchInput && filterSelect) {
        searchInput.addEventListener('input', filterAudit);
        filterSelect.addEventListener('change', filterAudit);
    }
    function filterAudit() {
        // Placeholder: implement real filtering logic
        console.log('Audit search:', searchInput.value, 'Type:', filterSelect.value);
    }
}); 