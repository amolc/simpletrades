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

  // Add password reset modal elements
  const passwordResetModalEl = document.getElementById('passwordResetModal')
  const passwordResetModal = passwordResetModalEl ? new bootstrap.Modal(passwordResetModalEl) : null

  const load=async()=>{
    // Keep the original approach - data is already rendered in template
    // No need to reload data via JavaScript
  }

  const escape=t=>{const d=document.createElement('div');d.textContent=t;return d.innerHTML}

  // Show success notification
  const showSuccess = (message) => {
    const alert = document.createElement('div')
    alert.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 end-0 m-3'
    alert.style.zIndex = '10000'
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `
    document.body.appendChild(alert)
    setTimeout(() => alert.remove(), 5000)
  }

  // Show error notification
  const showError = (message) => {
    const alert = document.createElement('div')
    alert.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3'
    alert.style.zIndex = '10000'
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `
    document.body.appendChild(alert)
    setTimeout(() => alert.remove(), 5000)
  }

  addBtn.addEventListener('click',()=>{
    console.log('Add staff button clicked')
    form.reset()
    document.getElementById('staffId').value=''
    document.querySelector('#staffModal .modal-title').textContent='Add Staff'
    document.getElementById('staffPasswordGroup').style.display='block'
    modal.show()
    console.log('Modal should be showing')
  })

  saveBtn.addEventListener('click',async()=>{
    console.log('Save button clicked')
    const id=document.getElementById('staffId').value
    const payload={
      email:document.getElementById('staffEmail').value,
      phoneNumber:document.getElementById('staffPhone').value,
      fullName:document.getElementById('staffFullName').value,
      status:document.getElementById('staffStatus').value
    }

    console.log('Payload:', payload)
    console.log('ID:', id)

    if(!payload.fullName){showError('Full name is required');return}
    if(!payload.email){showError('Email is required');return}
    if(!payload.phoneNumber){showError('Phone number is required');return}

    try {
      if(!id){
        console.log('Creating new staff with payload:', payload)
        const password=document.getElementById('staffPassword').value
        if(!password){showError('Password is required');return}

        const requestBody = {
          phoneNumber:payload.phoneNumber,
          email:payload.email,
          password,
          fullName:payload.fullName,
          userType:'staff'
        }
        console.log('Request body:', requestBody)

        const res=await fetch('/api/users/register',{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
          body:JSON.stringify(requestBody)
        })

        console.log('Response status:', res.status)
        const responseData = await res.json().catch(()=>({}))
        console.log('Response data:', responseData)

        if(res.ok){
          modal.hide()
          showSuccess('Staff member created successfully!')
          setTimeout(() => window.location.reload(), 1000)
        }else{
          showError(responseData.message||responseData.error||'Error creating staff')
        }
      }else{
        const res=await fetch(`/api/users/${id}`,{
          method:'PUT',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
          body:JSON.stringify(payload)
        })

        if(res.ok){
          modal.hide()
          showSuccess('Staff member updated successfully!')
          setTimeout(() => window.location.reload(), 1000)
        }else{
          const j=await res.json().catch(()=>({}))
          showError(j.error||'Error updating staff')
        }
      }
    } catch (error) {
      showError('Network error: ' + error.message)
    }
  })

  // Handle password reset functionality
  const handlePasswordReset = async () => {
    const resetBtn = document.getElementById('resetPasswordBtn')
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const userId = document.getElementById('resetUserId').value
        const newPassword = document.getElementById('resetPassword').value
        const confirmPassword = document.getElementById('confirmPassword').value

        if (!newPassword) {
          showError('New password is required')
          return
        }

        if (newPassword !== confirmPassword) {
          showError('Passwords do not match')
          return
        }

        if (newPassword.length < 6) {
          showError('Password must be at least 6 characters')
          return
        }

        try {
          const res = await fetch(`/api/users/${userId}/change-password`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              currentPassword: 'admin_reset_override', // Special flag for admin reset
              newPassword: newPassword
            })
          })

          if (res.ok) {
            passwordResetModal.hide()
            showSuccess('Password reset successfully!')
          } else {
            const j = await res.json().catch(() => ({}))
            if (j.error === 'Invalid admin authorization' || j.error === 'Token expired. Please log in again.' || j.error === 'Invalid token. Please log in again.') {
              showError('Session expired. Please log in again.')
              setTimeout(() => {
                localStorage.removeItem('adminToken')
                window.location.href = '/admin/login'
              }, 2000)
            } else {
              showError(j.error || 'Error resetting password')
            }
          }
        } catch (error) {
          showError('Network error: ' + error.message)
        }
      })
    }
  }

  tbody.addEventListener('click',async(e)=>{
    const btn=e.target.closest('button')
    if(!btn)return
    
    // Check for edit-staff class
    if(btn.classList.contains('edit-staff')){
      const id=btn.dataset.userId
      const fullName=btn.dataset.fullName||''
      const email=btn.dataset.email||''
      const phone=btn.dataset.phone||''
      const status=btn.dataset.status||'active'

      document.getElementById('staffId').value=id
      document.getElementById('staffFullName').value=fullName
      document.getElementById('staffEmail').value=email
      document.getElementById('staffPhone').value=phone
      document.getElementById('staffStatus').value=status
      document.querySelector('#staffModal .modal-title').textContent='Edit Staff'
      document.getElementById('staffPasswordGroup').style.display='none'
      modal.show()
      return
    }

    // Check for delete-staff class
    if(btn.classList.contains('delete-staff')){
      const id=btn.dataset.userId
      const row=btn.closest('tr')
      const userName=row.querySelector('td:first-child').textContent.trim()||'this staff member'

      if(confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)){
        try {
          const res=await fetch(`/api/users/${id}`,{
            method:'DELETE',
            headers:{'Authorization':`Bearer ${token}`}
          })

          if(res.ok){
            showSuccess('Staff member deleted successfully!')
            row.remove()
          }else{
            const j=await res.json().catch(()=>({}))
            showError(j.error||'Error deleting staff member')
          }
        } catch (error) {
          showError('Network error: ' + error.message)
        }
      }
    }

    // Check for view-user class (details)
    if(btn.classList.contains('view-user')){
      const id=btn.dataset.userId
      // For details, we need to fetch the full user data since it's not all in the template
      try {
        const res=await fetch(`/api/users/${id}`,{headers:{'Authorization':`Bearer ${token}`}})
        const data=await res.json()
        const u=data.data||data

        // Enhanced details view with password reset option
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
          <div class="mt-3 d-flex justify-content-end">
            <button class="btn btn-warning btn-sm" id="resetPasswordForUser" data-user-id="${u.id}" data-user-name="${escape(u.fullName||'')}">
              <i class="fas fa-key me-1"></i> Reset Password
            </button>
          </div>
        `

        detailsModal.show()

        // Add event listener for password reset button
        document.getElementById('resetPasswordForUser')?.addEventListener('click', () => {
          detailsModal.hide()
          if (passwordResetModal) {
            document.getElementById('resetUserId').value = u.id
            document.getElementById('resetUserName').textContent = escape(u.fullName || '')
            passwordResetModal.show()
          }
        })
      } catch (error) {
        showError('Error loading user details: ' + error.message)
      }
    }
  })

  // Initialize password reset functionality if modal exists
  if (passwordResetModalEl) {
    handlePasswordReset()
  }

  load()
})
