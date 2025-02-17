document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;
            
            // Update active states
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Calendar functionality
    let currentDate = new Date();
    let selectedDate = null;
    const calendar = document.getElementById('adminCalendar');
    const currentMonthElement = document.getElementById('currentMonth');
    const slotManagement = document.getElementById('slotManagement');
    const selectedDateElement = document.getElementById('selectedDate');

    // Sample data structure for available slots
    let availableSlots = {};

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
            
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const slots = availableSlots[dateStr] || { morning: 5, afternoon: 5 };
            
            dayDiv.innerHTML = `
                <span class="day-number">${day}</span>
                <div class="slots-info">
                    <small>M: ${slots.morning}</small>
                    <small>A: ${slots.afternoon}</small>
                </div>
            `;
            
            const currentDay = new Date(year, month, day);
            
            // Disable past dates
            if (currentDay < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
                dayDiv.classList.add('disabled');
            } else {
                dayDiv.addEventListener('click', function() {
                    if (!this.classList.contains('disabled')) {
                        // Remove previous selection
                        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedDate = dateStr;
                        
                        // Show slot management panel
                        selectedDateElement.textContent = dateStr;
                        document.getElementById('morningSlots').value = slots.morning;
                        document.getElementById('afternoonSlots').value = slots.afternoon;
                        slotManagement.style.display = 'block';
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

    // Slot management functionality
    document.querySelectorAll('.save-slots').forEach(button => {
        button.addEventListener('click', function() {
            if (!selectedDate) return;

            const period = this.dataset.period;
            const slots = document.getElementById(`${period}Slots`).value;

            // Update available slots
            if (!availableSlots[selectedDate]) {
                availableSlots[selectedDate] = { morning: 5, afternoon: 5 };
            }
            availableSlots[selectedDate][period] = parseInt(slots);

            // Update calendar display
            updateCalendar();

            // Show success message
            alert(`Slots updated for ${selectedDate}`);
        });
    });

    // Sample appointments data
    const sampleAppointments = [
        {
            date: '2024-03-15',
            time: 'Morning',
            clientName: 'John Doe',
            serviceType: 'Weekly',
            contact: '+60 12-345-6789',
            address: '123 Main St, Kluang',
            status: 'confirmed'
        },
        {
            date: '2024-03-16',
            time: 'Afternoon',
            clientName: 'Jane Smith',
            serviceType: 'One-off',
            contact: '+60 98-765-4321',
            address: '456 Park Ave, Kluang',
            status: 'pending'
        }
    ];

    // Populate appointments table
    function populateAppointments(appointments) {
        const tbody = document.getElementById('appointmentsTableBody');
        tbody.innerHTML = '';

        appointments.forEach(appointment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${appointment.date}</td>
                <td>${appointment.time}</td>
                <td>${appointment.clientName}</td>
                <td>${appointment.serviceType}</td>
                <td>${appointment.contact}</td>
                <td>${appointment.address}</td>
                <td><span class="status-badge status-${appointment.status}">${appointment.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-edit">Edit</button>
                        <button class="action-btn btn-delete">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Initialize appointments table
    populateAppointments(sampleAppointments);

    // Search and filter functionality
    const searchInput = document.getElementById('searchAppointments');
    const statusFilter = document.getElementById('filterStatus');
    const dateFilter = document.getElementById('filterDate');

    function filterAppointments() {
        let filtered = [...sampleAppointments];

        // Apply search filter
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(appointment => 
                appointment.clientName.toLowerCase().includes(searchTerm) ||
                appointment.address.toLowerCase().includes(searchTerm) ||
                appointment.contact.includes(searchTerm)
            );
        }

        // Apply status filter
        const status = statusFilter.value;
        if (status !== 'all') {
            filtered = filtered.filter(appointment => appointment.status === status);
        }

        // Apply date filter
        const dateOption = dateFilter.value;
        const today = new Date();
        if (dateOption !== 'all') {
            filtered = filtered.filter(appointment => {
                const appointmentDate = new Date(appointment.date);
                switch(dateOption) {
                    case 'today':
                        return appointmentDate.toDateString() === today.toDateString();
                    case 'tomorrow':
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return appointmentDate.toDateString() === tomorrow.toDateString();
                    case 'week':
                        const weekLater = new Date(today);
                        weekLater.setDate(weekLater.getDate() + 7);
                        return appointmentDate >= today && appointmentDate <= weekLater;
                    case 'month':
                        return appointmentDate.getMonth() === today.getMonth() &&
                               appointmentDate.getFullYear() === today.getFullYear();
                }
            });
        }

        populateAppointments(filtered);
    }

    // Add event listeners for filters
    searchInput.addEventListener('input', filterAppointments);
    statusFilter.addEventListener('change', filterAppointments);
    dateFilter.addEventListener('change', filterAppointments);

    // Initialize calendar
    updateCalendar();
}); 