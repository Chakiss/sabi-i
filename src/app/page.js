'use client';

import { useState, useEffect } from 'react';
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
 const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

 // Update current time every minute
 useEffect(() => {
 const timer = setInterval(() => {
 setCurrentTime(new Date());
 }, 60000);
 
 return () => clearInterval(timer);
 }, []);

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
 };

 const handleStatusUpdate = async (bookingId, newStatus, discountData = null) => {
 try {
 await updateBookingStatus(bookingId, newStatus, discountData);
 await fetchDashboardData(); // Refresh data
 toast.success('อัพเดทสถานะสำเร็จ');
 } catch (error) {
 console.error('Error updating booking status:', error);
 toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
 }
 };

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

 const handleCompleteBooking = (booking) => {
 setCompletingBooking(booking);
 setIsDiscountModalOpen(true);
 };

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

 // Touch handlers for mobile/tablet support
 const handleTouchStart = (e, booking) => {
 const touch = e.touches[0];
 setTouchStartPos({ x: touch.clientX, y: touch.clientY });
 setDraggedBooking(booking);
 };

 const handleTouchMove = (e) => {
 if (!draggedBooking) return;
 
 e.preventDefault(); // Prevent scrolling
 const touch = e.touches[0];
 const deltaX = Math.abs(touch.clientX - touchStartPos.x);
 const deltaY = Math.abs(touch.clientY - touchStartPos.y);
 
 // Start dragging if moved more than 10px
 if (deltaX > 10 || deltaY > 10) {
 setIsDragging(true);
 
 // Find which zone we're over
 const element = document.elementFromPoint(touch.clientX, touch.clientY);
 const dropZone = element?.closest('[data-drop-zone]');
 if (dropZone) {
 const targetStatus = dropZone.getAttribute('data-drop-zone');
 setDragOverZone(targetStatus);
 } else {
 setDragOverZone(null);
 }
 }
 };

 const handleTouchEnd = async (e) => {
 if (!draggedBooking || !isDragging) {
 // Reset state
 setDraggedBooking(null);
 setIsDragging(false);
 setDragOverZone(null);
 return;
 }

 const touch = e.changedTouches[0];
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
 } catch (error) {
 console.error('Error in touch drag and drop:', error);
 toast.error('เกิดข้อผิดพลาดในการย้ายคิว');
 }
 }
 }

 // Reset state
 setDraggedBooking(null);
 setIsDragging(false);
 setDragOverZone(null);
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ 
 background: 'linear-gradient(135deg, #F8F5F2 0%, #ECE8E4 50%, #F0EBE7 100%)' 
 }}>
 <div className="rounded-3xl shadow-2xl p-12 text-center border max-w-md mx-4" style={{
 background: 'rgba(255, 255, 255, 0.95)',
 borderColor: 'rgba(184, 155, 133, 0.2)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)'
 }}>
 {/* Animated Logo */}
 <div className="relative mb-8">
 <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-2xl animate-pulse" style={{
 background: 'linear-gradient(135deg, #B89B85 0%, #A1826F 50%, rgba(184, 155, 133, 0.8) 100%)'
 }}>
 <SparklesIcon className="h-10 w-10 text-white" />
 </div>
 {/* Floating particles */}
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-4 h-4 rounded-full animate-bounce delay-0 absolute -top-2 -left-2" style={{ backgroundColor: 'rgba(184, 155, 133, 0.6)' }}></div>
 <div className="w-3 h-3 rounded-full animate-bounce delay-75 absolute -bottom-1 -right-1" style={{ backgroundColor: 'rgba(161, 130, 111, 0.6)' }}></div>
 <div className="w-2 h-2 rounded-full animate-bounce delay-150 absolute top-1 right-4" style={{ backgroundColor: 'rgba(184, 155, 133, 0.4)' }}></div>
 </div>
 </div>
 
 {/* Loading Spinner */}
 <div className="relative mb-6">
 <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent mx-auto" style={{
 borderTopColor: '#B89B85',
 borderRightColor: '#A1826F'
 }}></div>
 <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent mx-auto" style={{ 
 borderBottomColor: 'rgba(184, 155, 133, 0.6)',
 borderLeftColor: 'rgba(161, 130, 111, 0.6)',
 animationDirection: 'reverse', 
 animationDuration: '1.5s' 
 }}></div>
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
 <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#B89B85' }}></div>
 <div className="w-2 h-2 rounded-full animate-pulse delay-75" style={{ backgroundColor: '#A1826F' }}></div>
 <div className="w-2 h-2 rounded-full animate-pulse delay-150" style={{ backgroundColor: 'rgba(184, 155, 133, 0.6)' }}></div>
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
 background: 'linear-gradient(135deg, #F8F5F2 0%, #ECE8E4 50%, #F0EBE7 100%)' 
 }}>
 {/* Main Content */}
 <div className="w-full px-6 lg:px-12 py-12">
 {/* Enhanced Queue Management Section */}
 <div className="rounded-3xl shadow-2xl p-8 border mb-8 min-h-[calc(100vh-6rem)] relative overflow-hidden" style={{
 background: 'rgba(255, 255, 255, 0.95)',
 borderColor: 'rgba(184, 155, 133, 0.3)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)'
 }}>
 {/* Animated Background Elements */}
 <div className="absolute top-10 right-10 w-24 h-24 rounded-full blur-2xl animate-pulse" style={{
 background: 'linear-gradient(135deg, rgba(184, 155, 133, 0.2) 0%, rgba(161, 130, 111, 0.2) 100%)'
 }}></div>
 <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full blur-2xl animate-pulse delay-1000" style={{
 background: 'linear-gradient(135deg, rgba(184, 155, 133, 0.15) 0%, rgba(236, 232, 228, 0.3) 100%)'
 }}></div>
 
 {/* Touch drag feedback overlay */}
 {isDragging && (
 <div className="fixed inset-0 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none" style={{
 backgroundColor: 'rgba(0, 0, 0, 0.1)',
 backdropFilter: 'blur(4px)',
 WebkitBackdropFilter: 'blur(4px)'
 }}>
 <div className="text-white px-6 py-3 rounded-2xl shadow-2xl font-semibold flex items-center" style={{
 backgroundColor: '#B89B85'
 }}>
 <span className="animate-pulse mr-2">🎯</span>
 ลากไปยังตำแหน่งที่ต้องการ
 </div>
 </div>
 )}
 
 <div className="relative z-10">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center space-x-4">
 <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl hover:rotate-6 no-transition" style={{
 background: 'linear-gradient(135deg, #B89B85 0%, #A1826F 50%, rgba(184, 155, 133, 0.8) 100%)'
 }}>
 <ClipboardDocumentListIcon className="h-8 w-8" />
 </div>
 <div>
 <h2 className="text-3xl font-bold" style={{
 background: 'linear-gradient(90deg, #4E3B31 0%, #B89B85 50%, #A1826F 100%)',
 WebkitBackgroundClip: 'text',
 WebkitTextFillColor: 'transparent',
 backgroundClip: 'text',
 color: '#4E3B31' /* Fallback for unsupported browsers */
 }}>
 จัดการคิววันนี้
 </h2>
 <p className="font-medium flex items-center" style={{ color: '#7E7B77' }}>
 <span className="w-3 h-3 rounded-full mr-2 animate-pulse inline-block" style={{ backgroundColor: '#B89B85' }}></span>
 ({sortedBookings.length} คิว) ลากและวางเพื่อเปลี่ยนสถานะ
 </p>
 </div>
 </div>
 <div className="flex space-x-3">
 <button
 onClick={handleNewBooking}
 className="group relative px-6 py-3 text-white font-semibold rounded-xl shadow-lg no-transition hover:scale-105 flex items-center space-x-2 overflow-hidden" style={{
 background: 'linear-gradient(90deg, #B89B85 0%, #A1826F 100%)'
 }}
 >
 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 no-transition" style={{
 background: 'linear-gradient(90deg, #A1826F 0%, #B89B85 100%)'
 }}></div>
 <div className="relative z-10 flex items-center space-x-2">
 <SparklesIcon className="h-5 w-5 group-hover:rotate-180 no-transition " />
 <span>จองคิวใหม่</span>
 </div>
 </button>
 </div>
 </div>

 {sortedBookings.length === 0 ? (
 <div className="text-center py-20">
 <div className="mb-8">
 <div className="text-8xl mb-4 animate-bounce">🌸</div>
 <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#F8F5F2] to-[#ECE8E4] rounded-full flex items-center justify-center shadow-xl mb-6">
 <CalendarDaysIcon className="h-16 w-16 text-[#B89B85]" />
 </div>
 </div>
 <h3 className="text-3xl font-bold text-[#4E3B31] mb-4">ยังไม่มีคิววันนี้</h3>
 <p className="text-[#7E7B77] mb-8 text-lg">เมื่อมีการจองคิว รายการจะปรากฏที่นี่</p>
 <button
 onClick={handleNewBooking}
 className="group relative px-10 py-4 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl no-transition hover:scale-105 text-lg overflow-hidden" style={{
 background: 'linear-gradient(90deg, #B89B85 0%, #A1826F 100%)'
 }}
 >
 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 no-transition" style={{
 background: 'linear-gradient(90deg, #A1826F 0%, #B89B85 100%)'
 }}></div>
 <div className="relative z-10 flex items-center space-x-3">
 <SparklesIcon className="h-6 w-6 group-hover:rotate-180 no-transition " />
 <span>จองคิวใหม่</span>
 <svg className="h-6 w-6 group-hover:translate-x-2 no-transition " fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
 </svg>
 </div>
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
 {/* รอคิว - Enhanced */}
 <div 
 className={`rounded-3xl shadow-2xl p-6 border flex flex-col h-full relative overflow-hidden no-transition ${
 dragOverZone === 'pending' ? 'ring-4 ring-opacity-50 shadow-2xl scale-105' : ''
 }`}
 style={{
 background: 'linear-gradient(135deg, rgba(255, 243, 224, 0.95) 0%, rgba(255, 237, 213, 0.85) 100%)',
 borderColor: dragOverZone === 'pending' ? 'rgba(255, 193, 7, 0.6)' : 'rgba(255, 193, 7, 0.6)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
 boxShadow: dragOverZone === 'pending' ? '0 0 0 4px rgba(255, 193, 7, 0.5)' : undefined
 }}
 data-drop-zone="pending"
 onDragOver={(e) => handleDragOver(e, 'pending')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'pending')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 rounded-full blur-xl" style={{
 background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 152, 0, 0.3) 100%)'
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
 className={`rounded-2xl p-4 shadow-lg border no-transition cursor-move touch-none ${
 isDragging && draggedBooking?.id === booking.id ? 'opacity-50 scale-95' : ''
 }`}
 style={{ 
 userSelect: 'none',
 background: 'rgba(255, 255, 255, 0.9)',
 borderColor: 'rgba(255, 193, 7, 0.5)',
 backdropFilter: 'blur(4px)',
 WebkitBackdropFilter: 'blur(4px)'
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
 className={`rounded-3xl shadow-2xl p-6 border flex flex-col h-full relative overflow-hidden no-transition ${
 dragOverZone === 'in_progress' ? 'ring-4 ring-opacity-50 shadow-2xl scale-105' : ''
 }`}
 style={{
 background: 'linear-gradient(135deg, rgba(227, 242, 253, 0.95) 0%, rgba(199, 221, 255, 0.85) 100%)',
 borderColor: dragOverZone === 'in_progress' ? 'rgba(33, 150, 243, 0.6)' : 'rgba(33, 150, 243, 0.6)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
 boxShadow: dragOverZone === 'in_progress' ? '0 0 0 4px rgba(33, 150, 243, 0.5)' : undefined
 }}
 data-drop-zone="in_progress"
 onDragOver={(e) => handleDragOver(e, 'in_progress')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'in_progress')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 rounded-full blur-xl animate-pulse" style={{
 background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.3) 0%, rgba(63, 81, 181, 0.3) 100%)'
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
 className={`rounded-2xl p-4 shadow-lg border no-transition cursor-move touch-none ${
 isDragging && draggedBooking?.id === booking.id ? 'opacity-50 scale-95' : ''
 }`}
 style={{ 
 userSelect: 'none',
 background: 'rgba(255, 255, 255, 0.9)',
 borderColor: 'rgba(33, 150, 243, 0.5)',
 backdropFilter: 'blur(4px)',
 WebkitBackdropFilter: 'blur(4px)'
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
 className={`rounded-3xl shadow-2xl p-6 border flex flex-col h-full relative overflow-hidden no-transition ${
 dragOverZone === 'done' ? 'ring-4 ring-opacity-50 shadow-2xl scale-105' : ''
 }`}
 style={{
 background: 'linear-gradient(135deg, rgba(232, 245, 233, 0.95) 0%, rgba(200, 230, 201, 0.85) 100%)',
 borderColor: dragOverZone === 'done' ? 'rgba(76, 175, 80, 0.6)' : 'rgba(76, 175, 80, 0.6)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
 boxShadow: dragOverZone === 'done' ? '0 0 0 4px rgba(76, 175, 80, 0.5)' : undefined
 }}
 data-drop-zone="done"
 onDragOver={(e) => handleDragOver(e, 'done')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'done')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 rounded-full blur-xl" style={{
 background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.3) 0%, rgba(46, 125, 50, 0.3) 100%)'
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
 className="rounded-2xl p-4 shadow-lg border no-transition" style={{
 background: 'rgba(255, 255, 255, 0.9)',
 borderColor: 'rgba(76, 175, 80, 0.5)',
 backdropFilter: 'blur(4px)',
 WebkitBackdropFilter: 'blur(4px)'
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
 />

 <BookingModal
 isOpen={isBookingModalOpen}
 onClose={handleBookingModalClose}
 therapists={therapists}
 services={services}
 onBookingAdded={handleBookingAdded}
 />
 </div>
 );
}
