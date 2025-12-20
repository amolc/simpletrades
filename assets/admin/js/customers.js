document.addEventListener('DOMContentLoaded',()=>{
  const token=localStorage.getItem('adminToken')
  const tbody=document.getElementById('customersBody')
  const addBtn=document.getElementById('addCustomerBtn')
  const saveBtn=document.getElementById('saveCustomerBtn')
  const form=document.getElementById('customerForm')
  const modalEl=document.getElementById('customerModal')
  const detailsModalEl=document.getElementById('customerDetailsModal')
  const resetPasswordModalEl=document.getElementById('resetPasswordModal')
  const modal=new bootstrap.Modal(modalEl)
  const detailsModal=new bootstrap.Modal(detailsModalEl)
  const resetPasswordModal=new bootstrap.Modal(resetPasswordModalEl)
  const confirmResetBtn=document.getElementById('confirmResetPasswordBtn')
  const load=async()=>{
    // Keep the original approach - data is already rendered in template
    // No need to reload data via JavaScript
  }
  const escape=t=>{const d=document.createElement('div');d.textContent=t;return d.innerHTML}
  addBtn.addEventListener('click',()=>{
    form.reset()
    document.getElementById('customerId').value=''
    document.querySelector('#customerModal .modal-title').textContent='Add Customer'
    document.getElementById('customerPasswordGroup').style.display='block'
    modal.show()
  })
  saveBtn.addEventListener('click',async()=>{
    const id=document.getElementById('customerId').value
    const payload={
      email:document.getElementById('customerEmail').value,
      phoneNumber:document.getElementById('customerPhone').value,
      fullName:document.getElementById('customerFullName').value,
      status:document.getElementById('customerStatus').value
    }
    if(!id){
      const password=document.getElementById('customerPassword').value
      const res=await fetch('/api/users/register',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({phoneNumber:payload.phoneNumber,email:payload.email,password,fullName:payload.fullName,userType:'customer'})})
      if(res.ok){modal.hide();load()}
    }else{
      const res=await fetch(`/api/users/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(payload)})
      if(res.ok){modal.hide();load()}
    }
  })
  tbody.addEventListener('click',async(e)=>{
    const btn=e.target.closest('button')
    if(!btn)return
    
    // Check for edit-customer class
    if(btn.classList.contains('edit-customer')){
      const id=btn.dataset.userId
      const fullName=btn.dataset.fullName||''
      const email=btn.dataset.email||''
      const phone=btn.dataset.phone||''
      const status=btn.dataset.status||'active'

      document.getElementById('customerId').value=id
      document.getElementById('customerFullName').value=fullName
      document.getElementById('customerEmail').value=email
      document.getElementById('customerPhone').value=phone
      document.getElementById('customerStatus').value=status
      document.querySelector('#customerModal .modal-title').textContent='Edit Customer'
      document.getElementById('customerPasswordGroup').style.display='none'
      modal.show()
      return
    }

    // Check for delete-customer class
    if(btn.classList.contains('delete-customer')){
      const id=btn.dataset.userId
      if(confirm('Delete this customer?')){
        const res=await fetch(`/api/users/${id}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}})
        if(res.ok){
          // Remove the row from the table
          const row=btn.closest('tr')
          if(row)row.remove()
        }
      }
      return
    }

    // Check for reset-password class
    if(btn.classList.contains('reset-password')){
      const id=btn.dataset.userId
      const userName=btn.dataset.userName||'Unknown User'

      document.getElementById('resetUserId').value=id
      document.getElementById('resetUserName').textContent=userName
      document.getElementById('resetPasswordForm').reset()
      resetPasswordModal.show()
      return
    }

    // Check for view-user class (details)
    if(btn.classList.contains('view-user')){
      const id=btn.dataset.userId
      // For details, we need to fetch the full user data since it's not all in the template
      const res=await fetch(`/api/users/${id}`,{headers:{'Authorization':`Bearer ${token}`}})
      const data=await res.json()
      const u=data.data||data

      document.getElementById('customerDetailsBody').innerHTML=`
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
      return
    }
  })

  // Handle reset password confirmation
  confirmResetBtn.addEventListener('click',async()=>{
    const userId=document.getElementById('resetUserId').value
    const newPassword=document.getElementById('newPassword').value
    const confirmPassword=document.getElementById('confirmPassword').value

    // Validate passwords
    if(!newPassword || newPassword.length < 6){
      alert('Password must be at least 6 characters long.')
      return
    }

    if(newPassword !== confirmPassword){
      alert('Passwords do not match.')
      return
    }

    try{
      const res=await fetch(`/api/users/${userId}/change-password`,{
        method:'PUT',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${token}`
        },
        body:JSON.stringify({
          currentPassword:'admin_reset_override',
          newPassword
        })
      })

      const data=await res.json()

      if(res.ok){
        alert('Password reset successfully!')
        resetPasswordModal.hide()
      }else{
        alert(`Error: ${data.error || 'Failed to reset password'}`)
      }
    }catch(error){
      console.error('Reset password error:',error)
      alert('An error occurred while resetting the password.')
    }
  })

  load()
})
