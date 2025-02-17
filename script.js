document.addEventListener('DOMContentLoaded', function() {
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
        
        // Update month display
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        currentMonthElement.textContent = `${monthNames[month]} ${year}`;
        
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
}); 