document.addEventListener('DOMContentLoaded',()=>{
  const token=localStorage.getItem('adminToken')
  const productName=decodeURIComponent(window.location.pathname.split('/').pop())
  const watchBody=document.getElementById('watchlistBody')
  const signalsBody=document.getElementById('signalsBody')
  const addBtn=document.getElementById('addWatchBtn')
  const modalEl=document.getElementById('watchModal')
  const modal=new bootstrap.Modal(modalEl)
  const saveBtn=document.getElementById('saveWatchBtn')

  const escape=t=>{const d=document.createElement('div');d.textContent=t;return d.innerHTML}
  const decodeJwt=(t)=>{try{const p=t.split('.')[1];return JSON.parse(atob(p))}catch(e){return {}}}

  addBtn.addEventListener('click',()=>{
    document.getElementById('watchForm').reset()
    document.getElementById('watchId').value=''
    modal.show()
  })

  saveBtn.addEventListener('click',async()=>{
    const id=document.getElementById('watchId').value
    const body={
      stockName:document.getElementById('watchStock').value,
      market:document.getElementById('watchMarket').value,
      currentPrice:document.getElementById('watchCurrentPrice').value,
      alertPrice:document.getElementById('watchAlertPrice').value,
      productName
    }
    const url=id?`/api/watchlist/${id}`:'/api/watchlist'
    const method=id?'PUT':'POST'
    const res=await fetch(url,{method,headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)})
    if(res.ok){modal.hide();window.location.reload()}else{alert('Error saving watchlist')}
  })

  const signalModalEl=document.getElementById('signalCreateModal')
  const signalModal=new bootstrap.Modal(signalModalEl)
  const createSignalBtn=document.getElementById('createSignalBtn')

  watchBody.addEventListener('click',async(e)=>{
    const btn=e.target.closest('button')
    if(!btn)return
    const id=btn.dataset.id
    const action=btn.dataset.action
    if(action==='edit'){
      const res=await fetch(`/api/watchlist/${id}`,{headers:{'Authorization':`Bearer ${token}`}})
      const data=await res.json()
      const w=data.data
      document.getElementById('watchId').value=w.id
      document.getElementById('watchStock').value=w.stockName
      document.getElementById('watchMarket').value=w.market
      document.getElementById('watchCurrentPrice').value=w.currentPrice
      document.getElementById('watchAlertPrice').value=w.alertPrice
      modal.show()
    }
    if(action==='delete'){
      if(confirm('Delete this watchlist item?')){
        const res=await fetch(`/api/watchlist/${id}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}})
        if(res.ok){window.location.reload()}
      }
    }
    if(action==='buy' || action==='sell'){
      const isBuy=action==='buy'
      const res=await fetch(`/api/watchlist/${id}`,{headers:{'Authorization':`Bearer ${token}`}})
      const data=await res.json()
      const w=data.data
      document.getElementById('signalCreateTitle').textContent=`Create ${isBuy?'BUY':'SELL'} Signal`
      document.getElementById('signalStock').value=w.stockName
      document.getElementById('signalTime').value=new Date().toLocaleString()
      document.getElementById('signalEntry').value=w.currentPrice
      document.getElementById('signalCurrentPrice').value=w.currentPrice
      document.getElementById('signalSide').value=isBuy?'BUY':'SELL'
      // default 0.5% offsets
      const entry=parseFloat(w.currentPrice)
      const targetPctEl=document.getElementById('targetPct')
      const stopPctEl=document.getElementById('stopPct')
      const targetLabel=document.getElementById('targetPctLabel')
      const stopLabel=document.getElementById('stopPctLabel')
      const targetSign=document.getElementById('targetPctSign')
      const stopSign=document.getElementById('stopPctSign')
      targetPctEl.value=0.5
      stopPctEl.value=0.5
      const applyPct=()=>{
        const tp=parseFloat(targetPctEl.value)
        const sp=parseFloat(stopPctEl.value)
        targetLabel.textContent=tp
        stopLabel.textContent=sp
        targetSign.textContent = isBuy ? '+' : '-'
        stopSign.textContent = isBuy ? '-' : '+'
        const targetVal = isBuy ? entry*(1+tp/100) : entry*(1-tp/100)
        const stopVal = isBuy ? entry*(1-sp/100) : entry*(1+sp/100)
        document.getElementById('signalTarget').value=targetVal.toFixed(2)
        document.getElementById('signalStop').value=stopVal.toFixed(2)
      }
      applyPct()
      targetPctEl.oninput=applyPct
      stopPctEl.oninput=applyPct
      document.getElementById('signalNotes').value=''
      signalModal.show()
    }
  })

  createSignalBtn.addEventListener('click',async()=>{
    const stock=document.getElementById('signalStock').value
    const entry=parseFloat(document.getElementById('signalEntry').value)
    const target=parseFloat(document.getElementById('signalTarget').value)
    const stopLoss=parseFloat(document.getElementById('signalStop').value)
    const notes=document.getElementById('signalNotes').value
    const side=document.getElementById('signalSide').value
    const adminId=decodeJwt(token).id
    if(!stock || !Number.isFinite(entry) || !Number.isFinite(target) || !Number.isFinite(stopLoss)){
      alert('Please fill target and stop loss');
      return;
    }
    const toType=(p)=>({Stocks:'stocks',Crypto:'crypto',Forex:'forex',Commodity:'commodity',Options:'options'})[p]||(p?p.toLowerCase():'stocks')
    const body={ product: productName, symbol: stock, entry, target, stopLoss, type: toType(productName), signalType:side, notes, userId: adminId }
    const res=await fetch('/api/signals',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)})
    if(res.ok){ signalModal.hide(); window.location.reload() } else { const j=await res.json().catch(()=>({})); alert(j.error||'Error creating signal') }
  })

  document.getElementById('signalsTable').addEventListener('click',async(e)=>{
    const btn=e.target.closest('button')
    if(!btn)return
    const id=btn.dataset.sid
    const action=btn.dataset.saction
    if(action==='activate'){
      const res=await fetch(`/api/signals/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({status:'ACTIVE'})})
      if(res.ok){window.location.reload()}
    }
    if(action==='close'){
      const res=await fetch(`/api/signals/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({status:'CLOSED'})})
      if(res.ok){window.location.reload()}
    }
    if(action==='delete'){
      if(confirm('Delete this signal?')){
        const res=await fetch(`/api/signals/${id}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}})
        if(res.ok){window.location.reload()}
      }
    }
  })

  // Data is now loaded server-side via Nunjucks
})
