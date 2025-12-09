document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/admin/login';
  }
  const subscriptionsTableBody = document.getElementById('subscriptionsTableBody');
  const totalCustomersEl = document.getElementById('totalCustomers');
  const todayCustomersEl = document.getElementById('todayCustomers');
  const totalSubsEl = document.getElementById('totalSubscriptions');
  const todaySubsEl = document.getElementById('todaySubscriptions');
  const productStatsBody = document.getElementById('productStatsBody');
  const logoutBtn = document.getElementById('logoutBtn');

  const isToday = (d) => {
    const dateStr = new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const todayStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    return dateStr === todayStr;
  };

  const loadStats = async () => {
    try {
      // Customers
      let totalCustomers = 0;
      let todayCustomers = 0;
      const usersRes = await fetch('/api/users?userType=customer&status=', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const usersPayload = await usersRes.json();
        const list = usersPayload.data || [];
        totalCustomers = list.length;
        todayCustomers = list.filter(u => isToday(u.createdAt)).length;
      }
      if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
      if (todayCustomersEl) todayCustomersEl.textContent = todayCustomers;

      // Subscriptions
      let totalSubs = 0;
      let todaySubs = 0;
      const subsRes = await fetch('/api/subscriptions?page=1&limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subsRes.ok) {
        const subsPayload = await subsRes.json();
        const data = subsPayload.data || {};
        const rows = data.subscriptions || [];
        const pagination = data.pagination || {};
        totalSubs = pagination.total || rows.length;
        todaySubs = rows.filter(s => isToday(s.createdAt)).length;
      }
      if (totalSubsEl) totalSubsEl.textContent = totalSubs;
      if (todaySubsEl) todaySubsEl.textContent = todaySubs;
    } catch (e) {
      // no-op
    }
  };

  const loadProductStats = async () => {
    try {
      const res = await fetch('/api/signals/products/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const payload = await res.json();
      const stats = payload.data || [];
      if (productStatsBody) {
        productStatsBody.innerHTML = '';
        stats.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${p.productName}</td>
            <td>${p.totalSignals}</td>
            <td><span class="text-success">${p.profitSignals}</span></td>
            <td><span class="text-danger">${p.lossSignals}</span></td>
            <td>${p.inProgressSignals}</td>
            <td>Rs ${(p.totalProfit||0).toFixed(2)}</td>
            <td>Rs ${(p.netProfit||0).toFixed(2)}</td>
          `;
          productStatsBody.appendChild(tr);
        });
      }
    } catch (e) {
      // no-op
    }
  };
  const fetchPendingSubscriptions = async () => {
    try {
      let response = await fetch('/api/subscriptions/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        response = await fetch('/api/subscriptions?status=pending&limit=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      if (response.ok) {
        const payload = await response.json();
        const list = Array.isArray(payload) ? payload : (payload.data?.subscriptions || payload.data || []);
        renderSubscriptions(list);
      }
    } catch (error) {}
  };
  const renderSubscriptions = (subscriptions) => {
    subscriptionsTableBody.innerHTML = '';
    subscriptions.forEach(subscription => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${subscription.User?.email || ''}</td>
        <td>${subscription.plan?.planName || ''}</td>
        <td>${subscription.referenceNumber}</td>
        <td>${new Date(subscription.createdAt).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</td>
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
  loadStats();
  loadProductStats();
  fetchPendingSubscriptions();
});
