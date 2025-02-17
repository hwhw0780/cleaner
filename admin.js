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

    // Fetch appointments from the server
    async function fetchAppointments() {
        try {
            const response = await fetch('/api/bookings');
            if (!response.ok) {
                throw new Error('Failed to fetch appointments');
            }
            const appointments = await response.json();
            populateAppointments(appointments);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            alert('Failed to load appointments. Please try again.');
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
    function filterAppointments() {
        fetchAppointments().then(appointments => {
            if (!appointments) return;

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
        });
    }

    // Add event listeners for filters
    searchInput.addEventListener('input', filterAppointments);
    statusFilter.addEventListener('change', filterAppointments);
    dateFilter.addEventListener('change', filterAppointments);

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

    // Search and filter functionality
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