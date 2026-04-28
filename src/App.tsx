/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { 
  Users, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Search, 
  ArrowLeft,
  UserPlus,
  LayoutDashboard,
  Wallet,
  Download,
  FileText,
  Calendar,
  Leaf,
  Sprout,
  ChevronDown,
  X,
  User,
  MapPin,
  Phone
} from 'lucide-react';

interface Person {
  id: string;
  name: string;
  phone: string;
  type: "ra'wi" | 'muqawit';
}

interface Transaction {
  id: string;
  date: string;
  personId: string;
  amount: number;
  type: 'delivery' | 'sale'; // delivery from ra'wi, sale to muqawit
  paymentType: 'cash' | 'credit';
  note: string;
  quantity?: number;
  unitPrice?: number;
  category?: string;
  refDeliveryId?: string; // Links a sale to a specific delivery
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['dashboard', 'raia', 'muqawatah', 'intake', 'sales', 'reports'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const [raia, setRaia] = useState<Person[]>(() => {
    try {
      const saved = localStorage.getItem('raia');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading raia:', e);
      return [];
    }
  });
  const [muqawatah, setMuqawatah] = useState<Person[]>(() => {
    try {
      const saved = localStorage.getItem('muqawatah');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading muqawatah:', e);
      return [];
    }
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('transactions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading transactions:', e);
      return [];
    }
  });
  
  // One-time data reset logic
  useEffect(() => {
    const isReset = localStorage.getItem('app_reset_2024_04_20');
    if (!isReset) {
      localStorage.removeItem('raia');
      localStorage.removeItem('muqawatah');
      localStorage.removeItem('transactions');
      setRaia([]);
      setMuqawatah([]);
      setTransactions([]);
      localStorage.setItem('app_reset_2024_04_20', 'true');
    }
  }, []);

  const [isAdding, setIsAdding] = useState<false | "ra'wi" | 'muqawit' | 'transaction'>(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrintingSilent, setIsPrintingSilent] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSuccessModal, setShowSuccessModal] = useState<{show: boolean, filename: string}>({ show: false, filename: '' });
  const [raiaReportId, setRaiaReportId] = useState('');
  const [muqawitReportId, setMuqawitReportId] = useState('');
  const [raiaReportDate, setRaiaReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [muqawitReportDate, setMuqawitReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedDetailDate, setSelectedDetailDate] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'full'>('daily');
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);
  const [profile, setProfile] = useState(() => {
    const defaultProfile = {
      name: '',
      location: '',
      phone: ''
    };
    try {
      const saved = localStorage.getItem('muqawit_profile');
      if (!saved || saved === 'undefined' || saved === 'null') return defaultProfile;
      const parsed = JSON.parse(saved);
      return { ...defaultProfile, ...parsed };
    } catch (e) {
      console.error('Error loading profile:', e);
      return defaultProfile;
    }
  });

  useEffect(() => {
    localStorage.setItem('muqawit_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (!selectedPerson) setSelectedDetailDate(null);
  }, [selectedPerson]);

  useEffect(() => {
    if (selectedDetailDate) {
      setReportDate(selectedDetailDate);
    }
  }, [selectedDetailDate]);

  const reportRef = useRef<HTMLDivElement>(null);

  // RE-ENGINEERED GENERATOR: Optimized for PWA / Mobile memory constraints
  const generatePDF = async (filename: string, p: any = null, type: string = 'daily', d: string = '') => {
    if (!reportRef.current) {
      alert('نظام المصلح: تعذر العثور على قالب التقرير.');
      return;
    }
    
    setIsGeneratingPDF(true);
    
    // Use parameters if provided, otherwise fallback to current state (for global report)
    const activePerson = p;
    const activeType = type;
    const activeDate = d || reportDate;

    // Safety abort timer
    const safetyTimer = setTimeout(() => {
      setIsGeneratingPDF((prev) => {
        if (prev) alert('⚠️ لم نتمكن من إكمال المعالجة في الوقت المحدد. يرجى المحاولة مرة أخرى.');
        return false;
      });
    }, 60000);

    // Give React extra time to flush the heavy Comprehensive Report DOM
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      const element = reportRef.current;
      if (!element) throw new Error('Ref lost');

      // Double check data presence
      const hasContent = activePerson 
        ? transactions.some(t => {
            const isMatch = t.personId === activePerson.id || (t.type === 'sale' && transactions.find(del => del.id === t.refDeliveryId)?.personId === activePerson.id);
            return activeType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, activeDate));
          })
        : transactions.some(t => isSpecificDate(t.date, activeDate));

      if (!hasContent) {
        clearTimeout(safetyTimer);
        setIsGeneratingPDF(false);
        alert('⚠️ التقرير فارغ تماماً.');
        return;
      }

      const safeFilename = `${filename.replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, '_')}.pdf`;

      // HYPER-STABLE OPTIONS: Avoiding memory spikes
      const opt = {
        margin: [0, 0] as [number, number],
        filename: safeFilename,
        image: { type: 'jpeg' as const, quality: 0.95 }, 
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          backgroundColor: '#ffffff',
          letterRendering: true,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const, compress: true },
        pagebreak: { mode: ['avoid-all' as const, 'css' as const, 'legacy' as const] }
      };

      window.scrollTo(0, 0);

      // Strictly enforce A4 width to ensure border is visible from all sides
      element.style.width = '210mm';
      
      // Execute PDF generation
      const blob: Blob = await html2pdf().set(opt).from(element).output('blob');
      
      element.style.width = ''; 
      
      clearTimeout(safetyTimer);

      if (!blob || blob.size < 500) {
        throw new Error('PDF Generation produced empty file');
      }

      const file = new File([blob], safeFilename, { type: 'application/pdf' });
      
      // Native Share API (Primary for PWA on Phones)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'تقرير المقوت المحترف',
            text: `كشف حساب - ${reportDate}`
          });
          setIsGeneratingPDF(false);
          if (isPrintingSilent) {
            setSelectedPerson(null);
            setIsPrintingSilent(false);
          }
          setShowSuccessModal({ show: true, filename: safeFilename });
          return;
        } catch (shareErr) {
          console.log('Share canceled or failing', shareErr);
        }
      }

      // Fallback: Browser Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsGeneratingPDF(false);
        if (isPrintingSilent) {
          setSelectedPerson(null);
          setIsPrintingSilent(false);
        }
        setShowSuccessModal({ show: true, filename: safeFilename });
      }, 1000);

    } catch (error) {
      console.error('CRITICAL PDF ERROR:', error);
      clearTimeout(safetyTimer);
      setIsGeneratingPDF(false);
      if (isPrintingSilent) {
        setSelectedPerson(null);
        setIsPrintingSilent(false);
      }
      alert('⚠️ فشل إنشاء التقرير. يرجى استخدام متصفح Chrome أو تقليل كمية البيانات المختارة.');
    }
  };

  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [swActive, setSwActive] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone);
    setIsInIframe(window.self !== window.top);
    
    // Check if SW is active
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwActive(true));
    }
  }, []);

  useEffect(() => {
    // Check for early captured prompt
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA: install prompt ready');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isInIframe) {
      alert("⚠️ لا يمكن تثبيت التطبيق من داخل نافذة المعاينة. يرجى الضغط على الزر 'فتح في نافذة مستقلة' أولاً.");
      return;
    }
    
    if (!deferredPrompt) {
      if (!swActive) {
        alert("⚠️ المتصفح لا يزال يحمل ملفات النظام في الخلفية. انتظر ثانية واحدة ثم جرب مجدداً.");
      } else {
        alert("⚠️ عذراً، المتصفح لم يرسل إشارة التثبيت التلقائي بعد. \n\nالحل اليدوي السريع: \n1. اضغط على النقاط الثلاث (⋮) في أعلى المتصفح. \n2. اختر 'إضافة إلى الشاشة الرئيسية' أو 'تثبيت التطبيق'.");
      }
      return;
    }
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } catch (err) {
      console.error('Installation failed', err);
    }
  };

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('raia', JSON.stringify(raia));
  }, [raia]);

  useEffect(() => {
    localStorage.setItem('muqawatah', JSON.stringify(muqawatah));
  }, [muqawatah]);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  
  // Transaction State
  const [transAmount, setTransAmount] = useState('');
  const [transUnitPrice, setTransUnitPrice] = useState('');
  const [transQuantity, setTransQuantity] = useState('');
  const [transCategory, setTransCategory] = useState('');
  const [transDeliveryRef, setTransDeliveryRef] = useState('');
  const [transPerson, setTransPerson] = useState('');
  const [transPayment, setTransPayment] = useState<'cash' | 'credit'>('cash');
  const [transType, setTransType] = useState<'delivery' | 'sale'>('sale');

  // Handle adding new person
  const handleAddPerson = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newPerson: Person = {
      id: Date.now().toString(),
      name: newName,
      phone: newPhone,
      type: isAdding as "ra'wi" | 'muqawit'
    };

    if (isAdding === "ra'wi") {
      setRaia([...raia, newPerson]);
    } else if (isAdding === 'muqawit') {
      setMuqawatah([...muqawatah, newPerson]);
    }

    setNewName('');
    setNewPhone('');
    setIsAdding(false);
  };

  const handleAddTransaction = (e: FormEvent) => {
    e.preventDefault();
    if (!transPerson) return;

    const qty = parseFloat(transQuantity) || 0;
    const price = parseFloat(transUnitPrice) || 0;
    const total = transType === 'sale' ? (qty * price) : 0;

    if (transType === 'sale' && transDeliveryRef) {
      const stock = getRemainingStock(transDeliveryRef);
      if (qty > stock) {
        alert(`عذراً، الكمية المتوفرة حالياً هي ${stock} حبة فقط`);
        return;
      }
    }

    const newTrans: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      personId: transPerson,
      amount: total,
      unitPrice: price,
      type: transType,
      paymentType: transPayment,
      quantity: qty,
      category: transCategory,
      refDeliveryId: transDeliveryRef,
      note: ''
    };

    setTransactions([newTrans, ...transactions]);
    setTransAmount('');
    setTransUnitPrice('');
    setTransQuantity('');
    setTransCategory('');
    setTransDeliveryRef('');
    setTransPerson('');
    setIsAdding(false);
  };

  const deletePerson = (id: string, type: "ra'wi" | 'muqawit') => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاسم؟ سيتم فقدان كافة سجلاته.')) return;
    if (type === "ra'wi") {
      setRaia(raia.filter(p => p.id !== id));
    } else {
      setMuqawatah(muqawatah.filter(p => p.id !== id));
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const isSpecificDate = (dateString: string, targetDate: string) => {
    if (!dateString || !targetDate) return false;
    // Strip everything after 'T' to get only YYYY-MM-DD from ISO strings and inputs
    const dStr = dateString.split('T')[0];
    const tStr = targetDate.split('T')[0];
    return dStr === tStr;
  };

  const isToday = (dateString: string) => isSpecificDate(dateString, new Date().toISOString());

  const getRemainingStock = (deliveryId: string) => {
    const delivery = transactions.find(t => t.id === deliveryId);
    if (!delivery) return 0;
    const soldQty = transactions
      .filter(t => t.type === 'sale' && t.refDeliveryId === deliveryId)
      .reduce((sum, t) => sum + (t.quantity || 0), 0);
    return (delivery.quantity || 0) - soldQty;
  };

  const totalCashSales = transactions.filter(t => isToday(t.date) && t.type === 'sale' && t.paymentType === 'cash').reduce((sum, t) => sum + t.amount, 0);
  const totalCreditSales = transactions.filter(t => isToday(t.date) && t.type === 'sale' && t.paymentType === 'credit').reduce((sum, t) => sum + t.amount, 0);
  
  const dashboardSalesTotal = transactions
    .filter(t => isSpecificDate(t.date, dashboardDate) && t.type === 'sale')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDeliveries = transactions.filter(t => isToday(t.date) && t.type === 'delivery').reduce((sum, t) => sum + (t.quantity || 0), 0);
  
  const todayDeliveries = transactions.filter(t => isToday(t.date) && t.type === 'delivery');
  const categoriesToday = Array.from(new Set(todayDeliveries.map(t => t.category))).filter((Boolean) as any);
  const categoryStats = categoriesToday.map((cat: string) => ({
    category: cat,
    quantity: todayDeliveries.filter(t => t.category === cat).reduce((sum, t) => sum + (t.quantity || 0), 0)
  }));

  const handleDownloadSpecificReport = (type: "ra'wi" | 'muqawit', mode: 'daily' | 'full' = 'daily') => {
    const id = type === "ra'wi" ? raiaReportId : muqawitReportId;
    const dateUsed = type === "ra'wi" ? raiaReportDate : muqawitReportDate;
    const p = (type === "ra'wi" ? raia : muqawatah).find(person => person.id === id);
    if (!p) {
      alert('يرجى اختيار الاسم أولاً');
      return;
    }
    
    setReportType(mode);
    if (mode === 'daily') setReportDate(dateUsed);
    setIsPrintingSilent(true);
    setSelectedPerson(p);
    
    setTimeout(() => {
      generatePDF(`كشف_${p.name}_${mode === 'full' ? 'كامل' : dateUsed}`, p, mode, dateUsed);
    }, 100);
  };

  return (
    <div className="flex h-screen flex-col bg-[#F9FAFB] text-[#111827] select-none overflow-hidden antialiased">
      {/* Premium Header */}
      <header className="px-6 pb-4 pt-8 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Leaf size={24} fill="currentColor" fillOpacity={0.2} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">المقوت المحترف - جملة</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">سحابي • متوفر</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setShowProfileModal(true)}
            className="p-2 rounded-xl text-slate-400 bg-slate-50 transition-all active:scale-90"
          >
            <User size={20} />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-6 py-6 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="space-y-6"
            >
              {/* Quick Info Grid - Raia & Muqawatah first */}
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setActiveTab('raia')}
                  className="bg-white border border-slate-100 p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] group active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                      <Sprout size={20} />
                    </div>
                  </div>
                  <div className="text-2xl font-black font-mono tracking-tighter text-slate-900 leading-tight">
                    {raia.length}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">الرعويين</div>
                </div>

                <div 
                  onClick={() => setActiveTab('muqawatah')}
                  className="bg-white border border-slate-100 p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] group active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <Leaf size={20} />
                    </div>
                  </div>
                  <div className="text-2xl font-black font-mono tracking-tighter text-slate-900 leading-tight">
                    {muqawatah.length}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">المقواتة</div>
                </div>
              </div>

              {/* Transactions Summary Grid - Simple & Modern */}
              <div className="bg-slate-950 text-white p-7 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">إجمالي المبيعات</h3>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-emerald-500" />
                        <input 
                          type="date"
                          value={dashboardDate}
                          onChange={(e) => setDashboardDate(e.target.value)}
                          className="bg-transparent border-none text-[10px] font-bold text-slate-300 outline-none p-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400">
                      <Wallet size={20} />
                    </div>
                  </div>

                  <div className="text-4xl font-black font-mono tracking-tighter text-white">
                    {dashboardSalesTotal.toLocaleString()} <span className="text-xs font-bold text-slate-500">ريال</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">نقدي</div>
                      <div className="text-lg font-black font-mono text-emerald-400">
                        {transactions.filter(t => isSpecificDate(t.date, dashboardDate) && t.type === 'sale' && t.paymentType === 'cash').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">آجل</div>
                      <div className="text-lg font-black font-mono text-orange-400">
                        {transactions.filter(t => isSpecificDate(t.date, dashboardDate) && t.type === 'sale' && t.paymentType === 'credit').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-20"
            >
               <div className="flex justify-between items-end mb-2">
                 <h2 className="text-xl font-black text-slate-900">مركز التقارير</h2>
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest underline decoration-emerald-500/30">سحابي</div>
               </div>

               {/* Section 1: Daily Global Report */}
               <div className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">تقرير اليوم الشامل</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">ملخص كافة عمليات السوق لليوم</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-5 font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-center"
                      />
                    </div>
                    <button 
                      onClick={() => { 
                        setReportType('daily');
                        setSelectedPerson(null); 
                        generatePDF(`تقرير_المقوت_المحترف_الشامل_${reportDate}`, null, 'daily', reportDate); 
                      }}
                      disabled={isGeneratingPDF}
                      className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {isGeneratingPDF ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          جاري تجميع البيانات...
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          تحميل التقرير الشامل
                        </>
                      )}
                    </button>
                  </div>
               </div>

               {/* Section 2: Raia Box */}
               <div className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                       <Users size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-slate-900">قسم الرعويين</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">تقارير حسابات الرعاة</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {/* Option 1: Full */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase text-center">تقرير شامل لكافة المواعيد</h4>
                      <select 
                        value={raiaReportId}
                        onChange={(e) => setRaiaReportId(e.target.value)}
                        className="w-full bg-white border-none rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:ring-2 focus:ring-orange-200 transition-all text-center text-xs appearance-none"
                      >
                        <option value="">-- اختر الرعوي --</option>
                        {raia.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button 
                        onClick={() => handleDownloadSpecificReport("ra'wi", 'full')}
                        disabled={isGeneratingPDF || !raiaReportId}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                      >
                        <FileText size={14} />
                        تنزيل التقرير الشامل
                      </button>
                    </div>

                    {/* Option 2: Date-based */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 shadow-inner">
                      <h4 className="text-[10px] font-black text-orange-500 uppercase text-center">كشف حساب محدد بتاريخ</h4>
                      <div className="space-y-3">
                        <select 
                          value={raiaReportId}
                          onChange={(e) => setRaiaReportId(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:ring-2 focus:ring-orange-100 transition-all text-center text-xs appearance-none"
                        >
                          <option value="">-- اختر الرعوي --</option>
                          {raia.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input 
                          type="date"
                          value={raiaReportDate}
                          onChange={(e) => setRaiaReportDate(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-black text-slate-700 outline-none transition-all text-center text-xs"
                        />
                        <button 
                          onClick={() => handleDownloadSpecificReport("ra'wi", 'daily')}
                          disabled={isGeneratingPDF || !raiaReportId}
                          className="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                        >
                          <Download size={14} />
                          تنزيل تقرير اليوم المحدد
                        </button>
                      </div>
                    </div>
                  </div>
               </div>

               {/* Section 3: Muqawit Box */}
               <div className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                       <ShoppingBag size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-slate-900">قسم المقواتة</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">تقارير حسابات المقواتة</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {/* Option 1: Full */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase text-center">تقرير شامل لكافة المواعيد</h4>
                      <select 
                        value={muqawitReportId}
                        onChange={(e) => setMuqawitReportId(e.target.value)}
                        className="w-full bg-white border-none rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 transition-all text-center text-xs appearance-none"
                      >
                        <option value="">-- اختر المقوت --</option>
                        {muqawatah.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button 
                        onClick={() => handleDownloadSpecificReport('muqawit', 'full')}
                        disabled={isGeneratingPDF || !muqawitReportId}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                      >
                        <FileText size={14} />
                        تنزيل التقرير الشامل
                      </button>
                    </div>

                    {/* Option 2: Date-based */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 shadow-inner">
                      <h4 className="text-[10px] font-black text-emerald-500 uppercase text-center">كشف حساب محدد بتاريخ</h4>
                      <div className="space-y-3">
                        <select 
                          value={muqawitReportId}
                          onChange={(e) => setMuqawitReportId(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100 transition-all text-center text-xs appearance-none"
                        >
                          <option value="">-- اختر المقوت --</option>
                          {muqawatah.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input 
                          type="date"
                          value={muqawitReportDate}
                          onChange={(e) => setMuqawitReportDate(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-black text-slate-700 outline-none transition-all text-center text-xs"
                        />
                        <button 
                          onClick={() => handleDownloadSpecificReport('muqawit', 'daily')}
                          disabled={isGeneratingPDF || !muqawitReportId}
                          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                        >
                          <Download size={14} />
                          تنزيل تقرير اليوم المحدد
                        </button>
                      </div>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'intake' && (
            <motion.div
              key="intake"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-xl font-black text-slate-900">الوردات</h2>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{transactions.filter(t => t.type === 'delivery').length} توريد</div>
              </div>
              
              <div 
                onClick={() => {
                  setIsAdding('transaction');
                  setTransType('delivery');
                }}
                className="bg-orange-500 text-white p-6 rounded-[32px] shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-between cursor-pointer mb-6"
              >
                <div>
                  <h3 className="font-black text-lg">إضافة وارد جديد</h3>
                  <p className="text-orange-100 text-[10px] font-bold">تسجيل حمولة قات جديدة من الرعاة</p>
                </div>
                <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Plus size={24} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">آخر الواردات</h3>
                {transactions.filter(t => t.type === 'delivery').length === 0 ? (
                  <div className="py-10 text-center text-slate-300 font-bold text-xs uppercase tracking-widest bg-white rounded-[32px] border border-dashed border-slate-200">لا يوجد وارد مسجل</div>
                ) : (
                  transactions.filter(t => t.type === 'delivery').map(t => {
                    const person = raia.find(p => p.id === t.personId);
                    return (
                      <div key={t.id} className="bg-white border border-slate-100 p-4 rounded-[28px] shadow-sm flex items-center justify-between group">
                        <div className="flex gap-4 items-center">
                          <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs">
                            وارد
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{person?.name || 'مجهول'}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-black text-slate-400 font-mono">{new Date(t.date).toLocaleDateString('ar-YE')}</span>
                              <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">{t.category}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-black font-mono text-slate-900 tracking-tighter">
                          {t.quantity} <span className="text-[10px] text-slate-400 font-bold">حبة</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div
              key="sales"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-xl font-black text-slate-900">المبيعات</h2>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{transactions.filter(t => t.type === 'sale').length} عملية بيع</div>
              </div>

              <div 
                onClick={() => {
                  setIsAdding('transaction');
                  setTransType('sale');
                }}
                className="bg-emerald-600 text-white p-6 rounded-[32px] shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-between cursor-pointer mb-6"
              >
                <div>
                  <h3 className="font-black text-lg">تحرير فاتورة بيع</h3>
                  <p className="text-emerald-100 text-[10px] font-bold">تسجيل عملية بيع نقدية أو آجلة للمقواتة</p>
                </div>
                <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Plus size={24} />
                </div>
              </div>
              
              <div className="space-y-3">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">آخر المبيعات</h3>
                {transactions.filter(t => t.type === 'sale').length === 0 ? (
                  <div className="py-10 text-center text-slate-300 font-bold text-xs uppercase tracking-widest bg-white rounded-[32px] border border-dashed border-slate-200">لا توجد مبيعات مسجلة</div>
                ) : (
                  transactions.filter(t => t.type === 'sale').map(t => {
                    const person = muqawatah.find(p => p.id === t.personId);
                    return (
                      <div key={t.id} className="bg-white border border-slate-100 p-4 rounded-[28px] shadow-sm flex items-center justify-between group">
                        <div className="flex gap-4 items-center">
                          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                            بيع
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{person?.name || 'مجهول'}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${t.paymentType === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                {t.paymentType === 'cash' ? 'نقدي' : 'آجل'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(t.date).toLocaleDateString('ar-YE')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-black font-mono text-slate-900 tracking-tighter">
                          {t.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">ريال</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {(activeTab === 'raia' || activeTab === 'muqawatah') && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-xl font-black text-slate-900">{activeTab === 'raia' ? 'الرعويين' : 'المقواتة'}</h2>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(activeTab === 'raia' ? raia : muqawatah).length} اسم</div>
              </div>

              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="ابحث عن اسم أو رقم هاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-100 rounded-[20px] py-3 pr-11 pl-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 shadow-sm transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {(activeTab === 'raia' ? raia : muqawatah).length === 0 ? (
                activeTab === 'raia' ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="h-20 w-20 bg-orange-50 rounded-[40px] flex items-center justify-center mb-4">
                      <Sprout size={32} className="text-orange-200" />
                    </div>
                    <h3 className="text-slate-400 font-bold text-sm">قائمة الرعاة فارغة</h3>
                  </div>
                ) : (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="h-20 w-20 bg-emerald-50 rounded-[40px] flex items-center justify-center mb-4">
                      <Leaf size={32} className="text-emerald-200" />
                    </div>
                    <h3 className="text-slate-400 font-bold text-sm">قائمة المقواتة فارغة</h3>
                  </div>
                )
              ) : (
                <div className="grid gap-3">
                  {(() => {
                    const filteredList = (activeTab === 'raia' ? raia : muqawatah).filter(p => 
                      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      p.phone.includes(searchTerm)
                    );
                    
                    if (filteredList.length === 0) {
                      return (
                        <div className="py-10 text-center flex flex-col items-center">
                          <Search size={24} className="text-slate-200 mb-2" />
                          <p className="text-slate-400 text-xs font-bold">لا توجد نتائج تطابق بحثك</p>
                        </div>
                      );
                    }

                    return filteredList.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => setSelectedPerson(p)}
                        className="bg-white border border-slate-100 p-4 rounded-[28px] shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <div className="flex gap-4 items-center overflow-hidden">
                          <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-300 text-lg shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-sm text-slate-900 truncate">{p.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold font-mono tracking-wider">{p.phone || '-- --- ---'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="h-8 w-8 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                              <Plus size={14} />
                           </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Plus Button - Minimal & Modern */}
      <AnimatePresence>
        {activeTab !== 'dashboard' && (
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            onClick={() => {
              if (activeTab === 'intake') {
                setIsAdding('transaction');
                setTransType('delivery');
              } else if (activeTab === 'sales') {
                setIsAdding('transaction');
                setTransType('sale');
              } else {
                setIsAdding(activeTab === 'raia' ? "ra'wi" : 'muqawit');
              }
            }}
            className="fixed bottom-28 left-6 h-16 w-16 bg-slate-950 text-white rounded-[24px] shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-30"
          >
            {(activeTab === 'sales' || activeTab === 'intake') ? <Plus size={28} /> : <UserPlus size={28} />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Rail Navigation - Minimal Swiss Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 h-24 flex items-center justify-around z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
          { id: 'raia', icon: Users, label: 'الرعويين' },
          { id: 'muqawatah', icon: ShoppingBag, label: 'المقواتة' },
          { id: 'intake', icon: Sprout, label: 'الوردات' },
          { id: 'sales', icon: Wallet, label: 'المبيعات' },
          { id: 'reports', icon: FileText, label: 'التقارير' },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchTerm('');
            }}
            className="flex flex-col items-center gap-0 group relative transition-all flex-1"
          >
            <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === tab.id ? 'text-emerald-600 bg-emerald-50 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon size={22} className={`${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`} />
            </div>
            <span className={`text-[11px] font-black uppercase tracking-tight transition-all pb-1 ${activeTab === tab.id ? 'text-emerald-700 opacity-100' : 'text-slate-400 opacity-60'}`}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div layoutId="nav-dot" className="absolute bottom-0 h-1 w-4 bg-emerald-500 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Modern Modals */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6"
            onClick={() => setIsAdding(false)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 50, scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full translate-x-16 -translate-y-16"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <header className="p-8 pb-0 shrink-0 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                      {isAdding === 'transaction' 
                        ? (transType === 'delivery' ? 'تسجيل وارد جديد' : 'تحرير فاتورة بيع') 
                        : isAdding === "ra'wi" ? 'رعوي جديد' : 'مقوت جديد'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">يرجى ملء البيانات بدقة</p>
                  </div>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 pt-6 pb-2 custom-scrollbar">
                  <form 
                    id="add-form"
                    onSubmit={isAdding === 'transaction' ? handleAddTransaction : handleAddPerson} 
                    className="space-y-4"
                  >
                  {isAdding === 'transaction' ? (
                    <>
                      <div className="space-y-1.5 relative">
                         <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                         <select
                            required
                            value={transPerson}
                            onChange={e => setTransPerson(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-5 py-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50 transition-all appearance-none text-center text-sm"
                          >
                            <option value="">{transType === 'sale' ? '-- اختر مـقـوت --' : '-- اختر رعـوي --'}</option>
                            {(transType === 'sale' ? muqawatah : raia).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                      </div>

                      {transType === 'delivery' ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                               <div className="text-right flex flex-col">
                                  <div className="flex items-center justify-center gap-2">
                                    <input
                                      required
                                      type="number"
                                      value={transQuantity}
                                      onChange={e => setTransQuantity(e.target.value)}
                                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-5 font-black font-mono text-slate-900 outline-none focus:ring-4 focus:ring-emerald-50 transition-all font-mono text-center text-sm"
                                      placeholder="الكمية (حبة)"
                                    />
                                  </div>
                                </div>
                                <div className="text-right flex flex-col">
                                  <input
                                    required
                                    type="text"
                                    value={transCategory}
                                    onChange={e => setTransCategory(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-center text-sm"
                                    placeholder="صنف القات.."
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-1.5 relative">
                                <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                                <select
                                  required
                                  value={transDeliveryRef}
                                  onChange={e => setTransDeliveryRef(e.target.value)}
                                  className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-5 py-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50 transition-all appearance-none text-center text-sm"
                                >
                                  <option value="">-- اختر من المـخـزون --</option>
                                  {transactions.filter(t => t.type === 'delivery' && isToday(t.date) && getRemainingStock(t.id) > 0).map(t => {
                                    const rawi = raia.find(r => r.id === t.personId);
                                    return (
                                      <option key={t.id} value={t.id}>
                                        {rawi?.name} - {t.category} (المتوفر: {getRemainingStock(t.id)} حبة)
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5 flex flex-col">
                                  <input
                                    required
                                    type="number"
                                    value={transQuantity}
                                    onChange={e => setTransQuantity(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-5 font-black font-mono text-slate-900 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-center text-sm"
                                    placeholder="الكمية"
                                  />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                  <input
                                    required
                                    type="number"
                                    value={transUnitPrice}
                                    onChange={e => setTransUnitPrice(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-5 font-black font-mono text-slate-900 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-center text-sm"
                                    placeholder="سعر الحبة"
                                  />
                                </div>
                              </div>

                          <div className="bg-emerald-50/50 p-4 rounded-2xl flex items-center justify-between border border-emerald-100/50">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">الإجمالي:</span>
                            <span className="text-lg font-black font-mono text-emerald-700">
                              {((parseFloat(transQuantity) || 0) * (parseFloat(transUnitPrice) || 0)).toLocaleString()} ريال
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setTransPayment('cash')}
                              className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all border-2 ${transPayment === 'cash' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-50 text-slate-300'}`}
                            >
                              نقدي
                            </button>
                            <button
                              type="button"
                              onClick={() => setTransPayment('credit')}
                              className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all border-2 ${transPayment === 'credit' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-50 text-slate-300'}`}
                            >
                              آجل
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <input
                          autoFocus
                          required
                          type="text"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-center text-sm"
                          placeholder="الاسـم بالـكـامـل"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={e => setNewPhone(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-center text-sm"
                          placeholder="رقم الهاتف (اختياري)"
                        />
                      </div>
                    </>
                  )}
                  </form>
                </div>

                {/* Sticky Footer */}
                <div className="p-8 pt-4 pb-8 shrink-0 bg-white border-t border-slate-50">
                  <button
                    form="add-form"
                    type="submit"
                    className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black text-sm shadow-2xl active:scale-95 transition-all"
                  >
                    حفظ الآن
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Person Details Modal */}
      <AnimatePresence>
        {selectedPerson && !isPrintingSilent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-md p-0"
            onClick={() => setSelectedPerson(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-xl bg-white rounded-t-[40px] p-8 shadow-2xl h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h2 className="text-2xl font-black text-slate-900">{selectedPerson.name}</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">كشف حساب {selectedPerson.type === "ra'wi" ? 'رعوي' : 'مقوت'}</p>
                </div>
                <div className="flex gap-2">
                   <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" size={14} />
                      <input 
                        type="date" 
                        value={selectedDetailDate || ''}
                        onChange={(e) => setSelectedDetailDate(e.target.value || null)}
                        className="bg-emerald-50 text-emerald-700 py-3 pl-3 pr-8 rounded-2xl text-[9px] font-black outline-none border border-emerald-100/50 appearance-none focus:ring-4 focus:ring-emerald-100 transition-all w-28 text-center"
                      />
                   </div>
                   <button onClick={() => setSelectedPerson(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 leading-none flex items-center justify-center">
                     <ArrowLeft size={20} />
                   </button>
                </div>
              </div>

              {!selectedDetailDate ? (
                 <div className="space-y-6 pb-20">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">سجل الحساب اليومي (حدد يوماً)</h3>
                    </div>
                    {(() => {
                      const pTrans = transactions.filter(t => {
                        if (t.personId === selectedPerson.id) return true;
                        if (t.type === 'sale') {
                          const delivery = transactions.find(d => d.id === t.refDeliveryId);
                          return delivery?.personId === selectedPerson.id;
                        }
                        return false;
                      });
                      const dates = Array.from(new Set(pTrans.map(t => t.date.split('T')[0]))).sort().reverse();
                      if (dates.length === 0) return <div className="text-center py-10 bg-slate-50 rounded-3xl text-slate-300 text-xs font-bold">لا يوجد سجل معاملات لهذا الشخص</div>;
                      return dates.map(date => {
                        const dayTrans = pTrans.filter(t => t.date.startsWith(date));
                        if (selectedPerson.type === "ra'wi") {
                          const deliveryQty = dayTrans.filter(t => t.type === 'delivery').reduce((sum, t) => sum + (t.quantity || 0), 0);
                          const salesVal = dayTrans.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
                          return (
                            <motion.div 
                              key={date}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedDetailDate(date)}
                              className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm cursor-pointer hover:shadow-md transition-all flex justify-between items-center"
                            >
                              <div>
                                <h4 className="text-sm font-black text-slate-900 mb-1">{date}</h4>
                                <p className="text-[10px] font-bold text-slate-400">توريد: {deliveryQty} حبة</p>
                              </div>
                              <div className="text-right">
                                <div className="text-emerald-600 font-black font-mono text-sm">{salesVal.toLocaleString()} ريال</div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">إجمالي المبيعات</p>
                              </div>
                            </motion.div>
                          );
                        } else {
                          const total = dayTrans.reduce((sum, t) => sum + t.amount, 0);
                          const cash = dayTrans.filter(t => t.paymentType === 'cash').reduce((sum, t) => sum + t.amount, 0);
                          const credit = dayTrans.filter(t => t.paymentType === 'credit').reduce((sum, t) => sum + t.amount, 0);
                          
                          // Custom Category Totals for Muqawit List
                          const qatalTotal = dayTrans.filter(t => transactions.find(d => d.id === t.refDeliveryId)?.category === 'قطل').reduce((sum, t) => sum + t.amount, 0);
                          const roosTotal = dayTrans.filter(t => transactions.find(d => d.id === t.refDeliveryId)?.category === 'روس').reduce((sum, t) => sum + t.amount, 0);
                          const qatalQty = dayTrans.filter(t => transactions.find(d => d.id === t.refDeliveryId)?.category === 'قطل').reduce((sum, t) => sum + (t.quantity || 0), 0);
                          const roosQty = dayTrans.filter(t => transactions.find(d => d.id === t.refDeliveryId)?.category === 'روس').reduce((sum, t) => sum + (t.quantity || 0), 0);

                          return (
                            <motion.div 
                              key={date}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedDetailDate(date)}
                              className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm cursor-pointer hover:shadow-md transition-all space-y-4"
                            >
                              <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                                <div>
                                  <h4 className="text-[13px] font-black text-slate-900">{date}</h4>
                                  <div className="flex gap-3 mt-1">
                                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">نقدي: {cash.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">آجل: {credit.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-slate-900 font-black font-mono text-base">{total.toLocaleString()} <span className="text-[10px] opacity-40">ريال</span></div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">إجمالي المشتريات</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                                  <div className="text-[8px] font-black text-indigo-500 uppercase mb-1">روس</div>
                                  <div className="text-xs font-black text-slate-700">{roosTotal.toLocaleString()} <span className="text-[9px] opacity-40">ريال</span></div>
                                  <div className="text-[9px] text-slate-400 font-bold">{roosQty} حبة</div>
                                </div>
                                <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                                  <div className="text-[8px] font-black text-emerald-500 uppercase mb-1">قطل</div>
                                  <div className="text-xs font-black text-slate-700">{qatalTotal.toLocaleString()} <span className="text-[9px] opacity-40">ريال</span></div>
                                  <div className="text-[9px] text-slate-400 font-bold">{qatalQty} حبة</div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        }
                      });
                    })()}
                 </div>
               ) : (
                 <div className="space-y-6">
                   <div className="flex items-center gap-2 mb-2">
                      <button 
                        onClick={() => setSelectedDetailDate(null)}
                        className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black"
                      >
                        <ArrowLeft size={14} className="rotate-180" />
                        العودة للسجل اليومي
                      </button>
                      <div className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-xl text-center font-black text-[10px]">
                        عرض حساب يوم: {selectedDetailDate}
                      </div>
                   </div>
                   {selectedPerson.type === "ra'wi" ? (
                     <div className="space-y-6">
                  {/* Today Summary */}
                  <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden text-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">كشف حساب اليوم</h3>
                    <div className="grid grid-cols-2 gap-6 relative z-10">
                      <div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">إجمالي التوريد اليوم</div>
                        <div className="text-2xl font-black font-mono flex items-baseline justify-center gap-1">
                          {transactions.filter(t => t.personId === selectedPerson.id && t.type === 'delivery' && t.date.startsWith(selectedDetailDate!)).reduce((sum, t) => sum + (t.quantity || 0), 0)}
                          <span className="text-xs font-bold text-slate-500">حبة</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">إجمالي المبيعات اليوم</div>
                        <div className="text-2xl font-black font-mono text-emerald-400">
                          {transactions.filter(t => {
                            if (t.type !== 'sale' || !t.date.startsWith(selectedDetailDate!)) return false;
                            const delivery = transactions.find(d => d.id === t.refDeliveryId);
                            return delivery?.personId === selectedPerson.id;
                          }).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-sm font-bold opacity-60">ريال</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Activity */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">تفاصيل توريد اليوم</h3>
                      <div className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">موثق</div>
                    </div>
                    
                    {transactions.filter(t => t.personId === selectedPerson.id && t.type === 'delivery' && t.date.startsWith(selectedDetailDate!)).length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-3xl text-slate-300 text-xs font-bold">لا توجد توريدات اليوم</div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.filter(t => t.personId === selectedPerson.id && t.type === 'delivery' && isSpecificDate(t.date, selectedDetailDate!)).map(d => (
                          <div key={d.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
                              <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-0.5">الصنف</span>
                                <span className="font-black text-slate-900">{d.category}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-0.5">الكمية</span>
                                <span className="font-black font-mono text-slate-900">{d.quantity} حبة</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {transactions.filter(s => s.refDeliveryId === d.id).map(s => {
                                const muqawit = muqawatah.find(m => m.id === s.personId);
                                return (
                                  <div key={s.id} className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl group">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-slate-400 uppercase">المقوت</span>
                                      <span className="text-[11px] font-bold text-slate-700">{muqawit?.name}</span>
                                    </div>
                                    <div className="text-right flex flex-col">
                                      <span className="text-[8px] font-black text-slate-400 uppercase">السجل</span>
                                      <span className="text-[11px] font-black font-mono text-emerald-600">{s.amount.toLocaleString()} ريال ({s.quantity} حبة)</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {transactions.filter(s => s.refDeliveryId === d.id).length === 0 && (
                                <div className="text-center py-2 text-[10px] text-slate-400 font-bold border border-dashed border-slate-200 rounded-2xl italic">قيد التصريف...</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Muqawit Today Summary - Enhanced with Categories */}
                  <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">ملخص المشتريات اليومي</h3>
                      
                      {/* Top Row: Cash vs Credit */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                          <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">إجمالي النقدي</div>
                          <div className="text-xl font-black font-mono text-emerald-400">
                            {transactions.filter(t => t.personId === selectedPerson.id && t.paymentType === 'cash' && t.date.startsWith(selectedDetailDate!)).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                          <div className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-1">إجمالي الآجل</div>
                          <div className="text-xl font-black font-mono text-orange-400">
                            {transactions.filter(t => t.personId === selectedPerson.id && t.paymentType === 'credit' && t.date.startsWith(selectedDetailDate!)).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Category Breakdown: Qatal vs Roos */}
                      <div className="grid grid-cols-2 gap-6 pb-6 border-b border-white/10 mb-6">
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">إجمالي (قطل)</div>
                          <div className="text-lg font-black font-mono flex flex-col items-center">
                            <span className="text-emerald-50 text-xl">
                              {transactions.filter(t => t.personId === selectedPerson.id && t.date.startsWith(selectedDetailDate!) && transactions.find(d => d.id === t.refDeliveryId)?.category === 'قطل').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] opacity-40 font-bold mt-1">
                              {transactions.filter(t => t.personId === selectedPerson.id && t.date.startsWith(selectedDetailDate!) && transactions.find(d => d.id === t.refDeliveryId)?.category === 'قطل').reduce((sum, t) => sum + (t.quantity || 0), 0)} حبة
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">إجمالي (روس)</div>
                          <div className="text-lg font-black font-mono flex flex-col items-center">
                            <span className="text-emerald-50 text-xl">
                              {transactions.filter(t => t.personId === selectedPerson.id && t.date.startsWith(selectedDetailDate!) && transactions.find(d => d.id === t.refDeliveryId)?.category === 'روس').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] opacity-40 font-bold mt-1">
                              {transactions.filter(t => t.personId === selectedPerson.id && t.date.startsWith(selectedDetailDate!) && transactions.find(d => d.id === t.refDeliveryId)?.category === 'روس').reduce((sum, t) => sum + (t.quantity || 0), 0)} حبة
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Grand Total */}
                      <div className="text-center pt-2">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">الإجمالي العام للمشتريات</div>
                        <div className="text-4xl font-black font-mono text-white flex items-baseline justify-center gap-2">
                          {transactions.filter(t => t.personId === selectedPerson.id && t.date.startsWith(selectedDetailDate!)).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                          <span className="text-sm font-bold text-slate-500">ريال</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">سجل العمليات التفصيلي</h3>
                      <div className="text-[9px] font-bold text-slate-400">التاريخ: {selectedDetailDate}</div>
                    </div>
                    
                    {(() => {
                      const dayTrans = transactions.filter(t => t.personId === selectedPerson.id && t.date.startsWith(selectedDetailDate!));
                      if (dayTrans.length === 0) return <div className="text-center py-10 bg-slate-50 rounded-3xl text-slate-300 text-xs font-bold">لا توجد عمليات مسجلة لهذا اليوم</div>;
                      
                      return (
                        <div className="space-y-3">
                          {dayTrans.map(t => {
                            const delivery = transactions.find(d => d.id === t.refDeliveryId);
                            const rawi = raia.find(r => r.id === delivery?.personId);
                            const isRoos = delivery?.category === 'روس';
                            
                            return (
                              <div key={t.id} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                <div className={`absolute top-0 right-0 w-2 h-full ${isRoos ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                
                                <div className="space-y-4">
                                  {/* Line 1: Type and Header */}
                                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                    <div className="flex items-center gap-2">
                                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${t.paymentType === 'cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {t.paymentType === 'cash' ? 'نقدي' : 'آجل'}
                                      </div>
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${isRoos ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                        صنف: {delivery?.category || 'غير محدد'}
                                      </span>
                                    </div>
                                    <div className="text-xs font-black text-slate-400">
                                      {t.date.split(' ')[1]}
                                    </div>
                                  </div>

                                  {/* Line 2: Ra'wi Information */}
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                      <User size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">اسم الرعوي</span>
                                      <span className="text-sm font-black text-slate-900">{rawi?.name || 'مجهول'}</span>
                                    </div>
                                  </div>

                                  {/* Line 3: Pricing and Quantity */}
                                  <div className="grid grid-cols-2 gap-2 py-2">
                                    <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-100/50">
                                      <span className="text-[10px] font-bold text-slate-400 mb-1">الكمية</span>
                                      <span className="text-lg font-black text-slate-900 font-mono">{t.quantity} <span className="text-[10px] font-black">حبة</span></span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-100/50">
                                      <span className="text-[10px] font-bold text-slate-400 mb-1">سعر الحبة</span>
                                      <span className="text-lg font-black text-slate-900 font-mono">{t.unitPrice?.toLocaleString()} <span className="text-[10px] font-black">ريال</span></span>
                                    </div>
                                  </div>

                                  {/* Line 4: Total Amount */}
                                  <div className="pt-3 border-t border-slate-50 flex justify-between items-center px-2">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">إجمالي المبلغ:</span>
                                    <div className="text-xl font-black font-mono text-slate-900 tracking-tight">
                                      {t.amount.toLocaleString()}
                                      <span className="text-xs text-slate-400 mr-2 font-bold uppercase">ريال يمني</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>

      {/* Profile Modal - Modern Design */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-6"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full translate-x-16 -translate-y-16"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">الملف الشخصي</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">بيانات صاحب المصلحة</p>
                  </div>
                  <button 
                    onClick={() => setShowProfileModal(false)}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">اسم المقوت</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        type="text"
                        value={profile.name}
                        onChange={e => setProfile({...profile, name: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-sm"
                        placeholder="أدخل اسمك الكامل"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">الموقع / العنوان</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        type="text"
                        value={profile.location}
                        onChange={e => setProfile({...profile, location: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-sm"
                        placeholder="مثلاً: صنعاء، شارع تعز"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-1">رقم الهاتف</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        type="text"
                        value={profile.phone}
                        onChange={e => setProfile({...profile, phone: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50 transition-all text-sm font-mono tracking-wider"
                        placeholder="رقم هاتفك"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  حفظ التعديلات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal - Modern Swiss Design */}
      <AnimatePresence>
        {showSuccessModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl text-center"
            >
              <div className="h-20 w-20 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                <Download size={40} />
              </div>
              
              <h2 className="text-xl font-black text-slate-900 mb-2">تم التنزيل بنجاح!</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4 mb-4">نظام المصلح السحابي</p>
              
              <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">اسم الملف</div>
                <div className="text-[11px] font-bold text-slate-700 truncate font-mono">{showSuccessModal.filename}</div>
                <div className="mt-3 text-[10px] font-bold text-emerald-600 flex items-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                   تم الحفظ في مجلد التنزيلات (Downloads)
                </div>
              </div>

              <button 
                onClick={() => setShowSuccessModal({ show: false, filename: '' })}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
              >
                إغلاق الإشعار
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden PDF Templates Area - Robustly placed far off-screen to avoid any interference while remaining in DOM */}
      <div 
        className="absolute top-0 left-[-10000px] pointer-events-none"
        style={{ width: '210mm', opacity: 1, visibility: 'visible' }}
      >
        <div 
          ref={reportRef} 
          dir="rtl" 
          style={{ 
            width: '210mm',
            minHeight: '297mm',
            fontFamily: 'Inter, sans-serif',
            color: '#000000',
            backgroundColor: '#ffffff'
          }}
        >
          {selectedPerson ? (
            /* Individual Report Template */
            <div className="report-doc">
               <div className="report-section">
                <div className="flex justify-between items-start mb-8 pb-4 border-b-2" style={{ borderColor: '#0f172a' }}>
                  <div className="text-right">
                    {profile.name && <h3 className="text-sm font-black" style={{ color: '#0f172a' }}>{profile.name}</h3>}
                    {profile.location && <p className="text-[10px] font-bold" style={{ color: '#64748b' }}>{profile.location}</p>}
                  </div>
                  <div className="text-center flex-1">
                    <h1 className="text-xl font-black" style={{ color: '#0f172a' }}>
                      {reportType === 'full' ? 'التقرير الشامل التراكمي' : 'كشف حساب'}
                    </h1>
                    <p className="text-xs font-bold" style={{ color: '#64748b' }}>
                      {reportType === 'full' ? 'كافة السجلات التاريخية' : `التاريخ: ${new Date(reportDate).toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-black" style={{ color: '#0f172a' }}>{selectedPerson.name}</h2>
                    <p className="text-[10px] font-bold uppercase" style={{ color: '#94a3b8' }}>{selectedPerson.type === "ra'wi" ? 'رعوي' : 'مقوت'}</p>
                  </div>
                </div>

                {selectedPerson.type === "ra'wi" ? (
                  <div>
                    {(() => {
                      const personDeliveries = transactions.filter(t => {
                        const isMatch = t.personId === selectedPerson.id && t.type === 'delivery';
                        return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                      });
                      const roosQty = personDeliveries.filter(t => (t.category || '').includes('روس')).reduce((sum, t) => sum + (t.quantity || 0), 0);
                      const qatalQty = personDeliveries.filter(t => (t.category || '').includes('قطل')).reduce((sum, t) => sum + (t.quantity || 0), 0);
                      return (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {roosQty > 0 && (
                            <div className="p-4 rounded-xl text-center bg-slate-900 text-white">
                              <div className="text-[10px] font-bold mb-1 opacity-60 uppercase">إجمالي الروس</div>
                              <div className="text-xl font-black">{roosQty} رأس</div>
                            </div>
                          )}
                          {qatalQty > 0 && (
                            <div className="p-4 rounded-xl text-center bg-slate-900 text-white">
                              <div className="text-[10px] font-bold mb-1 opacity-60 uppercase">إجمالي القطل</div>
                              <div className="text-xl font-black">{qatalQty} قطلة</div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                        <div className="text-xs font-bold mb-1" style={{ color: '#1e40af' }}>إجمالي توريدات الفترة</div>
                        <div className="text-xl font-black" style={{ color: '#1e3a8a' }}>
                          {transactions.filter(t => {
                            const isMatch = t.personId === selectedPerson.id && t.type === 'delivery';
                            return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                          }).reduce((sum, t) => sum + (t.quantity || 0), 0)} حبة
                        </div>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: '#ecfdf5', border: '1px solid #d1fae5' }}>
                        <div className="text-xs font-bold mb-1" style={{ color: '#059669' }}>إجمالي المبيعات المحققة</div>
                        <div className="text-xl font-black" style={{ color: '#047857' }}>
                          {transactions.filter(t => {
                            if (t.type !== 'sale') return false;
                            if (reportType !== 'full' && !isSpecificDate(t.date, reportDate)) return false;
                            const delivery = transactions.find(d => d.id === t.refDeliveryId);
                            return delivery?.personId === selectedPerson.id;
                          }).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} ريال
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-8 flex-wrap">
                      <div className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">الإجمالي:</span>
                        <span className="text-xs font-black text-slate-900">
                          {transactions.filter(t => {
                            const isMatch = t.personId === selectedPerson.id && t.type === 'delivery';
                            return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                          }).reduce((sum, t) => sum + (t.quantity || 0), 0)} حبة
                        </span>
                      </div>
                      {Array.from(new Set(transactions.filter(t => {
                        const isMatch = t.personId === selectedPerson.id && t.type === 'delivery';
                        return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                      }).map(t => t.category))).map(cat => (
                        <div key={cat} className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500">{cat}:</span>
                          <span className="text-xs font-black text-slate-900">
                            {transactions.filter(t => {
                              const isMatch = t.personId === selectedPerson.id && t.type === 'delivery' && t.category === cat;
                              return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                            }).reduce((sum, t) => sum + (t.quantity || 0), 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-6">
                        {(() => {
                           const filteredDeliveries = transactions.filter(t => {
                             const isMatch = t.personId === selectedPerson.id && t.type === 'delivery';
                             return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                           });

                           const grouped = filteredDeliveries.reduce((acc, t) => {
                             const dStr = new Date(t.date).toISOString().split('T')[0];
                             if (!acc[dStr]) acc[dStr] = [];
                             acc[dStr].push(t);
                             return acc;
                           }, {} as Record<string, Transaction[]>);

                           return Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(date => {
                             const dayTotalSales = grouped[date].reduce((acc, d) => {
                               const sales = transactions.filter(s => s.refDeliveryId === d.id);
                               return acc + sales.reduce((sSum, s) => sSum + s.amount, 0);
                             }, 0);

                             return (
                               <div key={date} className="mb-8 last:mb-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                 <div className="bg-slate-100 p-3 flex justify-between items-center border-b border-slate-200">
                                   <span className="text-[10px] font-black" style={{ color: '#0f172a' }}>
                                     سجلات يوم: {new Date(date).toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                   </span>
                                   <div className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-black">
                                      إجمالي المبيعات المحققة لهذا اليوم: {dayTotalSales.toLocaleString()} ريال
                                   </div>
                                 </div>
                                 <table className="w-full border-collapse">
                                 <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                   <tr>
                                     <th className="p-3 text-right text-[10px] font-black" style={{ color: '#64748b' }}>الصنف</th>
                                     <th className="p-3 text-right text-[10px] font-black" style={{ color: '#64748b' }}>الكمية</th>
                                     <th className="p-3 text-right text-[10px] font-black" style={{ color: '#64748b' }}>التصريف (المبيعات)</th>
                                   </tr>
                                 </thead>
                                 <tbody style={{ backgroundColor: '#ffffff' }}>
                                   {grouped[date].map(d => (
                                     <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                       <td className="p-3 text-sm font-bold" style={{ color: '#334155' }}>{d.category}</td>
                                       <td className="p-3 text-sm font-black font-mono" style={{ color: '#0f172a' }}>{d.quantity} {d.category}</td>
                                       <td className="p-3 border-r border-slate-100">
                                         {transactions.filter(s => s.refDeliveryId === d.id).map(s => {
                                           const m = muqawatah.find(p => p.id === s.personId);
                                           return (
                                             <div key={s.id} className="text-[10px] mb-1" style={{ color: '#475569' }}>
                                                <span className="font-black" style={{ color: '#059669' }}>{s.amount.toLocaleString()} ريال</span> - {m?.name} ({s.quantity} {d.category})
                                             </div>
                                           )
                                         })}
                                       </td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                           );
                           });
                        })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                       <div className="p-4 rounded-xl" style={{ backgroundColor: '#ecfdf5', border: '1px solid #d1fae5' }}>
                         <div className="text-[10px] font-bold mb-1" style={{ color: '#059669' }}>إجمالي النقدي</div>
                         <div className="text-xl font-black" style={{ color: '#047857' }}>
                           {transactions.filter(t => {
                             const isMatch = t.personId === selectedPerson.id && t.paymentType === 'cash';
                             return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                           }).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} ريال
                         </div>
                       </div>
                       <div className="p-4 rounded-xl" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                         <div className="text-[10px] font-bold mb-1" style={{ color: '#ea580c' }}>إجمالي الآجل</div>
                         <div className="text-xl font-black" style={{ color: '#c2410c' }}>
                           {transactions.filter(t => {
                             const isMatch = t.personId === selectedPerson.id && t.paymentType === 'credit';
                             return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                           }).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} ريال
                         </div>
                       </div>
                       <div className="p-4 rounded-xl" style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                         <div className="text-[10px] font-bold mb-1" style={{ color: '#1e40af' }}>إجمالي المشتريات</div>
                         <div className="text-xl font-black" style={{ color: '#1e3a8a' }}>
                           {transactions.filter(t => {
                             const isMatch = t.personId === selectedPerson.id;
                             return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                           }).reduce((sum, t) => sum + t.amount, 0).toLocaleString()} ريال
                         </div>
                       </div>
                    </div>

                    <div className="flex gap-2 mb-8 flex-wrap">
                      <div className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">إجمالي الكمية:</span>
                        <span className="text-xs font-black text-slate-900">
                           {transactions.filter(t => {
                             const isMatch = t.personId === selectedPerson.id;
                             return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                           }).reduce((sum, t) => sum + (t.quantity || 0), 0)} حبة
                        </span>
                      </div>
                      {Array.from(new Set(transactions.filter(t => {
                        const isMatch = t.personId === selectedPerson.id;
                        return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                      }).map(t => {
                        const del = transactions.find(d => d.id === t.refDeliveryId);
                        return del?.category;
                      }))).filter(Boolean).map(cat => (
                        <div key={cat} className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500">{cat}:</span>
                          <span className="text-xs font-black text-slate-900">
                            {transactions.filter(t => {
                              const isMatch = t.personId === selectedPerson.id && transactions.find(d => d.id === t.refDeliveryId)?.category === cat;
                              return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                            }).reduce((sum, t) => sum + (t.quantity || 0), 0)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6">
                         {(() => {
                            const filteredSales = transactions.filter(t => {
                               const isMatch = t.personId === selectedPerson.id;
                               return reportType === 'full' ? isMatch : (isMatch && isSpecificDate(t.date, reportDate));
                            });

                            const grouped = filteredSales.reduce((acc, t) => {
                               const dStr = new Date(t.date).toISOString().split('T')[0];
                               if (!acc[dStr]) acc[dStr] = [];
                               acc[dStr].push(t);
                               return acc;
                            }, {} as Record<string, Transaction[]>);

                            return Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(date => {
                               const dayCash = grouped[date].filter(t => t.paymentType === 'cash').reduce((sum, t) => sum + t.amount, 0);
                               const dayCredit = grouped[date].filter(t => t.paymentType === 'credit').reduce((sum, t) => sum + t.amount, 0);
                               const dayTotal = dayCash + dayCredit;

                               return (
                                 <div key={date} className="mb-8 last:mb-0 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-100 p-3 flex justify-between items-center border-b border-slate-200">
                                      <span className="text-[10px] font-black" style={{ color: '#0f172a' }}>
                                        سجلات يوم: {new Date(date).toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                      </span>
                                      <div className="flex gap-2">
                                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[9px] font-black border border-emerald-100">
                                          نقدي: {dayCash.toLocaleString()}
                                        </div>
                                        <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg text-[9px] font-black border border-orange-100">
                                          آجل: {dayCredit.toLocaleString()}
                                        </div>
                                        <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black shadow-sm">
                                          الإجمالي: {dayTotal.toLocaleString()} ريال
                                        </div>
                                      </div>
                                    </div>
                                    <table className="w-full border-collapse">
                                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                      <tr>
                                        <th className="p-3 text-right text-[10px] font-black" style={{ color: '#64748b' }}>الرعوي</th>
                                        <th className="p-3 text-right text-[10px] font-black" style={{ color: '#64748b' }}>الصنف</th>
                                        <th className="p-3 text-right text-[10px] font-black" style={{ color: '#64748b' }}>الكمية</th>
                                        <th className="p-3 text-right text-[10px] font-black" style={{ color: '#64748b' }}>سعر الحبة</th>
                                        <th className="p-3 text-right text-[10px] font-black" style={{ color: '#64748b' }}>الإجمالي</th>
                                      </tr>
                                    </thead>
                                    <tbody style={{ backgroundColor: '#ffffff' }}>
                                      {grouped[date].map(t => {
                                        const d = transactions.find(delivery => delivery.id === t.refDeliveryId);
                                        const rw = raia.find(p => p.id === d?.personId);
                                        return (
                                          <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td className="p-3 text-sm font-bold" style={{ color: '#0f172a' }}>{rw?.name || 'مجهول'}</td>
                                            <td className="p-3 text-sm font-bold" style={{ color: '#334155' }}>{d?.category}</td>
                                            <td className="p-3 text-sm font-black font-mono" style={{ color: '#0f172a' }}>{t.quantity} {d?.category}</td>
                                            <td className="p-3 text-sm font-black font-mono" style={{ color: '#64748b' }}>{t.unitPrice?.toLocaleString()} ريال</td>
                                            <td className="p-3 text-sm font-black font-mono" style={{ color: '#059669' }}>{t.amount.toLocaleString()} ريال</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                               </div>
                             );
                           });
                        })()}
                    </div>
                  </div>
                )}
                
                <div className="report-footer-print">
                  برمجة المهندس صادق النعم - ت/777437409
                </div>
              </div>
            </div>
          ) : (
            /* Full Daily Report Template */
            <div className="report-doc">
               {(() => {
                 // Pre-calculate data for the comprehensive report
                 const dailyTransactions = transactions.filter(t => isSpecificDate(t.date, reportDate));
                 const totalCashSales = dailyTransactions.filter(t => t.type === 'sale' && t.paymentType === 'cash').reduce((sum, t) => sum + t.amount, 0);
                 const totalCreditSales = dailyTransactions.filter(t => t.type === 'sale' && t.paymentType === 'credit').reduce((sum, t) => sum + t.amount, 0);
                 const totalDelivQty = dailyTransactions.filter(t => t.type === 'delivery').reduce((sum, t) => sum + (t.quantity || 0), 0);

                 const muqawitDetails = muqawatah.map(m => {
                   const mSales = dailyTransactions.filter(t => t.personId === m.id && t.type === 'sale');
                   if (mSales.length === 0) return null;

                   const categories = Array.from(new Set(mSales.map(t => {
                     const del = transactions.find(d => d.id === t.refDeliveryId);
                     return del?.category;
                   }))).filter(Boolean) as string[];

                   const categorySummary = categories.map(cat => ({
                     name: cat,
                     qty: mSales.filter(t => transactions.find(d => d.id === t.refDeliveryId)?.category === cat).reduce((sum, t) => sum + (t.quantity || 0), 0)
                   }));
                   return {
                     id: m.id,
                     name: m.name,
                     sales: mSales,
                     total: mSales.reduce((sum, t) => sum + t.amount, 0),
                     totalQty: mSales.reduce((sum, t) => sum + (t.quantity || 0), 0),
                     cash: mSales.filter(t => t.paymentType === 'cash').reduce((sum, t) => sum + t.amount, 0),
                     credit: mSales.filter(t => t.paymentType === 'credit').reduce((sum, t) => sum + t.amount, 0),
                     categorySummary: categorySummary
                   };
                 }).filter(Boolean);

                 const raiaDetailed = raia.map(r => {
                   const rDeliveries = dailyTransactions.filter(t => t.personId === r.id && t.type === 'delivery');
                   if (rDeliveries.length === 0) return null;
                   
                   const deliveriesWithSales = rDeliveries.map(d => {
                     const sales = dailyTransactions.filter(s => s.type === 'sale' && s.refDeliveryId === d.id);
                     return { ...d, sales };
                   });

                   return { 
                     id: r.id, 
                     name: r.name, 
                     deliveries: deliveriesWithSales,
                     totalQty: rDeliveries.reduce((sum, t) => sum + (t.quantity || 0), 0),
                     totalSalesVal: deliveriesWithSales.reduce((sum, d) => sum + d.sales.reduce((sSum, s) => sSum + s.amount, 0), 0)
                   };
                 }).filter(Boolean);

                 return (
                   <div className="report-section px-8 py-4">
                     {/* HEADER & STATS */}
                     <div className="flex justify-between items-start mb-8 pb-4 border-b-2" style={{ borderColor: '#0f172a' }}>
                       <div className="text-right">
                         <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mb-1 inline-block">
                           {profile.name}
                         </div>
                         <p className="text-[10px] font-bold" style={{ color: '#64748b' }}>{profile.location}</p>
                       </div>
                       <div className="text-center flex-1">
                         <h1 className="text-xl font-black" style={{ color: '#0f172a' }}>التقرير اليومي الشامل</h1>
                         <p className="text-xs font-bold" style={{ color: '#64748b' }}>التاريخ: {new Date(reportDate).toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                       </div>
                       <div className="text-left">
                         <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                           سجل عام
                         </div>
                       </div>
                     </div>

                     <div className="grid grid-cols-3 gap-6 mb-8">
                       <div className="p-6 rounded-2xl" style={{ backgroundColor: '#ecfdf5', border: '1px solid #d1fae5' }}>
                         <div className="text-[10px] font-bold mb-1 uppercase" style={{ color: '#059669' }}>إجمالي المبيعات (نقدي)</div>
                         <div className="text-2xl font-black font-mono" style={{ color: '#047857' }}>{totalCashSales.toLocaleString()} ريال</div>
                       </div>
                       <div className="p-6 rounded-2xl" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                         <div className="text-[10px] font-bold mb-1 uppercase" style={{ color: '#ea580c' }}>إجمالي المبيعات (آجل)</div>
                         <div className="text-2xl font-black font-mono" style={{ color: '#c2410c' }}>{totalCreditSales.toLocaleString()} ريال</div>
                       </div>
                       <div className="p-6 rounded-2xl" style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                         <div className="text-[10px] font-bold mb-1 uppercase" style={{ color: '#1e40af' }}>إجمالي الوارد</div>
                         <div className="text-2xl font-black font-mono" style={{ color: '#1e3a8a' }}>{totalDelivQty.toLocaleString()} حبة</div>
                       </div>
                     </div>

                     <div className="flex gap-4 mb-12 flex-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="flex flex-col gap-1 pr-4 border-l border-slate-200 last:border-0 min-w-[120px]">
                          <span className="text-[10px] font-black text-slate-400 uppercase">إجمالي الكمية</span>
                          <span className="text-lg font-black text-slate-900">{totalDelivQty.toLocaleString()} حبة</span>
                       </div>
                       {Array.from(new Set(dailyTransactions.filter(t => t.type === 'delivery').map(t => t.category))).map(cat => (
                         <div key={cat} className="flex flex-col gap-1 pr-4 border-l border-slate-200 last:border-0 min-w-[120px]">
                            <span className="text-[10px] font-black text-slate-400 uppercase">{cat}</span>
                            <span className="text-lg font-black text-slate-900">
                              {dailyTransactions.filter(t => t.type === 'delivery' && t.category === cat).reduce((sum, t) => sum + (t.quantity || 0), 0).toLocaleString()} حبة
                            </span>
                         </div>
                       ))}
                     </div>

                     {/* MUQAWIT DETAILS */}
                     {muqawitDetails.length > 0 && (
                       <div className="mb-16">
                         <h2 className="text-2xl font-black mb-8 underline underline-offset-8">تفاصيل حسابات المقواتة</h2>
                         <div className="space-y-10">
                           {muqawitDetails.map((m: any) => (
                             <div key={m.id} className="border-t-2 border-black pt-4">
                                <div className="flex justify-between items-end mb-6">
                                  <div>
                                    <span className="text-xl font-black block mb-2">{m.name}</span>
                                    <div className="flex gap-4 items-center">
                                       <div className="flex gap-2">
                                         {m.categorySummary?.map((cat: any) => (
                                           <div key={cat.name} className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-700">
                                              {cat.name}: {cat.qty}
                                           </div>
                                         ))}
                                       </div>
                                       <span className="text-[10px] font-bold text-slate-400">إجمالي: {m.totalQty}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                                    <div className="text-right">
                                      <div className="text-[8px] font-bold text-emerald-500 uppercase">نقدي</div>
                                      <div className="text-sm font-black font-mono text-emerald-700">{m.cash?.toLocaleString()} ريال</div>
                                    </div>
                                    <div className="h-8 w-[1px] bg-slate-200"></div>
                                    <div className="text-right">
                                      <div className="text-[8px] font-bold text-orange-500 uppercase">آجل</div>
                                      <div className="text-sm font-black font-mono text-orange-700">{m.credit?.toLocaleString()} ريال</div>
                                    </div>
                                    <div className="h-8 w-[1px] bg-slate-200"></div>
                                    <div className="text-right">
                                      <div className="text-[8px] font-bold text-slate-500 uppercase">الإجمالي</div>
                                      <div className="text-sm font-black font-mono text-slate-900">{m.total?.toLocaleString()} ريال</div>
                                    </div>
                                  </div>
                                </div>
                               <table className="w-full text-sm border border-black">
                                 <thead>
                                   <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #000000' }}>
                                     <th className="p-3 text-right">الرعوي</th>
                                      <th className="p-3 text-right">الصنف</th>
                                     <th className="p-3 text-right">الكمية</th>
                                      <th className="p-3 text-right">السعر</th>
                                     <th className="p-3 text-right">الإجمالي</th>
                                     <th className="p-3 text-right">النوع</th>
                                   </tr>
                                 </thead>
                                 <tbody>
                                   {m.sales.map((t: any) => {
                                      const del = transactions.find(d => d.id === t.refDeliveryId);
                                      const rw = raia.find(p => p.id === del?.personId);
                                      return (
                                     <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                          <td className="p-3 font-bold">{rw?.name || 'مجهول'}</td>
                                          <td className="p-3 font-bold">{del?.category}</td>
                                          <td className="p-3 font-mono font-bold">{t.quantity} {del?.category}</td>
                                          <td className="p-3 font-mono">{t.unitPrice?.toLocaleString()} ريال</td>
                                          <td className="p-3 font-mono font-bold">{t.amount.toLocaleString()} ريال</td>
                                          <td className="p-3">{t.paymentType === 'cash' ? 'نقدي' : 'آجل'}</td>
                                        </tr>
                                      );
                                    })}
                                 </tbody>
                               </table>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* RAIA DETAILED TABLES */}
                     {raiaDetailed.length > 0 && (
                       <div style={{ pageBreakBefore: 'always', paddingTop: '15mm' }}>
                         <h2 className="text-2xl font-black mb-8 underline underline-offset-8">تفاصيل حسابات الرعية</h2>
                         <div className="space-y-14">
                           {raiaDetailed.map((r: any) => (
                             <div key={r.id} className="border-t-2 border-black pt-4">
                               <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-xl font-black">{r.name}</h3>
                                 {(() => {
                                   const roos = r.deliveries.filter((d: any) => (d.category || '').includes('روس')).reduce((sum: number, d: any) => sum + (d.quantity || 0), 0);
                                   const qatal = r.deliveries.filter((d: any) => (d.category || '').includes('قطل')).reduce((sum: number, d: any) => sum + (d.quantity || 0), 0);
                                   return (
                                     <div className="flex gap-4 items-center">
                                       {roos > 0 && <span className="text-xs font-black bg-slate-100 px-3 py-1 rounded-lg">الروس: {roos}</span>}
                                       {qatal > 0 && <span className="text-xs font-black bg-slate-100 px-3 py-1 rounded-lg">القطل: {qatal}</span>}
                                       <div className="text-sm font-black flex items-center justify-center pt-0 pb-1.5 px-[2px] m-0" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                                         إجمالي مبيعات الرعوي: {r.totalSalesVal.toLocaleString()} ريال
                                       </div>
                                     </div>
                                   );
                                 })()}
                               </div>
                               
                               <div className="space-y-8">
                                 {r.deliveries.map((d: any) => (
                                   <div key={d.id} className="border border-black p-4" style={{ backgroundColor: '#ffffff' }}>
                                     <div className="flex justify-between items-center mb-4 border-b border-black pb-2">
                                       <span className="font-bold underline">{d.category}</span>
                                       <span className="font-bold font-mono">كمية التوريد: {d.quantity} {d.category}</span>
                                     </div>
                                     <table className="w-full text-xs">
                                       <thead>
                                         <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000000' }}>
                                           <th className="p-2 text-right">المشتري</th>
                                           <th className="p-2 text-right">الكمية المباعة</th>
                                           <th className="p-2 text-right">سعر الحبة</th>
                                           <th className="p-2 text-right">الإجمالي</th>
                                         </tr>
                                       </thead>
                                       <tbody>
                                         {d.sales.map((s: any) => {
                                           const buyer = muqawatah.find(m => m.id === s.personId);
                                           return (
                                             <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                               <td className="p-2 font-bold">{buyer?.name || 'مجهول'}</td>
                                               <td className="p-2 font-mono">{s.quantity} {d.category}</td>
                                               <td className="p-2 font-mono">{s.unitPrice?.toLocaleString()} ريال</td>
                                               <td className="p-2 font-black font-mono">{s.amount.toLocaleString()} ريال</td>
                                             </tr>
                                           );
                                         })}
                                       </tbody>
                                     </table>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     <div className="report-footer-print">
                       برمجة المهندس صادق النعم - ت/777437409
                     </div>
                   </div>
                 );
               })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

