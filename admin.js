document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    // Search and filter elements
    const searchInput = document.getElementById('searchAppointments');
    const statusFilter = document.getElementById('filterStatus');
    const dateFilter = document.getElementById('filterDate');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;
            
            // Update active states
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // Refresh appointments when switching to appointments tab
            if (tabId === 'appointments') {
                fetchAppointments();
            }
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

    // Format date for display
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    // Update calendar function
    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update month display
        currentMonthElement.textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;
        
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
        for (let day = 1; day <= totalDays; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const currentDay = new Date(year, month, day);
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            dayDiv.textContent = day;
            
            // Add click handler for slot management
            dayDiv.addEventListener('click', function() {
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                this.classList.add('selected');
                selectedDate = dateStr;
                selectedDateElement.textContent = formatDate(dateStr);
                slotManagement.style.display = 'block';
                
                // Fetch and display current slots
                fetch(`/api/slots/${dateStr}`)
                    .then(response => response.json())
                    .then(slots => {
                        document.getElementById('morningSlots').value = slots.morning ?? 5;
                        document.getElementById('afternoonSlots').value = slots.afternoon ?? 5;
                    })
                    .catch(error => {
                        console.error('Error fetching slots:', error);
                        document.getElementById('morningSlots').value = 5;
                        document.getElementById('afternoonSlots').value = 5;
                    });
            });
            
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

    // Fetch appointments from the server
    async function fetchAppointments() {
        try {
            const response = await fetch('/api/bookings');
            if (!response.ok) {
                throw new Error('Failed to fetch appointments');
            }
            const appointments = await response.json();
            populateAppointments(appointments); // Directly populate the appointments
            return appointments;
        } catch (error) {
            console.error('Error fetching appointments:', error);
            alert('Failed to load appointments. Please try again.');
            return [];
        }
    }

    // Populate appointments table with real data
    function populateAppointments(appointments) {
        const tbody = document.getElementById('appointmentsTableBody');
        tbody.innerHTML = '';

        appointments.forEach(appointment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(appointment.date)}</td>
                <td>${appointment.time_period === 'morning' ? 'Morning (8:00 AM - 12:00 PM)' : 'Afternoon (1:00 PM - 5:00 PM)'}</td>
                <td>${appointment.client_name}</td>
                <td>${appointment.service_type}</td>
                <td>${appointment.contact}</td>
                <td>${appointment.address}</td>
                <td><span class="status-badge status-${appointment.status}">${appointment.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-edit" data-id="${appointment.id}">Edit</button>
                        <button class="action-btn btn-delete" data-id="${appointment.id}">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);

            // Add event listeners for edit and delete buttons
            const editBtn = tr.querySelector('.btn-edit');
            const deleteBtn = tr.querySelector('.btn-delete');

            editBtn.addEventListener('click', () => handleEditAppointment(appointment));
            deleteBtn.addEventListener('click', () => handleDeleteAppointment(appointment.id));
        });
    }

    // Handle edit appointment
    async function handleEditAppointment(appointment) {
        const newStatus = prompt('Update status (pending/confirmed/completed/cancelled):', appointment.status);
        if (newStatus && ['pending', 'confirmed', 'completed', 'cancelled'].includes(newStatus)) {
            try {
                const response = await fetch(`/api/bookings/${appointment.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!response.ok) {
                    throw new Error('Failed to update appointment');
                }

                // Refresh appointments list
                fetchAppointments();
            } catch (error) {
                console.error('Error updating appointment:', error);
                alert('Failed to update appointment. Please try again.');
            }
        }
    }

    // Handle delete appointment
    async function handleDeleteAppointment(id) {
        if (confirm('Are you sure you want to delete this appointment?')) {
            try {
                const response = await fetch(`/api/bookings/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete appointment');
                }

                // Refresh appointments list
                fetchAppointments();
            } catch (error) {
                console.error('Error deleting appointment:', error);
                alert('Failed to delete appointment. Please try again.');
            }
        }
    }

    // Search and filter functionality
    async function filterAppointments() {
        const appointments = await fetchAppointments();
        if (!appointments || appointments.length === 0) return;

        let filtered = [...appointments];

        // Apply search filter
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(appointment => 
                appointment.client_name.toLowerCase().includes(searchTerm) ||
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
    searchInput.addEventListener('input', () => filterAppointments());
    statusFilter.addEventListener('change', () => filterAppointments());
    dateFilter.addEventListener('change', () => filterAppointments());

    // Initialize calendar
    updateCalendar();

    // Initial fetch of appointments
    fetchAppointments();

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
}); 