/* ============================================
   PAVAN'S PORTFOLIO - JAVASCRIPT
   Typing Effect, Navigation, and Interactivity
   ============================================ */

// ============================================
// TYPING EFFECT
// ============================================
const typingText = document.getElementById('typingText');
const phrases = [
    'Data Analyst',
    'Python Expert',
    'Machine Learning Enthusiast',
    'MS Computer Science Candidate',
    '4.0 GPA Scholar'
];

let currentPhraseIndex = 0;
let currentCharIndex = 0;
let isDeleting = false;
const typingSpeed = 50;
const deletingSpeed = 30;
const delayBetweenPhrases = 2000;

function typeEffect() {
    const currentPhrase = phrases[currentPhraseIndex];

    if (isDeleting) {
        currentCharIndex--;
    } else {
        currentCharIndex++;
    }

    typingText.textContent = currentPhrase.substring(0, currentCharIndex);

    if (!isDeleting && currentCharIndex === currentPhrase.length) {
        // Pause before deleting
        setTimeout(() => {
            isDeleting = true;
            typeEffect();
        }, delayBetweenPhrases);
        return;
    }

    if (isDeleting && currentCharIndex === 0) {
        isDeleting = false;
        currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
    }

    const speed = isDeleting ? deletingSpeed : typingSpeed;
    setTimeout(typeEffect, speed);
}

// Start typing effect when page loads
document.addEventListener('DOMContentLoaded', () => {
    typeEffect();
});

// ============================================
// HAMBURGER MENU
// ============================================
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close menu when a link is clicked
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ============================================
// SMOOTH SCROLL FOR NAVIGATION
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            const target = document.querySelector(href);
            const offsetTop = target.offsetTop - 80; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// AOS INITIALIZATION
// ============================================
AOS.init({
    duration: 600,
    easing: 'ease-out',
    once: true,
    offset: 100
});

// ============================================
// ACTIVE NAVIGATION LINK
// ============================================
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// ============================================
// SCROLL TO TOP BUTTON (Optional Enhancement)
// ============================================
const scrollToTopBtn = document.createElement('button');
scrollToTopBtn.id = 'scrollToTopBtn';
scrollToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollToTopBtn.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #06B6D4 0%, #14B8A6 100%);
    color: #0F172A;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    transition: all 0.3s ease-out;
    z-index: 999;
`;

document.body.appendChild(scrollToTopBtn);

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopBtn.style.display = 'flex';
    } else {
        scrollToTopBtn.style.display = 'none';
    }
});

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

scrollToTopBtn.addEventListener('mouseover', () => {
    scrollToTopBtn.style.transform = 'translateY(-3px)';
    scrollToTopBtn.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.4)';
});

scrollToTopBtn.addEventListener('mouseout', () => {
    scrollToTopBtn.style.transform = 'translateY(0)';
    scrollToTopBtn.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)';
});

// ============================================
// INTERSECTION OBSERVER FOR LAZY LOADING
// ============================================
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

// Observe all elements with data-aos attribute
document.querySelectorAll('[data-aos]').forEach(el => {
    observer.observe(el);
});

// ============================================
// CONSOLE MESSAGE
// ============================================
console.log('%c👋 Welcome to Pavan Adapa\'s Portfolio!', 'font-size: 20px; color: #06B6D4; font-weight: bold;');
console.log('%cFeel free to explore and connect!', 'font-size: 14px; color: #14B8A6;');
console.log('%cGitHub: https://github.com/adapapavandharma', 'font-size: 12px; color: #CBD5E1;');
console.log('%cLinkedIn: https://www.linkedin.com/in/pavan-adapa/', 'font-size: 12px; color: #CBD5E1;');
