document.addEventListener('DOMContentLoaded', function() {
    // Initialize date variables first
    let currentDate = new Date();
    let selectedDate = null;

    // Get DOM elements
    const calendar = document.getElementById('calendar');
    const currentMonthElement = document.getElementById('currentMonth');
    const timeSlotContainer = document.getElementById('timeSlotContainer');
    const bookingFormContainer = document.getElementById('bookingFormContainer');

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

    // Get slot availability
    function fetchSlots(dateStr, dayDiv, morningSlots, afternoonSlots) {
        fetch(`/api/slots/${dateStr}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(slots => {
                // Use nullish coalescing to handle undefined values
                const morning = slots.morning ?? 5;
                const afternoon = slots.afternoon ?? 5;
                
                morningSlots.textContent = morning;
                afternoonSlots.textContent = afternoon;
                
                // Disable if both slots are 0
                if (morning <= 0 && afternoon <= 0) {
                    dayDiv.classList.add('disabled');
                } else {
                    dayDiv.classList.remove('disabled');
                }
            })
            .catch(error => {
                console.error('Error fetching slots:', error);
                morningSlots.textContent = '5';
                afternoonSlots.textContent = '5';
                dayDiv.classList.remove('disabled');
            });
    }

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
            
            const currentDay = new Date(year, month, day);
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            // Create day number element
            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayDiv.appendChild(dayNumber);
            
            // Create slots info container
            const slotsInfo = document.createElement('div');
            slotsInfo.className = 'slots-info';
            
            // Add morning and afternoon slots
            const morningSlots = document.createElement('div');
            morningSlots.className = 'morning-slots';
            const afternoonSlots = document.createElement('div');
            afternoonSlots.className = 'afternoon-slots';
            
            // Fetch and update slot availability
            fetchSlots(dateStr, dayDiv, morningSlots, afternoonSlots);
            
            slotsInfo.appendChild(morningSlots);
            slotsInfo.appendChild(afternoonSlots);
            dayDiv.appendChild(slotsInfo);
            
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
                        selectedDate = dateStr;
                        
                        // Show time slot container
                        timeSlotContainer.style.display = 'block';
                        
                        // Update time slot availability
                        fetch(`/api/slots/${dateStr}`)
                            .then(response => response.json())
                            .then(slots => {
                                const timeSlots = document.querySelectorAll('.time-slot');
                                
                                // Morning slot
                                const morningAvailable = slots.morning ?? 5;
                                if (morningAvailable <= 0) {
                                    timeSlots[0].disabled = true;
                                    timeSlots[0].classList.add('disabled');
                                    timeSlots[0].innerHTML = currentLang === 'en' ? 
                                        'Morning (Fully Booked)' : 
                                        '上午 (已满)';
                                } else {
                                    timeSlots[0].disabled = false;
                                    timeSlots[0].classList.remove('disabled');
                                    timeSlots[0].innerHTML = currentLang === 'en' ? 
                                        `Morning (8:00 AM - 12:00 PM) - ${morningAvailable} slots left` : 
                                        `上午 (8:00 - 12:00) - 剩余 ${morningAvailable} 个名额`;
                                }
                                
                                // Afternoon slot
                                const afternoonAvailable = slots.afternoon ?? 5;
                                if (afternoonAvailable <= 0) {
                                    timeSlots[1].disabled = true;
                                    timeSlots[1].classList.add('disabled');
                                    timeSlots[1].innerHTML = currentLang === 'en' ? 
                                        'Afternoon (Fully Booked)' : 
                                        '下午 (已满)';
                                } else {
                                    timeSlots[1].disabled = false;
                                    timeSlots[1].classList.remove('disabled');
                                    timeSlots[1].innerHTML = currentLang === 'en' ? 
                                        `Afternoon (1:00 PM - 5:00 PM) - ${afternoonAvailable} slots left` : 
                                        `下午 (13:00 - 17:00) - 剩余 ${afternoonAvailable} 个名额`;
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching slots:', error);
                                const timeSlots = document.querySelectorAll('.time-slot');
                                timeSlots[0].innerHTML = translations.timeSlots[currentLang].morning + ' - 5 slots left';
                                timeSlots[1].innerHTML = translations.timeSlots[currentLang].afternoon + ' - 5 slots left';
                            });
                    }
                });
            }
            
            calendar.appendChild(dayDiv);
        }
    }

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

    // Add CSS for disabled time slots
    const style = document.createElement('style');
    style.textContent = `
        .time-slot.disabled {
            background: var(--gray-200);
            color: var(--gray-600);
            cursor: not-allowed;
            opacity: 0.7;
        }
        .time-slot.disabled:hover {
            background: var(--gray-200);
            transform: none;
        }
    `;
    document.head.appendChild(style);
}); 