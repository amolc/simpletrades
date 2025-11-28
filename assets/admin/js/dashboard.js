document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/admin/login';
  }
  const subscriptionsTableBody = document.getElementById('subscriptionsTableBody');
  const logoutBtn = document.getElementById('logoutBtn');
  const fetchPendingSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const subscriptions = await response.json();
        renderSubscriptions(subscriptions);
      }
    } catch (error) {}
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
        const response = await fetch(`/api/subscriptions/${id}/approve`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) fetchPendingSubscriptions();
      } catch (error) {}
    }
    if (e.target.classList.contains('reject-btn')) {
      const id = e.target.dataset.id;
      try {
        const response = await fetch(`/api/subscriptions/${id}/reject`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) fetchPendingSubscriptions();
      } catch (error) {}
    }
  });
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  });
  fetchPendingSubscriptions();
});
