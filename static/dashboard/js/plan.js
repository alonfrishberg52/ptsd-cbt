// plan.js

document.addEventListener('DOMContentLoaded', function() {
    // Placeholder: Load plan summary, checklist, and segments
    document.getElementById('plan-summary').textContent = 'Plan summary goes here.';
    document.getElementById('plan-validation-list').innerHTML = '<li>All triggers included</li><li>Word counts validated</li>';
    document.getElementById('plan-segments-table').innerHTML = '<tr><td>1</td><td>Intro</td><td>Setup</td><td>200</td><td>None</td><td>N/A</td></tr>';

    // Approve/Reject buttons
    document.getElementById('approve-plan-btn').addEventListener('click', function() {
        alert('Plan approved!');
    });
    document.getElementById('reject-plan-btn').addEventListener('click', function() {
        alert('Plan rejected.');
    });
}); 