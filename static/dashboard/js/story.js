// story.js

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('story-summary').textContent = 'Story summary goes here.';
    document.getElementById('story-sud-chart').textContent = '[SUD chart placeholder]';
    document.getElementById('story-compliance-report').textContent = '[Compliance report placeholder]';

    document.getElementById('approve-story-btn').addEventListener('click', function() {
        alert('Story approved!');
    });
    document.getElementById('reject-story-btn').addEventListener('click', function() {
        alert('Story rejected.');
    });
}); 