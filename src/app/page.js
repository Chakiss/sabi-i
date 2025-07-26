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
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8F5F2] via-[#ECE8E4] to-[#F0EBE7]">
 <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-[#B89B85]/20 max-w-md mx-4">
 {/* Animated Logo */}
 <div className="relative mb-8">
 <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#B89B85] via-[#A1826F] to-[#B89B85]/80 flex items-center justify-center shadow-2xl animate-pulse">
 <SparklesIcon className="h-10 w-10 text-white" />
 </div>
 {/* Floating particles */}
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-4 h-4 bg-[#B89B85]/60 rounded-full animate-bounce delay-0 absolute -top-2 -left-2"></div>
 <div className="w-3 h-3 bg-[#A1826F]/60 rounded-full animate-bounce delay-75 absolute -bottom-1 -right-1"></div>
 <div className="w-2 h-2 bg-[#B89B85]/40 rounded-full animate-bounce delay-150 absolute top-1 right-4"></div>
 </div>
 </div>
 
 {/* Loading Spinner */}
 <div className="relative mb-6">
 <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-[#B89B85] border-r-[#A1826F] mx-auto"></div>
 <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-b-[#B89B85]/60 border-l-[#A1826F]/60 mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
 </div>
 
 <h2 className="text-2xl font-bold bg-gradient-to-r from-[#4E3B31] via-[#B89B85] to-[#A1826F] bg-clip-text text-transparent mb-3">
 กำลังโหลดข้อมูล
 </h2>
 <p className="text-[#7E7B77] font-medium">
 <SparklesIcon className="h-4 w-4 inline mr-1" />
 กรุณารอสักครู่...
 </p>
 
 {/* Progress dots */}
 <div className="flex justify-center space-x-2 mt-6">
 <div className="w-2 h-2 bg-[#B89B85] rounded-full animate-pulse"></div>
 <div className="w-2 h-2 bg-[#A1826F] rounded-full animate-pulse delay-75"></div>
 <div className="w-2 h-2 bg-[#B89B85]/60 rounded-full animate-pulse delay-150"></div>
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
 <div className="min-h-screen bg-gradient-to-br from-[#F8F5F2] via-[#ECE8E4] to-[#F0EBE7]">
 {/* Main Content */}
 <div className="w-full px-6 lg:px-12 py-12">
 {/* Enhanced Queue Management Section */}
 <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-[#B89B85]/30 mb-8 min-h-[calc(100vh-6rem)] relative overflow-hidden">
 {/* Animated Background Elements */}
 <div className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-[#B89B85]/20 to-[#A1826F]/20 rounded-full blur-2xl animate-pulse"></div>
 <div className="absolute bottom-10 left-10 w-32 h-32 bg-gradient-to-br from-[#B89B85]/15 to-[#ECE8E4]/30 rounded-full blur-2xl animate-pulse delay-1000"></div>
 
 {/* Touch drag feedback overlay */}
 {isDragging && (
 <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none">
 <div className="bg-[#B89B85] text-white px-6 py-3 rounded-2xl shadow-2xl font-semibold flex items-center">
 <span className="animate-pulse mr-2">🎯</span>
 ลากไปยังตำแหน่งที่ต้องการ
 </div>
 </div>
 )}
 
 <div className="relative z-10">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center space-x-4">
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B89B85] via-[#A1826F] to-[#B89B85]/80 flex items-center justify-center text-white shadow-xl hover:rotate-6 no-transition ">
 <ClipboardDocumentListIcon className="h-8 w-8" />
 </div>
 <div>
 <h2 className="text-3xl font-bold bg-gradient-to-r from-[#4E3B31] via-[#B89B85] to-[#A1826F] bg-clip-text text-transparent">
 จัดการคิววันนี้
 </h2>
 <p className="text-[#7E7B77] font-medium flex items-center">
 <span className="w-3 h-3 bg-[#B89B85] rounded-full mr-2 animate-pulse inline-block"></span>
 ({sortedBookings.length} คิว) ลากและวางเพื่อเปลี่ยนสถานะ
 </p>
 </div>
 </div>
 <div className="flex space-x-3">
 <button
 onClick={handleNewBooking}
 className="group relative px-6 py-3 bg-gradient-to-r from-[#B89B85] to-[#A1826F] text-white font-semibold rounded-xl shadow-lg no-transition hover:scale-105 flex items-center space-x-2 overflow-hidden"
 >
 <div className="absolute inset-0 bg-gradient-to-r from-[#A1826F] to-[#B89B85] opacity-0 group-hover:opacity-100 no-transition "></div>
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
 className="group relative px-10 py-4 bg-gradient-to-r from-[#B89B85] to-[#A1826F] text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl no-transition hover:scale-105 text-lg overflow-hidden"
 >
 <div className="absolute inset-0 bg-gradient-to-r from-[#A1826F] to-[#B89B85] opacity-0 group-hover:opacity-100 no-transition "></div>
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
 className={`bg-gradient-to-br from-yellow-50/95 to-orange-50/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-yellow-200/60 flex flex-col h-full relative overflow-hidden no-transition ${
 dragOverZone === 'pending' ? 'ring-4 ring-yellow-400 ring-opacity-50 shadow-2xl scale-105' : ''
 }`}
 data-drop-zone="pending"
 onDragOver={(e) => handleDragOver(e, 'pending')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'pending')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-yellow-300/30 to-orange-300/30 rounded-full blur-xl"></div>
 
 <div className="flex items-center mb-6 relative z-10">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 no-transition ">
 ⏳
 </div>
 <div>
 <h2 className="text-xl font-bold text-yellow-800">รอคิว</h2>
 <p className="text-yellow-600 font-medium flex items-center">
 <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse inline-block"></span>
 {pendingBookings.length} คิว
 {dragOverZone === 'pending' && (
 <span className="block text-yellow-700 text-sm font-medium ml-2">🎯 วางที่นี่</span>
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
 className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-yellow-200/50 no-transition cursor-move touch-none ${
 isDragging && draggedBooking?.id === booking.id ? 'opacity-50 scale-95' : ''
 }`}
 style={{ userSelect: 'none' }}
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center">
 <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold mr-3">
 {index + 1}
 </div>
 <div>
 <h3 className="font-bold text-[#4E3B31] text-lg">{booking.customerName}</h3>
 <p className="text-sm text-[#7E7B77]">{booking.customerPhone}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold mb-1">
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
 className="flex-1 px-3 py-2 bg-gradient-to-r from-[#B89B85] to-[#A1826F] text-white text-sm font-semibold rounded-xl hover:shadow-lg no-transition hover:scale-105"
 >
 🏃‍♀️ เริ่มนวด
 </button>
 <button
 onClick={() => handleEditBooking(booking)}
 className="px-3 py-2 bg-white/90 hover:bg-white text-[#7E7B77] hover:text-[#4E3B31] text-sm font-semibold rounded-xl border border-[#B89B85]/20 hover:border-[#B89B85] hover:shadow-lg no-transition "
 >
 ✏️
 </button>
 </div>
 </div>
 );
 })}
 
 {pendingBookings.length === 0 && (
 <div className="text-center py-12 text-yellow-600 flex-1 flex flex-col justify-center">
 <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
 <ClockIcon className="h-10 w-10 text-yellow-400" />
 </div>
 <p className="text-base font-medium">ไม่มีคิวที่รอ</p>
 <p className="text-sm text-yellow-500 mt-1">คิวใหม่จะปรากฏที่นี่</p>
 </div>
 )}
 </div>
 </div>

 {/* กำลังนวด */}
 <div 
 className={`bg-gradient-to-br from-blue-50/95 to-indigo-50/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-blue-200/60 flex flex-col h-full relative overflow-hidden no-transition ${
 dragOverZone === 'in_progress' ? 'ring-4 ring-blue-400 ring-opacity-50 shadow-2xl scale-105' : ''
 }`}
 data-drop-zone="in_progress"
 onDragOver={(e) => handleDragOver(e, 'in_progress')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'in_progress')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-blue-300/30 to-indigo-300/30 rounded-full blur-xl animate-pulse"></div>
 
 <div className="flex items-center mb-6 relative z-10">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 no-transition ">
 💆‍♀️
 </div>
 <div>
 <h2 className="text-xl font-bold text-blue-800">กำลังนวด</h2>
 <p className="text-blue-600 font-medium flex items-center">
 <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse inline-block"></span>
 {inProgressBookings.length} คิว
 {dragOverZone === 'in_progress' && (
 <span className="block text-blue-700 text-sm font-medium ml-2">🎯 วางที่นี่</span>
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
 className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-blue-200/50 no-transition cursor-move touch-none ${
 isDragging && draggedBooking?.id === booking.id ? 'opacity-50 scale-95' : ''
 }`}
 style={{ userSelect: 'none' }}
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center">
 <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold mr-3">
 💆‍♀️
 </div>
 <div>
 <h3 className="font-bold text-gray-800 text-lg">{booking.customerName}</h3>
 <p className="text-sm text-gray-600">{booking.customerPhone}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold mb-1">
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
 className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg no-transition hover:scale-105"
 >
 ✅ เสร็จแล้ว
 </button>
 <button
 onClick={() => handleEditBooking(booking)}
 className="px-3 py-2 bg-white/90 hover:bg-white text-[#7E7B77] hover:text-[#4E3B31] text-sm font-semibold rounded-xl border border-[#B89B85]/20 hover:border-[#B89B85] hover:shadow-lg no-transition "
 >
 ✏️
 </button>
 </div>
 </div>
 );
 })}
 
 {inProgressBookings.length === 0 && (
 <div className="text-center py-12 text-[#7E7B77] flex-1 flex flex-col justify-center">
 <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
 <PlayCircleIcon className="h-10 w-10 text-blue-400" />
 </div>
 <p className="text-base font-medium">ไม่มีคิวที่กำลังนวด</p>
 <p className="text-sm text-[#7E7B77]/70 mt-1">คิวที่เริ่มแล้วจะปรากฏที่นี่</p>
 </div>
 )}
 </div>
 </div>

 {/* เสร็จแล้ว */}
 <div 
 className={`bg-gradient-to-br from-green-50/95 to-emerald-50/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-green-200/60 flex flex-col h-full relative overflow-hidden no-transition ${
 dragOverZone === 'done' ? 'ring-4 ring-green-400 ring-opacity-50 shadow-2xl scale-105' : ''
 }`}
 data-drop-zone="done"
 onDragOver={(e) => handleDragOver(e, 'done')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, 'done')}
 >
 <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-green-300/30 to-emerald-300/30 rounded-full blur-xl"></div>
 
 <div className="flex items-center mb-6 relative z-10">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 no-transition ">
 ✅
 </div>
 <div>
 <h2 className="text-xl font-bold text-green-800">เสร็จแล้ว</h2>
 <p className="text-green-600 font-medium flex items-center">
 <span className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block"></span>
 {doneBookings.length} คิว
 {dragOverZone === 'done' && (
 <span className="block text-green-700 text-sm font-medium ml-2">🎯 วางที่นี่</span>
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
 className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-green-200/50 no-transition"
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center">
 <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold mr-3">
 ✅
 </div>
 <div>
 <h3 className="font-bold text-gray-800 text-lg">{booking.customerName}</h3>
 <p className="text-sm text-gray-600">{booking.customerPhone}</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold mb-1">
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
 <div className="text-center py-12 text-[#7E7B77] flex-1 flex flex-col justify-center">
 <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
 <CheckCircleIcon className="h-10 w-10 text-green-400" />
 </div>
 <p className="text-base font-medium">ยังไม่มีคิวที่เสร็จ</p>
 <p className="text-sm text-[#7E7B77]/70 mt-1">คิวที่เสร็จแล้วจะปรากฏที่นี่</p>
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
