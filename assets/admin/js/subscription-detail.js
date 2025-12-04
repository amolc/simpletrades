document.addEventListener('DOMContentLoaded', function() {
  // Get subscription data from data attributes
  const subscriptionData = JSON.parse(document.getElementById('subscriptionData').dataset.subscription);
  const subscriptionId = subscriptionData.id;
  const userId = subscriptionData.User.id || 0;
  const planCost = subscriptionData.plan.cost || 0;

  // Cancel subscription button
  const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
  if (cancelSubscriptionBtn) {
    cancelSubscriptionBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to cancel this subscription?')) {
        fetch(`/api/subscriptions/${subscriptionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelled' })
        })
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            alert('Subscription cancelled successfully!');
            window.location.reload();
          } else {
            alert('Error cancelling subscription: ' + (result.error || 'Unknown error'));
          }
        })
        .catch(error => {
          console.error('Error cancelling subscription:', error);
          alert('Error cancelling subscription');
        });
      }
    });
  }

  // Link payment button
  const linkPaymentBtn = document.getElementById('linkPaymentBtn');
  if (linkPaymentBtn) {
    linkPaymentBtn.addEventListener('click', function() {
      const linkPaymentModal = new bootstrap.Modal(document.getElementById('linkPaymentModal'));
      linkPaymentModal.show();

      // Handle form submission
      const linkPaymentForm = document.getElementById('linkPaymentForm');
      if (linkPaymentForm) {
        linkPaymentForm.onsubmit = function(event) {
          event.preventDefault();
          const transactionReference = document.getElementById('transactionReference').value.trim();

          if (!transactionReference) {
            alert('Please enter a transaction reference number.');
            return;
          }

          fetch('/api/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              subscriptionId: subscriptionId,
              amount: planCost,
              paymentMethod: 'UPI',
              paymentStatus: 'completed',
              transactionType: 'subscription_payment',
              referenceNumber: transactionReference
            })
          })
          .then(response => response.json())
          .then(result => {
            if (result.success) {
              alert('Payment linked successfully!');
              window.location.reload();
            } else {
              alert('Error linking payment: ' + (result.message || 'Unknown error'));
            }
          })
          .catch(error => {
            console.error('Error submitting payment:', error);
            alert('Network error while submitting payment.');
          });
        };
      }
    });
  }

  // Edit subscription button
  const editSubscriptionBtn = document.getElementById('editSubscriptionBtn');
  if (editSubscriptionBtn) {
    editSubscriptionBtn.addEventListener('click', function() {
      const editSubscriptionModal = new bootstrap.Modal(document.getElementById('editSubscriptionModal'));
      editSubscriptionModal.show();

      // Handle save button
      const saveEditBtn = document.getElementById('saveEditBtn');
      if (saveEditBtn) {
        saveEditBtn.addEventListener('click', function() {
          const status = document.getElementById('editStatus').value;
          const paymentStatus = document.getElementById('editPaymentStatus').value;
          const startDate = document.getElementById('editStartDate').value;
          const endDate = document.getElementById('editEndDate').value;
          const notes = document.getElementById('editNotes').value;

          fetch(`/api/subscriptions/${subscriptionId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: status,
              paymentStatus: paymentStatus,
              startDate: startDate,
              endDate: endDate,
              notes: notes
            })
          })
          .then(response => response.json())
          .then(result => {
            if (result.success) {
              alert('Subscription updated successfully!');
              editSubscriptionModal.hide();
              window.location.reload();
            } else {
              alert('Error updating subscription: ' + (result.error || 'Unknown error'));
            }
          })
          .catch(error => {
            console.error('Error updating subscription:', error);
            alert('Error updating subscription');
          });
        });
      }
    });
  }
});