document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
    }

    const signalsTableBody = document.querySelector('tbody');

    const fetchSignals = async () => {
        try {
            const response = await fetch('/api/signals', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const signals = await response.json();
                renderSignals(signals);
            } else {
                console.error('Failed to fetch signals');
            }
        } catch (error) {
            console.error('Error fetching signals:', error);
        }
    };

    const renderSignals = (signals) => {
        signalsTableBody.innerHTML = '';
        signals.forEach(signal => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${signal.stock}</td>
                <td>${signal.entryPrice}</td>
                <td>${signal.targetPrice}</td>
                <td>${signal.stopLoss}</td>
                <td>${new Date(signal.createdAt).toLocaleDateString()}</td>
            `;
            signalsTableBody.appendChild(row);
        });
    };

    fetchSignals();
});