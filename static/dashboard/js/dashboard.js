// dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    // Example: update quick stats (replace with real data fetch)
    document.getElementById('stat-patients').textContent = '12';
    document.getElementById('stat-pending-plans').textContent = '3';
    document.getElementById('stat-compliance-alerts').textContent = '1';

    // Sidebar navigation highlighting
    const links = document.querySelectorAll('.sidebar nav ul li a');
    links.forEach(link => {
        if (window.location.pathname.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });
}); 