/* copied from admin/script.js with route adjustments */
class SignalManager{constructor(){this.form=document.getElementById('signalForm');this.bodyEl=document.getElementById('signalsBody');this.totalEl=document.getElementById('total');this.emptyState=document.getElementById('emptyState');this.exportBtn=document.getElementById('exportBtn');this.clearBtn=document.getElementById('clearBtn');if(this.form&&this.bodyEl){this.init()}}init(){this.loadSignals();this.bindEvents();this.updateCount();this.checkEmptyState()}bindEvents(){if(this.form){this.form.addEventListener('submit',e=>this.handleSubmit(e))}if(this.exportBtn){this.exportBtn.addEventListener('click',()=>this.exportSignals())}if(this.clearBtn){this.clearBtn.addEventListener('click',()=>this.clearAllSignals())}}handleSubmit(e){e.preventDefault();const s=this.readForm();if(!this.validateSignal(s))return;this.addSignal(s);this.saveSignal(s);this.updateCount();this.checkEmptyState();this.form.reset();this.showNotification('Signal created successfully!','success')}readForm(){return{stock:document.getElementById('stock').value.trim().toUpperCase(),price:parseFloat(document.getElementById('price').value),target:parseFloat(document.getElementById('target').value),stop:parseFloat(document.getElementById('stop').value),type:document.getElementById('type').value,notes:document.getElementById('notes').value.trim(),time:new Date().toISOString(),id:Date.now().toString()}}validateSignal(s){if(!s.stock){this.showNotification('Please enter a stock symbol','error');return false}if(!/^[A-Z]{1,5}$/.test(s.stock)){this.showNotification('Please enter a valid stock symbol (1-5 letters)','error');return false}if(!s.type){this.showNotification('Please select a signal type','error');return false}if(![s.price,s.target,s.stop].every(Number.isFinite)){this.showNotification('Please enter valid numbers for price, target, and stop loss','error');return false}if(s.target<=s.price){this.showNotification('Target price must be higher than entry price','error');return false}if(s.stop>=s.price){this.showNotification('Stop loss must be lower than entry price','error');return false}return true}addSignal(s){const r=this.createSignalRow(s);this.bodyEl.prepend(r);r.classList.add('fade-in')}createSignalRow(s){const t=document.createElement('tr');const b=this.getStatusBadge(s);t.innerHTML=`
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
    `;return m}exportSignals(){const s=this.getAllSignals();if(s.length===0){this.showNotification('No signals to export','warning');return}const csv=this.convertToCSV(s);const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`signals_${new Date().toISOString().split('T')[0]}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);this.showNotification('Signals exported successfully!','success')}convertToCSV(s){const headers=['Stock','Entry Price','Target','Stop Loss','Type','Notes','Created'];const rows=s.map(x=>[x.stock,x.price.toFixed(2),x.target.toFixed(2),x.stop.toFixed(2),this.getTypeName(x.type),`"${x.notes.replace(/"/g,'""')}"`,new Date(x.time).toLocaleString()]);return[headers,...rows].map(r=>r.join(',')).join('\n')}clearAllSignals(){if(confirm('Are you sure you want to clear all signals? This action cannot be undone.')){localStorage.removeItem('signals');this.bodyEl.innerHTML='';this.updateCount();this.checkEmptyState();this.showNotification('All signals cleared','info')}}loadSignals(){const s=this.getAllSignals();s.forEach(x=>this.addSignal(x))}getAllSignals(){return JSON.parse(localStorage.getItem('signals')||'[]')}updateCount(){if(this.totalEl){this.totalEl.textContent=this.getAllSignals().length}}checkEmptyState(){if(this.emptyState){const has=this.getAllSignals().length>0;this.emptyState.style.display=has?'none':'block'}}formatTime(t){const d=new Date(t);const n=new Date();const diffMs=n-d;const diffMins=Math.floor(diffMs/6e4);const diffHours=Math.floor(diffMs/36e5);const diffDays=Math.floor(diffMs/864e5);if(diffMins<1)return'Just now';if(diffMins<60)return`${diffMins}m ago`;if(diffHours<24)return`${diffHours}h ago`;if(diffDays<7)return`${diffDays}d ago`;return d.toLocaleDateString()}showNotification(m,type='info'){const cls={success:'alert-success',error:'alert-danger',warning:'alert-warning',info:'alert-info'}[type]||'alert-info';const n=document.createElement('div');n.className=`alert ${cls} alert-dismissible fade show position-fixed`;n.style.cssText='top: 20px; right: 20px; z-index: 1050; min-width: 300px;';n.innerHTML=`
      ${m}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;document.body.appendChild(n);setTimeout(()=>{if(n.parentNode){n.remove()}},3000)}escapeHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}getTypeIcon(t){const icons={stocks:'<i class="fas fa-chart-bar text-primary"></i>',fno:'<i class="fas fa-contract text-warning"></i>',index:'<i class="fas fa-chart-area text-info"></i>',commodity:'<i class="fas fa-coins text-success"></i>'};return icons[t]||'<i class="fas fa-chart-line text-secondary"></i>'}getTypeName(t){const names={stocks:'Stocks',fno:'F&O',index:'Index',commodity:'Commodity'};return names[t]||'Unknown'}
}
const signalManager=new SignalManager();
class ProductManager{constructor(){this.form=document.getElementById('productForm');this.products=this.loadProducts();this.init()}init(){if(this.form){this.bindEvents()}}bindEvents(){this.form.addEventListener('submit',e=>this.handleSubmit(e))}handleSubmit(e){e.preventDefault();const p=this.readForm();if(!this.validateProduct(p))return;this.addProduct(p);this.saveProduct();this.form.reset();this.showNotification('Product created successfully!','success');if(typeof updateProductList==='function'){updateProductList()}}readForm(){return{name:document.getElementById('productName').value.trim(),category:document.getElementById('productCategory').value,description:document.getElementById('productDescription').value.trim(),keyFeatures:document.getElementById('keyFeatures').value.trim().split('\n').filter(f=>f.trim()),targetAudience:document.getElementById('targetAudience').value.trim(),pricing:{trial:parseFloat(document.getElementById('trialPrice').value)||0,monthly:parseFloat(document.getElementById('monthlyPrice').value)||0,quarterly:parseFloat(document.getElementById('quarterlyPrice').value)||0,yearly:parseFloat(document.getElementById('yearlyPrice').value)||0},status:document.getElementById('productStatus').value,sortOrder:parseInt(document.getElementById('sortOrder').value)||0,createdAt:new Date().toISOString()}}validateProduct(p){if(!p.name){this.showNotification('Product name is required!','error');return false}if(p.pricing.monthly<=0){this.showNotification('Monthly price must be greater than 0!','error');return false}if(p.pricing.quarterly<=0){this.showNotification('Quarterly price must be greater than 0!','error');return false}if(p.pricing.yearly<=0){this.showNotification('Yearly price must be greater than 0!','error');return false}return true}addProduct(p){this.products.push(p)}saveProduct(){localStorage.setItem('products',JSON.stringify(this.products))}loadProducts(){const saved=localStorage.getItem('products');return saved?JSON.parse(saved):[]}showNotification(m,type){const n=document.createElement('div');n.className=`alert alert-${type==='success'?'success':'danger'} alert-dismissible fade show position-fixed`;n.style.cssText='top: 20px; right: 20px; z-index: 9999; min-width: 300px;';n.innerHTML=`
      ${m}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;document.body.appendChild(n);setTimeout(()=>{if(n.parentNode){n.parentNode.removeChild(n)}},3000)}}const productManager=document.getElementById('productForm')?new ProductManager():null;function updateProductList(){const list=document.getElementById('productList');if(!list)return;const products=JSON.parse(localStorage.getItem('products')||'[]');if(products.length===0){list.innerHTML=`
      <div class="text-center text-muted py-4">
        <i class="fas fa-box fa-3x mb-3"></i>
        <p>No products created yet. <a href="#" onclick="switchToCreateTab(); return false;" class="text-primary">Click here</a> to add your first product.</p>
      </div>
    `;return}list.innerHTML=products.map(p=>`
    <div class="card mb-3 shadow-sm product-card" data-product-name="${p.name}" style="cursor: pointer;">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-8">
            <div class="d-flex align-items-center mb-2">
              <h5 class="card-title mb-0 me-3">${p.name}</h5>
              ${p.category?`<span class="badge bg-secondary">${p.category.replace('-', ' ')}</span>`:''}
              <span class="badge bg-${p.status==='active'?'success':p.status==='draft'?'warning':'secondary'} ms-2">${p.status}</span>
            </div>
            <p class="card-text text-muted mb-2">${p.description||'No description provided'}</p>
            ${p.targetAudience?`<small class="text-muted"><i class="fas fa-users me-1"></i> ${p.targetAudience}</small>`:''}
            ${p.keyFeatures.length>0?`
              <div class="mt-2">
                <small class="text-muted">
                  <i class="fas fa-check-circle me-1"></i>${p.keyFeatures.length} key features
                </small>
              </div>
            `:''}
          </div>
          <div class="col-md-4">
            <div class="d-flex flex-column gap-2">
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">Trial:</small>
                <span class="badge bg-light text-dark">$${p.pricing.trial.toFixed(2)}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">Monthly:</small>
                <span class="badge bg-primary">$${p.pricing.monthly.toFixed(2)}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">Quarterly:</small>
                <span class="badge bg-success">$${p.pricing.quarterly.toFixed(2)}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">Yearly:</small>
                <span class="badge bg-warning">$${p.pricing.yearly.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="product-details mt-3" style="display: none; border-top: 1px solid #e9ecef; padding-top: 1rem;">
          ${p.keyFeatures.length>0?`
            <div class="mb-3">
              <h6 class="text-muted mb-2"><i class="fas fa-star me-1"></i>Key Features</h6>
              <ul class="list-unstyled">
                ${p.keyFeatures.map(f=>`<li><i class="fas fa-check text-success me-2"></i>${f}</li>`).join('')}
              </ul>
            </div>
          `:''}
          <div class="row">
            <div class="col-md-6">
              <h6 class="text-muted mb-2"><i class="fas fa-chart-line me-1"></i>Pricing Details</h6>
              <div class="table-responsive">
                <table class="table table-sm">
                  <tbody>
                    <tr><td><strong>Trial</strong></td><td>$${p.pricing.trial.toFixed(2)}</td></tr>
                    <tr><td><strong>Monthly</strong></td><td>$${p.pricing.monthly.toFixed(2)}</td></tr>
                    <tr><td><strong>Quarterly</strong></td><td>$${p.pricing.quarterly.toFixed(2)}</td></tr>
                    <tr><td><strong>Yearly</strong></td><td>$${p.pricing.yearly.toFixed(2)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="col-md-6">
              <h6 class="text-muted mb-2"><i class="fas fa-info-circle me-1"></i>Product Info</h6>
              <p><strong>Status:</strong> <span class="badge bg-${p.status==='active'?'success':p.status==='draft'?'warning':'secondary'}">${p.status}</span></p>
              <p><strong>Category:</strong> ${p.category?p.category.replace('-', ' '):'N/A'}</p>
              ${p.targetAudience?`<p><strong>Target Audience:</strong> ${p.targetAudience}</p>`:''}
              <p><strong>Created:</strong> ${new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="card-footer bg-light">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted"><i class="fas fa-calendar me-1"></i> Created: ${new Date(p.createdAt).toLocaleDateString()}</small>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="event.stopPropagation(); editProduct('${p.name}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-outline-danger" onclick="event.stopPropagation(); deleteProduct('${p.name}')"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');document.querySelectorAll('.product-card').forEach(card=>{card.addEventListener('click',function(e){if(e.target.closest('button'))return;const details=this.querySelector('.product-details');const isVisible=details.style.display!=='none';document.querySelectorAll('.product-details').forEach(d=>{d.style.display='none'});details.style.display=isVisible?'none':'block'})})}if(document.getElementById('productList')){updateProductList()}if(document.getElementById('signalProductsList')){loadSignalProducts()}function loadSignalProducts(){const list=document.getElementById('signalProductsList');if(!list)return;const products=JSON.parse(localStorage.getItem('products')||'[]');const signals=products.filter(p=>p.category==='trading-signals'&&p.status==='active');if(signals.length===0){list.innerHTML=`
      <div class="text-center text-muted py-5">
        <i class="fas fa-signal fa-3x mb-3"></i>
        <h5>No Trading Signal Products Available</h5>
        <p>Please create trading signal products in the Products section first.</p>
        <a href="/admin/products" class="btn btn-primary mt-2">
          <i class="fas fa-plus me-2"></i>Create Signal Products
        </a>
      </div>
    `;return}list.innerHTML=`
    <div class="row">
      ${signals.map(p=>`
        <div class="col-lg-6 col-xl-4 mb-4">
          <div class="card h-100 shadow-sm signal-product-card" data-product-name="${p.name}" style="cursor: pointer;">
            <div class="card-header bg-light">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0 fw-bold text-dark">${p.name}</h5>
                <span class="badge bg-success">Active</span>
              </div>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">${p.description||'No description available'}</p>
              <div class="row mb-3">
                <div class="col-6"><small class="text-muted d-block">Clients</small><span class="fw-bold text-primary">${Math.floor(Math.random()*50)+10}</span></div>
                <div class="col-6 text-end"><small class="text-muted d-block">Target Audience</small><small class="text-dark">${p.targetAudience||'General'}</small></div>
              </div>
              <div class="pricing-grid mb-3">
                <div class="row g-2">
                  <div class="col-6"><div class="text-center p-2 bg-light rounded"><small class="text-muted d-block">Trial</small><span class="fw-bold text-success">$${p.pricing.trial.toFixed(2)}</span></div></div>
                  <div class="col-6"><div class="text-center p-2 bg-light rounded"><small class="text-muted d-block">Monthly</small><span class="fw-bold text-primary">$${p.pricing.monthly.toFixed(2)}</span></div></div>
                  <div class="col-6"><div class="text-center p-2 bg-light rounded"><small class="text-muted d-block">Quarterly</small><span class="fw-bold text-info">$${p.pricing.quarterly.toFixed(2)}</span></div></div>
                  <div class="col-6"><div class="text-center p-2 bg-light rounded"><small class="text-muted d-block">Yearly</small><span class="fw-bold text-warning">$${p.pricing.yearly.toFixed(2)}</span></div></div>
                </div>
              </div>
              ${p.keyFeatures.length>0?`
                <div class="mb-3">
                  <small class="text-muted d-block mb-2">Key Features:</small>
                  <div class="d-flex flex-wrap gap-1">
                    ${p.keyFeatures.slice(0,3).map(f=>`<span class="badge bg-light text-dark small">${f.replace(/^•\s*/,'').substring(0,20)}${f.length>20?'...':''}</span>`).join('')}
                    ${p.keyFeatures.length>3?`<span class="badge bg-light text-dark small">+${p.keyFeatures.length-3} more</span>`:''}
                  </div>
                </div>
              `:''}
            </div>
            <div class="card-footer bg-transparent border-top-0">
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted"><i class="fas fa-calendar me-1"></i>Created ${new Date(p.createdAt).toLocaleDateString()}</small>
                <button class="btn btn-outline-primary btn-sm" onclick="viewSignalProductDetails('${p.name}')"><i class="fas fa-eye me-1"></i>Details</button>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;document.querySelectorAll('.signal-product-card').forEach(card=>{card.addEventListener('click',function(e){if(e.target.closest('button'))return;const name=this.dataset.productName;viewSignalProductDetails(name)})})}function viewSignalProductDetails(name){const products=JSON.parse(localStorage.getItem('products')||'[]');const p=products.find(x=>x.name===name);if(!p){showNotification('Product not found!','error');return}const modalHtml=`
    <div class="modal fade" id="signalProductModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title"><i class="fas fa-signal me-2"></i>${p.name} - Signal Details</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-8">
                <h6 class="text-muted mb-3">Product Description</h6>
                <p>${p.description||'No description available'}</p>
                ${p.targetAudience?`<h6 class="text-muted mb-2">Target Audience</h6><p>${p.targetAudience}</p>`:''}
                ${p.keyFeatures.length>0?`<h6 class="text-muted mb-3">Key Features</h6><ul class="list-unstyled">${p.keyFeatures.map(f=>`<li class="mb-2"><i class="fas fa-check text-success me-2"></i>${f.replace(/^•\s*/,'')}</li>`).join('')}</ul>`:''}
              </div>
              <div class="col-md-4">
                <div class="card bg-light"><div class="card-body"><h6 class="text-muted mb-3">Pricing Plans</h6><div class="d-flex justify-content-between align-items-center mb-2"><span>Trial:</span><span class="badge bg-success">$${p.pricing.trial.toFixed(2)}</span></div><div class="d-flex justify-content-between align-items-center mb-2"><span>Monthly:</span><span class="badge bg-primary">$${p.pricing.monthly.toFixed(2)}</span></div><div class="d-flex justify-content-between align-items-center mb-2"><span>Quarterly:</span><span class="badge bg-info">$${p.pricing.quarterly.toFixed(2)}</span></div><div class="d-flex justify-content-between align-items-center"><span>Yearly:</span><span class="badge bg-warning">$${p.pricing.yearly.toFixed(2)}</span></div></div></div><div class="mt-3"><small class="text-muted"><i class="fas fa-calendar me-1"></i>Created: ${new Date(p.createdAt).toLocaleDateString()}</small></div><div class="mt-2"><span class="badge bg-${p.status==='active'?'success':'secondary'}"><i class="fas fa-circle me-1"></i>${p.status}</span></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><i class="fas fa-times me-2"></i>Close</button>
            <button type="button" class="btn btn-primary" onclick="editProductFromSignals('${p.name}')"><i class="fas fa-edit me-2"></i>Edit Product</button>
          </div>
        </div>
      </div>
    </div>
  `;const existing=document.getElementById('signalProductModal');if(existing){existing.remove()}document.body.insertAdjacentHTML('beforeend',modalHtml);const modal=new bootstrap.Modal(document.getElementById('signalProductModal'));modal.show();document.getElementById('signalProductModal').addEventListener('hidden.bs.modal',function(){this.remove()})}function editProductFromSignals(name){const modal=bootstrap.Modal.getInstance(document.getElementById('signalProductModal'));if(modal){modal.hide()}window.location.href=`/admin/products?edit=${encodeURIComponent(name)}#create-product`}function switchToCreateTab(){const createTab=document.getElementById('create-product-tab');const createPane=document.getElementById('create-product');const viewTab=document.getElementById('view-products-tab');const viewPane=document.getElementById('view-products');if(createTab&&createPane){if(viewTab)viewTab.classList.remove('active');if(viewPane)viewPane.classList.remove('show','active');createTab.classList.add('active');createPane.classList.add('show','active');setTimeout(()=>{const first=document.querySelector('#create-product input[type="text"]');if(first){first.focus()}},300)}}document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();const stock=document.getElementById('stock');if(stock)stock.focus()}if(e.key==='Escape'){const form=document.getElementById('signalForm');if(form)form.reset()}});function addDefaultProducts(){const defaults=[{"name":"Stocks","category":"trading-signals","description":"Professional stock trading signals with real-time market analysis and expert recommendations for profitable trading opportunities.","keyFeatures":["• Real-time stock signals","• Technical analysis reports","• Entry and exit points","• Risk management strategies","• 24/7 market monitoring"],"targetAudience":"Active traders and investors looking for professional stock market guidance","pricing":{"trial":0,"monthly":3000,"quarterly":6000,"yearly":30000},"status":"active","sortOrder":1,"createdAt":""},{"name":"Options","category":"trading-signals","description":"Advanced options trading strategies with detailed analysis of market volatility and optimal strike price selection.","keyFeatures":["• Options trading signals","• Implied volatility analysis","• Strike price recommendations","• Greeks calculation","• Weekly expiration alerts"],"targetAudience":"Experienced traders seeking options trading opportunities and strategies","pricing":{"trial":0,"monthly":3000,"quarterly":6000,"yearly":30000},"status":"active","sortOrder":2,"createdAt":""},{"name":"Commodity","category":"trading-signals","description":"Comprehensive commodity trading signals covering precious metals, energy, and agricultural products with global market insights.","keyFeatures":["• Commodity market signals","• Supply and demand analysis","• Seasonal trend identification","• Global economic factors","• Futures contract recommendations"],"targetAudience":"Traders interested in diversifying with commodity markets and global trading","pricing":{"trial":0,"monthly":3000,"quarterly":6000,"yearly":30000},"status":"active","sortOrder":3,"createdAt":""},{"name":"Crypto","category":"trading-signals","description":"Cryptocurrency trading signals with blockchain analysis, market sentiment tracking, and DeFi opportunity identification.","keyFeatures":["• Crypto trading signals","• Blockchain analysis","• Market sentiment tracking","• DeFi opportunity alerts","• 24/7 crypto market monitoring"],"targetAudience":"Crypto enthusiasts and traders seeking professional digital asset guidance","pricing":{"trial":0,"monthly":3000,"quarterly":6000,"yearly":30000},"status":"active","sortOrder":4,"createdAt":""},{"name":"Forex","category":"trading-signals","description":"Foreign exchange trading signals with currency pair analysis, economic calendar integration, and central bank policy tracking.","keyFeatures":["• Forex trading signals","• Currency pair analysis","• Economic calendar alerts","• Central bank policy updates","• Major and exotic pairs coverage"],"targetAudience":"Forex traders looking for professional currency trading recommendations","pricing":{"trial":0,"monthly":3000,"quarterly":6000,"yearly":30000},"status":"active","sortOrder":5,"createdAt":""}];const existing=JSON.parse(localStorage.getItem('products')||'[]');const toAdd=defaults.filter(d=>!existing.some(e=>e.name===d.name));if(toAdd.length>0){toAdd.forEach(d=>d.createdAt=new Date().toISOString());const updated=[...existing,...toAdd];localStorage.setItem('products',JSON.stringify(updated));if(typeof updateProductList==='function'){updateProductList()}}}document.addEventListener('DOMContentLoaded',function(){if(window.location.pathname.startsWith('/admin/products')){setTimeout(addDefaultProducts,1000)}});
