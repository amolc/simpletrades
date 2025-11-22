document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
    }

    const subscriptionsTableBody = document.getElementById('subscriptionsTableBody');
    const logoutBtn = document.getElementById('logoutBtn');

    const fetchPendingSubscriptions = async () => {
        try {
            const response = await fetch('/api/admin/subscriptions/pending', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const subscriptions = await response.json();
                renderSubscriptions(subscriptions);
            } else {
                console.error('Failed to fetch pending subscriptions');
            }
        } catch (error) {
            console.error('Error fetching pending subscriptions:', error);
        }
    };

    const renderSubscriptions = (subscriptions) => {
        subscriptionsTableBody.innerHTML = '';
        subscriptions.forEach(subscription => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${subscription.User.email}</td>
                <td>${subscription.plan}</td>
                <td>${subscription.referenceNumber}</td>
                <td>${new Date(subscription.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-success btn-sm approve-btn" data-id="${subscription.id}">Approve</button>
                    <button class="btn btn-danger btn-sm reject-btn" data-id="${subscription.id}">Reject</button>
                </td>
            `;
            subscriptionsTableBody.appendChild(row);
        });
    };

    subscriptionsTableBody.addEventListener('click', async (e) => {
        const token = localStorage.getItem('adminToken');
        if (e.target.classList.contains('approve-btn')) {
            const id = e.target.dataset.id;
            try {
                const response = await fetch(`/api/admin/subscriptions/${id}/approve`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    fetchPendingSubscriptions();
                } else {
                    console.error('Failed to approve subscription');
                }
            } catch (error) {
                console.error('Error approving subscription:', error);
            }
        }

        if (e.target.classList.contains('reject-btn')) {
            const id = e.target.dataset.id;
            try {
                const response = await fetch(`/api/admin/subscriptions/${id}/reject`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    fetchPendingSubscriptions();
                } else {
                    console.error('Failed to reject subscription');
                }
            } catch (error) {
                console.error('Error rejecting subscription:', error);
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    });

    fetchPendingSubscriptions();
});