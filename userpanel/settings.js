document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
    }

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');

    const fetchUserData = async () => {
        try {
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                fullNameInput.value = user.fullName;
                emailInput.value = user.email;
            } else {
                console.error('Failed to fetch user data');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const updateProfileForm = document.getElementById('updateProfileForm');

    updateProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = fullNameInput.value;
        const email = emailInput.value;

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fullName, email })
            });

            if (response.ok) {
                alert('Profile updated successfully');
            } else {
                alert('Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('An error occurred while updating your profile');
        }
    });

    const changePasswordForm = document.getElementById('changePasswordForm');

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        try {
            const response = await fetch('/api/user/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (response.ok) {
                alert('Password changed successfully');
                changePasswordForm.reset();
            } else {
                const error = await response.json();
                alert(`Failed to change password: ${error.message}`);
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('An error occurred while changing your password');
        }
    });

    const alertPreferencesForm = document.getElementById('alertPreferencesForm');

    alertPreferencesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const telegramId = document.getElementById('telegramId').value;
        const whatsappNumber = document.getElementById('whatsappNumber').value;
        const preferredAlertMethod = document.getElementById('preferredAlertMethod').value;

        try {
            const response = await fetch('/api/user/alert-preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ telegramId, whatsappNumber, preferredAlertMethod })
            });

            if (response.ok) {
                alert('Alert preferences updated successfully');
            } else {
                alert('Failed to update alert preferences');
            }
        } catch (error) {
            console.error('Error updating alert preferences:', error);
            alert('An error occurred while updating your alert preferences');
        }
    });

    fetchUserData();
});