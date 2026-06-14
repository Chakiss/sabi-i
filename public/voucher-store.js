// ============================================================================
// Saba-i · Voucher store  (Firestore — ข้อมูลจริง)
// ต้องโหลด firebase-app-compat + firebase-firestore-compat + config.js ก่อนไฟล์นี้
// ใช้ร่วมกันระหว่าง voucher-sell.html และ voucher-use.html
// ============================================================================

// ---- นิยามแพ็กเกจ ----  (eligibleServices.serviceId = map ไป services จริงในระบบ)
const VOUCHER_PACKAGE = {
  id: 'PKG10H',
  name: 'แพ็กเกจนวด 10 ชั่วโมง',
  nameEn: '10-Hour Massage Voucher',
  hours: 10,
  price: 3825,
  validMonths: 6,
  eligibleServices: [
    { key: 'thai', name: 'นวดไทย',          en: 'Thai Massage',     serviceId: 'S001' },
    { key: 'foot', name: 'นวดเท้า',          en: 'Foot Massage',     serviceId: 'S001' },
    { key: 'deep', name: 'นวดรีดเส้น',       en: 'Deep Tissue',      serviceId: 'S002' },
    { key: 'neck', name: 'นวดคอ บ่า ไหล่',   en: 'Neck & Shoulder',  serviceId: 'S003' },
  ],
};

// ตรงกับ CONFIG จริง: SHOP_START_HOUR 10, SHOP_END_HOUR 22, SLOT_DURATION 15
const SHOP = { start: 10, end: 22, stepMin: 15 };

(function () {
  const db = window.db;                                   // จาก config.js
  const Timestamp = firebase.firestore.Timestamp;
  const vCol = () => db.collection('vouchers');
  const bCol = () => db.collection('bookings');

  // ---------------- realtime cache ----------------
  let _cache = [];
  let _ready = false;
  const _subs = [];
  const _emit = () => _subs.forEach(cb => { try { cb(_cache); } catch (e) { console.error(e); } });

  const _tsToIso = (ts) => {
    if (!ts) return null;
    if (typeof ts === 'string') return ts;
    if (ts.toDate) return ts.toDate().toISOString();
    return new Date(ts).toISOString();
  };

  function init() {
    if (!db) { console.error('VoucherStore: window.db ไม่พร้อม (โหลด config.js ก่อน)'); return; }
    vCol().orderBy('createdAt', 'desc').onSnapshot(
      (snap) => {
        _cache = snap.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            purchaseDate: _tsToIso(data.purchaseDate),
            expiryDate: _tsToIso(data.expiryDate),
            usedHours: data.usedHours || 0,
            totalHours: data.totalHours || 0,
            redemptions: data.redemptions || [],
          };
        });
        _ready = true;
        _emit();
      },
      (err) => console.error('vouchers listener error:', err)
    );
  }

  function onChange(cb) { _subs.push(cb); if (_ready) cb(_cache); }
  function loadVouchers() { return _cache; }
  function getVoucher(id) { return _cache.find(v => v.id === id) || null; }
  function isReady() { return _ready; }

  // ---------------- เขียนข้อมูล ----------------
  async function createVoucher(v) {
    const purchase = new Date(v.purchaseDate);
    const doc = {
      customerName: v.customerName,
      customerPhone: v.customerPhone,
      packageId: v.packageId,
      packageName: v.packageName,
      totalHours: v.totalHours,
      usedHours: 0,
      price: v.price,
      paymentMethod: v.paymentMethod || '',
      purchaseDate: Timestamp.fromDate(purchase),
      expiryDate: Timestamp.fromDate(addMonths(purchase, VOUCHER_PACKAGE.validMonths)),
      status: 'active',
      redemptions: [],
      createdAt: Timestamp.now(),
    };
    await vCol().doc(v.id).set(doc);
    return v.id;
  }

  // ตัดสิทธิ์ด้วย transaction (กันหักเกิน/ชนกันหลายเครื่อง)
  async function redeemVoucher(id, redemption) {
    const ref = vCol().doc(id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('ไม่พบ Voucher');
      const data = snap.data();
      const remaining = (data.totalHours || 0) - (data.usedHours || 0);
      if (redemption.hours > remaining + 1e-9) throw new Error('ชั่วโมงคงเหลือไม่พอ');
      const usedHours = +((data.usedHours || 0) + redemption.hours).toFixed(2);
      const redemptions = (data.redemptions || []).concat([redemption]);
      const status = (data.totalHours - usedHours) <= 1e-9 ? 'used_up' : 'active';
      tx.update(ref, { usedHours, redemptions, status });
    });
  }

  // สร้าง booking จริงบนปฏิทิน (ผูกกับ voucher) → คืน bookingId
  async function createVoucherBooking({ therapistId, dateKey, startTime, endTime, durationMin, serviceId, voucherId, serviceName }) {
    const bid = genBookingId();
    const startDate = new Date(`${dateKey}T${startTime}:00`);
    const endDate = new Date(`${dateKey}T${endTime}:00`);
    const booking = {
      therapistId,
      startTime: Timestamp.fromDate(startDate),
      endTime: Timestamp.fromDate(endDate),
      dateKey,
      duration: durationMin,
      price: 0,                                  // จ่ายผ่าน voucher แล้ว
      discount: 0,
      therapistFee: 0,                           // แก้ทีหลังในโมดัลจองได้ ถ้าต้องจ่ายค่ามือ
      serviceId: serviceId || '',
      paymentMethod: 'voucher',
      note: `Voucher ${voucherId}${serviceName ? ' · ' + serviceName : ''}`,
      voucherId,
      createdAt: Timestamp.now(),
    };
    await bCol().doc(bid).set(booking);
    return bid;
  }

  async function deleteBooking(bid) {
    try { await bCol().doc(bid).delete(); } catch (e) { console.error('rollback booking failed', e); }
  }

  // ---------------- หมอนวด (จริง) ----------------
  async function loadTherapists() {
    try {
      const snap = await db.collection('therapists').orderBy('displayOrder').get();
      return snap.docs
        .map(d => ({ id: d.id, name: d.data().name || d.id, status: d.data().status }))
        .filter(t => t.status !== 'inactive');
    } catch (e) {
      console.error('loadTherapists error:', e);
      return [];
    }
  }

  // ---------------- ความว่างของหมอ (จาก bookings จริง) ----------------
  async function getTherapistBusy(therapistId, dateKey) {
    const busy = [];
    try {
      const snap = await bCol().where('dateKey', '==', dateKey).get();
      snap.forEach(d => {
        const b = d.data();
        if (b.therapistId !== therapistId) return;
        const s = b.startTime && b.startTime.toDate ? b.startTime.toDate() : null;
        const e = b.endTime && b.endTime.toDate ? b.endTime.toDate() : null;
        if (s && e) busy.push({ s: s.getHours() * 60 + s.getMinutes(), e: e.getHours() * 60 + e.getMinutes() });
      });
    } catch (err) {
      console.error('getTherapistBusy error:', err);
    }
    return busy;
  }

  async function genTimeSlots(therapistId, dateKey, durationHours) {
    const durMin = Math.round(durationHours * 60);
    const busy = await getTherapistBusy(therapistId, dateKey);
    const slots = [];
    for (let t = SHOP.start * 60; t + durMin <= SHOP.end * 60; t += SHOP.stepMin) {
      const s = t, e = t + durMin;
      const conflict = busy.some(b => s < b.e && e > b.s);
      slots.push({ value: _toHHMM(t), end: _toHHMM(e), disabled: conflict });
    }
    return slots;
  }

  // ---------------- helpers ----------------
  function genVoucherId(now) {
    const p = n => String(n).padStart(2, '0');
    return `V${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  }
  function genBookingId() {
    const n = new Date();
    const p = x => String(x).padStart(2, '0');
    return `B${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
  }
  function addMonths(date, months) {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }
  function fmtDateTH(date) {
    if (!date) return '-';
    const d = (date instanceof Date) ? date : new Date(date);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  }
  function remainingHours(v) { return Math.max(0, +(v.totalHours - v.usedHours).toFixed(2)); }
  function isExpired(v) { return new Date(v.expiryDate).getTime() < Date.now(); }
  function voucherStatus(v) {
    if (remainingHours(v) <= 0) return 'used_up';
    if (isExpired(v)) return 'expired';
    return 'active';
  }
  function serviceName(key) {
    const s = VOUCHER_PACKAGE.eligibleServices.find(x => x.key === key);
    return s ? s.name : key;
  }
  function serviceIdForKey(key) {
    const s = VOUCHER_PACKAGE.eligibleServices.find(x => x.key === key);
    return s ? s.serviceId : '';
  }
  function _toMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function _toHHMM(min) { const h = Math.floor(min / 60), m = min % 60; const p = n => String(n).padStart(2, '0'); return `${p(h)}:${p(m)}`; }
  function addMinutesHHMM(hhmm, minutes) { return _toHHMM(_toMin(hhmm) + minutes); }

  // ---------------- Stamp card renderer (10 ดวง) ----------------
  function renderStampCard(voucher) {
    const total = voucher.totalHours;
    const used = voucher.usedHours;
    const fullCount = Math.floor(used);
    const hasHalf = (used - fullCount) >= 0.5;
    const lotus = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3c1.2 1.9 1.2 3.8 0 5.7C10.8 6.8 10.8 4.9 12 3zm-4.7 2.4c1.9.6 3 2.1 3.4 4.4-2.1-.4-3.4-1.7-3.4-4.4zm9.4 0c0 2.7-1.3 4-3.4 4.4.4-2.3 1.5-3.8 3.4-4.4zM3.5 9.6c2.2-.2 3.9.6 4.9 2.6-2.1.6-3.9-.1-4.9-2.6zm17 0c-1 2.5-2.8 3.2-4.9 2.6 1-2 2.7-2.8 4.9-2.6zM12 10.5c1.7 0 3.1 1 3.7 2.7.5 1.6-.1 3.3-1.5 4.6-.7.6-1.5 1.1-2.2 1.6-.7-.5-1.5-1-2.2-1.6-1.4-1.3-2-3-1.5-4.6.6-1.7 2-2.7 3.7-2.7z"/>
    </svg>`;
    let dots = '';
    for (let i = 0; i < total; i++) {
      let cls = 'stamp', inner = '';
      if (i < fullCount) { cls += ' stamp-full'; inner = lotus; }
      else if (i === fullCount && hasHalf) { cls += ' stamp-half'; inner = lotus; }
      else { cls += ' stamp-empty'; inner = `<span class="stamp-num">${i + 1}</span>`; }
      dots += `<div class="${cls}"><div class="stamp-inner">${inner}</div></div>`;
    }
    return `<div class="stamp-grid">${dots}</div>`;
  }

  // ---------------- expose ----------------
  window.VoucherStore = {
    PACKAGE: VOUCHER_PACKAGE, SHOP,
    init, onChange, isReady, loadVouchers, getVoucher,
    createVoucher, redeemVoucher, createVoucherBooking, deleteBooking,
    loadTherapists, getTherapistBusy, genTimeSlots,
    genVoucherId, addMonths, fmtDateTH, remainingHours, isExpired,
    voucherStatus, serviceName, serviceIdForKey, addMinutesHHMM, renderStampCard,
  };

  init();
})();
