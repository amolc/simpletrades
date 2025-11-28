document.addEventListener('DOMContentLoaded',()=>{
  const token=localStorage.getItem('adminToken')
  const toastEl=document.getElementById('settingsToast')
  const toast=(msg,type='info')=>{
    toastEl.className=`toast align-items-center text-white bg-${type==='success'?'success':type==='error'?'danger':'info'} border-0`
    toastEl.innerHTML=`<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`
    new bootstrap.Toast(toastEl).show()
  }
  const fields=['websiteName','websiteUrl','paymentUpiName','analystName','telegramApiUrl','whatsappApiUrl','supportEmail','supportPhone','paymentUpiHandle','privacyPolicyUrl','termsUrl']
  const load=async()=>{
    const res=await fetch('/api/settings',{headers:{'Authorization':`Bearer ${token}`}})
    const data=await res.json()
    const s=data.data||{}
    fields.forEach(f=>{const el=document.getElementById(f);if(el)el.value=s[f]||''})
    document.getElementById('maintenanceMode').checked=!!s.maintenanceMode
  }
  const save=async()=>{
    const body={}
    fields.forEach(f=>{const el=document.getElementById(f);if(el)body[f]=el.value})
    body.maintenanceMode=document.getElementById('maintenanceMode').checked
    const res=await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)})
    if(res.ok){toast('Settings saved','success')}else{const j=await res.json().catch(()=>({}));toast(j.error||'Error saving settings','error')}
  }
  const reset=async()=>{
    if(!confirm('Reset settings to defaults?'))return
    const res=await fetch('/api/settings/reset',{method:'POST',headers:{'Authorization':`Bearer ${token}`}})
    if(res.ok){await load();toast('Settings reset','success')}else{toast('Error resetting settings','error')}
  }
  document.getElementById('saveSettingsBtn').addEventListener('click',save)
  document.getElementById('resetSettingsBtn').addEventListener('click',reset)
  load()
})
