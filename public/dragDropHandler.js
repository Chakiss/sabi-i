// Drag-and-Drop handler for moving bookings between therapists
class SabaiDragDropHandler {
    constructor(app) {
        this.app = app;
        this.dragState = null;
        this.longPressTimer = null;
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
    }

    // Called after each calendar render to attach listeners
    init() {
        const container = document.getElementById('calendarWithHeaders');
        if (!container) return;

        // Remove old listener before re-attaching (idempotent)
        container.removeEventListener('mousedown', this._onContainerDown);
        container.removeEventListener('touchstart', this._onContainerDown);

        this._onContainerDown = this._handlePointerDown.bind(this);
        container.addEventListener('mousedown', this._onContainerDown);
        container.addEventListener('touchstart', this._onContainerDown, { passive: true });
    }

    _getClientXY(e) {
        if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }

    _handlePointerDown(e) {
        // Only start on booked slots
        const slot = e.target.closest('.booking-slot.booked');
        if (!slot) return;

        const bookingId = slot.dataset.bookingId;
        if (!bookingId) return;

        const { x, y } = this._getClientXY(e);
        const isTouch = !!e.touches;

        this.dragState = {
            bookingId,
            originalTherapistId: slot.dataset.therapistId,
            startX: x,
            startY: y,
            activated: false,
            isTouch,
            currentTargetTherapistId: null
        };

        // Touch: long-press 300ms to activate; Mouse: activate on move
        if (isTouch) {
            this.longPressTimer = setTimeout(() => {
                this._activateDrag();
            }, 300);
        }

        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', this._onPointerMove, { passive: false });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', this._onPointerUp);
    }

    _activateDrag() {
        if (!this.dragState) return;
        this.dragState.activated = true;
        this.app.isDragging = true;

        const container = document.getElementById('calendarWithHeaders');

        // Mark all slots of this booking as dragging source
        container.querySelectorAll(`.booking-slot[data-booking-id="${this.dragState.bookingId}"]`).forEach(el => {
            el.classList.add('dragging-source');
        });

        // Prevent scroll on touch
        if (this.dragState.isTouch) {
            container.style.touchAction = 'none';
        }

        // Create ghost
        const booking = this.app.bookings.find(b => b.id === this.dragState.bookingId);
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        const serviceName = booking && booking.serviceId
            ? (this.app.dataService.getServiceName(booking.serviceId, this.app.services) || '')
            : '';
        ghost.textContent = serviceName || `${booking?.duration || 60} นาที`;
        document.body.appendChild(ghost);
        this.dragState.ghostElement = ghost;

        // Position ghost at start
        ghost.style.left = this.dragState.startX + 'px';
        ghost.style.top = this.dragState.startY + 'px';
    }

    _onPointerMove(e) {
        if (!this.dragState) return;
        const { x, y } = this._getClientXY(e);

        // Before activation: check movement to cancel long-press if scrolling
        if (!this.dragState.activated) {
            const dx = Math.abs(x - this.dragState.startX);
            const dy = Math.abs(y - this.dragState.startY);

            if (this.dragState.isTouch) {
                // Cancel long-press if moved too much
                if (dx > 10 || dy > 10) {
                    this._cancelDrag();
                    return;
                }
            } else {
                // Mouse: activate after small horizontal move
                if (dx > 5) {
                    this._activateDrag();
                } else {
                    return;
                }
            }
        }

        if (!this.dragState.activated) return;
        e.preventDefault();

        // Move ghost
        const ghost = this.dragState.ghostElement;
        if (ghost) {
            ghost.style.left = x + 'px';
            ghost.style.top = y + 'px';
        }

        // Hit-test: hide ghost, find element under pointer
        if (ghost) ghost.style.display = 'none';
        const elementUnder = document.elementFromPoint(x, y);
        if (ghost) ghost.style.display = '';

        const targetSlot = elementUnder ? elementUnder.closest('.booking-slot') : null;
        const targetTherapistId = targetSlot ? targetSlot.dataset.therapistId : null;

        // Update highlight
        if (targetTherapistId !== this.dragState.currentTargetTherapistId) {
            // Remove old highlights
            document.querySelectorAll('.booking-slot.drag-over').forEach(el => el.classList.remove('drag-over'));

            if (targetTherapistId && targetTherapistId !== this.dragState.originalTherapistId) {
                const container = document.getElementById('calendarWithHeaders');
                container.querySelectorAll(`.booking-slot[data-therapist-id="${targetTherapistId}"]`).forEach(el => {
                    if (!el.classList.contains('booked')) el.classList.add('drag-over');
                });
            }
            this.dragState.currentTargetTherapistId = targetTherapistId;
        }
    }

    _onPointerUp(e) {
        if (!this.dragState) return;

        const activated = this.dragState.activated;
        const targetTherapistId = this.dragState.currentTargetTherapistId;
        const originalTherapistId = this.dragState.originalTherapistId;
        const bookingId = this.dragState.bookingId;

        this._cleanupDrag();

        if (!activated) return; // Was a tap, let click handler fire

        // If dropped on a different therapist, move the booking
        if (targetTherapistId && targetTherapistId !== originalTherapistId) {
            this._moveBooking(bookingId, targetTherapistId);
        }
    }

    async _moveBooking(bookingId, targetTherapistId) {
        const booking = this.app.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        // Conflict check — convert Firestore Timestamps to Date for comparison
        const startTime = booking.startTime.seconds
            ? new Date(booking.startTime.seconds * 1000)
            : booking.startTime;
        const endTime = booking.endTime.seconds
            ? new Date(booking.endTime.seconds * 1000)
            : booking.endTime;
        const conflictCheck = {
            therapistId: targetTherapistId,
            startTime,
            endTime
        };
        const hasConflict = this.app.dataService.checkBookingConflict(
            this.app.bookings,
            conflictCheck,
            bookingId
        );

        if (hasConflict) {
            alert('หมอนวดคนนี้มีการจองในช่วงเวลานี้แล้ว');
            return;
        }

        // Get target therapist name for confirmation
        const targetTherapist = this.app.therapists.find(t => t.id === targetTherapistId);
        const targetName = targetTherapist ? targetTherapist.name : targetTherapistId;

        try {
            await this.app.dataService.db.collection('bookings').doc(bookingId).update({
                therapistId: targetTherapistId
            });
            log('✅ Booking moved to therapist:', targetName);
        } catch (error) {
            console.error('Error moving booking:', error);
            alert('ไม่สามารถย้ายการจองได้ กรุณาลองใหม่');
        }
    }

    _cancelDrag() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this._removeListeners();
        this.dragState = null;
    }

    _cleanupDrag() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        // Remove ghost
        if (this.dragState && this.dragState.ghostElement) {
            this.dragState.ghostElement.remove();
        }

        // Remove visual classes
        document.querySelectorAll('.dragging-source').forEach(el => el.classList.remove('dragging-source'));
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        // Restore touch-action
        const container = document.getElementById('calendarWithHeaders');
        if (container) container.style.touchAction = '';

        this.app.isDragging = false;
        this._removeListeners();
        this.dragState = null;
    }

    _removeListeners() {
        document.removeEventListener('mousemove', this._onPointerMove);
        document.removeEventListener('touchmove', this._onPointerMove);
        document.removeEventListener('mouseup', this._onPointerUp);
        document.removeEventListener('touchend', this._onPointerUp);
    }
}

window.SabaiDragDropHandler = SabaiDragDropHandler;
