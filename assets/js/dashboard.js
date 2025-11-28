document.addEventListener('DOMContentLoaded',()=>{
  const token=localStorage.getItem('authToken');
  if(!token){window.location.href='/login';return}
  const decode=(t)=>{try{const p=t.split('.')[1];return JSON.parse(atob(p))}catch(e){return {}}}
  const user=decode(token);
  const userSummary=document.getElementById('userSummary');
  const subsBody=document.getElementById('subsBody');
  const subsEmpty=document.getElementById('subsEmpty');
  const fmt=(d)=>new Date(d).toLocaleDateString();
  const loadProfile=async()=>{
    const res=await fetch(`/api/users/${user.id}`);
    const data=await res.json();
    if(res.ok&&data.success){
      const u=data.data;
      userSummary.textContent=`${u.fullName||'User'} · ${u.phoneNumber}${u.email?` · ${u.email}`:''}`;
    }
  };
  const loadSubs=async()=>{
    const res=await fetch(`/api/subscriptions?userId=${user.id}`);
    const data=await res.json();
    const subs=data.data||data||[];
    if(!subs.length){subsEmpty.style.display='block';return}
    subsBody.innerHTML=subs.map(s=>`<tr>
      <td>${s.productName||s.product||''}</td>
      <td>${s.planName||s.plan||''}</td>
      <td>${s.startDate?fmt(s.startDate):''}</td>
      <td>${s.endDate?fmt(s.endDate):''}</td>
      <td><span class="badge ${s.status==='active'?'bg-success':'bg-secondary'}">${s.status||'active'}</span></td>
      <td>
        <div class="btn-group btn-group-sm">
          <a class="btn btn-outline-primary" href="/dashboard/signals/${encodeURIComponent(s.productName||s.product||'Stocks')}?start=${encodeURIComponent(s.startDate||'')}">Details</a>
          <a class="btn btn-outline-success" href="/products">Renew</a>
        </div>
      </td>
    </tr>`).join('');
  };
  loadProfile();
  loadSubs();
});
