'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices, updateBookingStatus } from '@/lib/firestore';
import { dateTimeUtils } from '@/lib/dateTimeUtils';
import { 
 CalendarDaysIcon, 
 UserGroupIcon, 
 ClipboardDocumentListIcon, 
 CurrencyDollarIcon,
 SparklesIcon,
 ClockIcon,
 PlayCircleIcon,
 CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import EditBookingModal from '@/components/EditBookingModal';
import DiscountModal from '@/components/DiscountModal';
import BookingModal from '@/components/BookingModal';

export default function HomePage() {
 const [todayStats, setTodayStats] = useState({
 bookings: 0,
 activeTherapists: 0,
 totalRevenue: 0,
 completedSessions: 0,
 availableTherapists: [],
 availableCount: 0,
 busyTherapists: [],
 busyCount: 0
 });
 
 const [loading, setLoading] = useState(true);
 const [todayBookings, setTodayBookings] = useState([]);
 const [therapists, setTherapists] = useState([]);
 const [services, setServices] = useState([]);
 const [currentTime, setCurrentTime] = useState(new Date());
 
 // Queue management states
 const [editingBooking, setEditingBooking] = useState(null);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [completingBooking, setCompletingBooking] = useState(null);
 const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
 const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
 const [dragOverZone, setDragOverZone] = useState(null);

 // Touch drag and drop state for mobile/tablet support
 const [isDragging, setIsDragging] = useState(false);
 const [draggedBooking, setDraggedBooking] = useState(null);

 // Enhanced iPad performance state
 const [performanceMode, setPerformanceMode] = useState('normal');
 const [isRendering, setIsRendering] = useState(false);
 const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
 const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
 const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

 // Performance optimization for iPad
 const [isOnIpad, setIsOnIpad] = useState(false);
 const [isLowEndDevice, setIsLowEndDevice] = useState(false);
 const [isVeryLowEndDevice, setIsVeryLowEndDevice] = useState(false);
 const [lastTouchMove, setLastTouchMove] = useState(0);
 const [touchStarted, setTouchStarted] = useState(false);

 // Detect iPad for optimization
 useEffect(() => {
 const isIpadDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
 setIsOnIpad(isIpadDevice);
 
 // Detect low-end devices (iPad Air 2, etc.)
 const isLowEnd = isIpadDevice && (
 !CSS.supports('backdrop-filter', 'blur(10px)') ||
 navigator.hardwareConcurrency <= 2 ||
 navigator.deviceMemory <= 4
 );
 setIsLowEndDevice(isLowEnd);
 
 // Detect very low-end devices (iPad Air 2 iOS 15)
 const isVeryLowEnd = isIpadDevice && (
 navigator.hardwareConcurrency <= 2 &&
 (navigator.deviceMemory <= 2 || !navigator.deviceMemory) &&
 !window.DeviceMotionEvent?.requestPermission // iOS 15 feature detection
 );
 setIsVeryLowEndDevice(isVeryLowEnd);
 
 // Aggressive performance optimizations for low-end devices
 if (isLowEnd) {
 // Disable all visual effects
 document.documentElement.style.setProperty('--animation-duration', '0s');
 document.documentElement.style.setProperty('--transition-duration', '0s');
 document.documentElement.classList.add('low-end-device');
 
 if (isVeryLowEnd) {
 document.documentElement.classList.add('very-low-end-device');
 }
 
 // Reduce rendering complexity
 const style = document.createElement('style');
 style.textContent = `
 .low-end-device * {
 will-change: auto !important;
 transform: translateZ(0) !important;
 backface-visibility: hidden !important;
 }
 .low-end-device .no-transition {
 transition: none !important;
 animation: none !important;
 }
 .low-end-device [style*="backdrop-filter"] {
 backdrop-filter: none !important;
 -webkit-backdrop-filter: none !important;
 }
 .low-end-device [style*="blur"] {
 filter: none !important;
 }
 
 /* Very low-end device specific optimizations */
 .very-low-end-device .animate-pulse {
 animation: none !important;
 }
 .very-low-end-device .animate-bounce {
 animation: none !important;
 }
 .very-low-end-device .group:hover * {
 transform: none !important;
 }
 .very-low-end-device .shadow-xl,
 .very-low-end-device .shadow-2xl {
 box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
 }
 .very-low-end-device .gradient-bg {
 background: #F8F5F2 !important;
 }
 .very-low-end-device .hover\\:scale-105:hover {
 transform: none !important;
 }
 .very-low-end-device .hover\\:rotate-6:hover {
 transform: none !important;
 }
 `;
 document.head.appendChild(style);
 
 // Memory management for very low-end devices
 if (isVeryLowEnd) {
 const performGC = () => {
 if (window.gc) {
 window.gc();
 }
 // Force garbage collection by creating and releasing objects
 const temp = new Array(1000).fill(null);
 temp.length = 0;
 };
 
 // Periodic cleanup every 30 seconds
 const gcInterval = setInterval(performGC, 30000);
 
 // Additional CSS optimizations for very low-end devices
 const additionalStyle = document.createElement('style');
 additionalStyle.id = 'very-low-end-optimizations';
 additionalStyle.textContent = `
 /* Scrollbar optimization */
 .very-low-end-device ::-webkit-scrollbar {
 width: 8px !important;
 height: 8px !important;
 }
 .very-low-end-device ::-webkit-scrollbar-track {
 background: transparent !important;
 }
 .very-low-end-device ::-webkit-scrollbar-thumb {
 background-color: rgba(0,0,0,0.2) !important;
 border-radius: 4px !important;
 }
 
 /* Disable complex transforms */
 .very-low-end-device * {
 text-shadow: none !important;
 }
 
 /* Optimize overflow handling */
 .very-low-end-device .overflow-y-auto {
 -webkit-overflow-scrolling: touch !important;
 scroll-behavior: auto !important;
 }
 
 /* Disable pointer events during animations */
 .very-low-end-device.scrolling * {
 pointer-events: none !important;
 }
 `;
 document.head.appendChild(additionalStyle);
 
 return () => {
 clearInterval(gcInterval);
 const styleEl = document.getElementById('very-low-end-optimizations');
 if (styleEl) styleEl.remove();
 };
 }
 
 // Advanced Performance Mode Detection
 if (isVeryLowEnd) {
 setPerformanceMode('ultra');
 } else if (isLowEnd) {
 setPerformanceMode('high');
 } else {
 setPerformanceMode('normal');
 }
 
 // Enhanced scroll optimization for iPad
 let scrollTimeout;
 const handleScroll = () => {
 document.documentElement.classList.add('scrolling');
 clearTimeout(scrollTimeout);
 scrollTimeout = setTimeout(() => {
 document.documentElement.classList.remove('scrolling');
 }, 150);
 };
 
 window.addEventListener('scroll', handleScroll, { passive: true });
 window.addEventListener('touchmove', handleScroll, { passive: true });
 
 return () => {
 window.removeEventListener('scroll', handleScroll);
 window.removeEventListener('touchmove', handleScroll);
 clearTimeout(scrollTimeout);
 };
 }
 
 // Enhanced touch handling for iPad
 const optimizeTouchEvents = () => {
 // Throttle touch events to 30fps for very low-end devices
 let touchThrottle = false;
 const touchThrottleDelay = isVeryLowEndDevice ? 33 : 16; // 30fps vs 60fps
 
 const throttledTouchHandler = (e) => {
 if (touchThrottle) return;
 touchThrottle = true;
 
 setTimeout(() => {
 touchThrottle = false;
 }, touchThrottleDelay);
 };
 
 document.addEventListener('touchstart', throttledTouchHandler, { passive: true });
 document.addEventListener('touchmove', throttledTouchHandler, { passive: true });
 
 return () => {
 document.removeEventListener('touchstart', throttledTouchHandler);
 document.removeEventListener('touchmove', throttledTouchHandler);
 };
 };
 
 const touchCleanup = optimizeTouchEvents();
 
 return () => {
 touchCleanup();
 };
 
 // Reduce animations on older devices
 if (isIpadDevice && CSS.supports && !CSS.supports('backdrop-filter', 'blur(10px)')) {
 document.documentElement.style.setProperty('--animation-duration', '0s');
 }

 // Optimize scroll performance on iPad
 if (isIpadDevice) {
 const handleScroll = () => {
 // Minimal scroll handling for better performance
 };
 
 let ticking = false;
 const optimizedScroll = () => {
 if (!ticking) {
 requestAnimationFrame(() => {
 handleScroll();
 ticking = false;
 });
 ticking = true;
 }
 };
 
 // Add passive scroll listeners for better performance
 document.addEventListener('scroll', optimizedScroll, { passive: true });
 document.addEventListener('touchmove', optimizedScroll, { passive: true });
 
 return () => {
 document.removeEventListener('scroll', optimizedScroll);
 document.removeEventListener('touchmove', optimizedScroll);
 };
 }
 }, [isVeryLowEndDevice]);

 // Debounced resize handler for better performance
 useEffect(() => {
 let resizeTimeout;
 const handleResize = () => {
 clearTimeout(resizeTimeout);
 resizeTimeout = setTimeout(() => {
 // Handle resize logic for responsive design
 if (isVeryLowEndDevice) {
 // Force minimal layout recalculation for very low-end devices
 document.body.style.minHeight = window.innerHeight + 'px';
 }
 }, 250);
 };
 
 window.addEventListener('resize', handleResize, { passive: true });
 return () => {
 window.removeEventListener('resize', handleResize);
 clearTimeout(resizeTimeout);
 };
 }, [isVeryLowEndDevice]);

 // Additional scroll optimization for very low-end devices
 useEffect(() => {
 if (isVeryLowEndDevice) {
 let scrollTimeout;
 const optimizedScroll = () => {
 clearTimeout(scrollTimeout);
 scrollTimeout = setTimeout(() => {
 // Re-enable interactions after scroll stops
 document.body.style.pointerEvents = 'auto';
 }, 150);
 
 // Temporarily disable pointer events during scroll for performance
 document.body.style.pointerEvents = 'none';
 };
 
 window.addEventListener('scroll', optimizedScroll, { passive: true });
 window.addEventListener('touchmove', optimizedScroll, { passive: true });
 
 return () => {
 window.removeEventListener('scroll', optimizedScroll);
 window.removeEventListener('touchmove', optimizedScroll);
 clearTimeout(scrollTimeout);
 };
 }
 }, [isVeryLowEndDevice]);

 // Update current time every minute
 useEffect(() => {
 const timer = setInterval(() => {
 setCurrentTime(new Date());
 }, 60000);
 
 return () => clearInterval(timer);
 }, []);

 // Virtual scrolling and image optimization for iPad
 useEffect(() => {
 if (performanceMode === 'ultra' || performanceMode === 'high') {
 // Lazy load images
 const lazyImages = document.querySelectorAll('img[loading="lazy"]');
 if ('IntersectionObserver' in window) {
 const imageObserver = new IntersectionObserver((entries, observer) => {
 entries.forEach(entry => {
 if (entry.isIntersecting) {
 const img = entry.target;
 img.src = img.dataset.src;
 img.classList.remove('lazy');
 observer.unobserve(img);
 }
 });
 }, {
 rootMargin: '50px'
 });
 
 lazyImages.forEach(img => imageObserver.observe(img));
 
 return () => {
 imageObserver.disconnect();
 };
 }
 
 // Virtual scrolling for large lists
 const containers = document.querySelectorAll('.virtual-scroll');
 containers.forEach(container => {
 let visibleStart = 0;
 let visibleEnd = 20; // Show only 20 items at a time
 
 const handleVirtualScroll = () => {
 const scrollTop = container.scrollTop;
 const itemHeight = 80; // Estimated item height
 const containerHeight = container.clientHeight;
 
 visibleStart = Math.floor(scrollTop / itemHeight);
 visibleEnd = Math.min(
 visibleStart + Math.ceil(containerHeight / itemHeight) + 5,
 container.children.length
 );
 
 // Hide items outside visible range
 Array.from(container.children).forEach((child, index) => {
 if (index < visibleStart || index > visibleEnd) {
 child.style.display = 'none';
 } else {
 child.style.display = '';
 }
 });
 };
 
 container.addEventListener('scroll', handleVirtualScroll, { passive: true });
 });
 }
 }, [performanceMode]);

 // Advanced memory management
 useEffect(() => {
 if (performanceMode === 'ultra') {
 // Limit concurrent re-renders
 let renderQueue = [];
 let isProcessing = false;
 
 const processRenderQueue = () => {
 if (renderQueue.length === 0 || isProcessing) return;
 
 isProcessing = true;
 setIsRendering(true);
 
 const batch = renderQueue.splice(0, 3); // Process 3 at a time
 
 requestIdleCallback(() => {
 batch.forEach(fn => fn());
 isProcessing = false;
 setIsRendering(false);
 
 if (renderQueue.length > 0) {
 setTimeout(processRenderQueue, 16); // Next frame
 }
 });
 };
 
 window.queueRender = (fn) => {
 renderQueue.push(fn);
 processRenderQueue();
 };
 
 return () => {
 delete window.queueRender;
 renderQueue = [];
 };
 }
 }, [performanceMode]);

 useEffect(() => {
 const fetchDashboardData = async () => {
 try {
 const [bookings, therapistsData, servicesData] = await Promise.all([
 getTodayBookings(),
 getTherapists(),
 getServices()
 ]);

 setTodayBookings(bookings);
 setTherapists(therapistsData);
 setServices(servicesData);

 const activeTherapists = therapistsData.filter(t => t.status === 'active').length;
 const completedBookings = bookings.filter(b => b.status === 'done');
 const totalRevenue = completedBookings.reduce((sum, booking) => {
 const service = servicesData.find(s => s.id === booking.serviceId);
 return sum + (service?.priceByDuration?.[booking.duration] || 0);
 }, 0);

 // Calculate available and busy therapists
 const inProgressBookings = bookings.filter(b => b.status === 'in_progress');
 const busyTherapistIds = inProgressBookings.map(b => b.therapistId);
 const activeTherapistsList = therapistsData.filter(t => t.status === 'active');
 
 const availableTherapists = activeTherapistsList.filter(t => !busyTherapistIds.includes(t.id));
 const busyTherapists = activeTherapistsList.filter(t => busyTherapistIds.includes(t.id)).map(therapist => {
 const booking = inProgressBookings.find(b => b.therapistId === therapist.id);
 const service = servicesData.find(s => s.id === booking?.serviceId);
 const endTime = dateTimeUtils.calculateEndTime(booking?.startTime, booking?.duration || 60);
 
 return {
 ...therapist,
 customer: booking?.customerName || 'ไม่ระบุ',
 service: service?.name || 'ไม่ระบุ',
 endTime
 };
 });

 setTodayStats({
 bookings: bookings.length,
 activeTherapists,
 totalRevenue,
 completedSessions: completedBookings.length,
 availableTherapists,
 availableCount: availableTherapists.length,
 busyTherapists,
 busyCount: busyTherapists.length
 });
 } catch (error) {
 console.error('Error fetching dashboard data:', error);
 } finally {
 setLoading(false);
 }
 };

 fetchDashboardData();
 }, []);

 // Queue management functions
 const fetchDashboardData = useCallback(async () => {
 try {
 const [bookings, therapistsData, servicesData] = await Promise.all([
 getTodayBookings(),
 getTherapists(),
 getServices()
 ]);

 setTodayBookings(bookings);
 setTherapists(therapistsData);
 setServices(servicesData);

 const activeTherapists = therapistsData.filter(t => t.status === 'active').length;
 const completedBookings = bookings.filter(b => b.status === 'done');
 const totalRevenue = completedBookings.reduce((sum, booking) => {
 const service = servicesData.find(s => s.id === booking.serviceId);
 return sum + (service?.priceByDuration?.[booking.duration] || 0);
 }, 0);

 // Calculate available and busy therapists
 const inProgressBookings = bookings.filter(b => b.status === 'in_progress');
 const busyTherapistIds = inProgressBookings.map(b => b.therapistId);
 const activeTherapistsList = therapistsData.filter(t => t.status === 'active');
 
 const availableTherapists = activeTherapistsList.filter(t => !busyTherapistIds.includes(t.id));
 const busyTherapists = activeTherapistsList.filter(t => busyTherapistIds.includes(t.id)).map(therapist => {
 const booking = inProgressBookings.find(b => b.therapistId === therapist.id);
 const service = servicesData.find(s => s.id === booking?.serviceId);
 const endTime = new Date(booking?.startTime);
 endTime.setMinutes(endTime.getMinutes() + (booking?.duration || 60));
 
 return {
 ...therapist,
 customer: booking?.customerName || 'ไม่ระบุ',
 service: service?.name || 'ไม่ระบุ',
 endTime
 };
 });

 setTodayStats({
 bookings: bookings.length,
 activeTherapists,
 totalRevenue,
 completedSessions: completedBookings.length,
 availableTherapists,
 availableCount: availableTherapists.length,
 busyTherapists,
 busyCount: busyTherapists.length
 });
 } catch (error) {
 console.error('Error fetching dashboard data:', error);
 }
 }, []);

 const handleStatusUpdate = useCallback(async (bookingId, newStatus, discountData = null) => {
 try {
 await updateBookingStatus(bookingId, newStatus, discountData);
 await fetchDashboardData(); // Refresh data
 toast.success('อัพเดทสถานะสำเร็จ');
 } catch (error) {
 console.error('Error updating booking status:', error);
 toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
 }
 }, [fetchDashboardData]);

 const handleEditBooking = (booking) => {
 setEditingBooking(booking);
 setIsEditModalOpen(true);
 };

 const handleEditModalClose = () => {
 setIsEditModalOpen(false);
 setEditingBooking(null);
 };

 const handleBookingUpdate = () => {
 fetchDashboardData(); // Refresh data after update
 };

 const handleCompleteBooking = useCallback((booking) => {
 setCompletingBooking(booking);
 setIsDiscountModalOpen(true);
 }, []);

 const handleDiscountModalClose = () => {
 setIsDiscountModalOpen(false);
 setCompletingBooking(null);
 };

 const handleCompleteWithDiscount = async (bookingId, discountData) => {
 await handleStatusUpdate(bookingId, 'done', discountData);
 setIsDiscountModalOpen(false);
 setCompletingBooking(null);
 };

 const handleNewBooking = () => {
 setIsBookingModalOpen(true);
 };

 const handleBookingModalClose = () => {
 setIsBookingModalOpen(false);
 };

 // Global touch event listeners for drag and drop - moved after function declarations
 useEffect(() => {
 const handleGlobalTouchMove = (e) => {
 if (!draggedBooking || !isDragging || !touchStarted) return;
 
 // Prevent scrolling during drag
 if (e.cancelable) {
 e.preventDefault();
 }
 
 // Throttle touch events for very low-end devices
 if (isVeryLowEndDevice) {
 const now = Date.now();
 if (now - lastTouchMove < 32) return; // ~30fps instead of 60fps
 setLastTouchMove(now);
 }
 
 const touch = e.touches[0];
 if (!touch) return;
 
 const deltaX = Math.abs(touch.clientX - touchStartPos.x);
 const deltaY = Math.abs(touch.clientY - touchStartPos.y);
 
 // Increase threshold for better touch handling on iPad
 const threshold = isVeryLowEndDevice ? 20 : 15;
 if (deltaX > threshold || deltaY > threshold) {
 setIsDragging(true);
 }
 
 // อัพเดทตำแหน่งของ card ที่ลากไปมา
 setDragPosition({ 
 x: touch.clientX - dragOffset.x, 
 y: touch.clientY - dragOffset.y 
 });
 
 // Optimized element detection for iPad
 const element = document.elementFromPoint(touch.clientX, touch.clientY);
 const dropZone = element?.closest('[data-drop-zone]');
 
 // Remove previous drop zone highlights
 document.querySelectorAll('[data-drop-zone]').forEach(zone => {
 zone.classList.remove('drag-over');
 });
 
 if (dropZone) {
 const targetStatus = dropZone.getAttribute('data-drop-zone');
 
 // Add visual feedback to drop zone
 dropZone.classList.add('drag-over');
 
 // Haptic feedback เมื่อเข้า drop zone (only if not very low-end)
 if (dragOverZone !== targetStatus && navigator.vibrate && !isVeryLowEndDevice) {
 navigator.vibrate(30);
 }
 
 setDragOverZone(targetStatus);
 } else {
 setDragOverZone(null);
 }
 };

 const handleGlobalTouchEnd = async (e) => {
 if (!touchStarted) return;
 
 // Clean up drop zone highlights
 document.querySelectorAll('[data-drop-zone]').forEach(zone => {
 zone.classList.remove('drag-over');
 });
 
 if (!draggedBooking || !isDragging) {
 // Reset state
 setDraggedBooking(null);
 setIsDragging(false);
 setDragOverZone(null);
 setTouchStarted(false);
 return;
 }

 // Check if we can preventDefault without passive event listener error
 try {
 if (e.cancelable && !e.defaultPrevented) {
 e.preventDefault();
 }
 } catch (error) {
 // Handle passive event listener gracefully
 }
 
 const touch = e.changedTouches[0];
 if (!touch) {
 // Reset state
 setDraggedBooking(null);
 setIsDragging(false);
 setDragOverZone(null);
 setTouchStarted(false);
 return;
 }
 
 const element = document.elementFromPoint(touch.clientX, touch.clientY);
 const dropZone = element?.closest('[data-drop-zone]');
 
 if (dropZone) {
 const targetStatus = dropZone.getAttribute('data-drop-zone');
 
 if (draggedBooking.status !== targetStatus) {
 try {
 if (targetStatus === 'done') {
 handleCompleteBooking(draggedBooking);
 } else {
 await handleStatusUpdate(draggedBooking.id, targetStatus);
 }
 toast.success('ย้ายคิวสำเร็จ');
 
 // Add success haptic feedback
 if (navigator.vibrate) {
 navigator.vibrate([100, 30, 100]);
 }
 } catch (error) {
 console.error('Error updating booking status:', error);
 toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
 }
 }
 }
 
 // Reset drag state
 setDraggedBooking(null);
 setIsDragging(false);
 setDragOverZone(null);
 setTouchStarted(false);
 };

 // Add global touch event listeners for drag operations
 if (isOnIpad || /iPhone|iPod/.test(navigator.userAgent)) {
 document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
 document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
 document.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: false });
 
 return () => {
 document.removeEventListener('touchmove', handleGlobalTouchMove);
 document.removeEventListener('touchend', handleGlobalTouchEnd);
 document.removeEventListener('touchcancel', handleGlobalTouchEnd);
 };
 }
 }, [draggedBooking, isDragging, touchStarted, touchStartPos, dragOffset, dragOverZone, lastTouchMove, isVeryLowEndDevice, isOnIpad, handleStatusUpdate, handleCompleteBooking]);

 const handleBookingAdded = () => {
 fetchDashboardData(); // Refresh data after new booking
 };

 // Drag and Drop handlers
 const handleDragStart = (e, booking) => {
 const dragData = {
 bookingId: booking.id,
 currentStatus: booking.status,
 booking: booking
 };
 e.dataTransfer.setData('application/json', JSON.stringify(dragData));
 e.dataTransfer.effectAllowed = 'move';
 };

 const handleDragEnd = (e) => {
 setDragOverZone(null);
 };

 const handleDragOver = (e, targetStatus) => {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 setDragOverZone(targetStatus);
 };

 const handleDragLeave = (e) => {
 e.preventDefault();
 setDragOverZone(null);
 };

 const handleDrop = async (e, targetStatus) => {
 e.preventDefault();
 setDragOverZone(null);
 
 try {
 const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
 
 if (dragData.currentStatus !== targetStatus) {
 if (targetStatus === 'done') {
 // Open discount modal for completion
 const booking = todayBookings.find(b => b.id === dragData.bookingId);
 if (booking) {
 handleCompleteBooking(booking);
 }
 } else {
 await handleStatusUpdate(dragData.bookingId, targetStatus);
 }
 }
 } catch (error) {
 console.error('Error in drag and drop:', error);
 toast.error('เกิดข้อผิดพลาดในการย้ายคิว');
 }
 };

 // Touch handlers for mobile/tablet support - Optimized for iPad iOS 15
 const handleTouchStart = (e, booking) => {
 // Safely handle stopPropagation for touch events
 try {
 e.stopPropagation();
 } catch (error) {
 console.debug('Touch start event handling in passive mode');
 }
 
 const touch = e.touches[0];
 const element = e.currentTarget;
 const rect = element.getBoundingClientRect();
 
 // คำนวณ offset จากจุดที่กดไปจนถึงกึ่งกลางของ element สำหรับ UX ที่ดีขึ้น
 const centerOffsetX = rect.width / 2;
 const centerOffsetY = rect.height / 2;
 
 // บันทึกตำแหน่งเริ่มต้น
 setTouchStartPos({ x: touch.clientX, y: touch.clientY });
 setDragOffset({ x: centerOffsetX, y: centerOffsetY });
 
 // ตั้งตำแหน่งเริ่มต้นให้ card อยู่กึ่งกลางใต้นิ้ว
 setDragPosition({ 
 x: touch.clientX - centerOffsetX, 
 y: touch.clientY - centerOffsetY 
 });
 setDraggedBooking(booking);
 setTouchStarted(true);
 
 // Add haptic feedback for better UX on iOS
 if (navigator.vibrate) {
 navigator.vibrate(50);
 }
 };

 const handleTouchMove = (e) => {
 // This function is now handled by global touch listener
 // Keep for backward compatibility but do nothing
 return;
 };

 const handleTouchEnd = async (e) => {
 // This function is now handled by global touch listener
 // Keep for backward compatibility but do nothing
 return;
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ 
 background: isVeryLowEndDevice 
 ? '#F8F5F2' 
 : 'linear-gradient(135deg, #F8F5F2 0%, #ECE8E4 50%, #F0EBE7 100%)' 
 }}>
 <div className={`rounded-3xl p-12 text-center border max-w-md mx-4 ${
 isVeryLowEndDevice ? 'shadow-md' : 'shadow-2xl'
 }`} style={{
 background: 'rgba(255, 255, 255, 0.95)',
 borderColor: 'rgba(184, 155, 133, 0.2)',
 backdropFilter: isVeryLowEndDevice ? 'none' : 'blur(20px)',
 WebkitBackdropFilter: isVeryLowEndDevice ? 'none' : 'blur(20px)'
 }}>
 {/* Animated Logo */}
 <div className="relative mb-8">
 <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${
 isVeryLowEndDevice ? 'shadow-md' : 'shadow-2xl animate-pulse'
 }`} style={{
 background: 'linear-gradient(135deg, #B89B85 0%, #A1826F 50%, rgba(184, 155, 133, 0.8) 100%)'
 }}>
 <SparklesIcon className="h-10 w-10 text-white" />
 </div>
 {/* Floating particles - only for higher-end devices */}
 {!isVeryLowEndDevice && (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-4 h-4 rounded-full animate-bounce delay-0 absolute -top-2 -left-2" style={{ backgroundColor: 'rgba(184, 155, 133, 0.6)' }}></div>
 <div className="w-3 h-3 rounded-full animate-bounce delay-75 absolute -bottom-1 -right-1" style={{ backgroundColor: 'rgba(161, 130, 111, 0.6)' }}></div>
 <div className="w-2 h-2 rounded-full animate-bounce delay-150 absolute top-1 right-4" style={{ backgroundColor: 'rgba(184, 155, 133, 0.4)' }}></div>
 </div>
 )}
 </div>
 
 {/* Loading Spinner */}
 <div className="relative mb-6">
 <div className={`${
 isVeryLowEndDevice ? '' : 'animate-spin'
 } rounded-full h-16 w-16 border-4 border-transparent mx-auto`} style={{
 borderTopColor: '#B89B85',
 borderRightColor: '#A1826F'
 }}></div>
 {!isVeryLowEndDevice && (
 <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent mx-auto" style={{ 
 borderBottomColor: 'rgba(184, 155, 133, 0.6)',
 borderLeftColor: 'rgba(161, 130, 111, 0.6)',
 animationDirection: 'reverse', 
 animationDuration: '1.5s' 
 }}></div>
 )}
 </div>
 
 <h2 className="text-2xl font-bold mb-3" style={{
 background: 'linear-gradient(90deg, #4E3B31 0%, #B89B85 50%, #A1826F 100%)',
 WebkitBackgroundClip: 'text',
 WebkitTextFillColor: 'transparent',
 backgroundClip: 'text',
 color: '#4E3B31' /* Fallback for unsupported browsers */
 }}>
 กำลังโหลดข้อมูล
 </h2>
 <p className="font-medium" style={{ color: '#7E7B77' }}>
 <SparklesIcon className="h-4 w-4 inline mr-1" />
 กรุณารอสักครู่...
 </p>
 
 {/* Progress dots */}
 <div className="flex justify-center space-x-2 mt-6">
 <div className={`w-2 h-2 rounded-full ${
 isVeryLowEndDevice ? '' : 'animate-pulse'
 }`} style={{ backgroundColor: '#B89B85' }}></div>
 <div className={`w-2 h-2 rounded-full ${
 isVeryLowEndDevice ? '' : 'animate-pulse delay-75'
 }`} style={{ backgroundColor: '#A1826F' }}></div>
 <div className={`w-2 h-2 rounded-full ${
 isVeryLowEndDevice ? '' : 'animate-pulse delay-150'
 }`} style={{ backgroundColor: 'rgba(184, 155, 133, 0.6)' }}></div>
 </div>
 </div>
 </div>
 );
 }

 // Sort bookings by start time
 const sortedBookings = todayBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
 
 // Group by status
 const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
 const inProgressBookings = sortedBookings.filter(b => b.status === 'in_progress');
 const doneBookings = sortedBookings.filter(b => b.status === 'done');

 return (
 <div className="min-h-screen" style={{ 
 background: isVeryLowEndDevice 
 ? '#F8F5F2' 
 : 'linear-gradient(135deg, #F8F5F2 0%, #ECE8E4 50%, #F0EBE7 100%)' 
 }}>
 {/* Main Content */}
 <div className="w-full px-6 lg:px-12 py-12">
 {/* Enhanced Queue Management Section */}
 <div className={`rounded-3xl p-8 border mb-8 min-h-[calc(100vh-6rem)] relative overflow-hidden ${
 isVeryLowEndDevice ? 'shadow-md' : 'shadow-2xl'
 }`} style={{
 background: 'rgba(255, 255, 255, 0.95)',
 borderColor: 'rgba(184, 155, 133, 0.3)',
 backdropFilter: isOnIpad ? 'none' : 'blur(20px)',
 WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(20px)',
 willChange: isOnIpad ? 'auto' : 'transform'
 }}>
 {/* Animated Background Elements - Disabled on older iPads for performance */}
 {!isOnIpad && !isVeryLowEndDevice && (
 <>
 <div className="absolute top-10 right-10 w-24 h-24 rounded-full blur-2xl animate-pulse" style={{
 background: 'linear-gradient(135deg, rgba(184, 155, 133, 0.2) 0%, rgba(161, 130, 111, 0.2) 100%)'
 }}></div>
 <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full blur-2xl animate-pulse delay-1000" style={{
 background: 'linear-gradient(135deg, rgba(184, 155, 133, 0.15) 0%, rgba(236, 232, 228, 0.3) 100%)'
 }}></div>
 </>
 )}
 
 <div className="relative z-10">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center space-x-4">
 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl ${
 isVeryLowEndDevice ? '' : 'hover:rotate-6'
 } no-transition`} style={{
 background: 'linear-gradient(135deg, #B89B85 0%, #A1826F 50%, rgba(184, 155, 133, 0.8) 100%)'
 }}>
 <ClipboardDocumentListIcon className="h-8 w-8" />
 </div>
 <div>
 <h2 className="text-3xl font-bold" style={{
 background: isVeryLowEndDevice 
 ? '#4E3B31' 
 : 'linear-gradient(90deg, #4E3B31 0%, #B89B85 50%, #A1826F 100%)',
 WebkitBackgroundClip: isVeryLowEndDevice ? 'initial' : 'text',
 WebkitTextFillColor: isVeryLowEndDevice ? '#4E3B31' : 'transparent',
 backgroundClip: isVeryLowEndDevice ? 'initial' : 'text',
 color: '#4E3B31' /* Fallback for unsupported browsers */
 }}>
 จัดการคิววันนี้
 </h2>
 <p className="font-medium flex items-center" style={{ color: '#7E7B77' }}>
 <span className={`w-3 h-3 rounded-full mr-2 ${
 isVeryLowEndDevice ? '' : 'animate-pulse'
 } inline-block`} style={{ backgroundColor: '#B89B85' }}></span>
 ({sortedBookings.length} คิว) ลากและวางเพื่อเปลี่ยนสถานะ
 </p>
 </div>
 </div>
 <div className="flex space-x-3">
 <button
 onClick={handleNewBooking}
 className={`group relative px-6 py-3 text-white font-semibold rounded-xl ${
 isVeryLowEndDevice ? 'shadow-md' : 'shadow-lg hover:scale-105'
 } no-transition flex items-center space-x-2 overflow-hidden`} style={{
 background: 'linear-gradient(90deg, #B89B85 0%, #A1826F 100%)'
 }}
 >
 {!isVeryLowEndDevice && (
 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 no-transition" style={{
 background: 'linear-gradient(90deg, #A1826F 0%, #B89B85 100%)'
 }}></div>
 )}
 <div className="relative z-10 flex items-center space-x-2">
 <SparklesIcon className={`h-5 w-5 ${
 isVeryLowEndDevice ? '' : 'group-hover:rotate-180'
 } no-transition`} />
 <span>จองคิวใหม่</span>
 </div>
 </button>
 </div>
 </div>

 {sortedBookings.length === 0 ? (
 <div className="text-center py-20">
 <div className="mb-8">
 <div className={`text-8xl mb-4 ${
 isVeryLowEndDevice ? '' : 'animate-bounce'
 }`}>🌸</div>
 <div className={`w-32 h-32 mx-auto bg-gradient-to-br from-[#F8F5F2] to-[#ECE8E4] rounded-full flex items-center justify-center ${
 isVeryLowEndDevice ? 'shadow-md' : 'shadow-xl'
 } mb-6`}>
 <CalendarDaysIcon className="h-16 w-16 text-[#B89B85]" />
 </div>
 </div>
 <h3 className="text-3xl font-bold text-[#4E3B31] mb-4">ยังไม่มีคิววันนี้</h3>
 <p className="text-[#7E7B77] mb-8 text-lg">เมื่อมีการจองคิว รายการจะปรากฏที่นี่</p>
 <button
 onClick={handleNewBooking}
 className={`group relative px-10 py-4 text-white font-bold rounded-2xl ${
 isVeryLowEndDevice ? 'shadow-md' : 'shadow-xl hover:shadow-2xl hover:scale-105'
 } no-transition text-lg overflow-hidden`} style={{
 background: 'linear-gradient(90deg, #B89B85 0%, #A1826F 100%)'
 }}
 >
 {!isVeryLowEndDevice && (
 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 no-transition" style={{
 background: 'linear-gradient(90deg, #A1826F 0%, #B89B85 100%)'
 }}></div>
 )}
 <div className="relative z-10 flex items-center space-x-3">
 <SparklesIcon className={`h-6 w-6 ${
 isVeryLowEndDevice ? '' : 'group-hover:rotate-180'
 } no-transition`} />
 <span>จองคิวใหม่</span>
 <svg className={`h-6 w-6 ${
 isVeryLowEndDevice ? '' : 'group-hover:translate-x-2'
 } no-transition`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
 </svg>
 </div>
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
 {/* รอคิว - Enhanced */}
 <div 
 className={`rounded-3xl shadow-2xl p-6 border flex flex-col h-full relative overflow-hidden ${
 isOnIpad ? '' : 'no-transition'
 } ${
 dragOverZone === 'pending' ? 'ring-4 ring-opacity-50 shadow-2xl scale-105 drop-zone-highlight' : ''
 }`}
 style={{
 background: 'linear-gradient(135deg, rgba(255, 243, 224, 0.95) 0%, rgba(255, 237, 213, 0.85) 100%)',
 borderColor: dragOverZone === 'pending' ? 'rgba(255, 193, 7, 0.6)' : 'rgba(255, 193, 7, 0.6)',
 backdropFilter: isOnIpad ? 'none' : 'blur(20px)',
 WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(20px)',
 boxShadow: dragOverZone === 'pending' ? '0 0 0 4px rgba(255, 193, 7, 0.5)' : undefined,
 transform: isOnIpad ? 'translateZ(0)' : undefined
 }}
 data-drop-zone="pending"
 onDragOver={(e) => handleDragOver(e, 'pending')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'pending')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 rounded-full" style={{
 background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 152, 0, 0.3) 100%)',
 filter: isOnIpad ? 'none' : 'blur(1rem)'
 }}></div>
 
 <div className="flex items-center mb-6 relative z-10">
 <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 no-transition" style={{
 background: 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)'
 }}>
 ⏳
 </div>
 <div>
 <h2 className="text-xl font-bold" style={{ color: '#E65100' }}>รอคิว</h2>
 <p className="font-medium flex items-center" style={{ color: '#F57C00' }}>
 <span className="w-2 h-2 rounded-full mr-2 animate-pulse inline-block" style={{ backgroundColor: '#FFC107' }}></span>
 {pendingBookings.length} คิว
 {dragOverZone === 'pending' && (
 <span className="block text-sm font-medium ml-2" style={{ color: '#E65100' }}>🎯 วางที่นี่</span>
 )}
 </p>
 </div>
 </div>
 
 <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
 {pendingBookings.map((booking, index) => {
 const service = services.find(s => s.id === booking.serviceId);
 const therapist = therapists.find(t => t.id === booking.therapistId);
 
 return (
 <div
 key={booking.id}
 draggable
 onDragStart={(e) => handleDragStart(e, booking)}
 onDragEnd={handleDragEnd}
 onTouchStart={(e) => handleTouchStart(e, booking)}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleTouchEnd}
 className={`rounded-2xl p-4 shadow-lg border cursor-move touch-manipulation ${
 isOnIpad ? '' : 'no-transition'
 } ${
 isDragging && draggedBooking?.id === booking.id ? 'opacity-30 scale-95 ring-2 ring-orange-400 ring-opacity-50' : ''
 }`}
 style={{ 
 userSelect: 'none',
 background: 'rgba(255, 255, 255, 0.9)',
 borderColor: 'rgba(255, 193, 7, 0.5)',
 backdropFilter: isOnIpad ? 'none' : 'blur(4px)',
 WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(4px)',
 transform: isOnIpad ? 'translateZ(0)' : undefined,
 WebkitTapHighlightColor: 'transparent'
 }}
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center">
 <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3" style={{
 background: 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)'
 }}>
 {index + 1}
 </div>
 <div>
 <h3 className="font-bold text-lg" style={{ color: '#4E3B31' }}>{booking.customerName}</h3>
 <p className="text-sm" style={{ color: '#7E7B77' }}>{booking.customerPhone}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs px-2 py-1 rounded-full font-bold mb-1" style={{ 
 backgroundColor: 'rgba(255, 235, 59, 0.2)',
 color: '#E65100'
 }}>
 {new Date(booking.startTime).toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 })}
 </div>
 </div>
 </div>
 
 <div className="mb-4">
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-purple-600">💆‍♀️ {service?.name || 'ไม่ระบุคอร์ส'}</span>
 <span className="mx-2">•</span>
 <span className="font-medium text-blue-600">{booking.duration} นาที</span>
 </div>
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-green-600">👩‍⚕️ {therapist?.name || 'ไม่ระบุหมอนวด'}</span>
 </div>
 
 {/* Time Display */}
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-orange-600">
 ⏰ {new Date(booking.startTime).toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 })} - {(() => {
 const endTime = new Date(booking.startTime);
 endTime.setTime(endTime.getTime() + booking.duration * 60000);
 return endTime.toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 });
 })()}
 </span>
 </div>

 {/* Price and Discount Display */}
 <div className="space-y-1">
 {service?.priceByDuration?.[booking.duration] && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-gray-600">💰 ราคาเต็ม:</span>
 <span className="font-semibold text-gray-800">
 {service.priceByDuration[booking.duration].toLocaleString()} บาท
 </span>
 </div>
 )}
 
 {booking.discountValue > 0 && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-red-600">🎯 ส่วนลด:</span>
 <span className="font-semibold text-red-600">
 -{booking.discountType === 'percentage' ? 
 `${booking.discountValue}%` : 
 `${booking.discountValue.toLocaleString()} บาท`
 }
 </span>
 </div>
 )}
 
 {booking.finalPrice && (
 <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-1">
 <span className="text-green-600 font-medium">💳 ราคาสุดท้าย:</span>
 <span className="font-bold text-green-700">
 {booking.finalPrice.toLocaleString()} บาท
 </span>
 </div>
 )}
 </div>
 </div>
 
 <div className="flex space-x-2">
 <button
 onClick={() => handleStatusUpdate(booking.id, 'in_progress')}
 className="flex-1 px-3 py-2 text-white text-sm font-semibold rounded-xl hover:shadow-lg no-transition hover:scale-105" style={{
 background: 'linear-gradient(90deg, #B89B85 0%, #A1826F 100%)'
 }}
 >
 🏃‍♀️ เริ่มนวด
 </button>
 <button
 onClick={() => handleEditBooking(booking)}
 className="px-3 py-2 text-sm font-semibold rounded-xl border hover:shadow-lg no-transition" style={{
 backgroundColor: 'rgba(255, 255, 255, 0.9)',
 color: '#7E7B77',
 borderColor: 'rgba(184, 155, 133, 0.2)'
 }}
 onMouseEnter={(e) => {
 e.target.style.backgroundColor = 'white';
 e.target.style.color = '#4E3B31';
 e.target.style.borderColor = '#B89B85';
 }}
 onMouseLeave={(e) => {
 e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
 e.target.style.color = '#7E7B77';
 e.target.style.borderColor = 'rgba(184, 155, 133, 0.2)';
 }}
 >
 ✏️
 </button>
 </div>
 </div>
 );
 })}
 
 {pendingBookings.length === 0 && (
 <div className="text-center py-12 flex-1 flex flex-col justify-center" style={{ color: '#F57C00' }}>
 <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: 'rgba(255, 235, 59, 0.2)' }}>
 <ClockIcon className="h-10 w-10" style={{ color: '#FFC107' }} />
 </div>
 <p className="text-base font-medium">ไม่มีคิวที่รอ</p>
 <p className="text-sm mt-1" style={{ color: 'rgba(245, 124, 0, 0.7)' }}>คิวใหม่จะปรากฏที่นี่</p>
 </div>
 )}
 </div>
 </div>

 {/* กำลังนวด */}
 <div 
 className={`rounded-3xl shadow-2xl p-6 border flex flex-col h-full relative overflow-hidden ${
 isOnIpad ? '' : 'no-transition'
 } ${
 dragOverZone === 'in_progress' ? 'ring-4 ring-opacity-50 shadow-2xl scale-105 drop-zone-highlight' : ''
 }`}
 style={{
 background: 'linear-gradient(135deg, rgba(227, 242, 253, 0.95) 0%, rgba(199, 221, 255, 0.85) 100%)',
 borderColor: dragOverZone === 'in_progress' ? 'rgba(33, 150, 243, 0.6)' : 'rgba(33, 150, 243, 0.6)',
 backdropFilter: isOnIpad ? 'none' : 'blur(20px)',
 WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(20px)',
 boxShadow: dragOverZone === 'in_progress' ? '0 0 0 4px rgba(33, 150, 243, 0.5)' : undefined,
 transform: isOnIpad ? 'translateZ(0)' : undefined
 }}
 data-drop-zone="in_progress"
 onDragOver={(e) => handleDragOver(e, 'in_progress')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'in_progress')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 rounded-full animate-pulse" style={{
 background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.3) 0%, rgba(63, 81, 181, 0.3) 100%)',
 filter: isOnIpad ? 'none' : 'blur(1rem)',
 animationDuration: isOnIpad ? '3s' : '2s'
 }}></div>
 
 <div className="flex items-center mb-6 relative z-10">
 <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 no-transition" style={{
 background: 'linear-gradient(135deg, #2196F3 0%, #3F51B5 100%)'
 }}>
 💆‍♀️
 </div>
 <div>
 <h2 className="text-xl font-bold" style={{ color: '#0D47A1' }}>กำลังนวด</h2>
 <p className="font-medium flex items-center" style={{ color: '#1565C0' }}>
 <span className="w-2 h-2 rounded-full mr-2 animate-pulse inline-block" style={{ backgroundColor: '#2196F3' }}></span>
 {inProgressBookings.length} คิว
 {dragOverZone === 'in_progress' && (
 <span className="block text-sm font-medium ml-2" style={{ color: '#0D47A1' }}>🎯 วางที่นี่</span>
 )}
 </p>
 </div>
 </div>
 
 <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
 {inProgressBookings.map((booking, index) => {
 const service = services.find(s => s.id === booking.serviceId);
 const therapist = therapists.find(t => t.id === booking.therapistId);
 const endTime = dateTimeUtils.calculateEndTime(booking.startTime, booking.duration);
 
 return (
 <div
 key={booking.id}
 draggable
 onDragStart={(e) => handleDragStart(e, booking)}
 onDragEnd={handleDragEnd}
 onTouchStart={(e) => handleTouchStart(e, booking)}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleTouchEnd}
 className={`rounded-2xl p-4 shadow-lg border cursor-move touch-manipulation ${
 isOnIpad ? '' : 'no-transition'
 } ${
 isDragging && draggedBooking?.id === booking.id ? 'opacity-30 scale-95 ring-2 ring-blue-400 ring-opacity-50' : ''
 }`}
 style={{ 
 userSelect: 'none',
 background: 'rgba(255, 255, 255, 0.9)',
 borderColor: 'rgba(33, 150, 243, 0.5)',
 backdropFilter: isOnIpad ? 'none' : 'blur(4px)',
 WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(4px)',
 transform: isOnIpad ? 'translateZ(0)' : undefined,
 WebkitTapHighlightColor: 'transparent'
 }}
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center">
 <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3" style={{
 background: 'linear-gradient(135deg, #2196F3 0%, #3F51B5 100%)'
 }}>
 💆‍♀️
 </div>
 <div>
 <h3 className="font-bold text-lg" style={{ color: '#424242' }}>{booking.customerName}</h3>
 <p className="text-sm" style={{ color: '#757575' }}>{booking.customerPhone}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs px-2 py-1 rounded-full font-bold mb-1" style={{ 
 backgroundColor: 'rgba(33, 150, 243, 0.2)',
 color: '#0D47A1'
 }}>
 เสร็จ {endTime.toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 })}
 </div>
 </div>
 </div>
 
 <div className="mb-4">
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-purple-600">💆‍♀️ {service?.name || 'ไม่ระบุคอร์ส'}</span>
 <span className="mx-2">•</span>
 <span className="font-medium text-blue-600">{booking.duration} นาที</span>
 </div>
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-green-600">👩‍⚕️ {therapist?.name || 'ไม่ระบุหมอนวด'}</span>
 </div>
 
 {/* Time Display */}
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-orange-600">
 ⏰ {new Date(booking.startTime).toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 })} - {endTime.toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 })}
 </span>
 </div>

 {/* Price and Discount Display */}
 <div className="space-y-1">
 {service?.priceByDuration?.[booking.duration] && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-gray-600">💰 ราคาเต็ม:</span>
 <span className="font-semibold text-gray-800">
 {service.priceByDuration[booking.duration].toLocaleString()} บาท
 </span>
 </div>
 )}
 
 {booking.discountValue > 0 && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-red-600">🎯 ส่วนลด:</span>
 <span className="font-semibold text-red-600">
 -{booking.discountType === 'percentage' ? 
 `${booking.discountValue}%` : 
 `${booking.discountValue.toLocaleString()} บาท`
 }
 </span>
 </div>
 )}
 
 {booking.finalPrice && (
 <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-1">
 <span className="text-green-600 font-medium">💳 ราคาสุดท้าย:</span>
 <span className="font-bold text-green-700">
 {booking.finalPrice.toLocaleString()} บาท
 </span>
 </div>
 )}
 </div>
 </div>
 
 <div className="flex space-x-2">
 <button
 onClick={() => handleCompleteBooking(booking)}
 className="flex-1 px-3 py-2 text-white text-sm font-semibold rounded-xl hover:shadow-lg no-transition hover:scale-105" style={{
 background: 'linear-gradient(90deg, #4CAF50 0%, #00C853 100%)'
 }}
 >
 ✅ เสร็จแล้ว
 </button>
 <button
 onClick={() => handleEditBooking(booking)}
 className="px-3 py-2 text-sm font-semibold rounded-xl border hover:shadow-lg no-transition" style={{
 backgroundColor: 'rgba(255, 255, 255, 0.9)',
 color: '#7E7B77',
 borderColor: 'rgba(184, 155, 133, 0.2)'
 }}
 onMouseEnter={(e) => {
 e.target.style.backgroundColor = 'white';
 e.target.style.color = '#4E3B31';
 e.target.style.borderColor = '#B89B85';
 }}
 onMouseLeave={(e) => {
 e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
 e.target.style.color = '#7E7B77';
 e.target.style.borderColor = 'rgba(184, 155, 133, 0.2)';
 }}
 >
 ✏️
 </button>
 </div>
 </div>
 );
 })}
 
 {inProgressBookings.length === 0 && (
 <div className="text-center py-12 flex-1 flex flex-col justify-center" style={{ color: '#7E7B77' }}>
 <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: 'rgba(33, 150, 243, 0.2)' }}>
 <PlayCircleIcon className="h-10 w-10" style={{ color: '#2196F3' }} />
 </div>
 <p className="text-base font-medium">ไม่มีคิวที่กำลังนวด</p>
 <p className="text-sm mt-1" style={{ color: 'rgba(126, 123, 119, 0.7)' }}>คิวที่เริ่มแล้วจะปรากฏที่นี่</p>
 </div>
 )}
 </div>
 </div>

 {/* เสร็จแล้ว */}
 <div 
 className={`rounded-3xl shadow-2xl p-6 border flex flex-col h-full relative overflow-hidden ${
 isOnIpad ? '' : 'no-transition'
 } ${
 dragOverZone === 'done' ? 'ring-4 ring-opacity-50 shadow-2xl scale-105 drop-zone-highlight' : ''
 }`}
 style={{
 background: 'linear-gradient(135deg, rgba(232, 245, 233, 0.95) 0%, rgba(200, 230, 201, 0.85) 100%)',
 borderColor: dragOverZone === 'done' ? 'rgba(76, 175, 80, 0.6)' : 'rgba(76, 175, 80, 0.6)',
 backdropFilter: isOnIpad ? 'none' : 'blur(20px)',
 WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(20px)',
 boxShadow: dragOverZone === 'done' ? '0 0 0 4px rgba(76, 175, 80, 0.5)' : undefined,
 transform: isOnIpad ? 'translateZ(0)' : undefined
 }}
 data-drop-zone="done"
 onDragOver={(e) => handleDragOver(e, 'done')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'done')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 rounded-full" style={{
 background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.3) 0%, rgba(46, 125, 50, 0.3) 100%)',
 filter: isOnIpad ? 'none' : 'blur(1rem)'
 }}></div>
 
 <div className="flex items-center mb-6 relative z-10">
 <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 no-transition" style={{
 background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)'
 }}>
 ✅
 </div>
 <div>
 <h2 className="text-xl font-bold" style={{ color: '#1B5E20' }}>เสร็จแล้ว</h2>
 <p className="font-medium flex items-center" style={{ color: '#2E7D32' }}>
 <span className="w-2 h-2 rounded-full mr-2 inline-block" style={{ backgroundColor: '#4CAF50' }}></span>
 {doneBookings.length} คิว
 {dragOverZone === 'done' && (
 <span className="block text-sm font-medium ml-2" style={{ color: '#1B5E20' }}>🎯 วางที่นี่</span>
 )}
 </p>
 </div>
 </div>
 
 <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
 {doneBookings.map((booking, index) => {
 const service = services.find(s => s.id === booking.serviceId);
 const therapist = therapists.find(t => t.id === booking.therapistId);
 
 return (
 <div
 key={booking.id}
 className={`rounded-2xl p-4 shadow-lg border ${isOnIpad ? '' : 'no-transition'}`} style={{
 background: 'rgba(255, 255, 255, 0.9)',
 borderColor: 'rgba(76, 175, 80, 0.5)',
 backdropFilter: isOnIpad ? 'none' : 'blur(4px)',
 WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(4px)',
 transform: isOnIpad ? 'translateZ(0)' : undefined
 }}
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center">
 <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3" style={{
 background: 'linear-gradient(135deg, #4CAF50 0%, #00C853 100%)'
 }}>
 ✅
 </div>
 <div>
 <h3 className="font-bold text-lg" style={{ color: '#424242' }}>{booking.customerName}</h3>
 <p className="text-sm" style={{ color: '#757575' }}>{booking.customerPhone}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs px-2 py-1 rounded-full font-bold mb-1" style={{ 
 backgroundColor: 'rgba(76, 175, 80, 0.2)',
 color: '#1B5E20'
 }}>
 เสร็จแล้ว
 </div>
 </div>
 </div>
 
 <div className="mb-4">
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-purple-600">💆‍♀️ {service?.name || 'ไม่ระบุคอร์ส'}</span>
 <span className="mx-2">•</span>
 <span className="font-medium text-blue-600">{booking.duration} นาที</span>
 </div>
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-green-600">👩‍⚕️ {therapist?.name || 'ไม่ระบุหมอนวด'}</span>
 </div>
 
 {/* Time Display */}
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-orange-600">
 ⏰ {new Date(booking.startTime).toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 })} - {(() => {
 const endTime = new Date(booking.startTime);
 endTime.setTime(endTime.getTime() + booking.duration * 60000);
 return endTime.toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 });
 })()}
 </span>
 </div>

 {/* Price and Discount Display */}
 <div className="space-y-1">
 {service?.priceByDuration?.[booking.duration] && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-gray-600">💰 ราคาเต็ม:</span>
 <span className="font-semibold text-gray-800">
 {service.priceByDuration[booking.duration].toLocaleString()} บาท
 </span>
 </div>
 )}
 
 {(booking.discountValue > 0 || (booking.discount && booking.discount > 0)) && (
 <div className="flex items-center justify-between text-sm">
 <span className="text-red-600">🎯 ส่วนลด:</span>
 <span className="font-semibold text-red-600">
 -{booking.discountType === 'percentage' ? 
 `${booking.discountValue}%` : 
 booking.discountValue ? 
 `${booking.discountValue.toLocaleString()} บาท` :
 `${booking.discount.toLocaleString()} บาท`
 }
 </span>
 </div>
 )}
 
 {(booking.finalPrice || booking.finalAmount) && (
 <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-1">
 <span className="text-green-600 font-medium">💳 ราคาสุดท้าย:</span>
 <span className="font-bold text-green-700">
 {(booking.finalPrice || booking.finalAmount).toLocaleString()} บาท
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })}
 
 {doneBookings.length === 0 && (
 <div className="text-center py-12 flex-1 flex flex-col justify-center" style={{ color: '#7E7B77' }}>
 <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)' }}>
 <CheckCircleIcon className="h-10 w-10" style={{ color: '#4CAF50' }} />
 </div>
 <p className="text-base font-medium">ยังไม่มีคิวที่เสร็จ</p>
 <p className="text-sm mt-1" style={{ color: 'rgba(126, 123, 119, 0.7)' }}>คิวที่เสร็จแล้วจะปรากฏที่นี่</p>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Floating Drag Card สำหรับ iPad - Enhanced UX */}
 {isDragging && draggedBooking && (
 <div
 className={`floating-drag-card drag-shadow rounded-2xl p-4 border-2 touch-manipulation ${
 isVeryLowEndDevice ? 'shadow-md' : 'shadow-2xl'
 }`}
 style={{
 position: 'fixed',
 left: dragPosition.x,
 top: dragPosition.y,
 zIndex: 9999,
 background: 'rgba(255, 255, 255, 0.95)',
 borderColor: dragOverZone ? '#10B981' : (
 draggedBooking.status === 'pending' ? 'rgba(255, 193, 7, 0.8)' : 
 draggedBooking.status === 'in_progress' ? 'rgba(33, 150, 243, 0.8)' : 
 'rgba(76, 175, 80, 0.8)'
 ),
 borderWidth: dragOverZone ? '3px' : '2px',
 borderStyle: dragOverZone ? 'solid' : 'dashed',
 backdropFilter: isVeryLowEndDevice ? 'none' : 'blur(10px)',
 WebkitBackdropFilter: isVeryLowEndDevice ? 'none' : 'blur(10px)',
 userSelect: 'none',
 pointerEvents: 'none',
 minWidth: '300px',
 maxWidth: '350px',
 transform: `rotate(3deg) scale(1.05) ${isVeryLowEndDevice ? 'translateZ(0)' : ''}`,
 transition: 'transform 0.1s ease-out, border-color 0.2s ease-out',
 opacity: 0.95
 }}
 >
 {/* Pulse effect when over drop zone */}
 {dragOverZone && (
 <div className="absolute inset-0 bg-green-200 rounded-2xl animate-pulse opacity-20"></div>
 )}
 
 {/* Drop shadow for depth */}
 <div className="absolute inset-0 bg-black rounded-2xl opacity-10 transform translate-x-1 translate-y-1 -z-10"></div>
 
 {(() => {
 const service = services.find(s => s.id === draggedBooking.serviceId);
 const therapist = therapists.find(t => t.id === draggedBooking.therapistId);
 
 return (
 <>
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center">
 <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold mr-3" style={{
 background: draggedBooking.status === 'pending' ? 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)' :
 draggedBooking.status === 'in_progress' ? 'linear-gradient(135deg, #2196F3 0%, #3F51B5 100%)' :
 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)'
 }}>
 {draggedBooking.status === 'pending' ? '⏳' : 
 draggedBooking.status === 'in_progress' ? '💆‍♀️' : '✅'}
 </div>
 <div>
 <h3 className="font-bold text-lg" style={{ color: '#4E3B31' }}>{draggedBooking.customerName}</h3>
 <p className="text-sm" style={{ color: '#7E7B77' }}>{draggedBooking.customerPhone}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs px-2 py-1 rounded-full font-bold" style={{ 
 backgroundColor: draggedBooking.status === 'pending' ? 'rgba(255, 235, 59, 0.3)' : 
 draggedBooking.status === 'in_progress' ? 'rgba(33, 150, 243, 0.3)' : 
 'rgba(76, 175, 80, 0.3)',
 color: draggedBooking.status === 'pending' ? '#E65100' : 
 draggedBooking.status === 'in_progress' ? '#0D47A1' : 
 '#1B5E20'
 }}>
 {new Date(draggedBooking.startTime).toLocaleTimeString('th-TH', {
 hour: '2-digit',
 minute: '2-digit'
 })}
 </div>
 </div>
 </div>

 <div className="mb-3">
 <div className="flex items-center text-sm text-gray-700 mb-2">
 <span className="font-medium text-purple-600">💆‍♀️ {service?.name || 'ไม่ระบุคอร์ส'}</span>
 <span className="mx-2">•</span>
 <span className="font-medium text-blue-600">{draggedBooking.duration} นาที</span>
 </div>
 <div className="flex items-center text-sm text-gray-700">
 <span className="font-medium text-green-600">👩‍⚕️ {therapist?.name || 'ไม่ระบุหมอนวด'}</span>
 </div>
 </div>

 {/* การแสดง status ปัจจุบัน */}
 <div className="text-center py-2 rounded-xl font-medium text-sm" style={{
 background: draggedBooking.status === 'pending' ? 'linear-gradient(90deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%)' :
 draggedBooking.status === 'in_progress' ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.2) 0%, rgba(63, 81, 181, 0.2) 100%)' :
 'linear-gradient(90deg, rgba(76, 175, 80, 0.2) 0%, rgba(56, 142, 60, 0.2) 100%)',
 color: draggedBooking.status === 'pending' ? '#E65100' :
 draggedBooking.status === 'in_progress' ? '#0D47A1' :
 '#1B5E20'
 }}>
 🚀 กำลังย้ายคิว...
 </div>
 </>
 );
 })()}
 </div>
 )}

 {/* Modals */}
 <EditBookingModal
 booking={editingBooking}
 isOpen={isEditModalOpen}
 onClose={handleEditModalClose}
 onUpdate={handleBookingUpdate}
 />

 <DiscountModal
 booking={completingBooking}
 isOpen={isDiscountModalOpen}
 onClose={handleDiscountModalClose}
 onComplete={handleCompleteWithDiscount}
 services={services}
 />

 <BookingModal
 isOpen={isBookingModalOpen}
 onClose={handleBookingModalClose}
 therapists={therapists}
 services={services}
 onBookingAdded={handleBookingAdded}
 />

 {/* Performance monitoring overlay for debugging */}
 {performanceMode !== 'normal' && (
 <div className="fixed bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-xs z-50">
 <div>Mode: {performanceMode.toUpperCase()}</div>
 <div>Rendering: {isRendering ? 'ON' : 'OFF'}</div>
 <div>Memory: {navigator.deviceMemory || 'Unknown'}GB</div>
 <div>Cores: {navigator.hardwareConcurrency || 'Unknown'}</div>
 </div>
 )}

 {/* Additional CSS for enhanced iPad performance */}
 <style jsx global>{`
 /* Ultra performance mode styles */
 .ultra-performance * {
 will-change: auto !important;
 transform: translateZ(0) !important;
 }
 
 .ultra-performance .card,
 .ultra-performance .rounded-xl,
 .ultra-performance .shadow-lg {
 box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
 }
 
 .ultra-performance .bg-gradient-to-r,
 .ultra-performance .bg-gradient-to-br {
 background: var(--fallback-bg, #f0f0f0) !important;
 }
 
 /* Optimized scrolling */
 .virtual-scroll {
 -webkit-overflow-scrolling: touch;
 overflow-y: auto;
 scroll-snap-type: y proximity;
 }
 
 .virtual-scroll > * {
 scroll-snap-align: start;
 }
 
 /* Reduce repaints during scrolling */
 .scrolling * {
 pointer-events: none !important;
 }
 
 /* Memory-efficient animations */
 @media (prefers-reduced-motion: no-preference) {
 .normal-performance .transition-all {
 transition: transform 0.2s ease-out, opacity 0.2s ease-out !important;
 }
 }
 
 .high-performance .transition-all,
 .ultra-performance .transition-all {
 transition: none !important;
 }
 
 /* Optimized touch targets for iPad */
 @media (pointer: coarse) {
 button, .cursor-pointer {
 min-height: 44px;
 min-width: 44px;
 }
 }
 
 /* Lazy loading placeholder */
 img.lazy {
 opacity: 0;
 transition: opacity 0.3s;
 }
 
 img.lazy.loaded {
 opacity: 1;
 }
 
 /* Enhanced drag card styles */
 .floating-drag-card {
 position: fixed;
 z-index: 9999;
 will-change: transform;
 backface-visibility: hidden;
 -webkit-backface-visibility: hidden;
 }
 
 .drag-shadow {
 filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.3));
 }
 
 /* Touch improvements for iPad */
 @media (pointer: coarse) {
 .floating-drag-card {
 transform: rotate(2deg) scale(1.08) !important;
 }
 
 /* Visual feedback for drop zones on touch devices */
 [data-drop-zone].drag-over {
 background: rgba(16, 185, 129, 0.1) !important;
 border-color: #10B981 !important;
 box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important;
 }
 
 /* Improve touch responsiveness */
 .booking-card {
 touch-action: manipulation;
 user-select: none;
 -webkit-user-select: none;
 -webkit-touch-callout: none;
 }
 }
 `}</style>
 </div>
 );
}
