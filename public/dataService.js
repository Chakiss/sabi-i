// Data Service for Firebase Operations
class SabaiDataService {
    constructor() {
        this.db = window.db;
        this.bookingsListener = null;
        this.therapistsListener = null;
        this.currentDateKey = null;
    }

    // Real-time booking operations
    setupBookingsRealTimeListener(date, callback) {
        try {
            const dateKey = SabaiUtils.formatDateKey(date);
            
            // Clean up existing listener if date changed
            if (this.bookingsListener && this.currentDateKey !== dateKey) {
                console.log('🔄 Date changed, cleaning up old booking listener...');
                this.bookingsListener();
                this.bookingsListener = null;
            }
            
            // Only create new listener if we don't have one for this date
            if (!this.bookingsListener || this.currentDateKey !== dateKey) {
                console.log('🔥 Setting up real-time booking listener for:', dateKey);
                this.currentDateKey = dateKey;
                
                this.bookingsListener = this.db.collection('bookings')
                    .where('dateKey', '==', dateKey)
                    .onSnapshot((snapshot) => {
                        const bookings = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        
                        console.log('📡 Real-time booking update for', dateKey, ':', bookings.length, 'bookings');
                        
                        // Call the callback with updated data
                        if (callback) {
                            callback(bookings);
                        }
                    }, (error) => {
                        console.error('❌ Real-time booking listener error:', error);
                    });
            }
            
        } catch (error) {
            console.error('Error setting up bookings real-time listener:', error);
            throw error;
        }
    }
    
    // Real-time therapist operations  
    setupTherapistsRealTimeListener(callback) {
        try {
            // Only create listener if we don't have one
            if (!this.therapistsListener) {
                console.log('🔥 Setting up real-time therapist listener...');
                
                this.therapistsListener = this.db.collection('therapists')
                    .orderBy('displayOrder')
                    .limit(CONFIG.MAX_THERAPISTS)
                    .onSnapshot((snapshot) => {
                        const therapists = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        
                        console.log('📡 Real-time therapist update:', therapists.length, 'therapists');
                        
                        // Call the callback with updated data
                        if (callback) {
                            callback(therapists);
                        }
                    }, (error) => {
                        console.error('❌ Real-time therapist listener error:', error);
                    });
            }
            
        } catch (error) {
            console.error('Error setting up therapists real-time listener:', error);
            throw error;
        }
    }
    
    // Cleanup all listeners
    cleanup() {
        console.log('🧹 Cleaning up all real-time listeners...');
        
        if (this.bookingsListener) {
            this.bookingsListener();
            this.bookingsListener = null;
        }
        
        if (this.therapistsListener) {
            this.therapistsListener();
            this.therapistsListener = null;
        }
        
        this.currentDateKey = null;
        console.log('✅ All listeners cleaned up');
    }

    // Therapist operations
    async getTherapists() {
        try {
            const snapshot = await this.db.collection('therapists')
                .orderBy('displayOrder')
                .limit(CONFIG.MAX_THERAPISTS)
                .get();
                
            const therapists = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded therapists:', therapists);
            return therapists;
            
        } catch (error) {
            console.error('Error loading therapists:', error);
            throw error;
        }
    }

    // Booking operations  
    async getBookingsByDate(date) {
        try {
            const dateKey = SabaiUtils.formatDateKey(date);
            const snapshot = await this.db.collection('bookings')
                .where('dateKey', '==', dateKey)
                .get();
                
            const bookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded bookings for', dateKey, ':', bookings);
            return bookings;
            
        } catch (error) {
            console.error('Error loading bookings:', error);
            throw error;
        }
    }

    async createBooking(data) {
        try {
            const bookingId = SabaiUtils.generateBookingId();
            
            const booking = {
                therapistId: data.therapistId,
                startTime: firebase.firestore.Timestamp.fromDate(data.startTime),
                endTime: firebase.firestore.Timestamp.fromDate(data.endTime),
                dateKey: data.dateKey,
                duration: data.duration,
                price: data.price,
                discount: data.discount || 0,
                therapistFee: data.therapistFee,
                serviceId: data.serviceId,
                paymentMethod: data.paymentMethod,
                note: data.note,
                createdAt: firebase.firestore.Timestamp.now()
            };
            
            // Clean up null/empty fields
            this._cleanBookingData(booking);
            
            await this.db.collection('bookings').doc(bookingId).set(booking);
            console.log('Created new booking with ID:', bookingId, booking);
            
            return booking;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    async updateBooking(bookingId, data) {
        try {
            const booking = {
                therapistId: data.therapistId,
                startTime: firebase.firestore.Timestamp.fromDate(data.startTime),
                endTime: firebase.firestore.Timestamp.fromDate(data.endTime),
                dateKey: data.dateKey,
                duration: data.duration,
                price: data.price,
                discount: data.discount || 0,
                therapistFee: data.therapistFee,
                serviceId: data.serviceId,
                paymentMethod: data.paymentMethod,
                note: data.note
            };
            
            // Clean up null/empty fields
            this._cleanBookingData(booking);
            
            await this.db.collection('bookings').doc(bookingId).update(booking);
            console.log('Updated booking:', booking);
            
            return booking;
        } catch (error) {
            console.error('Error updating booking:', error);
            throw error;
        }
    }

    async deleteBooking(bookingId) {
        try {
            await this.db.collection('bookings').doc(bookingId).delete();
            console.log('Deleted booking:', bookingId);
        } catch (error) {
            console.error('Error deleting booking:', error);
            throw error;
        }
    }

    // Service operations
    async getServices() {
        try {
            const snapshot = await this.db.collection('services')
                .orderBy('displayOrder')
                .get();
                
            const services = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded services:', services);
            return services;
            
        } catch (error) {
            console.error('Error loading services:', error);
            // Don't throw error to prevent blocking app initialization
            return [];
        }
    }

    // Helper methods
    _cleanBookingData(booking) {
        if (!booking.serviceId) {
            delete booking.serviceId;
        }
        if (!booking.paymentMethod) {
            delete booking.paymentMethod;
        }
        if (!booking.note || booking.note.trim() === '') {
            delete booking.note;
        }
    }

    // Utility methods for bookings
    getServiceName(serviceId, services) {
        if (!serviceId) return null;
        const service = services.find(s => s.id === serviceId);
        return service ? service.name : null;
    }

    findBookingForSlot(bookings, therapistId, timeSlot, currentDate) {
        const slotTime = SabaiUtils.parseTimeSlot(timeSlot, currentDate);
        
        return bookings.find(booking => {
            if (booking.therapistId !== therapistId) return false;
            
            const startTime = new Date(booking.startTime.seconds * 1000);
            const endTime = new Date(booking.endTime.seconds * 1000);
            
            return slotTime >= startTime && slotTime < endTime;
        });
    }

    isFirstSlotOfBooking(booking, timeSlot, currentDate) {
        const slotTime = SabaiUtils.parseTimeSlot(timeSlot, currentDate);
        const startTime = new Date(booking.startTime.seconds * 1000);
        
        const timeDiff = Math.abs(slotTime.getTime() - startTime.getTime());
        return timeDiff < (CONFIG.SLOT_DURATION * 60 * 1000);
    }

    checkBookingConflict(bookings, newBooking, excludeBookingId = null) {
        console.log('🔍 Checking booking conflict for:', {
            therapist: newBooking.therapistId,
            startTime: newBooking.startTime,
            endTime: newBooking.endTime,
            excluding: excludeBookingId
        });
        
        const conflictingBooking = bookings.find(booking => {
            if (excludeBookingId && booking.id === excludeBookingId) {
                console.log('⏭️ Skipping own booking:', booking.id);
                return false;
            }
            
            if (booking.therapistId !== newBooking.therapistId) {
                return false;
            }
            
            const existingStart = new Date(booking.startTime.seconds * 1000);
            const existingEnd = new Date(booking.endTime.seconds * 1000);
            
            const hasOverlap = newBooking.startTime < existingEnd && newBooking.endTime > existingStart;
            
            if (hasOverlap) {
                console.log('❌ Found conflict with booking:', {
                    id: booking.id,
                    existing: `${existingStart.getHours().toString().padStart(2,'0')}:${existingStart.getMinutes().toString().padStart(2,'0')}-${existingEnd.getHours().toString().padStart(2,'0')}:${existingEnd.getMinutes().toString().padStart(2,'0')}`,
                    new: `${newBooking.startTime.getHours().toString().padStart(2,'0')}:${newBooking.startTime.getMinutes().toString().padStart(2,'0')}-${newBooking.endTime.getHours().toString().padStart(2,'0')}:${newBooking.endTime.getMinutes().toString().padStart(2,'0')}`
                });
            }
            
            return hasOverlap;
        });
        
        const hasConflict = conflictingBooking !== undefined;
        console.log(hasConflict ? '❌ Booking conflict detected' : '✅ No booking conflicts found');
        
        return hasConflict;
    }
}

// Export for use in other modules
window.SabaiDataService = SabaiDataService;