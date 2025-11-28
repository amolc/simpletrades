document.addEventListener('DOMContentLoaded',()=>{
  const token=localStorage.getItem('adminToken')
  const fmtINR=v=>`₹${Number(v||0).toFixed(2)}`
  const loadMetrics=async()=>{
    const clientsRes=await fetch('/api/users?userType=customer&status=active',{headers:{'Authorization':`Bearer ${token}`}})
    const clientsData=await clientsRes.json()
    document.getElementById('metricClients').textContent=clientsData.count||clientsData.data?.length||0
    const sigRes=await fetch('/api/signals/stats',{headers:{'Authorization':`Bearer ${token}`}})
    const sigStats=await sigRes.json()
    const stats=sigStats.data||{}
    document.getElementById('metricWinLoss').textContent=`${stats.winRate||0}%`
    document.getElementById('metricProfit').textContent=fmtINR(stats.netProfit||0)
  }
  const loadProducts=async()=>{
    const res=await fetch('/api/products')
    const data=await res.json()
    const products=data.data||[]
    const container=document.getElementById('productsList')
    if(products.length===0){
      container.innerHTML='<div class="text-muted">No products found.</div>'
      return
    }
    container.innerHTML = `
      <div class="row g-3">
        ${products.map(p=>`
          <div class="col-md-4">
            <div class="card h-100">
              <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h6 class="mb-0">${p.name}</h6>
                  <span class="badge ${p.status==='active'?'bg-success':'bg-secondary'}">${p.status||'active'}</span>
                </div>
                <small class="text-muted flex-grow-1">${p.description||''}</small>
                <div class="mt-3">
                  <a class="btn btn-outline-primary btn-sm" href="/admin/signals/${encodeURIComponent(p.name)}">Details</a>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `
  }
  loadMetrics();loadProducts()
})
