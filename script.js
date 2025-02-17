document.addEventListener('DOMContentLoaded', function() {
    // Language switcher functionality
    const languageButtons = document.querySelectorAll('.language-btn');
    let currentLang = 'en';

    const translations = {
        months: {
            en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            cn: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
        },
        weekdays: {
            en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            cn: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
        },
        timeSlots: {
            en: {
                morning: "Morning (8:00 AM - 12:00 PM)",
                afternoon: "Afternoon (1:00 PM - 5:00 PM)"
            },
            cn: {
                morning: "上午 (8:00 - 12:00)",
                afternoon: "下午 (13:00 - 17:00)"
            }
        },
        form: {
            en: {
                selectTime: "Select Time",
                serviceType: "Select Service Type",
                fullName: "Full Name",
                phone: "Phone Number",
                email: "Email Address",
                address: "Service Address",
                back: "Back",
                confirm: "Confirm Booking"
            },
            cn: {
                selectTime: "选择时间",
                serviceType: "选择服务类型",
                fullName: "姓名",
                phone: "电话号码",
                email: "电子邮件",
                address: "服务地址",
                back: "返回",
                confirm: "确认预约"
            }
        }
    };

    function switchLanguage(lang) {
        currentLang = lang;
        // Update active button state
        languageButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Update all translatable elements
        document.querySelectorAll('[data-' + lang + ']').forEach(element => {
            element.textContent = element.dataset[lang];
        });

        // Update calendar weekdays
        document.querySelectorAll('.weekdays div').forEach((div, index) => {
            div.textContent = translations.weekdays[lang][index];
        });

        // Update time slots
        const timeSlots = document.querySelectorAll('.time-slot');
        timeSlots[0].textContent = translations.timeSlots[lang].morning;
        timeSlots[1].textContent = translations.timeSlots[lang].afternoon;

        // Update form labels
        document.querySelector('label[for="serviceType"]').textContent = translations.form[lang].serviceType;
        document.querySelector('label[for="name"]').textContent = translations.form[lang].fullName;
        document.querySelector('label[for="phone"]').textContent = translations.form[lang].phone;
        document.querySelector('label[for="email"]').textContent = translations.form[lang].email;
        document.querySelector('label[for="address"]').textContent = translations.form[lang].address;
        document.querySelector('.back-btn').textContent = translations.form[lang].back;
        document.querySelector('.submit-btn').textContent = translations.form[lang].confirm;
        document.querySelector('#timeSlotContainer h3').textContent = translations.form[lang].selectTime;

        // Update current month display
        updateCalendar();

        // Store language preference
        localStorage.setItem('preferredLanguage', lang);
    }

    // Initialize language from localStorage or default to English
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) {
        switchLanguage(savedLang);
    }

    // Add click handlers to language buttons
    languageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            if (lang !== currentLang) {
                switchLanguage(lang);
            }
        });
    });

    let currentDate = new Date();
    let selectedDate = null;

    // Get DOM elements
    const calendar = document.getElementById('calendar');
    const currentMonthElement = document.getElementById('currentMonth');
    const timeSlotContainer = document.getElementById('timeSlotContainer');
    const bookingFormContainer = document.getElementById('bookingFormContainer');

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update month display using translations
        currentMonthElement.textContent = `${translations.months[currentLang][month]} ${year}`;
        
        // Get first day of month and total days
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        calendar.innerHTML = '';
        
        // Add empty cells for days before first of month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }
        
        // Add days of month
        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;
            
            const currentDay = new Date(year, month, day);
            
            // Disable past dates
            if (currentDay < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
                dayDiv.classList.add('disabled');
            } else {
                // Check if this is today
                if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                    dayDiv.classList.add('today');
                }
                
                // Add click handler for future dates
                dayDiv.addEventListener('click', function() {
                    if (!this.classList.contains('disabled')) {
                        // Remove previous selection
                        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedDate = new Date(year, month, day);
                        timeSlotContainer.style.display = 'block';
                    }
                });
            }
            
            calendar.appendChild(dayDiv);
        }
    }

    // Add event listeners for month navigation
    document.querySelector('.month-nav.prev').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.querySelector('.month-nav.next').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Time slot selection
    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach(slot => {
        slot.addEventListener('click', function() {
            timeSlots.forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
            bookingFormContainer.style.display = 'block';
        });
    });

    // Back button functionality
    document.querySelector('.back-btn').addEventListener('click', function() {
        bookingFormContainer.style.display = 'none';
        timeSlotContainer.style.display = 'none';
        selectedDate = null;
        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    });

    // Form submission
    document.getElementById('bookingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        // Add your form submission logic here
        alert('Booking submitted successfully!');
    });

    // Initialize calendar
    updateCalendar();

    // Animation on scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // Observe all sections and cards
    document.querySelectorAll('.vision-mission-content, .highlight-item, .benefit-card, .pricing-card').forEach(element => {
        element.classList.add('fade-in');
        observer.observe(element);
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}); 