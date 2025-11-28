document.addEventListener('DOMContentLoaded',()=>{
  const token=localStorage.getItem('adminToken')
  const productName=decodeURIComponent(window.location.pathname.split('/').pop())
  document.getElementById('productTitle').textContent=productName
  const watchBody=document.getElementById('watchlistBody')
  const signalsBody=document.getElementById('signalsBody')
  const addBtn=document.getElementById('addWatchBtn')
  const modalEl=document.getElementById('watchModal')
  const modal=new bootstrap.Modal(modalEl)
  const saveBtn=document.getElementById('saveWatchBtn')

  const loadWatch=async()=>{
    const res=await fetch(`/api/watchlist?productName=${encodeURIComponent(productName)}`,{headers:{'Authorization':`Bearer ${token}`}})
    const data=await res.json()
    const rows=(data.data||[]).map(w=>`
      <tr>
        <td>${escape(w.stockName)}</td>
        <td>${escape(w.market)}</td>
        <td>₹${Number(w.currentPrice).toFixed(2)}</td>
        <td>₹${Number(w.alertPrice).toFixed(2)}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" data-action="buy" data-id="${w.id}" data-stock="${escape(w.stockName)}">Buy</button>
            <button class="btn btn-outline-warning" data-action="sell" data-id="${w.id}" data-stock="${escape(w.stockName)}">Sell</button>
            <button class="btn btn-outline-primary" data-action="edit" data-id="${w.id}">Edit</button>
            <button class="btn btn-outline-danger" data-action="delete" data-id="${w.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('')
    watchBody.innerHTML=rows
  }

  const loadSignals=async()=>{
    const res=await fetch('/api/signals',{headers:{'Authorization':`Bearer ${token}`}})
    const data=await res.json()
    signalsBody.innerHTML=(data.data||[]).map(s=>`
      <tr>
        <td>${escape(s.stock)}</td>
        <td>${escape(s.signalType||s.type)}</td>
        <td>₹${Number(s.entry).toFixed(2)}</td>
        <td>₹${Number(s.target).toFixed(2)}</td>
        <td>₹${Number(s.stopLoss).toFixed(2)}</td>
        <td><span class="badge ${s.status==='ACTIVE'?'bg-success':s.status==='CLOSED'?'bg-secondary':'bg-warning'}">${escape(s.status)}</span></td>
        <td>${new Date(s.createdAt).toLocaleString()}</td>
        <td>${new Date(s.updatedAt).toLocaleString()}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-saction="activate" data-sid="${s.id}">Activate</button>
            <button class="btn btn-outline-secondary" data-saction="close" data-sid="${s.id}">Close</button>
            <button class="btn btn-outline-danger" data-saction="delete" data-sid="${s.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('')
  }

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
    if(res.ok){modal.hide();loadWatch()}else{alert('Error saving watchlist')}
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
        if(res.ok){loadWatch()}
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
    const body={ stock, entry, target, stopLoss, type:'stocks', signalType:side, notes, userId: adminId }
    const res=await fetch('/api/signals',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)})
    if(res.ok){ signalModal.hide(); loadSignals() } else { const j=await res.json().catch(()=>({})); alert(j.error||'Error creating signal') }
  })

  document.getElementById('signalsTable').addEventListener('click',async(e)=>{
    const btn=e.target.closest('button')
    if(!btn)return
    const id=btn.dataset.sid
    const action=btn.dataset.saction
    if(action==='activate'){
      const res=await fetch(`/api/signals/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({status:'ACTIVE'})})
      if(res.ok){loadSignals()}
    }
    if(action==='close'){
      const res=await fetch(`/api/signals/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({status:'CLOSED'})})
      if(res.ok){loadSignals()}
    }
    if(action==='delete'){
      if(confirm('Delete this signal?')){
        const res=await fetch(`/api/signals/${id}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}})
        if(res.ok){loadSignals()}
      }
    }
  })

  loadWatch();loadSignals()
})
