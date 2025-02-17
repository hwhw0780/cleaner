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

    // Add getSlotClass helper function
    function getSlotClass(slots) {
        if (slots === 0) return 'slots-none';
        if (slots === 1) return 'slots-low';
        if (slots === 2) return 'slots-medium';
        return 'slots-high';
    }

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
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
        
        // Calculate the maximum booking date (50 days from today)
        const maxBookingDate = new Date(today);
        maxBookingDate.setDate(today.getDate() + 50);
        maxBookingDate.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= totalDays; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const currentDay = new Date(year, month, day);
            currentDay.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            // Create initial structure
            dayDiv.innerHTML = `
                <span class="day-number">${day}</span>
                <div class="slots-info">
                    <small>M: ...</small>
                    <small>A: ...</small>
                </div>
            `;
            
            // Handle past dates and dates beyond 50 days
            if (currentDay < today || currentDay > maxBookingDate) {
                dayDiv.classList.add('disabled');
                const slotsInfo = dayDiv.querySelector('.slots-info');
                slotsInfo.innerHTML = `
                    <small class="slots-none">M: 0</small>
                    <small class="slots-none">A: 0</small>
                `;
            } else {
                // Update fetch slots section for valid dates
                fetch(`/api/slots/${dateStr}`)
                    .then(response => response.json())
                    .then(slots => {
                        const slotsInfo = dayDiv.querySelector('.slots-info');
                        const morning = slots.morning ?? 5;
                        const afternoon = slots.afternoon ?? 5;
                        
                        const morningClass = getSlotClass(morning);
                        const afternoonClass = getSlotClass(afternoon);
                        
                        slotsInfo.innerHTML = `
                            <small class="${morningClass}">M: ${morning}</small>
                            <small class="${afternoonClass}">A: ${afternoon}</small>
                        `;
                        
                        // Disable if both slots are 0
                        if (morning <= 0 && afternoon <= 0) {
                            dayDiv.classList.add('disabled');
                        } else {
                            dayDiv.classList.remove('disabled');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching slots:', error);
                        const slotsInfo = dayDiv.querySelector('.slots-info');
                        slotsInfo.innerHTML = `
                            <small class="slots-high">M: 5</small>
                            <small class="slots-high">A: 5</small>
                        `;
                    });
                
                // Add click handler for valid dates
                dayDiv.addEventListener('click', function() {
                    if (!this.classList.contains('disabled')) {
                        // Remove previous selection
                        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedDate = dateStr;
                        
                        // Show slot management panel and fetch current slots
                        selectedDateElement.textContent = dateStr;
                        fetch(`/api/slots/${dateStr}`)
                            .then(response => response.json())
                            .then(slots => {
                                document.getElementById('morningSlots').value = slots.morning;
                                document.getElementById('afternoonSlots').value = slots.afternoon;
                                slotManagement.style.display = 'block';
                            })
                            .catch(error => {
                                console.error('Error fetching slots:', error);
                                document.getElementById('morningSlots').value = 5;
                                document.getElementById('afternoonSlots').value = 5;
                                slotManagement.style.display = 'block';
                            });
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

            const morning = parseInt(document.getElementById('morningSlots').value);
            const afternoon = parseInt(document.getElementById('afternoonSlots').value);

            // Update slots using API
            fetch(`/api/slots/${selectedDate}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ morning, afternoon })
            })
            .then(response => response.json())
            .then(data => {
                // Update calendar display
                updateCalendar();
                alert(`Slots updated for ${selectedDate}`);
            })
            .catch(error => {
                console.error('Error updating slots:', error);
                alert('Error updating slots. Please try again.');
            });
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