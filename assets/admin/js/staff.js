document.addEventListener('DOMContentLoaded',()=>{
  const token=localStorage.getItem('adminToken')
  const tbody=document.getElementById('staffBody')
  const addBtn=document.getElementById('addStaffBtn')
  const saveBtn=document.getElementById('saveStaffBtn')
  const form=document.getElementById('staffForm')
  const modalEl=document.getElementById('staffModal')
  const detailsModalEl=document.getElementById('userDetailsModal')
  const modal=new bootstrap.Modal(modalEl)
  const detailsModal=new bootstrap.Modal(detailsModalEl)
  const load=async()=>{
    const res=await fetch('/api/users?userType=staff',{headers:{'Authorization':`Bearer ${token}`}})
    const data=await res.json()
    const users=data.data||[]
    tbody.innerHTML=users.map(u=>`
      <tr>
        <td>${escape(u.fullName||'')}</td>
        <td>${escape(u.phoneNumber||'')}</td>
        <td>${escape(u.email||'')}</td>
        <td><span class="badge ${u.status==='active'?'bg-success':u.status==='inactive'?'bg-secondary':'bg-danger'}">${u.status}</span></td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-action="details" data-id="${u.id}">Details</button>
            <button class="btn btn-outline-primary" data-action="edit" data-id="${u.id}">Edit</button>
            <button class="btn btn-outline-danger" data-action="delete" data-id="${u.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('')
  }
  const escape=t=>{const d=document.createElement('div');d.textContent=t;return d.innerHTML}
  addBtn.addEventListener('click',()=>{
    form.reset()
    document.getElementById('staffId').value=''
    document.querySelector('#staffModal .modal-title').textContent='Add Staff'
    document.getElementById('staffPasswordGroup').style.display='block'
    modal.show()
  })
  saveBtn.addEventListener('click',async()=>{
    const id=document.getElementById('staffId').value
    const payload={
      email:document.getElementById('staffEmail').value,
      phoneNumber:document.getElementById('staffPhone').value,
      fullName:document.getElementById('staffFullName').value,
      status:document.getElementById('staffStatus').value
    }
    if(!payload.phoneNumber){alert('Phone number is required');return}
    if(!id){
      const password=document.getElementById('staffPassword').value
      if(!password){alert('Password is required');return}
      const res=await fetch('/api/users/register',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({phoneNumber:payload.phoneNumber,email:payload.email,password,fullName:payload.fullName,userType:'staff'})})
      if(res.ok){modal.hide();load()}else{const j=await res.json().catch(()=>({}));alert(j.error||'Error creating staff')}
    }else{
      const res=await fetch(`/api/users/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(payload)})
      if(res.ok){modal.hide();load()}else{alert('Error updating staff')}
    }
  })
  tbody.addEventListener('click',async(e)=>{
    const btn=e.target.closest('button')
    if(!btn)return
    const id=btn.dataset.id
    const action=btn.dataset.action
    if(action==='edit'){
      const res=await fetch(`/api/users/${id}`,{headers:{'Authorization':`Bearer ${token}`}})
      const data=await res.json()
      const u=data.data||data
      document.getElementById('staffId').value=u.id
      document.getElementById('staffFullName').value=u.fullName||''
      document.getElementById('staffEmail').value=u.email||''
      document.getElementById('staffPhone').value=u.phoneNumber||''
      document.getElementById('staffStatus').value=u.status||'active'
      document.querySelector('#staffModal .modal-title').textContent='Edit Staff'
      document.getElementById('staffPasswordGroup').style.display='none'
      modal.show()
    }
    if(action==='delete'){
      if(confirm('Delete this staff?')){
        const res=await fetch(`/api/users/${id}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}})
        if(res.ok){load()}
      }
    }
    if(action==='details'){
      const res=await fetch(`/api/users/${id}`,{headers:{'Authorization':`Bearer ${token}`}})
      const data=await res.json()
      const u=data.data||data
      document.getElementById('userDetailsBody').innerHTML=`
        <div class="row">
          <div class="col-md-6">
            <table class="table table-sm">
              <tr><td><strong>Name</strong></td><td>${escape(u.fullName||'')}</td></tr>
              <tr><td><strong>Email</strong></td><td>${escape(u.email||'')}</td></tr>
              <tr><td><strong>Phone</strong></td><td>${escape(u.phoneNumber||'')}</td></tr>
              <tr><td><strong>Status</strong></td><td>${escape(u.status||'')}</td></tr>
              <tr><td><strong>Role</strong></td><td>${escape(u.role||'')}</td></tr>
            </table>
          </div>
          <div class="col-md-6">
            <table class="table table-sm">
              <tr><td><strong>User Type</strong></td><td>${escape(u.userType||'')}</td></tr>
              <tr><td><strong>Created</strong></td><td>${new Date(u.createdAt).toLocaleString()}</td></tr>
              <tr><td><strong>Updated</strong></td><td>${new Date(u.updatedAt).toLocaleString()}</td></tr>
            </table>
          </div>
        </div>
      `
      detailsModal.show()
    }
  })
  load()
})
