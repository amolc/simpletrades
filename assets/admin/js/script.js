/* copied from admin/script.js with route adjustments */
class SignalManager{constructor(){this.form=document.getElementById('signalForm');this.bodyEl=document.getElementById('signalsBody');this.totalEl=document.getElementById('total');this.emptyState=document.getElementById('emptyState');this.exportBtn=document.getElementById('exportBtn');this.clearBtn=document.getElementById('clearBtn');if(this.form&&this.bodyEl){this.init()}}init(){this.loadSignals();this.bindEvents();this.updateCount();this.checkEmptyState()}bindEvents(){if(this.form){this.form.addEventListener('submit',e=>this.handleSubmit(e))}if(this.exportBtn){this.exportBtn.addEventListener('click',()=>this.exportSignals())}if(this.clearBtn){this.clearBtn.addEventListener('click',()=>this.clearAllSignals())}}handleSubmit(e){e.preventDefault();const s=this.readForm();if(!this.validateSignal(s))return;this.addSignal(s);this.saveSignal(s);this.updateCount();this.checkEmptyState();this.form.reset();this.showNotification('Signal created successfully!','success')}readForm(){return{stock:document.getElementById('stock').value.trim().toUpperCase(),price:parseFloat(document.getElementById('price').value),target:parseFloat(document.getElementById('target').value),stop:parseFloat(document.getElementById('stop').value),type:document.getElementById('type').value,notes:document.getElementById('notes').value.trim(),time:new Date().toISOString(),id:Date.now().toString()}}validateSignal(s){if(!s.stock){this.showNotification('Please enter a stock symbol','error');return false}if(!/^[A-Z]{1,5}$/.test(s.stock)){this.showNotification('Please enter a valid stock symbol (1-5 letters)','error');return false}if(!s.type){this.showNotification('Please select a signal type','error');return false}if(![s.price,s.target,s.stop].every(Number.isFinite)){this.showNotification('Please enter valid numbers for price, target, and stop loss','error');return false}if(s.target<=s.price){this.showNotification('Target price must be higher than entry price','error');return false}if(s.stop>=s.price){this.showNotification('Stop loss must be lower than entry price','error');return false}return true}addSignal(s){const r=document.createElement('tr');r.className='fade-in';r.dataset.id=s.id;r.innerHTML=this.createRowHtml(s);this.bodyEl.insertBefore(r,this.bodyEl.firstChild)}createRowHtml(s){const rr=this.calculateRiskReward(s);const b=this.getStatusBadge(s);const t=`
      <td>
        <div class="d-flex align-items-center">
          <span class="badge bg-primary me-2">${s.stock}</span>
          ${b}
        </div>
      </td>
      <td><span class="text-success fw-bold">$${s.price.toFixed(2)}</span></td>
      <td><span class="text-info">$${s.target.toFixed(2)}</span></td>
      <td><span class="text-warning">$${s.stop.toFixed(2)}</span></td>
      <td>${this.getTypeIcon(s.type)} ${this.getTypeName(s.type)}</td>
      <td>
        ${s.notes?`<div class="d-flex align-items-center">
            <i class="fas fa-sticky-note text-muted me-1"></i>
            <small class="text-muted" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(s.notes)}">
              ${this.escapeHtml(s.notes)}
            </small>
          </div>`:'<small class="text-muted"><em>No notes</em></small>'}
      </td>
      <td>
        <small class="text-muted">
          <i class="fas fa-clock me-1"></i>
          ${this.formatTime(s.time)}
        </small>
      </td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" onclick="signalManager.viewSignal('${s.id}')" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="signalManager.deleteSignal('${s.id}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;return t}calculateRiskReward(s){const r=Math.abs(s.price-s.stop);const w=Math.abs(s.target-s.price);return(w/r).toFixed(2)}getStatusBadge(s){const h=(Date.now()-new Date(s.time).getTime())/(1e3*60*60);if(h<1){return'<span class="badge bg-success">New</span>'}else if(h<24){return'<span class="badge bg-warning">Active</span>'}else{return'<span class="badge bg-secondary">Expired</span>'}}saveSignal(s){const a=this.getAllSignals();a.push(s);localStorage.setItem('signals',JSON.stringify(a))}deleteSignal(id){if(confirm('Are you sure you want to delete this signal?')){const a=this.getAllSignals().filter(s=>s.id!==id);localStorage.setItem('signals',JSON.stringify(a));const r=document.querySelector(`tr[data-id="${id}"]`);if(r){r.remove()}this.updateCount();this.checkEmptyState();this.showNotification('Signal deleted successfully','info')}}viewSignal(id){const s=this.getAllSignals().find(x=>x.id===id);if(s){const m=this.createSignalModal(s);document.body.appendChild(m);const bs=new bootstrap.Modal(m);bs.show();m.addEventListener('hidden.bs.modal',function(){this.remove()})}}createSignalModal(s){const rr=this.calculateRiskReward(s);const m=document.createElement('div');m.className='modal fade';m.innerHTML=`
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Signal Details - ${s.stock}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Trade Parameters</h6>
                <table class="table table-sm">
                  <tr><td><strong>Entry Price:</strong></td><td>$${s.price.toFixed(2)}</td></tr>
                  <tr><td><strong>Target Price:</strong></td><td>$${s.target.toFixed(2)}</td></tr>
                  <tr><td><strong>Stop Loss:</strong></td><td>$${s.stop.toFixed(2)}</td></tr>
                  <tr><td><strong>Type:</strong></td><td>${this.getTypeIcon(s.type)} ${this.getTypeName(s.type)}</td></tr>
                  <tr><td><strong>Risk/Reward:</strong></td><td>1:${rr}</td></tr>
                </table>
              </div>
              <div class="col-md-6">
                <h6>Trade Analysis</h6>
                <table class="table table-sm">
                  <tr><td><strong>Potential Profit:</strong></td><td class="text-success">$${(s.target-s.price).toFixed(2)}</td></tr>
                  <tr><td><strong>Potential Loss:</strong></td><td class="text-danger">$${(s.price-s.stop).toFixed(2)}</td></tr>
                  <tr><td><strong>Created:</strong></td><td>${new Date(s.time).toLocaleString()}</td></tr>
                </table>
              </div>
            </div>
            ${s.notes?`
              <div class="mt-3">
                <h6>Notes</h6>
                <div class="alert alert-info">${this.escapeHtml(s.notes)}</div>
              </div>
            `:''}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-danger" onclick="signalManager.deleteSignal('${s.id}')" data-bs-dismiss="modal">
              <i class="fas fa-trash me-1"></i>Delete Signal
            </button>
          </div>
        </div>
      </div>
    `;return m}exportSignals(){const s=this.getAllSignals();if(s.length===0){this.showNotification('No signals to export','warning');return}const csv=this.convertToCSV(s);const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`signals_${new Date().toISOString().split('T')[0]}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);this.showNotification('Signals exported successfully!','success')}convertToCSV(s){const headers=['Stock','Entry Price','Target','Stop Loss','Type','Notes','Created'];const rows=s.map(x=>[x.stock,x.price.toFixed(2),x.target.toFixed(2),x.stop.toFixed(2),this.getTypeName(x.type),`"${x.notes.replace(/"/g,'""')}"`,new Date(x.time).toLocaleString()]);return[headers,...rows].map(r=>r.join(',')).join('\n')}clearAllSignals(){if(confirm('Are you sure you want to clear all signals? This action cannot be undone.')){localStorage.removeItem('signals');this.bodyEl.innerHTML='';this.updateCount();this.checkEmptyState();this.showNotification('All signals cleared','info')}}loadSignals(){const s=this.getAllSignals();s.forEach(x=>this.addSignal(x))}getAllSignals(){return JSON.parse(localStorage.getItem('signals')||'[]')}updateCount(){if(this.totalEl){this.totalEl.textContent=this.getAllSignals().length}}checkEmptyState(){if(this.emptyState){const has=this.getAllSignals().length>0;this.emptyState.style.display=has?'none':'block'}}formatTime(t){const d=new Date(t);const n=new Date();const diffMs=n-d;const diffMins=Math.floor(diffMs/6e4);const diffHours=Math.floor(diffMs/36e5);const diffDays=Math.floor(diffMs/864e5);if(diffMins<1)return'Just now';if(diffMins<60)return`${diffMins}m ago`;if(diffHours<24)return`${diffHours}h ago`;if(diffDays<7)return`${diffDays}d ago`;return d.toLocaleDateString()}showNotification(m,type='info'){const cls={success:'alert-success',error:'alert-danger',warning:'alert-warning',info:'alert-info'}[type]||'alert-info';const n=document.createElement('div');n.className=`alert ${cls} alert-dismissible fade show position-fixed top-0 end-0 m-3`;n.style.zIndex='9999';n.innerHTML=`
      ${m}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;document.body.appendChild(n);setTimeout(()=>{if(n.parentNode){n.remove()}},3000)}escapeHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}getTypeIcon(t){const icons={stocks:'<i class="fas fa-chart-bar text-primary"></i>',fno:'<i class="fas fa-contract text-warning"></i>',index:'<i class="fas fa-chart-area text-info"></i>',commodity:'<i class="fas fa-coins text-success"></i>'};return icons[t]||'<i class="fas fa-chart-line text-secondary"></i>'}getTypeName(t){const names={stocks:'Stocks',fno:'F&O',index:'Index',commodity:'Commodity'};return names[t]||'Unknown'}
}
const signalManager=new SignalManager();

// New simplified Product logic using API
function initProductScripts() {
    console.log('Product scripts initializing...');
    console.log('DOM ready state:', document.readyState);
    console.log('Current URL:', window.location.href);
    console.log('Bootstrap available:', typeof bootstrap !== 'undefined');
    
    // Method 1: Direct event listener attachment
    setTimeout(() => {
        const editButtons = document.querySelectorAll('.edit-product-btn');
        console.log('Found edit buttons:', editButtons.length);
        
        if (editButtons.length === 0) {
            console.warn('No edit buttons found! This might be the issue.');
        }
        
        editButtons.forEach((btn, index) => {
            console.log(`Attaching listener to button ${index}:`, btn.dataset.productName);
            console.log('Button element:', btn);
            console.log('Button dataset:', btn.dataset);
            
            // Remove any existing listeners first
            btn.removeEventListener('click', handleEditClick);
            
            // Add new listener
            btn.addEventListener('click', handleEditClick);
        });
        
        console.log('Direct event listeners attached successfully');
    }, 2000); // Increased timeout to ensure DOM is fully loaded
    
    // Method 2: Event delegation as backup
    document.addEventListener('click', function(e) {
        console.log('Click event fired on:', e.target);
        console.log('Event path:', e.composedPath());
        console.log('Closest edit button:', e.target.closest('.edit-product-btn'));
        
        if (e.target.closest('.edit-product-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const btn = e.target.closest('.edit-product-btn');
            const productName = btn.dataset.productName;
            console.log('Edit button clicked (delegated):', productName);
            alert('Edit button clicked (delegated): ' + productName);
            editProduct(productName);
        }
    });
    
    console.log('Event delegation listener attached');
}

// Separate click handler function for better debugging
function handleEditClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const productName = this.dataset.productName;
    console.log('Edit button clicked (direct):', productName);
    alert('Edit button clicked (direct): ' + productName);
    editProduct(productName);
}

// Initialize scripts when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initProductScripts();
        initProductForm();
    });
} else {
    // DOM is already loaded
    initProductScripts();
    initProductForm();
}

function initProductForm() {
    // Form Submission
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('productName').value.trim(),
                category: document.getElementById('productCategory').value,
                description: document.getElementById('productDescription').value.trim(),
                keyFeatures: document.getElementById('keyFeatures').value.trim().split('\n').filter(f => f.trim()),
                targetAudience: document.getElementById('targetAudience').value.trim(),
                pricing: {
                    trial: 0,
                    monthly: 0,
                    quarterly: 0,
                    yearly: 0
                },
                status: document.getElementById('productStatus').value,
                sortOrder: parseInt(document.getElementById('sortOrder').value) || 0,
                plans: createProductPlans // Include plans in the product creation
            };

            try {
                const isEdit = productForm.dataset.mode === 'edit';
                const url = isEdit ? `/api/products/${formData.name}` : '/api/products';
                const method = isEdit ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    alert(isEdit ? 'Product updated successfully' : 'Product created successfully');
                    window.location.reload();
                } else {
                    alert(data.error || 'Operation failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Network error');
            }
        });
    }

    // Card Click Handlers (Toggle Details)
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('button')) return;
            const details = this.querySelector('.product-details');
            const isVisible = details.style.display !== 'none';
            document.querySelectorAll('.product-details').forEach(d => { d.style.display = 'none' });
            details.style.display = isVisible ? 'none' : 'block';
        });
    });
} // This closes the DOMContentLoaded event listener

console.log('Product scripts loaded successfully');

// Edit Product
async function editProduct(name) {
    alert('editProduct called with name: ' + name);
    console.log('editProduct called with name:', name);
    try {
        const res = await fetch(`/api/products/${name}`);
        console.log('API response status:', res.status);
        const data = await res.json();
        console.log('API response data:', data);
        
        if (res.ok && data.success) {
            const p = data.data;
            console.log('Product data received:', p);
            
            switchToCreateTab();
            
            // Wait a bit for tab switch to complete
            setTimeout(() => {
                const form = document.getElementById('productForm');
                if (!form) {
                    console.error('Product form not found!');
                    alert('Error: Product form not found');
                    return;
                }
                
                form.dataset.mode = 'edit';
                
                // Update the header text with proper null checking
                const headerElement = document.querySelector('#create-product .border-bottom h4');
                if (headerElement) {
                    headerElement.textContent = 'Edit Product';
                } else {
                    console.warn('Header element not found for editing');
                }
                
                // Update the submit button text with proper null checking
                const submitButton = document.querySelector('#create-product button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Update Product';
                } else {
                    console.warn('Submit button not found for editing');
                }

                // Populate form fields
                const productName = document.getElementById('productName');
                const productCategory = document.getElementById('productCategory');
                const productDescription = document.getElementById('productDescription');
                const keyFeatures = document.getElementById('keyFeatures');
                const targetAudience = document.getElementById('targetAudience');
                const productStatus = document.getElementById('productStatus');
                const sortOrder = document.getElementById('sortOrder');
                
                console.log('Form elements found:', {
                    productName: !!productName,
                    productCategory: !!productCategory,
                    productDescription: !!productDescription,
                    keyFeatures: !!keyFeatures,
                    targetAudience: !!targetAudience,
                    productStatus: !!productStatus,
                    sortOrder: !!sortOrder
                });

                if (productName) {
                    productName.value = p.name;
                    productName.readOnly = true;
                }
                if (productCategory) productCategory.value = p.category || '';
                if (productDescription) productDescription.value = p.description || '';
                if (keyFeatures && p.keyFeatures) keyFeatures.value = p.keyFeatures.join('\n');
                if (targetAudience) targetAudience.value = p.targetAudience || '';
                if (productStatus) productStatus.value = p.status || 'active';
                if (sortOrder) sortOrder.value = p.sortOrder || 0;
                
                console.log('Form populated successfully');
                
                // Populate plans for editing (but make them read-only since we can't edit plans here)
                if (p.plans && p.plans.length > 0) {
                    createProductPlans = p.plans.map(plan => ({
                        planName: plan.name,
                        planDescription: plan.description,
                        numberOfDays: plan.days,
                        cost: plan.cost,
                        isActive: plan.isActive,
                        currency: 'INR'
                    }));
                    renderCreateProductPlans();
                    
                    // Add info message about plan editing with null checks
                    const plansContainer = document.querySelector('#createProductPlans');
                    const addPlanButton = document.querySelector('button[onclick="addPlanToCreateForm()"]');
                    
                    if (plansContainer) {
                        plansContainer.insertAdjacentHTML('afterbegin', 
                            '<div class="alert alert-info mb-2"><small><i class="fas fa-info-circle me-1"></i>Plans cannot be edited here. Use the "Add Plan" button on the product card to add new plans.</small></div>');
                    }
                    
                    if (addPlanButton) {
                        addPlanButton.disabled = true;
                    } else {
                        console.warn('Add plan button not found');
                    }
                }
            }, 100); // End of setTimeout
        } else {
            alert('Product not found');
        }
    } catch (error) {
        console.error('Error in editProduct:', error);
        alert('Error fetching product details: ' + error.message);
    }
}

// Delete Product
async function deleteProduct(name) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
        const res = await fetch(`/api/products/${name}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            alert('Product deleted successfully');
            window.location.reload();
        } else {
            alert(data.error || 'Delete failed');
        }
    } catch (error) {
        alert('Error deleting product');
    }
}

// Tab Switcher
function switchToCreateTab() {
    console.log('switchToCreateTab called');
    const createTab = document.getElementById('create-product-tab');
    const createPane = document.getElementById('create-product');
    const viewTab = document.getElementById('view-products-tab');
    const viewPane = document.getElementById('view-products');

    console.log('Tab elements:', {
        createTab: !!createTab,
        createPane: !!createPane,
        viewTab: !!viewTab,
        viewPane: !!viewPane
    });

    if (createTab && createPane) {
        // Use Bootstrap's tab API instead of manual class manipulation
        const tabTrigger = new bootstrap.Tab(createTab);
        tabTrigger.show();
        console.log('Tab switched successfully using Bootstrap API');
        
        // Ensure the pane is visible
        setTimeout(() => {
            const first = document.querySelector('#create-product input[type="text"]');
            if (first) first.focus();
            console.log('Focus set to first input');
        }, 200); // Increased timeout for better reliability
    } else {
        console.error('Could not find required tab elements');
    }
    
    // Reset form mode if switching via button (not edit)
    const form = document.getElementById('productForm');
    if (form && !form.dataset.mode) {
         form.reset();
         const productNameInput = document.getElementById('productName');
         const headerElement = document.querySelector('#create-product .border-bottom h4');
         const submitButton = document.querySelector('#create-product button[type="submit"]');
         
         if (productNameInput) {
             productNameInput.readOnly = false;
         }
         if (headerElement) {
             headerElement.textContent = 'Create New Product';
         }
         if (submitButton) {
             submitButton.textContent = 'Create Product';
         }
    }
}

// Plan Management
function addPlan(productName) {
    const planProductName = document.getElementById('planProductName');
    const planProduct = document.getElementById('planProduct');
    const addPlanForm = document.getElementById('addPlanForm');
    const addPlanModal = document.getElementById('addPlanModal');
    
    if (planProductName) {
        planProductName.textContent = productName;
    }
    if (planProduct) {
        planProduct.value = productName;
    }
    if (addPlanForm) {
        addPlanForm.reset();
    }
    
    if (addPlanModal) {
        const modal = new bootstrap.Modal(addPlanModal);
        modal.show();
    } else {
        console.error('Add plan modal not found');
    }
}

// Create Product Plans Management
let createProductPlans = [];

function addPlanToCreateForm() {
    const modal = new bootstrap.Modal(document.getElementById('addCreatePlanModal'));
    document.getElementById('addCreatePlanForm').reset();
    modal.show();
}

function renderCreateProductPlans() {
    const container = document.getElementById('createProductPlans');
    if (createProductPlans.length === 0) {
        container.innerHTML = '<div class="text-center py-4"><i class="fas fa-layer-group text-muted mb-2" style="font-size: 2rem;"></i><p class="text-muted mb-0">No plans added yet. Click "Add Plan" to create plans for this product.</p></div>';
    } else {
        container.innerHTML = `
            <div class="table-responsive border rounded">
                <table class="table table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th class="border-0 fw-semibold text-dark">Plan Name</th>
                            <th class="border-0 fw-semibold text-dark">Duration</th>
                            <th class="border-0 fw-semibold text-dark">Cost</th>
                            <th class="border-0 fw-semibold text-dark">Status</th>
                            <th class="border-0 fw-semibold text-dark text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${createProductPlans.map((plan, index) => `
                            <tr class="align-middle">
                                <td>
                                    <div class="d-flex align-items-center">
                                        <i class="fas fa-layer-group text-primary me-2"></i>
                                        <strong class="text-dark">${plan.planName}</strong>
                                    </div>
                                </td>
                                <td><span class="badge bg-light text-dark border">${plan.numberOfDays} days</span></td>
                                <td><span class="fw-semibold text-success">₹${plan.cost}</span></td>
                                <td><span class="badge bg-${plan.isActive ? 'success' : 'secondary'} px-2 py-1">${plan.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td class="text-end">
                                    <button type="button" class="btn btn-outline-danger btn-sm rounded-pill px-2" onclick="removeCreatePlan(${index})" title="Remove Plan">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

function removeCreatePlan(index) {
    createProductPlans.splice(index, 1);
    renderCreateProductPlans();
}

function clearCreateProductPlans() {
    createProductPlans = [];
    renderCreateProductPlans();
}

document.addEventListener('DOMContentLoaded', function() {
    const planForm = document.getElementById('addPlanForm');
    if (planForm) {
        planForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                productName: document.getElementById('planProduct').value,
                planName: document.getElementById('planName').value.trim(),
                planDescription: document.getElementById('planDescription').value.trim(),
                numberOfDays: parseInt(document.getElementById('planDays').value),
                cost: parseFloat(document.getElementById('planCost').value),
                isActive: document.getElementById('planActive').checked,
                currency: 'INR' // Default
            };

            try {
                const res = await fetch('/api/plans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await res.json();
                if (res.ok && data.success) {
                    alert('Plan added successfully');
                    window.location.reload();
                } else {
                    alert(data.error || 'Failed to add plan');
                }
            } catch (error) {
                console.error('Error adding plan:', error);
                alert('Network error');
            }
        });
    }

    // Create Product Plan Form Handler
    const createPlanForm = document.getElementById('addCreatePlanForm');
    if (createPlanForm) {
        createPlanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const planData = {
                planName: document.getElementById('createPlanName').value.trim(),
                planDescription: document.getElementById('createPlanDescription').value.trim(),
                numberOfDays: parseInt(document.getElementById('createPlanDays').value),
                cost: parseFloat(document.getElementById('createPlanCost').value),
                isActive: document.getElementById('createPlanActive').checked,
                currency: 'INR'
            };

            // Validate plan data
            if (!planData.planName || planData.numberOfDays <= 0 || planData.cost < 0) {
                alert('Please fill in all required fields correctly');
                return;
            }

            // Add to create product plans array
            createProductPlans.push(planData);
            renderCreateProductPlans();
            
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addCreatePlanModal'));
            modal.hide();
            createPlanForm.reset();
        });
    }

    // Reset form when manually clicking Create tab
    document.getElementById('create-product-tab')?.addEventListener('click', () => {
        const form = document.getElementById('productForm');
        if (form) {
            delete form.dataset.mode;
            form.reset();
            document.getElementById('productName').readOnly = false;
            document.querySelector('#create-product .card-header h5').textContent = 'Create New Product';
            document.querySelector('#create-product button[type="submit"]').textContent = 'Create Product';
            // Clear plans when switching to create tab
            clearCreateProductPlans();
            // Re-enable add plan button and remove info message
            const addPlanBtn = document.querySelector('button[onclick="addPlanToCreateForm()"]');
            if (addPlanBtn) addPlanBtn.disabled = false;
            const infoMsg = document.querySelector('#createProductPlans .alert-info');
            if (infoMsg) infoMsg.remove();
        }
    });
});
