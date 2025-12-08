document.addEventListener('DOMContentLoaded',()=>{
  const params=new URLSearchParams(window.location.search);
  const start=params.get('start');
  const product=decodeURIComponent(window.location.pathname.split('/').pop());
  document.getElementById('sigProduct').textContent=product;
  document.getElementById('sigStart').textContent=start?new Date(start).toLocaleDateString():'—';
  const token=localStorage.getItem('authToken');
  const load=async()=>{
    const res=await fetch('/api/signals');
    const data=await res.json();
    const signals=(data.data||data||[]).filter(s=>{
      const created=new Date(s.createdAt).getTime();
      const min=start?new Date(start).getTime():0;
      const p=(s.type||'').toLowerCase();
      return created>=min && p===product.toLowerCase();
    });
    const body=document.getElementById('signalsBody');
    body.innerHTML=signals.map(s=>`<tr>
      <td>${s.stock}</td>
      <td>${s.signalType}</td>
      <td>Rs ${Number(s.entry).toFixed(2)}</td>
      <td>Rs ${Number(s.target).toFixed(2)}</td>
      <td>Rs ${Number(s.stopLoss).toFixed(2)}</td>
      <td><span class="badge ${s.status==='ACTIVE'?'bg-success':s.status==='CLOSED'?'bg-secondary':'bg-warning'}">${s.status}</span></td>
      <td>${new Date(s.createdAt).toLocaleString()}</td>
    </tr>`).join('');
  };
  load();
});
