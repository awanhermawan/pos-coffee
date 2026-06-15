/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Trash2, 
  Receipt, 
  Calendar, 
  RefreshCw, 
  Trash, 
  X, 
  Check, 
  CheckCircle, 
  Edit3, 
  Sun, 
  Moon, 
  Info,
  DollarSign, 
  Activity, 
  Coffee, 
  Smartphone,
  ChevronDown,
  Sparkles,
  Award,
  Mail,
  Instagram
} from 'lucide-react';
import CodeViewer from './components/CodeViewer';

// Menu Definitions as per user HTML layout
const INITIAL_MENU = [
  { id: 'gula-aren', name: 'Kopi Susu Gula Aren', price: 13000, img: 'https://lh3.googleusercontent.com/d/1loBvbvUdCyIKHlqIltDp3eIPHAGFTmmv' },
  { id: 'americano', name: 'Kopi Americano', price: 10000, img: 'https://lh3.googleusercontent.com/d/1S4VwLODeJ5p4aG_LwXx1hDSSmm2O5CSL' },
  { id: 'coklat', name: 'Coklat', price: 10000, img: 'https://lh3.googleusercontent.com/d/18EJUB09zZHsfELnO63_a5n3VpYU0OzMV' },
  { id: 'matcha', name: 'Matcha', price: 10000, img: 'https://lh3.googleusercontent.com/d/1n-LawknbS083-9Dr3ordu5Hs8z26AeZQ' }
];

interface OrderItem {
  id: string;
  name: string;
  price: number;
  img: string;
  qty: number;
  isCustom?: boolean;
}

interface OrderRecord {
  orderId: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string;   // HH:MM:SS
  items: string;   // e.g., "Matcha x2, Coklat x1"
  totalQty: string;
  total: number;
  paymentMethod: string;
  status: string;  // "Lunas" | "Belum Bayar"
  note: string;
}

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error';
}

let inMemoryOrders: OrderRecord[] = [];

export default function App() {
  const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeSlide, setActiveSlide] = useState<number>(1);
  
  // PWA elements for Android and iOS manually guided installation
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBadge, setShowInstallBadge] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBadge(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already nested in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBadge(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setShowInstallBadge(false);
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      // Show instructive help dialog
      setIsInstallModalOpen(true);
    }
  };

  // Auto slide effect
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(p => (p === 1 ? 2 : 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  
  // App state
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [customItems, setCustomItems] = useState<OrderItem[]>([]);
  const [customNameInput, setCustomNameInput] = useState('');
  const [customPriceInput, setCustomPriceInput] = useState('');
  
  // Cart sheet details
  const [payMethod, setPayMethod] = useState<'QRIS' | 'Cash'>('QRIS');
  const [payStatus, setPayStatus] = useState<'Lunas' | 'Belum Bayar'>('Belum Bayar');
  const [orderNote, setOrderNote] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Success Order modal
  const [lastInsertedOid, setLastInsertedOid] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Edit Order modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPayMethod, setEditPayMethod] = useState<'QRIS' | 'Cash'>('QRIS');
  const [editStatus, setEditStatus] = useState<'Lunas' | 'Belum Bayar'>('Belum Bayar');

  // History filtering and lazy loading state (Matching Google Apps Script)
  const [dateRangeMode, setDateRangeMode] = useState<string>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Server/GAS simulated records
  const [records, setRecords] = useState<OrderRecord[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderRecord[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Memproses...');
  
  // Lazy Loading Page states
  const lazyLimit = 10; // Set limit to exactly 10 transactions as requested

  // Filter by status filter (Semua, Lunas, Belum Bayar) in-memory with extreme speed
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return historyOrders;
    return historyOrders.filter(o => o.status === statusFilter);
  }, [historyOrders, statusFilter]);

  // Paginated/slice of filtered orders in-memory
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleLimit);
  }, [filteredOrders, visibleLimit]);

  const lazyHasMore = filteredOrders.length > visibleLimit;
  const filteredCount = filteredOrders.length;

  // Calculated stats based on overall filtered range
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCash: 0,
    totalQris: 0,
    totalCount: 0,
    bestSeller: null as { name: string; qty: number } | null
  });

  // Dialog Toast alerts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Seed default items in mock database for richer history simulation
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = getTodayStrObj(0);
    const yesterday = getTodayStrObj(-1);
    const threeDaysAgo = getTodayStrObj(-3);

    // Explicitly wipe the simulated database from localStorage
    try {
      localStorage.removeItem('kopi_pos_orders');
    } catch (e) {}

    if (inMemoryOrders.length === 0) {
      const defaultRecords: OrderRecord[] = [
        {
          orderId: 'ORD-' + today.year + today.month + today.day + '-152000',
          tanggal: today.str,
          waktu: '15:20:00',
          items: 'Kopi Susu Gula Aren x1, Matcha x2',
          totalQty: '3',
          total: 70000,
          paymentMethod: 'QRIS',
          status: 'Lunas',
          note: 'Meja 5'
        },
        {
          orderId: 'ORD-' + today.year + today.month + today.day + '-143000',
          tanggal: today.str,
          waktu: '14:30:00',
          items: 'Coklat x2, Kopi Americano x2',
          totalQty: '4',
          total: 76000,
          paymentMethod: 'Cash',
          status: 'Belum Bayar',
          note: 'Antrian 8'
        },
        {
          orderId: 'ORD-' + today.year + today.month + today.day + '-102432',
          tanggal: today.str,
          waktu: '10:24:32',
          items: 'Kopi Susu Gula Aren x2, Matcha x1',
          totalQty: '3',
          total: 68000,
          paymentMethod: 'QRIS',
          status: 'Lunas',
          note: 'Meja 4'
        },
        {
          orderId: 'ORD-' + today.year + today.month + today.day + '-091215',
          tanggal: today.str,
          waktu: '09:12:15',
          items: 'Kopi Americano x1, Coklat x1',
          totalQty: '2',
          total: 38000,
          paymentMethod: 'Cash',
          status: 'Lunas',
          note: 'Bungkus'
        },
        {
          orderId: 'ORD-' + yesterday.year + yesterday.month + yesterday.day + '-193000',
          tanggal: yesterday.str,
          waktu: '19:30:00',
          items: 'Kopi Susu Gula Aren x3, Coklat x1',
          totalQty: '4',
          total: 86000,
          paymentMethod: 'QRIS',
          status: 'Lunas',
          note: 'Gojek'
        },
        {
          orderId: 'ORD-' + yesterday.year + yesterday.month + yesterday.day + '-180000',
          tanggal: yesterday.str,
          waktu: '18:00:00',
          items: 'Matcha x2',
          totalQty: '2',
          total: 48000,
          paymentMethod: 'Cash',
          status: 'Lunas',
          note: 'Meja 8'
        },
        {
          orderId: 'ORD-' + yesterday.year + yesterday.month + yesterday.day + '-164412',
          tanggal: yesterday.str,
          waktu: '16:44:12',
          items: 'Matcha x3, Kopi Americano x2',
          totalQty: '5',
          total: 108000,
          paymentMethod: 'QRIS',
          status: 'Lunas',
          note: 'Meja 2'
        },
        {
          orderId: 'ORD-' + yesterday.year + yesterday.month + yesterday.day + '-111005',
          tanggal: yesterday.str,
          waktu: '11:10:05',
          items: 'Kopi Susu Gula Aren x1',
          totalQty: '1',
          total: 22000,
          paymentMethod: 'Cash',
          status: 'Belum Bayar',
          note: 'Pak Budi'
        },
        {
          orderId: 'ORD-' + threeDaysAgo.year + threeDaysAgo.month + threeDaysAgo.day + '-150000',
          tanggal: threeDaysAgo.str,
          waktu: '15:00:00',
          items: 'Kopi Americano x3, Coklat x2',
          totalQty: '5',
          total: 94000,
          paymentMethod: 'QRIS',
          status: 'Lunas',
          note: 'Grab'
        },
        {
          orderId: 'ORD-' + threeDaysAgo.year + threeDaysAgo.month + threeDaysAgo.day + '-142010',
          tanggal: threeDaysAgo.str,
          waktu: '14:20:10',
          items: 'Coklat x4, Matcha x2',
          totalQty: '6',
          total: 128000,
          paymentMethod: 'QRIS',
          status: 'Lunas',
          note: 'Meja 1'
        },
        {
          orderId: 'ORD-' + threeDaysAgo.year + threeDaysAgo.month + threeDaysAgo.day + '-120000',
          tanggal: threeDaysAgo.str,
          waktu: '12:00:00',
          items: 'Kopi Susu Gula Aren x2',
          totalQty: '2',
          total: 44000,
          paymentMethod: 'Cash',
          status: 'Lunas',
          note: 'Takeaway'
        },
        {
          orderId: 'ORD-' + threeDaysAgo.year + threeDaysAgo.month + threeDaysAgo.day + '-080512',
          tanggal: threeDaysAgo.str,
          waktu: '08:05:12',
          items: 'Kopi Americano x2',
          totalQty: '2',
          total: 36000,
          paymentMethod: 'Cash',
          status: 'Belum Bayar',
          note: 'Antrian 5'
        }
      ];
      inMemoryOrders = defaultRecords;
      setRecords(defaultRecords);
    } else {
      setRecords([...inMemoryOrders]);
    }

    // Set initial date fields
    const todayFormated = today.str;
    setDateFrom(todayFormated);
    setDateTo(todayFormated);

    // Set default theme from localStorage
    const savedTheme = localStorage.getItem('kopi_pos_theme') || 'light';
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setTheme('light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Update theme handling
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      localStorage.setItem('kopi_pos_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setTheme('light');
      localStorage.setItem('kopi_pos_theme', 'light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  // Helper date generators
  function getTodayStrObj(offset: number) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      str: `${year}-${month}-${day}`,
      year,
      month,
      day
    };
  }

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    const newToast: ToastMessage = {
      id: Date.now().toString(),
      text,
      type
    };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 3000);
  };

  // Handle Menu qty modifications
  const changeQty = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return updated;
    });
  };

  const addCustomItem = () => {
    const name = customNameInput.trim();
    const parsedPrice = parseInt(customPriceInput.replace(/\./g, '')) || 0;

    if (!name) {
      showToast('Nama item harus diisi', 'error');
      return;
    }
    if (parsedPrice <= 0) {
      showToast('Harga harus lebih besar dari 1', 'error');
      return;
    }

    const newItem: OrderItem = {
      id: 'custom-' + Date.now(),
      name,
      price: parsedPrice,
      img: '',
      qty: 1,
      isCustom: true
    };

    setCustomItems(prev => [...prev, newItem]);
    setCustomNameInput('');
    setCustomPriceInput('');
    setIsCartOpen(true);
    showToast(`${name} ditambahkan!`, 'success');
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(i => i.id !== id));
    showToast('Custom item dihapus', 'success');
  };

  // Compile cart details
  const getCartItems = (): OrderItem[] => {
    const items: OrderItem[] = [];
    INITIAL_MENU.forEach(m => {
      const q = cart[m.id] || 0;
      if (q > 0) {
        items.push({ ...m, qty: q });
      }
    });
    customItems.forEach(ci => {
      items.push(ci);
    });
    return items;
  };

  const cartTotalQty = getCartItems().reduce((sum, item) => sum + item.qty, 0);
  const cartTotalPrice = getCartItems().reduce((sum, item) => sum + (item.price * item.qty), 0);

  const formatRp = (n: number) => {
    return 'Rp ' + Number(n).toLocaleString('id-ID');
  };

  const formatCustomPrice = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('id-ID');
  };

  const clearCart = () => {
    setCart({});
    setCustomItems([]);
    setIsCartOpen(false);
    showToast('Keranjang telah dikosongkan', 'success');
  };

  // Submit Order Action (Simulates Google Apps Script 'submitOrder')
  const submitOrder = () => {
    const items = getCartItems();
    if (!items.length) return;

    setLoading(true);
    setLoadingText('Menyimpan order ke database server...');

    setTimeout(() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      
      const orderId = 'ORD-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
      const tanggal = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const waktu = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());

      const itemStrings = items.map(i => `${i.name} x${i.qty}`);
      const itemsFormatted = itemStrings.join(', ');
      
      const newRecord: OrderRecord = {
        orderId,
        tanggal,
        waktu,
        items: itemsFormatted,
        totalQty: String(items.reduce((sum, i) => sum + i.qty, 0)),
        total: cartTotalPrice,
        paymentMethod: payMethod,
        status: payStatus,
        note: orderNote || ''
      };

      // Save to in-memory DB
      inMemoryOrders.push(newRecord);
      setRecords([...inMemoryOrders]);

      // Clean Cart
      setCart({});
      setCustomItems([]);
      setOrderNote('');
      setPayMethod('QRIS');
      setPayStatus('Belum Bayar');
      setIsCartOpen(false);

      // Show success modal
      setLastInsertedOid(orderId);
      setIsSuccessModalOpen(true);
      setLoading(false);
      showToast('Order berhasil disimpan!', 'success');
    }, 800);
  };

  // Fetch orders from mock Database (Replicates paginateAndSummarize in Apps Script)
  const fetchHistoryWithGASLogic = (isFirstLoad: boolean) => {
    if (!isFirstLoad) {
      // Lazy page load: increment visible limit locally, very fast
      setVisibleLimit(prev => prev + 10);
      return;
    }

    setLoading(true);
    setLoadingText('Menghubungkan ke Google Sheets...');

    setTimeout(() => {
      const allSavedRecords: OrderRecord[] = [...inMemoryOrders];
      
      // Filter by range dates if present
      let filteredByDate = allSavedRecords;
      if (dateFrom || dateTo) {
        filteredByDate = allSavedRecords.filter(o => {
          if (dateFrom && o.tanggal < dateFrom) return false;
          if (dateTo && o.tanggal > dateTo) return false;
          return true;
        });
      }

      // Sort reverse (newest first)
      filteredByDate.sort((a, b) => b.orderId.localeCompare(a.orderId));

      // Calculate Stats OVER THE ENTIRE SELECTED RANGE (before status filtering)
      let totalRevenue = 0;
      let totalCash = 0;
      let totalQris = 0;
      let totalCount = filteredByDate.length;

      filteredByDate.forEach(o => {
        totalRevenue += Number(o.total || 0);
        if (o.paymentMethod === 'QRIS') {
          totalQris += Number(o.total || 0);
        } else {
          totalCash += Number(o.total || 0);
        }
      });

      // Best Seller logic
      const qtyMap: { [name: string]: number } = {};
      filteredByDate.forEach(o => {
        (o.items || '').split(', ').forEach(itemSet => {
          const parts = itemSet.split(' x');
          if (parts.length === 2) {
            const name = parts[0].trim();
            const count = parseInt(parts[1], 10) || 0;
            qtyMap[name] = (qtyMap[name] || 0) + count;
          }
        });
      });

      let best: { name: string; qty: number } | null = null;
      let maxQty = 0;
      for (const k in qtyMap) {
        if (qtyMap[k] > maxQty) {
          maxQty = qtyMap[k];
          best = { name: k, qty: qtyMap[k] };
        }
      }

      const calculatedStats = {
        totalRevenue,
        totalCash,
        totalQris,
        totalCount,
        bestSeller: best
      };

      // Update states
      setStats(calculatedStats);
      setHistoryOrders(filteredByDate);
      setVisibleLimit(10);
      
      setLoading(false);
    }, 600);
  };

  // Re-run whenever filter conditions change (excluding statusFilter for instant switching)
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryWithGASLogic(true);
    }
  }, [activeTab, dateFrom, dateTo]);

  // Set preset ranges
  const selectRangePreset = (preset: string) => {
    setDateRangeMode(preset);
    const today = getTodayStrObj(0);
    
    if (preset === 'today') {
      setDateFrom(today.str);
      setDateTo(today.str);
    } else if (preset === 'yesterday') {
      const yesterday = getTodayStrObj(-1);
      setDateFrom(yesterday.str);
      setDateTo(yesterday.str);
    } else if (preset === '7d') {
      const weekAgo = getTodayStrObj(-6);
      setDateFrom(weekAgo.str);
      setDateTo(today.str);
    } else if (preset === '14d') {
      const fortnightAgo = getTodayStrObj(-13);
      setDateFrom(fortnightAgo.str);
      setDateTo(today.str);
    } else if (preset === '30d') {
      const monthAgo = getTodayStrObj(-29);
      setDateFrom(monthAgo.str);
      setDateTo(today.str);
    }
  };

  // Edit dialog actions
  const openEditModal = (rec: OrderRecord) => {
    setEditingId(rec.orderId);
    setEditPayMethod(rec.paymentMethod as 'QRIS' | 'Cash');
    setEditStatus(rec.status as 'Lunas' | 'Belum Bayar');
  };

  const saveEditedOrder = () => {
    if (!editingId) return;

    setLoading(true);
    setLoadingText('Mengupdate status di server Google Sheets...');

    setTimeout(() => {
      const updated = inMemoryOrders.map(r => {
        if (r.orderId === editingId) {
          return {
            ...r,
            paymentMethod: editPayMethod,
            status: editStatus
          };
        }
        return r;
      });

      inMemoryOrders = updated;
      setRecords(updated);
      setEditingId(null);
      setLoading(false);
      showToast(`Order ${editingId} berhasil diperbarui!`, 'success');
      
      // Trigger update
      fetchHistoryWithGASLogic(true);
    }, 400);
  };

  const deleteSelectedOrder = () => {
    if (!editingId) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus transaksi ${editingId}?`)) return;

    setLoading(true);
    setLoadingText('Menghapus data dari Google Sheets...');

    setTimeout(() => {
      const filtered = inMemoryOrders.filter(r => r.orderId !== editingId);

      inMemoryOrders = filtered;
      setRecords(filtered);
      setEditingId(null);
      setLoading(false);
      showToast(`Order ${editingId} berhasil dihapus!`, 'success');

      // Trigger update
      fetchHistoryWithGASLogic(true);
    }, 400);
  };

  // Header display Date
  const getDisplayHeaderDate = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getWIBGreeting = () => {
    // WIB is UTC+7
    const utcDate = new Date();
    const utcHours = utcDate.getUTCHours();
    const wibHours = (utcHours + 7) % 24;
    
    if (wibHours >= 5 && wibHours < 12) {
      return "Good Morning";
    } else if (wibHours >= 12 && wibHours < 18) {
      return "Good Afternoon";
    } else {
      return "Good Night";
    }
  };

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 pb-24">
      
      {/* Toast notifications */}
      <div className="fixed top-4 left-4 right-4 z-[9999] pointer-events-none flex flex-col gap-2 max-w-sm mx-auto">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 bg-white dark:bg-zinc-800 border-l-4 border-amber-600 dark:border-amber-400 p-4 rounded-xl shadow-lg ring-1 ring-black/5 animate-slide-in">
            <CheckCircle className="text-amber-600 dark:text-amber-400 shrink-0" size={18} />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Loading Modal OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center max-w-xs w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full border-4 border-amber-200 dark:border-zinc-800 border-t-amber-600 dark:border-t-amber-400 animate-spin mb-4" />
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 text-center">{loadingText}</p>
            <p className="text-xs text-zinc-500 mt-1">Google Apps Script Simulation</p>
          </div>
        </div>
      )}

      {/* PWA Manual Install Instructions Modal */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-fade-in relative">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-scale-up text-zinc-900 dark:text-zinc-100">
            <button 
              onClick={() => setIsInstallModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full transition-all"
            >
              <X size={15} />
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2.5">
                <Smartphone size={24} />
              </div>
              <h3 className="font-extrabold text-md text-zinc-900 dark:text-zinc-100">
                Langkah Instalasi Aplikasi
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Aplikasi POS ini super ringan (kurang dari 1MB), hemat RAM, 100% online secepat kilat.
              </p>
            </div>

            <div className="space-y-4 text-left border-y border-zinc-100 dark:border-zinc-800 py-4 mb-4 select-text">
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-[10px] font-black text-zinc-950 flex items-center justify-center shrink-0">1</div>
                <div>
                  <h4 className="text-[11.5px] font-black uppercase text-amber-600 dark:text-amber-400 leading-none mb-1">Khusus Android (Sangat Mudah)</h4>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                    Tap ikon menu titik tiga <span className="font-black">&#8942;</span> di sudut kanan atas Google Chrome Anda, lalu pilih <strong className="text-zinc-900 dark:text-white">"Tambahkan ke Layar Utama"</strong> atau <strong className="text-zinc-900 dark:text-white">"Install aplikasi"</strong>. Selesai!
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-[10px] font-black text-zinc-950 flex items-center justify-center shrink-0">2</div>
                <div>
                  <h4 className="text-[11.5px] font-black uppercase text-amber-600 dark:text-amber-400 leading-none mb-1">Khusus iOS / iPhone (Safari)</h4>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                    Buka situs ini di browser Safari, tap tombol <strong className="text-zinc-900 dark:text-white">Share / Bagikan</strong> (ikon kotak dengan tanda panah ke atas di bilah bawah), scroll ke bawah lalu pilih <strong className="text-zinc-900 dark:text-white">"Add to Home Screen / Tambahkan ke Layar Utama"</strong>.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsInstallModalOpen(false)}
              className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-95"
            >
              Saya Mengerti & Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[900] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl animate-slide-up text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 scale-up">
              <Check size={32} strokeWidth={3} />
            </div>
            <h3 className="font-extrabold text-xl mb-1 text-zinc-900 dark:text-white">Order Tersimpan! 🎉</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Pesanan berhasil dicatat dalam Google Sheet database</p>
            
            <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 mb-6 font-mono text-xs text-amber-700 dark:text-amber-400 font-bold tracking-wider">
              {lastInsertedOid}
            </div>

            <button 
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold transition-all text-sm shadow-md"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/60 z-[900] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-lg flex items-center gap-2 text-zinc-900 dark:text-white">
                <Edit3 size={18} className="text-amber-600" />
                Edit Transaksi
              </h3>
              <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Mengevaluasi row order dengan ID: <strong className="text-amber-600 dark:text-amber-400 font-mono">{editingId}</strong>
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 mb-1.5 block">Metode Pembayaran</label>
                <select 
                  value={editPayMethod}
                  onChange={(e) => setEditPayMethod(e.target.value as 'QRIS' | 'Cash')}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="QRIS">QRIS</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 mb-1.5 block">Status Pembayaran</label>
                <select 
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'Lunas' | 'Belum Bayar')}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 mb-4">
              <button 
                onClick={() => setEditingId(null)}
                className="flex-1 py-3 border border-zinc-200 dark:border-zinc-750 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-xs"
              >
                Batal
              </button>
              <button 
                onClick={saveEditedOrder}
                className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Simpan
              </button>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={deleteSelectedOrder}
                className="w-full py-3 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-rose-100 dark:border-rose-950/40"
              >
                <Trash2 size={14} />
                Hapus Transaksi Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sheet Drawer */}
      {isCartOpen && (
        <>
          <div 
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/50 z-[400] transition-opacity duration-300 animate-fade-in"
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl z-[500] flex flex-col max-h-[92vh] overflow-y-auto animate-slide-up pb-safe shadow-2xl">
            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto my-3 shrink-0" />
            
            <div className="flex justify-between items-center px-5 py-2 shrink-0">
              <h2 className="font-extrabold text-md flex items-center gap-2">
                <Receipt className="text-amber-600 dark:text-amber-400" size={20} />
                Ringkasan Order
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* List - fully expanded without inner scrolling */}
            <div className="px-5 py-2 space-y-3.5 divide-y divide-zinc-100 dark:divide-zinc-800 shrink-0">
              {getCartItems().length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <ShoppingCart size={40} className="mx-auto opacity-20 mb-3" />
                  <p className="text-xs">Keranjang Anda kosong</p>
                </div>
              ) : (
                getCartItems().map((it, idx) => (
                  <div key={it.id} className={`flex items-center gap-3 pt-3.5 ${idx === 0 ? 'pt-0 border-t-0' : ''}`}>
                    {it.img ? (
                      <img src={it.img} alt={it.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-150" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/10 flex items-center justify-center font-bold text-xs shrink-0">
                        ☕
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 leading-snug break-words">{it.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">x{it.qty} · {formatRp(it.price)}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400">{formatRp(it.price * it.qty)}</span>
                      {it.isCustom && (
                        <button 
                          onClick={() => removeCustomItem(it.id)}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-md transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {getCartItems().length > 0 && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 p-5 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Total Transaksi</span>
                  <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{formatRp(cartTotalPrice)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 mb-1 block">Metode Pembayaran</label>
                    <select 
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as 'QRIS' | 'Cash')}
                      className="w-full bg-white dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="QRIS">QRIS</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 mb-1 block">Status Bayar</label>
                    <select 
                      value={payStatus}
                      onChange={(e) => setPayStatus(e.target.value as 'Lunas' | 'Belum Bayar')}
                      className="w-full bg-white dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="Belum Bayar">Belum Bayar</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 mb-1 block">Catatan Tambahan (opsional)</label>
                  <input 
                    type="text" 
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Contoh: Meja 5 / Pesanan atas nama siapa?" 
                    className="w-full bg-white dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-800 dark:text-zinc-150"
                  />
                </div>

                <button 
                  onClick={submitOrder}
                  className="w-full py-4 text-sm font-black text-white bg-amber-700 hover:bg-amber-800 active:scale-[0.98] rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Check size={18} strokeWidth={2.5} />
                  Simpan Order
                </button>

                <button 
                  onClick={clearCart}
                  className="w-full py-2.5 text-xs text-rose-500 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-dotted border-rose-200 dark:border-rose-950/40 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash size={12} />
                  Hapus Seluruh Keranjang
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Primary Layout Frame */}
      <div className="max-w-[480px] mx-auto bg-white dark:bg-zinc-900 min-h-screen shadow-xl border-x border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
        
        {/* TOP LEVEL ACTION HERO PANEL */}
        {activeTab === 'order' && (
          <div className="keep-inter relative overflow-hidden mx-4 mt-4 mb-2 rounded-2xl h-32 bg-zinc-900 shadow-md border border-zinc-200/10 dark:border-zinc-800/50">
            
            {/* SLIDE 1 CONTAINER */}
            <div className={`absolute inset-0 transition-all duration-700 ease-in-out ${activeSlide === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}`}>
              {/* Background Image with Overlay */}
              <img src="https://lh3.googleusercontent.com/d/1KEcw2VIR84PDOF14vZfk4CqMaH8T0oap" 
                   alt="Point Of Sale" 
                   referrerPolicy="no-referrer"
                   className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 opacity-65 dark:opacity-45" />
              
              {/* Gradient tint overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 dark:from-zinc-950/95 dark:via-zinc-900/60 dark:to-transparent" />
              
              {/* Slide Content */}
              <div className="absolute inset-0 p-4 flex flex-col justify-between text-white bg-transparent">
                {/* Slide 1 Top Row: Greeting aligned right (offset to not overlap theme toggle with pr-9) */}
                <div className="flex justify-end pr-9 pt-0.5 animate-fade-in">
                  <span className="text-[10px] sm:text-[9.5px] font-black uppercase tracking-widest bg-amber-500/25 border border-amber-500/35 text-amber-300 px-2.5 py-1 rounded-md shadow-sm whitespace-nowrap">
                    {getWIBGreeting()}
                  </span>
                </div>

                {/* Slide 1 Bottom Row: Branding Title & Date (RAISED AND ENLARGED) */}
                <div className="space-y-1 pb-2 sm:pb-1">
                  <div className="flex items-center gap-1">
                    <h1 className="font-black text-2xl sm:text-3xl tracking-tight leading-none text-white drop-shadow-md">
                      Point Of Sale
                    </h1>
                  </div>
                  
                  {/* Elegant minimal date row */}
                  <div className="flex items-center gap-1 text-[10.5px] sm:text-xs text-amber-300 dark:text-amber-400 font-bold drop-shadow-sm">
                    <Calendar size={12} className="leading-none text-current" />
                    <span>{getDisplayHeaderDate()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 2 CONTAINER (MARKETING BANNER) */}
            <div className={`absolute inset-0 transition-all duration-700 ease-in-out bg-zinc-950 ${activeSlide === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
              {/* Background Image with Overlay */}
              <img src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop&q=80" 
                   alt="Custom POS Background" 
                   referrerPolicy="no-referrer"
                   className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 opacity-55 dark:opacity-35" />
              
              {/* Gradient tint overlay for readability of contact text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/40" />
              
              {/* Slide Content */}
              <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                {/* Slide 2 Top Row: Badge */}
                <div className="flex justify-between items-start pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[8.5px] font-black uppercase tracking-widest border border-amber-500/20 shadow-xs select-none">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    Custom POS Kasir
                  </span>
                </div>

                {/* Marketing Info */}
                <div className="space-y-1 pb-2 sm:pb-1">
                  <h2 className="font-black text-[15px] sm:text-[17px] leading-tight text-white tracking-tight drop-shadow-xs">
                    Butuh Aplikasi POS Kasir <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 font-extrabold">Handal & Keren</span>?
                  </h2>
                  <p className="text-[9.5px] sm:text-[10.5px] text-zinc-300 font-medium leading-relaxed max-w-[320px]">
                    Tingkatkan bisnismu dengan sistem kasir premium yang responsive & terintegrasi Spreadsheet. Hubungi saya:
                  </p>
                  
                  {/* Contact links with outstanding visual design */}
                  <div className="flex flex-wrap gap-2 pt-1 pointer-events-auto">
                    <a href="mailto:awanhermawan78group@gmail.com" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/10 dark:border-zinc-700/80 px-2.5 py-1 rounded-lg text-[9px] font-extrabold text-amber-250 hover:text-amber-100 shadow-sm transition-all scale-100 hover:scale-[102] active:scale-[98]">
                      <Mail size={10} />
                      Email
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/10 dark:border-zinc-700/80 px-2.5 py-1 rounded-lg text-[9px] font-extrabold text-amber-250 hover:text-amber-100 shadow-sm transition-all scale-100 hover:scale-[102] active:scale-[98]">
                      <Instagram size={10} />
                      @awanhermawan
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Static Floating Overlay Header controls */}
            <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center gap-1.5">
              <button 
                onClick={toggleTheme}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/60 backdrop-blur-md flex items-center justify-center transition-all border border-white/10 dark:border-zinc-800/40 text-white" 
                title="Beralih Tema"
              >
                {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
              </button>
            </div>

            {/* Slideshow Indicators */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20 flex gap-1 select-none pointer-events-none">
              <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-sm ${activeSlide === 1 ? 'bg-white/80' : 'bg-white/30'}`} />
              <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-sm ${activeSlide === 2 ? 'bg-white/80' : 'bg-white/30'}`} />
            </div>

          </div>
        )}

        {/* Dynamic Code.gs Viewer Panel at the absolute top of the app workspace */}
        {activeTab === 'order' && (
          <div className="px-5 pt-4">
            <CodeViewer onCopySuccess={(msg) => showToast(msg, 'success')} />
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW: ORDER PAGE */}
        {/* ======================================================== */}
        {activeTab === 'order' && (
          <div className="px-5 py-4 space-y-6">
            
            <div>
              <div className="flex justify-between items-center mb-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  <Coffee size={14} className="text-amber-600" />
                  Menu Santai
                </div>
                {/* DOWNLOAD APP & CONNECTED wrappers side by side */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md active:scale-95 transition-all"
                    title="Download Aplikasi POS Kasir"
                  >
                    <Smartphone size={10} />
                    Download App
                  </button>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/25 dark:border-emerald-500/35 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-450 select-none shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    CONNECTED
                  </div>
                </div>
              </div>
              
              {/* Menu Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {INITIAL_MENU.map(m => {
                  const q = cart[m.id] || 0;
                  return (
                    <div 
                      key={m.id}
                      className={`relative flex flex-col bg-white dark:bg-zinc-900 border rounded-xl p-1.5 justify-between transition-all shadow-xs ${
                        q > 0 
                          ? 'border-amber-600/60 dark:border-amber-500/50 shadow-xs bg-zinc-50/10 dark:bg-zinc-850/5' 
                          : 'border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-750'
                      }`}
                    >
                      {/* Menu Image */}
                      <img 
                        src={m.img} 
                        alt={m.name} 
                        className="w-[60%] mx-auto aspect-square rounded-lg object-cover bg-zinc-100 border border-zinc-200/40 dark:border-zinc-800 mt-1"
                        referrerPolicy="no-referrer"
                      />

                      {/* Info left-aligned like attachment */}
                      <div className="px-0.5 mt-1 flex-1 flex flex-col justify-start">
                        <h3 className="font-semibold text-[11px] leading-tight text-zinc-850 dark:text-zinc-150 line-clamp-2 md:text-xs">
                          {m.name}
                        </h3>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                          {formatRp(m.price)}
                        </p>
                      </div>

                      {/* Qty Steppers with natural theme matching buttons */}
                      <div className="flex items-center justify-center gap-4 w-full mt-2 px-1 animate-fade-in">
                        <button 
                          onClick={() => changeQty(m.id, -1)}
                          className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-extrabold hover:bg-zinc-150 dark:hover:bg-zinc-700 active:scale-90 transition-transform select-none cursor-pointer flex items-center justify-center shadow-xs"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="text-sm font-extrabold text-zinc-800 dark:text-white min-w-[20px] text-center">
                          {q}
                        </span>
                        <button 
                          onClick={() => changeQty(m.id, 1)}
                          className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-extrabold hover:bg-zinc-150 dark:hover:bg-zinc-700 active:scale-90 transition-transform select-none cursor-pointer animate-pulse-once flex items-center justify-center shadow-xs"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CUSTOM ORDER SECTION */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
                <Sparkles size={14} className="text-amber-600" />
                Custom Menu Tambahan
              </div>

              <div className="flex gap-2.5 items-end">
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1 block">Nama Item</label>
                    <input 
                      type="text" 
                      value={customNameInput}
                      onChange={(e) => setCustomNameInput(e.target.value)}
                      placeholder="Contoh: Kopi Luwak / Bakwan" 
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1 block">Harga (Rp)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={customPriceInput}
                      onChange={(e) => setCustomPriceInput(formatCustomPrice(e.target.value))}
                      placeholder="0" 
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <button 
                  onClick={addCustomItem}
                  className="w-12 h-12 rounded-xl bg-amber-700 hover:bg-amber-800 hover:shadow text-white flex items-center justify-center shrink-0 active:scale-95 transition-all border border-amber-600"
                  title="Tambah Custom"
                >
                  <Plus size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW: HISTORY/TRANSACTION LIST PAGE */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <div>
            {/* Header Back Navbar Minimal */}
            <div className="keep-inter mx-4 mt-4 mb-2 flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 p-3 rounded-2xl shadow-sm">
              <button 
                onClick={() => setActiveTab('order')}
                className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-400 font-extrabold text-xs transition-colors cursor-pointer select-none"
              >
                <span className="font-sans font-bold text-sm leading-none">&larr;</span> Back to Ambil Order
              </button>
            </div>

            <div className="px-5 py-4 space-y-6">

            {/* Range selection chips */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={14} className="text-amber-600" />
                  Rentang Waktu
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x h-11 items-center">
                {[
                  { id: 'today', label: 'Hari Ini' },
                  { id: 'yesterday', label: 'Kemarin' },
                  { id: '7d', label: '7 Hari' },
                  { id: '14d', label: '14 Hari' },
                  { id: '30d', label: '30 Hari' }
                ].map(chip => (
                  <button 
                    key={chip.id}
                    onClick={() => selectRangePreset(chip.id)}
                    className={`shrink-0 px-4 py-2 text-xs font-bold rounded-xl border transition-all snap-start ${
                      dateRangeMode === chip.id 
                        ? 'bg-amber-750 text-white border-amber-800 shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Manual Date Input Fields */}
              <div className="grid grid-cols-2 gap-3 items-center mt-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl">
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Mulai Dari</label>
                  <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setDateRangeMode('custom');
                    }}
                    className="w-full bg-white dark:bg-zinc-850 p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-700 dark:text-zinc-300"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Sampai Dengan</label>
                  <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setDateRangeMode('custom');
                    }}
                    className="w-full bg-white dark:bg-zinc-850 p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-700 dark:text-zinc-300"
                  />
                </div>
              </div>
            </div>

            {/* REAL-TIME OVERLAY METADATA STATS PANEL */}
            <div className="bg-gradient-to-br from-amber-50/50 to-zinc-100/50 dark:from-zinc-900/30 dark:to-zinc-950/20 border border-amber-500/10 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[11px] uppercase font-black tracking-wider text-zinc-650 dark:text-zinc-350">DASHBOARD</span>
                </div>
                {/* REFRESH BUTTON HIGHLIGHTED HERE */}
                <button 
                  onClick={() => fetchHistoryWithGASLogic(true)}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-xs transition-all transform active:scale-95 cursor-pointer"
                >
                  <RefreshCw size={11} className="animate-spin-hover" />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 text-center transition-all hover:shadow-xs">
                  <span className="text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase block mb-1.5">Debit/QRIS</span>
                  <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 block tracking-tight">{formatRp(stats.totalQris)}</span>
                </div>
                <div className="bg-white dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 text-center transition-all hover:shadow-xs">
                  <span className="text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase block mb-1.5">Uang Tunai Cash</span>
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block tracking-tight">{formatRp(stats.totalCash)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 text-center flex flex-col justify-center items-center transition-all hover:shadow-xs">
                  <span className="text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase block mb-1.5">Volume Transaksi</span>
                  <span className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-400 block">{stats.totalCount}</span>
                </div>

                <div className="bg-white dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 text-center flex flex-col justify-center items-center transition-all hover:shadow-xs">
                  <span className="text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase block mb-1.5 flex items-center gap-1">
                    <Award size={12} className="text-amber-600" />
                    ⭐ Best Seller
                  </span>
                  {stats.bestSeller ? (
                    <>
                      <span className="text-xs sm:text-sm font-black truncate max-w-full text-coffee-700 dark:text-coffee-400 block leading-tight">
                        {stats.bestSeller.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-extrabold block mt-1">
                        {stats.bestSeller.qty} terjual
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-400 block">-</span>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4.5 text-center transition-all hover:shadow-xs">
                <span className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase block mb-1.5">Total Omset Pendapatan</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block tracking-tight">{formatRp(stats.totalRevenue)}</span>
              </div>
            </div>

            {/* LIST SECTION */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3.5 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex gap-1.5 items-center">
                  <button
                    key="all"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all border ${
                      statusFilter === 'all'
                        ? 'bg-amber-100 border-amber-500 text-amber-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-amber-200 shadow-xs'
                        : 'border-zinc-250 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    key="Lunas"
                    onClick={() => setStatusFilter('Lunas')}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all border ${
                      statusFilter === 'Lunas'
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-400 shadow-xs'
                        : 'border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold'
                    }`}
                  >
                    Lunas
                  </button>
                  <button
                    key="Belum Bayar"
                    onClick={() => setStatusFilter('Belum Bayar')}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all border ${
                      statusFilter === 'Belum Bayar'
                        ? 'bg-rose-100 border-rose-500 text-rose-900 dark:bg-rose-950/40 dark:border-rose-500 dark:text-rose-400 shadow-xs'
                        : 'border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-450 font-extrabold'
                    }`}
                  >
                    Belum Bayar
                  </button>
                </div>
                <div className="text-[10px] font-extrabold tracking-wider text-zinc-400 shrink-0">
                  Total Terdaftar: <strong className="text-amber-700 dark:text-amber-400 font-mono text-sm">{filteredCount}</strong>
                </div>
              </div>

              {/* Paginated Orders list items */}
              <div className="space-y-3">
                {paginatedOrders.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <Receipt size={40} className="mx-auto opacity-10 mb-2" />
                    <p className="text-xs">Tidak ada data transaksi yang cocok</p>
                  </div>
                ) : (
                  paginatedOrders.map(rec => (
                    <div 
                      key={rec.orderId}
                      className={`border p-4 text-left shadow-sm rounded-2xl relative group transition-all duration-300 ${
                        rec.status === 'Lunas'
                          ? 'bg-emerald-50/15 dark:bg-emerald-950/10 border-emerald-500/20 dark:border-emerald-500/30'
                          : 'bg-rose-50/15 dark:bg-rose-950/10 border-rose-500/20 dark:border-rose-500/30'
                      }`}
                    >
                      
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div>
                          <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400">
                            {rec.orderId}
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5 font-semibold">
                            {rec.tanggal} · {rec.waktu}
                          </span>
                        </div>
                        
                        <button 
                          onClick={() => openEditModal(rec)}
                          className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center transition-all shadow-sm active:scale-95"
                          title="Edit Transaksi"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>

                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1 leading-normal">
                        {rec.items}
                      </p>
                      <p className="text-[10px] text-zinc-400 mb-3 font-semibold">
                        Kuantitas: {rec.totalQty} item
                      </p>

                      <div className="flex justify-between items-center bg-white dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-750 p-2.5 rounded-xl">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                          {formatRp(rec.total)}
                        </span>
                        
                        <div className="flex gap-1.5">
                          {/* Payment badge */}
                          <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded ${
                            rec.paymentMethod === 'QRIS'
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                          }`}>
                            {rec.paymentMethod}
                          </span>

                          {/* Status badge */}
                          <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded ${
                            rec.status === 'Lunas'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-105 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50'
                          }`}>
                            {rec.status === 'Lunas' ? 'Lunas' : 'Belum Bayar'}
                          </span>
                        </div>
                      </div>

                      {rec.note && (
                        <div className="mt-2.5 pt-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 font-medium flex items-center gap-1 capitalize">
                          📝 {rec.note}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* LAZY LOAD MORE PAGINATION TRIGGER */}
              {lazyHasMore && (
                <div className="mt-5 text-center">
                  <button 
                    onClick={() => fetchHistoryWithGASLogic(false)}
                    className="w-full sm:w-auto px-6 py-3 border border-amber-600 bg-amber-500/5 dark:bg-amber-400/5 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-400 text-amber-700 dark:text-amber-400 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                  >
                    <ChevronDown size={14} className="animate-bounce" />
                    Tampilkan Lebih Banyak (Lazy Loading Page)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

      </div>

      {/* FLOAT BOTTOM NAV BAR FRAME */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-between h-16 items-center z-[300] px-3 shadow-lg select-none pb-safe shrink-0">
        {/* License Trademark brand badge centered and italic word mark */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
          <span className="font-serif italic text-[11px] tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
            founder by cloud
          </span>
        </div>

        <button 
          onClick={() => setActiveTab('order')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all relative z-10 ${
            activeTab === 'order' ? 'text-amber-700 dark:text-amber-400 font-extrabold' : 'text-zinc-400 dark:text-zinc-500 font-bold'
          }`}
        >
          <ShoppingCart size={18} strokeWidth={activeTab === 'order' ? 3 : 2} />
          <span className="text-[10px] tracking-wide">Pesan Menu</span>
          {activeTab === 'order' && <span className="absolute bottom-1 w-5 h-1 bg-amber-700 dark:bg-amber-400 rounded-full" />}
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all relative z-10 ${
            activeTab === 'history' ? 'text-amber-700 dark:text-amber-400 font-extrabold' : 'text-zinc-400 dark:text-zinc-500 font-bold'
          }`}
        >
          <Receipt size={18} strokeWidth={activeTab === 'history' ? 3 : 2} />
          <span className="text-[10px] tracking-wide">Riwayat Sheets</span>
          {activeTab === 'history' && <span className="absolute bottom-1 w-5 h-1 bg-amber-700 dark:bg-amber-400 rounded-full" />}
        </button>
      </nav>

      {/* FAB CART FLOAT BUTTON AT HOME PAGE */}
      {activeTab === 'order' && cartTotalQty > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-[340px] md:w-[380px] bg-amber-700 hover:bg-amber-800 active:scale-95 text-white h-14 rounded-2xl flex items-center justify-between px-5 font-bold shadow-lg shadow-amber-600/25 z-[350] transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/20 text-white flex items-center justify-center text-xs animate-pulse">
              {cartTotalQty}
            </div>
            <span className="text-xs font-extrabold text-zinc-150 shrink-0">Lihat Keranjang</span>
          </div>
          <span className="text-xs font-black tracking-wide bg-amber-900 border border-amber-600 px-3 py-1.5 rounded-lg">
            {formatRp(cartTotalPrice)}
          </span>
        </button>
      )}

    </div>
  );
}
