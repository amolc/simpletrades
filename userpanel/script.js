// SimpleIncome Landing Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initNavigation();
    initScrollEffects();
    initForms();
    initPricingCards();
    initAnimations();
});

// Navigation functionality
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// Scroll effects and animations
function initScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.service-card, .testimonial-card, .feature-item');
    animatedElements.forEach(el => observer.observe(el));
}

// Form handling
function initForms() {
    const loginForm = document.querySelector('#loginModal form');
    const registerForm = document.querySelector('#registerModal form');
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('#loginEmail').value;
            const password = this.querySelector('#loginPassword').value;
            
            // Simple validation
            if (!email || !password) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Simulate login process
            showNotification('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
                // Redirect to dashboard would go here
                window.location.href = 'stocks.html';
            }, 1500);
        });
    }
    
    // Registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const firstName = this.querySelector('#registerFirstName').value;
            const lastName = this.querySelector('#registerLastName').value;
            const email = this.querySelector('#registerEmail').value;
            const phone = this.querySelector('#registerPhone').value;
            const password = this.querySelector('#registerPassword').value;
            const confirmPassword = this.querySelector('#registerConfirmPassword').value;
            
            // Validation
            if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            if (!isValidPhone(phone)) {
                showNotification('Please enter a valid phone number', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('Password must be at least 6 characters long', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            // Simulate registration process
            showNotification('Registration successful! Welcome to SimpleIncome!', 'success');
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
                // Redirect to dashboard would go here
                window.location.href = 'stocks.html';
            }, 1500);
        });
    }
}

// Pricing card selection functionality
function initPricingCards() {
    const pricingCards = document.querySelectorAll('.pricing-card');

    pricingCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove 'selected' from all cards and reset buttons
            pricingCards.forEach(c => {
                c.classList.remove('selected');
                const button = c.querySelector('.btn');
                if (button) {
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-outline-primary');
                    button.textContent = 'Choose Plan';
                }
            });

            // Add 'selected' to the clicked card and update its button
            this.classList.add('selected');
            const button = this.querySelector('.btn');
            if (button) {
                button.classList.remove('btn-outline-primary');
                button.classList.add('btn-primary');
                button.textContent = 'Selected';
            }
        });
    });
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Service card interactions
document.addEventListener('click', function(e) {
    if (e.target.matches('.service-card .btn')) {
        e.preventDefault();
        const serviceName = e.target.closest('.service-card').querySelector('.service-title').textContent;
        showNotification(`Redirecting to ${serviceName} trading platform...`, 'info');
        
        // Simulate redirect to respective trading platform
        setTimeout(() => {
            window.location.href = 'stocks.html';
        }, 1000);
    }
});

// Add custom CSS for navbar scroll effect
const style = document.createElement('style');
style.textContent = `
    .navbar.scrolled {
        background-color: rgba(255, 255, 255, 0.98) !important;
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }
    
    .fade-in {
        animation: fadeInUp 0.6s ease-out forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Initialize animations
function initAnimations() {
    // Add hover effects to service cards
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add click effects to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Add ripple animation
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// Auto-redirect after successful login/registration (for demo purposes)
setTimeout(() => {
    if (window.location.pathname.includes('userpanel')) {
        console.log('SimpleIncome landing page loaded successfully');
    }
}, 1000);