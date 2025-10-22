// ==========================================
// SMOOTH SCROLLING AND NAVIGATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initSmoothScroll();
    initNavHighlight();
    initScrollAnimations();
});

// Smooth scrolling for navigation links
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link, a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Only handle internal links
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);

                if (targetSection) {
                    const navbarHeight = document.getElementById('navbar').offsetHeight;
                    const targetPosition = targetSection.offsetTop - navbarHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// Highlight active navigation link based on scroll position
function initNavHighlight() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        const navbarHeight = document.getElementById('navbar').offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - navbarHeight - 100;
            const sectionHeight = section.offsetHeight;

            if (window.pageYOffset >= sectionTop &&
                window.pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.style.color = '';
            link.style.textShadow = '';

            if (link.getAttribute('href') === `#${current}`) {
                link.style.color = 'var(--neon-orange)';
                link.style.textShadow = '0 0 10px var(--neon-orange)';
            }
        });
    });
}

// Scroll-triggered animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Animate project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Animate interest cards
    const interestCards = document.querySelectorAll('.interest-card');
    interestCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Animate skill categories
    const skillCategories = document.querySelectorAll('.skill-category');
    skillCategories.forEach((category, index) => {
        category.style.opacity = '0';
        category.style.transform = 'translateY(50px)';
        category.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(category);
    });

    // Animate contact methods
    const contactMethods = document.querySelectorAll('.contact-method');
    contactMethods.forEach((method, index) => {
        method.style.opacity = '0';
        method.style.transform = 'translateY(50px)';
        method.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(method);
    });
}

// ==========================================
// NAVBAR TRANSPARENCY ON SCROLL
// ==========================================

window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(10, 10, 10, 0.98)';
    } else {
        navbar.style.background = 'rgba(10, 10, 10, 0.95)';
    }
});

// ==========================================
// TYPING EFFECT FOR HERO (Optional)
// ==========================================

// Uncomment to enable typing effect
/*
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = '';

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// Usage
window.addEventListener('load', () => {
    const subtitle = document.querySelector('.hero-subtitle');
    if (subtitle) {
        const originalText = subtitle.textContent;
        typeWriter(subtitle, originalText, 50);
    }
});
*/

// ==========================================
// MOBILE MENU TOGGLE (if needed in future)
// ==========================================

function initMobileMenu() {
    // Create mobile menu button if it doesn't exist
    const navbar = document.querySelector('.nav-container');
    const existingBtn = document.querySelector('.mobile-menu-btn');

    if (!existingBtn && window.innerWidth <= 768) {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.innerHTML = '☰';
        menuBtn.style.cssText = `
            display: block;
            background: none;
            border: 2px solid var(--neon-orange);
            color: var(--neon-orange);
            font-size: 1.5rem;
            padding: 0.5rem 1rem;
            cursor: pointer;
        `;

        const menu = document.querySelector('.nav-menu');

        menuBtn.addEventListener('click', () => {
            menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            menu.style.flexDirection = 'column';
            menu.style.position = 'absolute';
            menu.style.top = '100%';
            menu.style.right = '0';
            menu.style.background = 'var(--dark-bg)';
            menu.style.padding = '1rem';
        });

        // Only add button on mobile
        if (window.innerWidth <= 768) {
            navbar.appendChild(menuBtn);
        }
    }
}

// Check on load and resize
window.addEventListener('load', initMobileMenu);
window.addEventListener('resize', initMobileMenu);

// ==========================================
// EASTER EGG: Konami Code
// ==========================================

let konamiCode = [];
const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);

    if (konamiCode.join(',') === konamiPattern.join(',')) {
        activateMatrixMode();
    }
});

function activateMatrixMode() {
    // Add a fun matrix effect when Konami code is entered
    document.body.style.filter = 'hue-rotate(120deg)';

    setTimeout(() => {
        document.body.style.filter = '';
    }, 3000);

    // Show a message
    const message = document.createElement('div');
    message.textContent = 'MATRIX MODE ACTIVATED';
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: var(--font-mono);
        font-size: 3rem;
        color: var(--neon-green);
        text-shadow: 0 0 20px var(--neon-green);
        z-index: 10000;
        animation: fadeOut 3s forwards;
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(message);

    setTimeout(() => {
        message.remove();
        style.remove();
    }, 3000);
}

// ==========================================
// PERFORMANCE: Debounce scroll events
// ==========================================

function debounce(func, wait = 10, immediate = true) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Apply debounce to scroll events if needed
// const efficientScrollHandler = debounce(yourScrollFunction);
// window.addEventListener('scroll', efficientScrollHandler);

console.log('%c🎨 Welcome to Bassem\'s Portfolio! 🎨', 'color: #FF6B35; font-size: 20px; font-weight: bold;');
console.log('%cBuilt with vanilla JavaScript, CSS, and Three.js', 'color: #00FF88; font-size: 14px;');
console.log('%cTry the Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A', 'color: #FF10F0; font-size: 12px;');
