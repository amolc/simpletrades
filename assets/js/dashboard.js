document.addEventListener('DOMContentLoaded',()=>{
  const token=localStorage.getItem('authToken');
  if(!token){window.location.href='/login';return}
  const decode=(t)=>{try{const p=t.split('.')[1];return JSON.parse(atob(p))}catch(e){return {}}}
  const user=decode(token);
  const userSummary=document.getElementById('userSummary');
  const subsBody=document.getElementById('subsBody');
  const subsEmpty=document.getElementById('subsEmpty');
  const fmt=(d)=>new Date(d).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'});
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
    const subs=data.data?.subscriptions || data.data || data || [];
    if(!subs.length){subsEmpty.style.display='block';return}
    
    // Fetch payment transactions for each subscription
    const paymentRes=await fetch(`/api/transactions?userId=${user.id}`);
    const paymentData=await paymentRes.json();
    const transactions=paymentData.data?.transactions || paymentData.data || paymentData || [];
    
    subsBody.innerHTML=subs.map(s=>{
      // Find the most recent transaction for this subscription
      const subscriptionTransactions=transactions.filter(t=>t.subscriptionId===s.id);
      const latestTransaction=subscriptionTransactions.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
      
      let paymentStatus='pending';
      let paymentBadgeClass='bg-warning';
      
      if(latestTransaction){
        if(latestTransaction.paymentStatus==='completed'){
          paymentStatus='completed';
          paymentBadgeClass='bg-success';
        }else if(latestTransaction.paymentStatus==='failed'){
          paymentStatus='failed';
          paymentBadgeClass='bg-danger';
        }else{
          paymentStatus=latestTransaction.paymentStatus||'pending';
          paymentBadgeClass=paymentStatus==='pending'?'bg-warning':'bg-secondary';
        }
      }
      
      const productName=s.plan?.Product?.name || s.productName || s.product || 'Stocks';
      const planName=s.plan?.planName || s.planName || s.plan || '';
      
      return `<tr>
        <td>${productName}</td>
        <td>${planName}</td>
        <td>${s.startDate?fmt(s.startDate):''}</td>
        <td>${s.endDate?fmt(s.endDate):''}</td>
        <td><span class="badge ${s.status==='active'?'bg-success':'bg-secondary'}">${s.status||'active'}</span></td>
        <td><span class="badge ${paymentBadgeClass}">${paymentStatus}</span></td>
        <td>
          <a class="btn btn-sm btn-outline-secondary text-decoration-none" href="/products">
            <i class="fas fa-redo me-1"></i>Renew
          </a>
        </td>
        <td>
          <a class="btn btn-sm btn-outline-primary text-decoration-none" href="/dashboard/signals/${encodeURIComponent(productName)}?start=${encodeURIComponent(s.startDate||'')}">
            <i class="fas fa-info-circle me-1"></i>Details
          </a>
          ${paymentStatus==='failed'?`<a class="btn btn-sm btn-outline-danger text-decoration-none ms-1" href="/payment/retry?subscriptionId=${s.id}&productId=${s.productId}&planId=${s.planId}">
            <i class="fas fa-exclamation-triangle me-1"></i>Pay Now
          </a>`:''}
        </td>
      </tr>`;
    }).join('');
  };
  loadProfile();
  loadSubs();
});
