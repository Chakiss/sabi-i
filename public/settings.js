class SabaiSettingsManager {
    constructor() {
        this.therapists = [];
        this.services = [];
        this.isLoading = false;
        this.currentEditingServiceId = null;
        this._dragCleanup = null; // Track drag listeners for cleanup

        this.bindEvents();
        this.loadInitialData();
    }

    // Bind event listeners
    bindEvents() {
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Settings tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Therapist management
        document.getElementById('addTherapistForm').addEventListener('submit', (e) => this.handleAddTherapist(e));

        // Service management  
        document.getElementById('addServiceForm').addEventListener('submit', (e) => this.handleAddService(e));
        document.getElementById('addDuration').addEventListener('click', () => this.addDurationRow());
        document.getElementById('initializeServices').addEventListener('click', () => this.initializeDefaultServices());
        document.getElementById('migratePatchTherapistFees').addEventListener('click', () => this.migratePatchTherapistFees());

        // Edit service modal
        document.getElementById('closeEditServiceModal').addEventListener('click', () => this.closeEditServiceModal());
        document.getElementById('cancelEditService').addEventListener('click', () => this.closeEditServiceModal());
        document.getElementById('editServiceForm').addEventListener('submit', (e) => this.handleEditServiceSubmit(e));
        document.getElementById('addEditDuration').addEventListener('click', () => this.addEditDurationRow());

        // Add event listener for remove duration button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-duration')) {
                e.target.closest('.duration-row').remove();
            }
        });

        // Retry button
        document.getElementById('retryButton').addEventListener('click', () => this.loadInitialData());
    }

    // Load initial data
    async loadInitialData() {
        try {
            this.showLoading();
            
            await Promise.all([
                this.loadTherapists(),
                this.loadServices()
            ]);
            
            this.renderTherapistList();
            this.renderServiceList();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Load therapists from Firestore
    async loadTherapists() {
        try {
            const snapshot = await db.collection('therapists')
                .orderBy('displayOrder')
                .limit(CONFIG.MAX_THERAPISTS)
                .get();
                
            this.therapists = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded therapists:', this.therapists);
            
        } catch (error) {
            console.error('Error loading therapists:', error);
            throw error;
        }
    }

    // Load services from Firestore
    async loadServices() {
        try {
            const snapshot = await db.collection('services')
                .orderBy('displayOrder')
                .get();
                
            this.services = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded services:', this.services);
            
        } catch (error) {
            console.error('Error loading services:', error);
            // Don't throw error to prevent blocking app initialization
        }
    }

    // Show loading state
    showLoading() {
        this.isLoading = true;
        document.getElementById('loadingSpinner').classList.remove('hidden');
        document.getElementById('settingsContainer').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
    }

    // Hide loading state
    hideLoading() {
        this.isLoading = false;
        document.getElementById('loadingSpinner').classList.add('hidden');
        document.getElementById('settingsContainer').classList.remove('hidden');
    }

    // Show error message
    showError(message) {
        this.isLoading = false;
        document.getElementById('loadingSpinner').classList.add('hidden');
        document.getElementById('settingsContainer').classList.add('hidden');
        document.getElementById('errorMessage').classList.remove('hidden');
        document.querySelector('.error-text').textContent = message;
    }

    // Settings Tabs Management
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    }

    // Therapist Management Methods

    // Handle add therapist form submission
    async handleAddTherapist(e) {
        e.preventDefault();
        
        const name = document.getElementById('therapistName').value.trim();
        const color = document.getElementById('therapistColor').value;
        
        if (!name) {
            alert('กรุณากรอกชื่อหมอนวด');
            return;
        }
        
        try {
            // Get next therapist ID (T001, T002, etc.)
            const nextTherapistId = await this.getNextTherapistId();
            
            // Get next display order
            const nextOrder = this.therapists.length > 0 
                ? Math.max(...this.therapists.map(t => t.displayOrder)) + 1 
                : 1;
            
            const therapist = {
                name: name,
                status: 'active',
                displayOrder: nextOrder,
                color: color,
                createdAt: firebase.firestore.Timestamp.now()
            };
            
            await db.collection('therapists').doc(nextTherapistId).set(therapist);
            
            // Reload therapists and update display
            await this.loadTherapists();
            this.renderTherapistList();
            
            // Clear form
            document.getElementById('therapistName').value = '';
            document.getElementById('therapistColor').value = '#4c9fff';
            
            console.log('Added new therapist with ID:', nextTherapistId, therapist);
            
        } catch (error) {
            console.error('Error adding therapist:', error);
            alert('ไม่สามารถเพิ่มหมอนวดได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Get next therapist ID in format T001, T002, T003, etc.
    async getNextTherapistId() {
        try {
            // Get all therapist documents to check existing IDs
            const snapshot = await db.collection('therapists').get();
            
            const existingIds = snapshot.docs
                .map(doc => doc.id)
                .filter(id => /^T\d{3}$/.test(id)) // Filter IDs that match T### pattern
                .map(id => parseInt(id.substring(1))) // Extract the number part
                .sort((a, b) => a - b); // Sort numerically
            
            // Find the next available number
            let nextNumber = 1;
            for (const num of existingIds) {
                if (num === nextNumber) {
                    nextNumber++;
                } else {
                    break;
                }
            }
            
            // Format as T### (T001, T002, etc.)
            return `T${nextNumber.toString().padStart(3, '0')}`;
            
        } catch (error) {
            console.error('Error getting next therapist ID:', error);
            // Fallback to timestamp-based ID if there's an error
            const timestamp = Date.now().toString().slice(-3);
            return `T${timestamp}`;
        }
    }

    // Render therapist list
    renderTherapistList() {
        // Cleanup old drag listeners before re-rendering
        if (this._dragCleanup) {
            this._dragCleanup();
            this._dragCleanup = null;
        }

        const container = document.getElementById('therapistList');
        container.innerHTML = '';

        if (this.therapists.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">ไม่มีหมอนวดในระบบ</p>';
            return;
        }

        this.therapists.forEach((therapist, index) => {
            const item = this.createTherapistItem(therapist, index);
            container.appendChild(item);
        });

        // Setup drag-and-drop for the whole list (single set of document listeners)
        this._dragCleanup = this.setupDragAndDrop(container);
    }

    // Create individual therapist item
    createTherapistItem(therapist, index) {
        const item = document.createElement('div');
        item.className = 'therapist-item';
        item.dataset.therapistId = therapist.id;
        item.dataset.order = therapist.displayOrder;
        
        item.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="therapist-color" style="background-color: ${therapist.color || '#4c9fff'}"></div>
            <div class="therapist-details">
                <div class="therapist-name">${therapist.name}</div>
                <div class="therapist-order">ลำดับที่ ${therapist.displayOrder}</div>
            </div>
            <div class="therapist-controls">
                <button class="toggle-visibility ${therapist.status === 'active' ? 'active' : ''}" 
                        data-therapist-id="${therapist.id}" 
                        title="${therapist.status === 'active' ? 'ซ่อนหมอนวด' : 'แสดงหมอนวด'}">
                </button>
                <button class="edit-therapist" data-therapist-id="${therapist.id}">แก้ไข</button>
                <button class="delete-therapist" data-therapist-id="${therapist.id}">ลบ</button>
            </div>
        `;
        
        // Add event listeners
        item.querySelector('.toggle-visibility').addEventListener('click', (e) => {
            this.toggleTherapistVisibility(therapist.id);
        });
        
        item.querySelector('.edit-therapist').addEventListener('click', (e) => {
            this.editTherapist(therapist.id);
        });
        
        item.querySelector('.delete-therapist').addEventListener('click', (e) => {
            this.deleteTherapist(therapist.id);
        });

        return item;
    }

    // Toggle therapist visibility
    async toggleTherapistVisibility(therapistId) {
        try {
            const therapist = this.therapists.find(t => t.id === therapistId);
            if (!therapist) return;
            
            const newStatus = therapist.status === 'active' ? 'inactive' : 'active';
            
            await db.collection('therapists').doc(therapistId).update({
                status: newStatus
            });
            
            // Reload and update display
            await this.loadTherapists();
            this.renderTherapistList();
            
            console.log('Updated therapist status:', therapistId, newStatus);
            
        } catch (error) {
            console.error('Error updating therapist status:', error);
            alert('ไม่สามารถอัพเดทสถานะหมอนวดได้');
        }
    }

    // Edit therapist
    editTherapist(therapistId) {
        const therapist = this.therapists.find(t => t.id === therapistId);
        if (!therapist) return;
        
        const newName = prompt('ชื่อหมอนวดใหม่:', therapist.name);
        if (newName && newName.trim() !== therapist.name) {
            this.updateTherapistName(therapistId, newName.trim());
        }
    }

    // Update therapist name
    async updateTherapistName(therapistId, newName) {
        try {
            await db.collection('therapists').doc(therapistId).update({
                name: newName
            });
            
            // Reload and update display
            await this.loadTherapists();
            this.renderTherapistList();
            
            console.log('Updated therapist name:', therapistId, newName);
            
        } catch (error) {
            console.error('Error updating therapist name:', error);
            alert('ไม่สามารถอัพเดทชื่อหมอนวดได้');
        }
    }

    // Delete therapist
    async deleteTherapist(therapistId) {
        const therapist = this.therapists.find(t => t.id === therapistId);
        if (!therapist) return;
        
        if (!confirm(`คุณต้องการลบหมอนวด "${therapist.name}" หรือไม่?\\n\\nคำเตือน: การจองทั้งหมดของหมอนวดนี้จะถูกลบด้วย`)) {
            return;
        }
        
        try {
            // Delete all bookings for this therapist
            const bookingsSnapshot = await db.collection('bookings')
                .where('therapistId', '==', therapistId)
                .get();
            
            const deletePromises = bookingsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);
            
            // Delete therapist
            await db.collection('therapists').doc(therapistId).delete();
            
            // Reload and update display
            await this.loadTherapists();
            this.renderTherapistList();
            
            console.log('Deleted therapist and all bookings:', therapistId);
            
        } catch (error) {
            console.error('Error deleting therapist:', error);
            alert('ไม่สามารถลบหมอนวดได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Setup drag-and-drop for the therapist list container
    // Returns a cleanup function to remove document-level listeners
    setupDragAndDrop(container) {
        let dragItem = null;
        let startY = 0;
        const self = this;

        function getClientY(e) {
            return e.touches ? e.touches[0].clientY : e.clientY;
        }

        function onStart(e) {
            const handle = e.target.closest('.drag-handle');
            if (!handle) return;
            const item = handle.closest('.therapist-item');
            if (!item) return;

            e.preventDefault();
            dragItem = item;
            startY = getClientY(e);
            item.classList.add('dragging');
        }

        function onMove(e) {
            if (!dragItem) return;
            e.preventDefault();

            const y = getClientY(e);
            const deltaY = y - startY;
            dragItem.style.transform = `translateY(${deltaY}px)`;
            dragItem.style.zIndex = '1000';

            // Find where to insert based on cursor position
            const siblings = [...container.querySelectorAll('.therapist-item:not(.dragging)')];
            const afterElement = siblings.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child };
                }
                return closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;

            // Only move in DOM if position actually changed
            const currentNext = dragItem.nextElementSibling;
            const needsMove = (afterElement == null && currentNext != null) ||
                              (afterElement != null && afterElement !== dragItem && afterElement !== currentNext);

            if (needsMove) {
                if (afterElement == null) {
                    container.appendChild(dragItem);
                } else {
                    container.insertBefore(dragItem, afterElement);
                }
                // Reset startY after DOM reorder so transform recalculates
                // from the new natural position — prevents visual jump
                startY = y;
                dragItem.style.transform = 'translateY(0px)';
            }
        }

        function onEnd() {
            if (!dragItem) return;
            dragItem.classList.remove('dragging');
            dragItem.style.transform = '';
            dragItem.style.zIndex = '';
            dragItem = null;
            self.updateTherapistOrders();
        }

        container.addEventListener('mousedown', onStart);
        container.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);

        // Return cleanup function
        return function cleanup() {
            container.removeEventListener('mousedown', onStart);
            container.removeEventListener('touchstart', onStart);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchend', onEnd);
        };
    }

    // Update therapist display orders based on current DOM order
    async updateTherapistOrders() {
        try {
            const items = document.querySelectorAll('.therapist-item');
            const updates = [];

            items.forEach((item, index) => {
                const therapistId = item.dataset.therapistId;
                const newOrder = index + 1;

                // Update local data
                const therapist = this.therapists.find(t => t.id === therapistId);
                if (therapist) therapist.displayOrder = newOrder;

                // Update the order label in DOM
                const orderLabel = item.querySelector('.therapist-order');
                if (orderLabel) orderLabel.textContent = `ลำดับที่ ${newOrder}`;

                updates.push(
                    db.collection('therapists').doc(therapistId).update({
                        displayOrder: newOrder
                    })
                );
            });

            await Promise.all(updates);
            console.log('Updated therapist display orders');

        } catch (error) {
            console.error('Error updating therapist orders:', error);
            alert('ไม่สามารถจัดเรียงลำดับหมอนวดได้');
            // On error, reload to restore correct state
            await this.loadTherapists();
            this.renderTherapistList();
        }
    }

    // Service Management Methods

    // Render service list
    renderServiceList() {
        const container = document.getElementById('serviceList');
        const serviceItems = container.querySelectorAll('.service-item');
        
        // Clear existing service items (but keep the init button)
        serviceItems.forEach(item => item.remove());
        
        if (this.services.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = '#666';
            emptyMsg.textContent = 'ไม่มีบริการในระบบ กดปุ่ม "สร้างข้อมูลบริการเริ่มต้น" เพื่อเริ่มใช้งาน';
            container.appendChild(emptyMsg);
            return;
        }
        
        this.services.forEach((service) => {
            const item = this.createServiceItem(service);
            container.appendChild(item);
        });
    }

    // Create individual service item
    createServiceItem(service) {
        const item = document.createElement('div');
        item.className = 'service-item';
        item.dataset.serviceId = service.id;
        
        const pricingHTML = service.durations.map(duration => `
            <div class="price-option">
                <div class="duration">${duration.duration} นาที</div>
                <div class="price">${duration.price} บาท</div>
                <div class="therapist-fee">ค่ามือ: ${duration.therapistFee || 0} บาท</div>
            </div>
        `).join('');
        
        item.innerHTML = `
            <div class="service-header">
                <div class="service-details">
                    <div class="service-name">${service.name}</div>
                    <span class="service-category">${this.getCategoryDisplayName(service.category)}</span>
                </div>
                <div class="service-controls">
                    <button class="toggle-visibility ${service.status === 'active' ? 'active' : ''}" 
                            data-service-id="${service.id}" 
                            title="${service.status === 'active' ? 'ซ่อนบริการ' : 'แสดงบริการ'}">
                    </button>
                    <button class="edit-therapist" data-service-id="${service.id}">แก้ไข</button>
                    <button class="delete-therapist" data-service-id="${service.id}">ลบ</button>
                </div>
            </div>
            <div class="service-pricing">
                ${pricingHTML}
            </div>
        `;
        
        // Add event listeners
        item.querySelector('.toggle-visibility').addEventListener('click', () => {
            this.toggleServiceVisibility(service.id);
        });
        
        item.querySelector('.edit-therapist').addEventListener('click', () => {
            this.editService(service.id);
        });
        
        item.querySelector('.delete-therapist').addEventListener('click', () => {
            this.deleteService(service.id);
        });
        
        return item;
    }

    // Get display name for service category
    getCategoryDisplayName(category) {
        const categories = {
            'traditional': 'นวดแผนไทย',
            'therapeutic': 'นวดเพื่อการรักษา',
            'aroma': 'อโรมาเทอราปี',
            'spa': 'สปา & ผิวพรรณ',
            'combination': 'บริการผสมผสาน'
        };
        return categories[category] || category;
    }

    // Add duration row to service form
    addDurationRow() {
        const container = document.getElementById('serviceDurations');
        const addButton = document.getElementById('addDuration');
        
        const durationRow = document.createElement('div');
        durationRow.className = 'duration-row';
        durationRow.innerHTML = `
            <select class="duration-select">
                <option value="30">30 นาที</option>
                <option value="60">60 นาที</option>
                <option value="90">90 นาที</option>
                <option value="120">120 นาที</option>
            </select>
            <input type="number" class="price-input" placeholder="ราคา (บาท)" min="0">
            <input type="number" class="therapist-fee-input" placeholder="ค่ามือ (บาท)" min="0">
            <button type="button" class="btn-remove-duration">×</button>
        `;
        
        // Add remove listener
        durationRow.querySelector('.btn-remove-duration').addEventListener('click', () => {
            durationRow.remove();
        });
        
        container.insertBefore(durationRow, addButton);
    }

    // Add duration row for editing (with default values)
    addEditDurationRow(duration = null, price = null, therapistFee = null) {
        const container = document.getElementById('editServiceDurations');
        
        const durationRow = document.createElement('div');
        durationRow.className = 'duration-row';
        durationRow.innerHTML = `
            <select class="duration-select">
                <option value="30" ${duration === 30 ? 'selected' : ''}>30 นาที</option>
                <option value="60" ${duration === 60 ? 'selected' : ''}>60 นาที</option>
                <option value="90" ${duration === 90 ? 'selected' : ''}>90 นาที</option>
                <option value="120" ${duration === 120 ? 'selected' : ''}>120 นาที</option>
                <option value="150" ${duration === 150 ? 'selected' : ''}>150 นาที</option>
                <option value="180" ${duration === 180 ? 'selected' : ''}>180 นาที</option>
            </select>
            <input type="number" class="price-input" placeholder="ราคา (บาท)" min="0" value="${price || ''}">
            <input type="number" class="therapist-fee-input" placeholder="ค่ามือ (บาท)" min="0" value="${therapistFee || ''}">
            <button type="button" class="btn-remove-duration">×</button>
        `;
        
        // Add remove listener
        durationRow.querySelector('.btn-remove-duration').addEventListener('click', () => {
            durationRow.remove();
        });
        
        container.appendChild(durationRow);
    }

    // Handle add service form submission
    async handleAddService(e) {
        e.preventDefault();
        
        const name = document.getElementById('serviceName').value.trim();
        const category = document.getElementById('serviceCategory').value;
        
        if (!name || !category) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        // Collect duration, price, and therapist fee data
        const durationRows = document.querySelectorAll('.duration-row');
        const durations = [];
        
        for (const row of durationRows) {
            const duration = parseInt(row.querySelector('.duration-select').value);
            const price = parseInt(row.querySelector('.price-input').value);
            const therapistFee = parseInt(row.querySelector('.therapist-fee-input').value);
            
            if (duration && price > 0 && therapistFee >= 0) {
                durations.push({ duration, price, therapistFee });
            }
        }
        
        if (durations.length === 0) {
            alert('กรุณาเพิ่มระยะเวลา ราคา และค่ามืออย่างน้อย 1 รายการ');
            return;
        }
        
        try {
            // Get next service ID (S001, S002, etc.)
            const nextServiceId = await this.getNextServiceId();
            
            // Get next display order
            const nextOrder = this.services.length > 0 
                ? Math.max(...this.services.map(s => s.displayOrder)) + 1 
                : 1;
            
            const service = {
                name: name,
                category: category,
                durations: durations.sort((a, b) => a.duration - b.duration),
                status: 'active',
                displayOrder: nextOrder,
                createdAt: firebase.firestore.Timestamp.now()
            };
            
            await db.collection('services').doc(nextServiceId).set(service);
            
            // Reload services and update display
            await this.loadServices();
            this.renderServiceList();
            
            // Clear form
            document.getElementById('serviceName').value = '';
            document.getElementById('serviceCategory').value = '';
            
            // Reset duration inputs to just one row
            const durationContainer = document.getElementById('serviceDurations');
            const existingRows = durationContainer.querySelectorAll('.duration-row');
            
            // Remove all but first row
            for (let i = 1; i < existingRows.length; i++) {
                existingRows[i].remove();
            }
            
            // Clear first row
            if (existingRows[0]) {
                existingRows[0].querySelector('.duration-select').value = '30';
                existingRows[0].querySelector('.price-input').value = '';
            }
            
            console.log('Added new service with ID:', nextServiceId, service);
            
        } catch (error) {
            console.error('Error adding service:', error);
            alert('ไม่สามารถเพิ่มบริการได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Get next service ID in format S001, S002, S003, etc.
    async getNextServiceId() {
        try {
            const snapshot = await db.collection('services').get();
            
            const existingIds = snapshot.docs
                .map(doc => doc.id)
                .filter(id => /^S\d{3}$/.test(id))
                .map(id => parseInt(id.substring(1)))
                .sort((a, b) => a - b);
            
            let nextNumber = 1;
            for (const num of existingIds) {
                if (num === nextNumber) {
                    nextNumber++;
                } else {
                    break;
                }
            }
            
            return `S${nextNumber.toString().padStart(3, '0')}`;
            
        } catch (error) {
            console.error('Error getting next service ID:', error);
            const timestamp = Date.now().toString().slice(-3);
            return `S${timestamp}`;
        }
    }

    // Toggle service visibility
    async toggleServiceVisibility(serviceId) {
        try {
            const service = this.services.find(s => s.id === serviceId);
            if (!service) return;
            
            const newStatus = service.status === 'active' ? 'inactive' : 'active';
            
            await db.collection('services').doc(serviceId).update({
                status: newStatus
            });
            
            await this.loadServices();
            this.renderServiceList();
            
            console.log('Updated service status:', serviceId, newStatus);
            
        } catch (error) {
            console.error('Error updating service status:', error);
            alert('ไม่สามารถอัพเดทสถานะบริการได้');
        }
    }

    // Edit service - Open edit modal
    editService(serviceId) {
        this.currentEditingServiceId = serviceId;
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        // Populate modal with service data
        document.getElementById('editServiceName').value = service.name;
        document.getElementById('editServiceCategory').value = service.category;
        
        // Clear and populate duration rows
        const durationsContainer = document.getElementById('editServiceDurations');
        durationsContainer.innerHTML = '';
        
        service.durations.forEach(duration => {
            this.addEditDurationRow(duration.duration, duration.price, duration.therapistFee);
        });
        
        // Show modal
        document.getElementById('editServiceModal').style.display = 'flex';
    }
    
    // Close edit service modal
    closeEditServiceModal() {
        document.getElementById('editServiceModal').style.display = 'none';
        this.currentEditingServiceId = null;
    }
    
    // Handle edit service form submission
    async handleEditServiceSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('editServiceName').value.trim();
        const category = document.getElementById('editServiceCategory').value;
        
        if (!name || !category) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // Collect duration, price, and therapist fee data
        const durationRows = document.querySelectorAll('#editServiceDurations .duration-row');
        const durations = [];
        
        for (const row of durationRows) {
            const duration = parseInt(row.querySelector('.duration-select').value);
            const price = parseInt(row.querySelector('.price-input').value);
            const therapistFee = parseInt(row.querySelector('.therapist-fee-input').value);
            
            if (price && price > 0 && therapistFee >= 0) {
                durations.push({ duration, price, therapistFee });
            }
        }
        
        if (durations.length === 0) {
            alert('กรุณาเพิ่มอย่างน้อยหนึ่งระยะเวลาพร้อมราคาและค่ามือ');
            return;
        }
        
        try {
            const updatedService = {
                name: name,
                category: category,
                durations: durations.sort((a, b) => a.duration - b.duration)
            };
            
            await db.collection('services').doc(this.currentEditingServiceId).update(updatedService);
            
            // Reload services and update display
            await this.loadServices();
            this.renderServiceList();
            
            // Close modal
            this.closeEditServiceModal();
            
            console.log('Updated service:', this.currentEditingServiceId, updatedService);
            
        } catch (error) {
            console.error('Error updating service:', error);
            alert('ไม่สามารถอัพเดทบริการได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Delete service
    async deleteService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        if (!confirm(`คุณต้องการลบบริการ "${service.name}" หรือไม่?`)) {
            return;
        }
        
        try {
            await db.collection('services').doc(serviceId).delete();
            
            await this.loadServices();
            this.renderServiceList();
            
            console.log('Deleted service:', serviceId);
            
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('ไม่สามารถลบบริการได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Initialize default services
    async initializeDefaultServices() {
        if (!confirm('คุณต้องการสร้างข้อมูลบริการเริ่มต้นหรือไม่? ข้อมูลนี้จะเพิ่มบริการมาตรฐานของร้านนวด')) {
            return;
        }

        const defaultServices = [
            {
                id: 'S001',
                name: 'นวดไทย / นวดเท้า (Thai Traditional / Foot Massage)',
                category: 'traditional',
                durations: [
                    { duration: 30, price: 290, therapistFee: 60 },
                    { duration: 60, price: 390, therapistFee: 120 },
                    { duration: 90, price: 590, therapistFee: 180 },
                    { duration: 120, price: 790, therapistFee: 240 }
                ],
                status: 'active',
                displayOrder: 1
            },
            {
                id: 'S002',
                name: 'นวดรีดเส้น (Deep Tissue Massage)',
                category: 'therapeutic',
                durations: [
                    { duration: 30, price: 390, therapistFee: 90 },
                    { duration: 60, price: 490, therapistFee: 180 },
                    { duration: 90, price: 690, therapistFee: 270 },
                    { duration: 120, price: 890, therapistFee: 360 }
                ],
                status: 'active',
                displayOrder: 2
            },
            {
                id: 'S003',
                name: 'นวดคอ บ่า ไหล่ (Neck Shoulder Massage)',
                category: 'therapeutic',
                durations: [
                    { duration: 30, price: 390, therapistFee: 90 },
                    { duration: 60, price: 490, therapistFee: 180 },
                    { duration: 90, price: 690, therapistFee: 270 },
                    { duration: 120, price: 890, therapistFee: 360 }
                ],
                status: 'active',
                displayOrder: 3
            },
            {
                id: 'S004',
                name: 'นวดสปอร์ต (Sports Massage)',
                category: 'therapeutic',
                durations: [
                    { duration: 60, price: 490, therapistFee: 200 },
                    { duration: 90, price: 690, therapistFee: 300 },
                    { duration: 120, price: 890, therapistFee: 400 }
                ],
                status: 'active',
                displayOrder: 4
            },
            {
                id: 'S005',
                name: 'นวดอโรม่า (Aroma Massage)',
                category: 'aroma',
                durations: [
                    { duration: 60, price: 490, therapistFee: 200 },
                    { duration: 90, price: 690, therapistFee: 300 },
                    { duration: 120, price: 890, therapistFee: 400 }
                ],
                status: 'active',
                displayOrder: 5
            },
            {
                id: 'S006',
                name: 'นวดอโรม่า + รีดเส้น (Aroma + Deep Tissue)',
                category: 'combination',
                durations: [
                    { duration: 90, price: 790, therapistFee: 300 },
                    { duration: 120, price: 990, therapistFee: 400 }
                ],
                status: 'active',
                displayOrder: 6
            },
            {
                id: 'S007',
                name: 'นวดอโรม่า + ประคบสมุนไพร (Aroma + Herbal Compress)',
                category: 'combination',
                durations: [
                    { duration: 90, price: 890, therapistFee: 300 },
                    { duration: 120, price: 1090, therapistFee: 400 }
                ],
                status: 'active',
                displayOrder: 7
            },
            {
                id: 'S008',
                name: 'นวดไทย + ประคบสมุนไพร (Thai Massage + Herbal Compress)',
                category: 'combination',
                durations: [
                    { duration: 60, price: 590, therapistFee: 200 },
                    { duration: 90, price: 790, therapistFee: 300 },
                    { duration: 120, price: 990, therapistFee: 400 }
                ],
                status: 'active',
                displayOrder: 8
            },
            {
                id: 'S009',
                name: 'ขัดผิว (Body Scrub)',
                category: 'spa',
                durations: [
                    { duration: 60, price: 490, therapistFee: 200 }
                ],
                status: 'active',
                displayOrder: 9
            },
            {
                id: 'S010',
                name: 'ขัดผิว + อโรมา (Scrub + Aroma Massage)',
                category: 'combination',
                durations: [
                    { duration: 90, price: 890, therapistFee: 300 },
                    { duration: 120, price: 1090, therapistFee: 400 }
                ],
                status: 'active',
                displayOrder: 10
            }
        ];

        try {
            const batch = db.batch();
            
            defaultServices.forEach(service => {
                const serviceRef = db.collection('services').doc(service.id);
                batch.set(serviceRef, {
                    ...service,
                    createdAt: firebase.firestore.Timestamp.now()
                });
            });
            
            await batch.commit();
            
            await this.loadServices();
            this.renderServiceList();
            
            alert('สร้างข้อมูลบริการเริ่มต้นเรียบร้อยแล้ว!');
            console.log('Initialized default services');
            
        } catch (error) {
            console.error('Error initializing default services:', error);
            alert('ไม่สามารถสร้างข้อมูลบริการเริ่มต้นได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Migrate old bookings to add therapist fees
    async migratePatchTherapistFees() {
        if (!confirm('คุณต้องการเติมค่ามือในการจองเก่าหรือไม่?\n\nระบบจะอัพเดทการจองที่ยังไม่มีค่ามือให้โดยอัตโนมัติ')) {
            return;
        }

        try {
            // Load services first if not loaded
            if (!this.services || this.services.length === 0) {
                await this.loadServices();
            }

            // Get all bookings without therapistFee but have serviceId
            const bookingsSnapshot = await db.collection('bookings').get();
            const bookingsToUpdate = [];

            bookingsSnapshot.docs.forEach(doc => {
                const booking = { id: doc.id, ...doc.data() };
                
                // Check if booking needs migration
                if ((!booking.therapistFee || booking.therapistFee === 0) && booking.serviceId) {
                    const service = this.services.find(s => s.id === booking.serviceId);
                    
                    if (service && service.durations) {
                        // Calculate duration if not stored
                        const duration = booking.duration || this.calculateDuration(booking.startTime, booking.endTime);
                        const durationOption = service.durations.find(d => d.duration === duration);
                        
                        if (durationOption && durationOption.therapistFee !== undefined) {
                            bookingsToUpdate.push({
                                id: booking.id,
                                therapistFee: durationOption.therapistFee,
                                serviceName: service.name,
                                duration: duration
                            });
                        }
                    }
                }
            });

            if (bookingsToUpdate.length === 0) {
                alert('ไม่พบการจองที่ต้องการอัพเดท ทุกการจองมีค่ามือครบถ้วนแล้ว');
                return;
            }

            // Batch update bookings
            const batch = db.batch();
            
            bookingsToUpdate.forEach(update => {
                const bookingRef = db.collection('bookings').doc(update.id);
                batch.update(bookingRef, {
                    therapistFee: update.therapistFee
                });
            });

            await batch.commit();

            // Show results
            const updateSummary = bookingsToUpdate.map(update => 
                `- ${update.serviceName} ${update.duration}นาที: ${update.therapistFee}฿`
            ).join('\n');

            alert(`อัพเดทค่ามือเรียบร้อยแล้ว!\n\nอัพเดท ${bookingsToUpdate.length} การจอง:\n\n${updateSummary}`);
            
            console.log('Migration completed:', bookingsToUpdate.length, 'bookings updated');

        } catch (error) {
            console.error('Error migrating therapist fees:', error);
            alert('เกิดข้อผิดพลาดในการอัพเดทค่ามือ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Helper function to calculate duration from start and end times
    calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 60; // default fallback
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        return endTotalMinutes - startTotalMinutes;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Saba-i Settings Manager...');
    window.settingsApp = new SabaiSettingsManager();
});