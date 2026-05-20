import React, { useState, useEffect } from 'react';
import Gauge from './components/Gauge';
import TransactionList from './components/TransactionList';
import { Plus, User, Bell, Home, PieChart, Settings, X, Users, TrendingUp, Calendar, History, Wallet, BellOff, Moon, Sun, ChevronRight, Clock, FileText, FileDown, Download, Sparkles } from 'lucide-react';
import { getDashboardStats, createTransaction, createUser, getFamilies, updateFamily, getFamilyTransactions, resetDatabase, askAI } from './api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const App: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [familyData, setFamilyData] = useState<any>(null);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [newMemberName, setNewMemberName] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    category: 'Groceries',
    is_private: false,
    user_id: 1, 
    family_id: 1, 
  });

  const formatTime = (ts: string) => {
    const dateStr = ts.endsWith('Z') || ts.includes('+') ? ts : `${ts}Z`;
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const fetchData = async () => {
    try {
      const [statsRes, familyRes, transRes] = await Promise.all([
        getDashboardStats(1),
        getFamilies(),
        getFamilyTransactions(1)
      ]);
      setStats(statsRes);
      setFamilyData(familyRes);
      setAllTransactions(transRes);
      setNewBudget(familyRes.budget_limit.toString());
      
      if (familyRes.users.length > 0 && !newTransaction.user_id) {
        setNewTransaction(prev => ({...prev, user_id: familyRes.users[0].id}));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const downloadCSV = () => {
    if (allTransactions.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ["Date", "Description", "Category", "Amount (Rs)", "Family Member"];
    const rows = allTransactions.map(t => {
      const date = new Date(t.timestamp).toLocaleDateString('en-IN');
      const member = familyMembers.find((m: any) => m.id === t.user_id)?.name || 'Unknown';
      const desc = `"${t.description.replace(/"/g, '""')}"`;
      return [date, desc, t.category, t.amount, member].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SpendWise_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    if (allTransactions.length === 0) {
      alert("No data to export");
      return;
    }
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('SpendWise Expense Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);
    
    const rows = allTransactions.map(t => [
      new Date(t.timestamp).toLocaleDateString('en-IN'),
      t.description,
      t.category,
      `Rs ${t.amount}`,
      familyMembers.find((m: any) => m.id === t.user_id)?.name || 'Unknown'
    ]);

    autoTable(doc, {
      head: [['Date', 'Description', 'Category', 'Amount', 'Member']],
      body: rows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    doc.save(`SpendWise_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransaction({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      });
      setIsModalOpen(false);
      setNewTransaction({ ...newTransaction, amount: '', description: '' });
      fetchData();
    } catch (error) {
      alert("Failed to add transaction");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    try {
      await createUser({
        name: newMemberName,
        email: `${newMemberName.toLowerCase().replace(/\s/g, '')}@spendwise.com`,
        family_id: 1
      });
      setNewMemberName('');
      setIsMemberModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Failed to add family member");
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateFamily(1, { budget_limit: parseFloat(newBudget) });
      setIsBudgetModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Failed to update budget");
    }
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
      <div className="animate-pulse text-2xl font-bold text-slate-300">Loading SpendWise...</div>
    </div>
  );

  const familyMembers = familyData?.users || [];

  const HomeView = () => (
    <main className="px-6 max-w-md mx-auto animate-in fade-in duration-500 pb-40">
      <div className="mt-4">
        <div className={`${darkMode ? 'bg-slate-900 border-slate-800 shadow-slate-900/50' : 'bg-white border-white shadow-slate-200/50'} rounded-3xl transition-colors duration-300 shadow-xl border`}>
          <Gauge 
            value={stats?.total_spend || 0} 
            max={stats?.budget_limit || 50000} 
            label="Monthly Spend" 
            darkMode={darkMode}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        {Object.entries(stats?.category_breakdown || {}).length > 0 ? (
          Object.entries(stats?.category_breakdown || {}).slice(0, 4).map(([cat, amount]: [any, any]) => (
            <div key={cat} className={`p-5 rounded-3xl shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer ${
              cat === 'Groceries' ? (darkMode ? 'bg-gradient-to-br from-emerald-900/60 to-teal-900/60 border border-emerald-500/30 text-emerald-400' : 'bg-gradient-to-br from-emerald-50 to-teal-100 text-teal-800 border border-emerald-200') : 
              cat === 'Dining' ? (darkMode ? 'bg-gradient-to-br from-rose-900/60 to-orange-900/60 border border-rose-500/30 text-rose-400' : 'bg-gradient-to-br from-rose-50 to-orange-100 text-rose-800 border border-rose-200') : 
              cat === 'Utilities' ? (darkMode ? 'bg-gradient-to-br from-blue-900/60 to-indigo-900/60 border border-blue-500/30 text-blue-400' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-800 border border-blue-200') : 
              (darkMode ? 'bg-gradient-to-br from-amber-900/60 to-yellow-900/60 border border-amber-500/30 text-amber-400' : 'bg-gradient-to-br from-amber-50 to-yellow-100 text-amber-800 border border-amber-200')
            }`}>
              <div className="font-extrabold text-xl mb-1">₹{amount.toLocaleString()}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{cat}</div>
            </div>
          ))
        ) : (
          <div className={`col-span-2 p-8 text-center rounded-3xl border-2 border-dashed ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
             <p className="text-slate-400 font-bold text-sm">No expenses yet. Add your first one! 🚀</p>
          </div>
        )}
      </div>

      <div className={`mt-8 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
          <History size={20} className="text-indigo-500" /> Recent Activity
        </h3>
        <TransactionList 
          transactions={stats?.recent_activity?.map((t: any) => ({
            ...t,
            user_name: familyMembers.find((m: any) => m.id === t.user_id)?.name || 'Unknown'
          })) || []} 
          darkMode={darkMode}
        />
      </div>
    </main>
  );

  const AnalysisView = () => {
    const percentage = stats?.budget_limit ? (stats.total_spend / stats.budget_limit) * 100 : 0;
    
    return (
      <main className="px-6 max-w-md mx-auto mt-6 animate-in slide-in-from-right duration-300 pb-40">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Analysis & History</h2>
          <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-full shadow-sm ${darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
            <Calendar size={14} /> May 2026
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${darkMode ? 'bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border border-indigo-500/30' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} text-white rounded-3xl shadow-xl shadow-indigo-500/30 p-6 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <TrendingUp size={100} />
            </div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
                <TrendingUp size={24} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-lg">Budget Performance</div>
                <div className="text-xs text-white/80 font-medium">You've used {percentage.toFixed(1)}% of your monthly limit</div>
              </div>
            </div>
            <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden relative z-10 backdrop-blur-md">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${percentage > 90 ? 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'}`} 
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
             <History size={18} className="text-slate-400" />
             <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Full Transaction Log ({allTransactions.length})</h3>
          </div>

          <div className="space-y-4">
             <TransactionList 
               transactions={allTransactions.map((t: any) => ({
                 ...t,
                 user_name: familyMembers.find((m: any) => m.id === t.user_id)?.name || 'Unknown'
               }))} 
               darkMode={darkMode}
             />
          </div>
        </div>
      </main>
    );
  };

  const TransactionsView = () => {
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'graph', 'pie', 'months'
    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
    const [viewingMonth, setViewingMonth] = useState(new Date());

    const prevMonth = () => {
       const newDate = new Date(viewingMonth);
       newDate.setMonth(newDate.getMonth() - 1);
       setViewingMonth(newDate);
    };
    
    const nextMonth = () => {
       const newDate = new Date(viewingMonth);
       newDate.setMonth(newDate.getMonth() + 1);
       setViewingMonth(newDate);
    };

    // Prepare chart data
    const chartData = [...allTransactions]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(t => {
        const dateStr = t.timestamp.endsWith('Z') || t.timestamp.includes('+') ? t.timestamp : `${t.timestamp}Z`;
        const date = new Date(dateStr);
        return {
          name: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          amount: t.amount,
          category: t.category
        };
      });

    // Prepare Monthly Comparison data
    const monthlyDataMap = allTransactions.reduce((acc, t) => {
      const d = new Date(t.timestamp.endsWith('Z') || t.timestamp.includes('+') ? t.timestamp : `${t.timestamp}Z`);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) acc[key] = { name: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), amount: 0, sortKey: d.getTime() };
      acc[key].amount += t.amount;
      return acc;
    }, {} as Record<string, any>);
    const monthlyChartData = Object.values(monthlyDataMap).sort((a: any, b: any) => a.sortKey - b.sortKey);

    // Group transactions by date str YYYY-MM-DD
    const transactionsByDateStr = allTransactions.reduce((acc, t) => {
      const dateStr = t.timestamp.endsWith('Z') || t.timestamp.includes('+') ? t.timestamp : `${t.timestamp}Z`;
      const date = new Date(dateStr);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; // unique key
      if (!acc[key]) acc[key] = { total: 0, transactions: [], dateObj: date };
      acc[key].total += t.amount;
      acc[key].transactions.push(t);
      return acc;
    }, {} as Record<string, any>);

    // Pie chart data
    const pieData = Object.entries(stats?.category_breakdown || {}).map(([name, value]) => ({ name, value }));
    const COLORS = ['#34d399', '#fb7185', '#818cf8', '#fbbf24', '#c084fc', '#60a5fa', '#f472b6'];

    // Build Calendar Grid
    const currentYear = viewingMonth.getFullYear();
    const currentMonth = viewingMonth.getMonth();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun
    const startDayOffset = firstDay === 0 ? 6 : firstDay - 1; // Make Monday 0
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const calendarDays = [];
    for (let i = 0; i < startDayOffset; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    // Selected transactions
    const selectedTransactions = selectedDateStr && transactionsByDateStr[selectedDateStr] 
      ? transactionsByDateStr[selectedDateStr] 
      : { total: 0, transactions: [], dateObj: null };

    return (
      <main className="px-6 max-w-md mx-auto mt-6 animate-in slide-in-from-right duration-300 pb-40">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Transactions Info</h2>
          <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-full shadow-sm ${darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
            <Wallet size={14} /> Total: ₹{stats?.total_spend?.toLocaleString() || 0}
          </div>
        </div>

        {/* Segmented Control */}
        <div className={`flex p-1.5 rounded-2xl mb-6 shadow-sm ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
           <button onClick={() => setViewMode('calendar')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${viewMode === 'calendar' ? (darkMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 shadow-md') : 'text-slate-400'}`}>Calendar</button>
           <button onClick={() => setViewMode('months')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${viewMode === 'months' ? (darkMode ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-amber-600 shadow-md') : 'text-slate-400'}`}>Months</button>
           <button onClick={() => setViewMode('pie')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${viewMode === 'pie' ? (darkMode ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-rose-600 shadow-md') : 'text-slate-400'}`}>Pie</button>
           <button onClick={() => setViewMode('graph')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${viewMode === 'graph' ? (darkMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-emerald-600 shadow-md') : 'text-slate-400'}`}>Daily</button>
        </div>

        <div className="space-y-6 animate-in fade-in duration-300">
          {viewMode === 'pie' && (
             <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-4 rounded-3xl shadow-xl shadow-slate-200/50 border`}>
                <h3 className={`font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                   <PieChart size={18} className="text-rose-500" /> Expense Breakdown
                </h3>
                <div className="h-48 w-full flex justify-center items-center">
                   {pieData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                       <RechartsPieChart>
                         <Pie
                           data={pieData}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                           stroke="none"
                         >
                           {pieData.map((_, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <RechartsTooltip 
                           contentStyle={{ 
                             borderRadius: '16px', border: 'none',
                             backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                             color: darkMode ? '#f8fafc' : '#0f172a'
                           }}
                         />
                         <Legend />
                       </RechartsPieChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="text-slate-400 text-sm">No expenses to display</div>
                   )}
                </div>
             </div>
          )}

          {viewMode === 'months' && (
             <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-4 rounded-3xl shadow-xl shadow-slate-200/50 border`}>
                <h3 className={`font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                   <TrendingUp size={18} className="text-amber-500" /> Monthly Comparison
                </h3>
                <div className="h-48 w-full">
                   {monthlyChartData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={monthlyChartData}>
                       <defs>
                         <linearGradient id="colorAmountMonthly" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={darkMode ? "#f59e0b" : "#f59e0b"} stopOpacity={0.8}/>
                           <stop offset="95%" stopColor={darkMode ? "#f59e0b" : "#f59e0b"} stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#e2e8f0"} />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12}} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12}} dx={-10} />
                       <RechartsTooltip 
                         contentStyle={{ 
                           borderRadius: '16px', border: 'none',
                           boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                           backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                           color: darkMode ? '#f8fafc' : '#0f172a'
                         }}
                       />
                       <Area type="monotone" dataKey="amount" stroke={darkMode ? "#f59e0b" : "#f59e0b"} strokeWidth={3} fillOpacity={1} fill="url(#colorAmountMonthly)" />
                     </AreaChart>
                   </ResponsiveContainer>
                   ) : (
                     <div className="text-slate-400 text-sm h-full flex items-center justify-center">No data available</div>
                   )}
                </div>
             </div>
          )}

          {viewMode === 'graph' && (
             <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-4 rounded-3xl shadow-xl shadow-slate-200/50 border`}>
                <h3 className={`font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                   <TrendingUp size={18} className="text-emerald-500" /> Spending Trends
                </h3>
                <div className="h-48 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                       <defs>
                         <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={darkMode ? "#34d399" : "#10b981"} stopOpacity={0.8}/>
                           <stop offset="95%" stopColor={darkMode ? "#34d399" : "#10b981"} stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#e2e8f0"} />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12}} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12}} dx={-10} />
                       <RechartsTooltip 
                         contentStyle={{ 
                           borderRadius: '16px', border: 'none',
                           boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                           backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                           color: darkMode ? '#f8fafc' : '#0f172a'
                         }}
                       />
                       <Area type="monotone" dataKey="amount" stroke={darkMode ? "#34d399" : "#10b981"} strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                     </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>
          )}

          {viewMode === 'calendar' && (
             <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-4 rounded-3xl shadow-xl shadow-slate-200/50 border`}>
                <div className="flex justify-between items-center mb-4">
                   <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      <Calendar size={18} className="text-indigo-500" /> {viewingMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                   </h3>
                   <div className="flex gap-2">
                     <button onClick={prevMonth} className={`p-1.5 rounded-lg active:scale-95 transition-all ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}>
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                     </button>
                     <button onClick={nextMonth} className={`p-1.5 rounded-lg active:scale-95 transition-all ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}>
                       <ChevronRight size={16} />
                     </button>
                   </div>
                </div>
                
                <div className="grid grid-cols-7 gap-2 mb-2">
                   {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                     <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{day}</div>
                   ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                   {calendarDays.map((day, i) => {
                     if (day === null) return <div key={i} className="p-2"></div>;
                     const dateKey = `${currentYear}-${currentMonth}-${day}`;
                     const hasData = transactionsByDateStr[dateKey];
                     const isSelected = selectedDateStr === dateKey;
                     const today = new Date();
                     const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
                     
                     return (
                       <button 
                         key={i} 
                         onClick={() => setSelectedDateStr(dateKey)}
                         className={`p-1.5 rounded-xl flex flex-col items-center justify-center min-h-[50px] transition-all border ${
                           isSelected 
                             ? (darkMode ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)] text-white' : 'bg-indigo-500 border-indigo-400 shadow-md shadow-indigo-500/30 text-white') 
                             : (hasData 
                                 ? (darkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100')
                                 : (darkMode ? 'bg-transparent border-transparent hover:bg-slate-800/50' : 'bg-transparent border-transparent hover:bg-slate-50')
                               )
                         } ${isToday && !isSelected ? 'ring-2 ring-indigo-400/50' : ''}`}
                       >
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : (hasData ? (darkMode ? 'text-slate-200' : 'text-slate-800') : (darkMode ? 'text-slate-500' : 'text-slate-400'))}`}>{day}</span>
                          {hasData && (
                            <span className={`text-[9px] font-black mt-0.5 leading-none ${isSelected ? 'text-indigo-100' : 'text-rose-500'}`}>
                               {hasData.total > 999 ? (hasData.total/1000).toFixed(1)+'k' : hasData.total}
                            </span>
                          )}
                       </button>
                     );
                   })}
                </div>

                {/* Selected Date Details */}
                {selectedDateStr && (
                  <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} animate-in slide-in-from-bottom-2`}>
                     <div className="flex justify-between items-center mb-4">
                        <h4 className={`font-bold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                           {selectedTransactions.dateObj ? selectedTransactions.dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </h4>
                        <div className="font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full text-xs">
                           Out: ₹{selectedTransactions.total.toLocaleString()}
                        </div>
                     </div>
                     
                     {selectedTransactions.transactions.length > 0 ? (
                       <div className="space-y-3">
                          {selectedTransactions.transactions.map((t: any) => (
                             <div key={t.id} className={`p-4 rounded-2xl border flex justify-between items-center ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-black/20" style={{color: COLORS[Object.keys(stats?.category_breakdown || {}).indexOf(t.category) % COLORS.length] || '#34d399'}}>
                                      <Wallet size={16} />
                                   </div>
                                   <div>
                                      <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>{t.description}</div>
                                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">{t.category}</div>
                                   </div>
                                </div>
                                <div className="font-black text-rose-500">-₹{t.amount}</div>
                             </div>
                          ))}
                       </div>
                     ) : (
                       <div className="text-center py-6 text-slate-400 text-sm font-medium">
                          No transactions on this day
                       </div>
                     )}
                  </div>
                )}
             </div>
          )}
        </div>
      </main>
    );
  };

  const AdvisorView = () => {
    const [query, setQuery] = useState('');
    const [chat, setChat] = useState<{role: string, text: string}[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    
    const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      const userQ = query;
      setChat(prev => [...prev, {role: 'user', text: userQ}]);
      setChatHistory(prev => [...prev, {role: 'user', text: userQ}]);
      setQuery('');
      setIsThinking(true);
      try {
        const res = await askAI(1, userQ);
        setChat(prev => [...prev, {role: 'ai', text: res.answer}]);
        setChatHistory(prev => [...prev, {role: 'ai', text: res.answer}]);
      } catch (e) {
        setChat(prev => [...prev, {role: 'ai', text: 'Sorry, I encountered an error connecting to the AI.'}]);
      } finally {
        setIsThinking(false);
      }
    };
    
    return (
      <main className="px-6 max-w-md mx-auto mt-6 animate-in slide-in-from-right duration-300 pb-48 flex flex-col min-h-[70vh]">
        <div className="flex justify-between items-center mb-6">
           <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
             <Sparkles className="text-amber-500" /> AI Advisor
           </h2>
           <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-full transition-all active:scale-95 ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}>
             <History size={20} />
           </button>
        </div>
        
        {showHistory ? (
           <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide flex flex-col p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
             <h3 className="font-bold text-slate-500 text-sm text-center mb-2 flex items-center justify-center gap-2">
               <History size={16} /> Conversation History
             </h3>
             {chatHistory.length === 0 && <p className="text-center text-sm text-slate-400 mt-10">No history yet.</p>}
             {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${msg.role === 'user' ? (darkMode ? 'bg-indigo-900 text-indigo-100' : 'bg-indigo-100 text-indigo-900') : (darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 border border-slate-200')} whitespace-pre-wrap`}>
                      {msg.text}
                   </div>
                </div>
             ))}
           </div>
        ) : (
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide flex flex-col">
          {chat.length === 0 && (
             <div className="m-auto text-center p-6 opacity-50 mt-20">
                <Sparkles size={48} className={`mx-auto mb-4 ${darkMode ? 'text-amber-500' : 'text-amber-400'}`} />
                <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ask me anything about your family's finances!</p>
             </div>
          )}
          {chat.map((msg, i) => (
             <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm ${msg.role === 'user' ? (darkMode ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-indigo-500 text-white rounded-br-sm') : (darkMode ? 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700' : 'bg-slate-100 text-slate-800 rounded-bl-sm')} whitespace-pre-wrap`}>
                   {msg.text}
                </div>
             </div>
          ))}
          {isThinking && (
             <div className="flex justify-start">
                <div className={`p-4 rounded-3xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-bl-sm flex gap-1`}>
                   <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
                   <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-75"></div>
                   <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-150"></div>
                </div>
             </div>
          )}
        </div>
        )}
        
        <form onSubmit={handleSend} className="relative mt-auto pt-2">
          <input 
             type="text" 
             value={query} 
             onChange={e => setQuery(e.target.value)} 
             placeholder="Ask about your budget..." 
             className={`w-full p-4 pr-12 rounded-2xl outline-none font-bold shadow-sm ${darkMode ? 'bg-slate-900 border border-slate-800 text-white focus:border-indigo-500' : 'bg-white border border-slate-200 focus:border-indigo-500'}`} 
          />
          <button type="submit" className="absolute right-3 top-5 p-1.5 bg-indigo-500 text-white rounded-xl shadow-md active:scale-95 transition-all">
             <ChevronRight size={16} />
          </button>
        </form>
      </main>
    );
  };

  const SettingsView = () => (
    <main className="px-6 max-w-md mx-auto mt-6 animate-in slide-in-from-right duration-300 pb-48">
      <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Settings</h2>
      
      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Users size={14} /> Family Members
        </h3>
        <div className="space-y-3">
          {familyMembers.map((member: any) => (
            <button 
              key={member.id} 
              onClick={() => setSelectedMember(member)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl premium-shadow border active:scale-95 transition-all text-left ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-white'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                  {member.name[0]}
                </div>
                <div>
                  <div className="font-bold">{member.name}</div>
                  <div className="text-[10px] text-slate-400">View History</div>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
            </button>
          ))}
          <button 
            onClick={() => setIsMemberModalOpen(true)}
            className={`w-full p-4 border-2 border-dashed rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${darkMode ? 'border-slate-800 text-slate-600 hover:bg-slate-900' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
          >
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <button className={`w-full p-4 rounded-2xl text-sm text-left font-bold flex items-center justify-between premium-shadow border active:scale-95 transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-white text-slate-800'}`}>
          Currency <span>Rupee (₹)</span>
        </button>
        
        <button 
          onClick={() => setIsBudgetModalOpen(true)}
          className={`w-full p-4 rounded-2xl text-sm text-left font-bold flex items-center justify-between premium-shadow border active:scale-95 transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-white text-slate-800'}`}
        >
          Monthly Budget Limit <span className="text-emerald-500">₹{stats?.budget_limit?.toLocaleString()}</span>
        </button>
        
        <button 
          onClick={async () => {
            if(window.confirm("Are you sure you want to clear all data?")) {
              await resetDatabase();
              alert("Database reset!");
              window.location.reload();
            }
          }}
          className={`w-full p-4 rounded-2xl text-sm text-center font-bold active:scale-95 transition-all mt-6 shadow-lg shadow-rose-500/20 ${darkMode ? 'bg-gradient-to-r from-rose-950/80 to-red-900/80 text-rose-400 border border-rose-800' : 'bg-gradient-to-r from-rose-100 to-red-50 text-rose-600 border border-rose-200 hover:from-rose-200 hover:to-red-100'}`}
        >
          Reset Database
        </button>
      </div>
    </main>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-[#FDFDFD]'}`}>
      {/* Header */}
      <header className={`p-6 flex justify-between items-center backdrop-blur-md sticky top-0 z-40 transition-colors duration-300 ${darkMode ? 'bg-slate-950/50 border-b border-slate-900' : 'bg-white/50 border-b border-slate-50'}`}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SpendWise Logo" className="w-10 h-10 object-contain rounded-xl" />
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>SpendWise</h1>
            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{familyData?.name || 'Loading...'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'settings' && (
            <>
              <button onClick={() => setIsExportModalOpen(true)} className={`p-3 rounded-2xl transition-all active:scale-90 shadow-sm ${darkMode ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-white text-emerald-500 border border-slate-200'}`} title="Export Data">
                <Download size={20} />
              </button>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 rounded-2xl transition-all active:scale-90 shadow-sm ${darkMode ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'bg-white text-indigo-500 border border-slate-200'}`}
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </>
          )}
          
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-3 rounded-2xl transition-all ${isNotificationsOpen ? (darkMode ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white') : (darkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600')}`}
          >
            <Bell size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`p-3 rounded-2xl transition-colors ${activeTab === 'settings' ? (darkMode ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white') : (darkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600')}`}
          >
            <User size={20} />
          </button>
        </div>
      </header>

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
           <div className={`w-full max-w-md rounded-[32px] p-8 animate-in slide-in-from-bottom duration-300 relative max-h-[85vh] overflow-y-auto ${darkMode ? 'bg-slate-900 text-white' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xl">
                      {selectedMember.name[0]}
                   </div>
                   <div>
                      <h2 className="text-2xl font-bold">{selectedMember.name}</h2>
                      <p className="text-xs text-slate-500">Personal History</p>
                   </div>
                </div>
                <button onClick={() => setSelectedMember(null)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className={`p-6 rounded-3xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                   <div className="text-xs font-bold text-slate-400 uppercase mb-1">Total Spent</div>
                   <div className="text-3xl font-bold">₹{allTransactions.filter(t => t.user_id === selectedMember.id).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</div>
                </div>

                <div className="space-y-4">
                   <h3 className="font-bold flex items-center gap-2">
                      <History size={18} className="text-slate-400" /> Transactions
                   </h3>
                   {allTransactions.filter(t => t.user_id === selectedMember.id).length > 0 ? (
                      <div className="space-y-3">
                         {allTransactions.filter(t => t.user_id === selectedMember.id).map((t: any) => (
                            <div key={t.id} className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                               <div className="flex justify-between items-start mb-2">
                                  <div className="font-bold">{t.description}</div>
                                  <div className="font-bold text-emerald-500">₹{t.amount}</div>
                               </div>
                               <div className="flex justify-between items-center text-[10px] text-slate-400">
                                  <div className="px-2 py-0.5 bg-slate-500/10 rounded-full font-bold uppercase">{t.category}</div>
                                  <div className="flex items-center gap-1">
                                     <Clock size={10} />
                                     {formatTime(t.timestamp)}
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <p className="text-center py-8 text-slate-400 text-sm">No transactions yet.</p>
                   )}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Notification Tray */}
      {isNotificationsOpen && (
        <div className={`fixed top-24 right-6 left-6 max-w-md mx-auto rounded-[32px] premium-shadow border z-50 p-6 animate-in slide-in-from-top-4 duration-300 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
           <div className="flex justify-between items-center mb-4">
              <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Family Activity</h3>
              <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400">
                <X size={18} />
              </button>
           </div>
           <div className="space-y-4">
             {stats?.recent_activity?.slice(0, 3).map((notif: any) => (
                <div key={notif.id} className="flex gap-3 items-start">
                   <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                      <TrendingUp size={16} />
                   </div>
                   <div className="text-sm">
                      <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{familyMembers.find((m: any) => m.id === notif.user_id)?.name}</span> 
                      <span className="text-slate-500"> logged an expense of </span>
                      <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>₹{notif.amount}</span>
                   </div>
                </div>
             ))}
             {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
               <div className="text-center py-6">
                  <BellOff size={32} className="mx-auto text-slate-800 mb-2" />
                  <p className="text-slate-500 text-xs font-bold">No new notifications</p>
               </div>
             )}
           </div>
        </div>
      )}

      {activeTab === 'home' && <HomeView />}
      {activeTab === 'analysis' && <AnalysisView />}
      {activeTab === 'transactions' && <TransactionsView />}
      {activeTab === 'settings' && <SettingsView />}
      {activeTab === 'advisor' && <AdvisorView />}

      {/* Floating Action Button */}
      {activeTab === 'home' && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className={`fixed bottom-32 right-6 p-5 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 ${darkMode ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.4)]'}`}
        >
          <Plus size={28} />
        </button>
      )}

      {/* Modals */}
      {(isModalOpen || isMemberModalOpen || isBudgetModalOpen || isExportModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-slate-900 text-white' : 'bg-white'} w-full max-w-md rounded-[32px] p-8 animate-in slide-in-from-bottom duration-300 relative`}>
            {isModalOpen && (
                <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Add Expense</h2>
                  <button onClick={() => setIsModalOpen(false)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddTransaction} className="space-y-5">
                   <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-2">Who Spent This?</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {familyMembers.map((member: any) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => setNewTransaction({...newTransaction, user_id: member.id})}
                          className={`px-5 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
                            newTransaction.user_id === member.id 
                            ? (darkMode ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white') 
                            : (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400')
                          }`}
                        >
                          {member.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="number" 
                      required 
                      className={`w-full p-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 border-none' : 'bg-slate-50 border-none'}`} 
                      placeholder="Amount (₹)"
                      value={newTransaction.amount}
                      onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})}
                    />
                    <select 
                      className={`w-full p-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 border-none' : 'bg-slate-50 border-none'}`}
                      value={newTransaction.category}
                      onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}
                    >
                      <option>Groceries</option>
                      <option>Utilities</option>
                      <option>Dining</option>
                      <option>Transport</option>
                      <option>Healthcare</option>
                      <option>Entertainment</option>
                      <option>Shopping</option>
                    </select>
                  </div>
                  <input 
                    type="text" 
                    required 
                    className={`w-full p-4 rounded-2xl ${darkMode ? 'bg-slate-800 border-none' : 'bg-slate-50 border-none'}`} 
                    placeholder="Description"
                    value={newTransaction.description}
                    onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                  />
                  <button type="submit" className={`w-full py-5 rounded-2xl font-bold mt-4 ${darkMode ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>Log Transaction</button>
                </form>
                </>
            )}
            
            {isMemberModalOpen && (
               <div className="text-center">
                  <h3 className="text-xl font-bold mb-6">Add Family Member</h3>
                  <form onSubmit={handleAddMember}>
                    <input 
                      type="text" 
                      required 
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Name" 
                      className={`w-full p-4 rounded-2xl mb-4 ${darkMode ? 'bg-slate-800 border-none' : 'bg-slate-50 border-none'}`} 
                    />
                    <button type="submit" className={`w-full py-4 rounded-2xl font-bold ${darkMode ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>Add Now</button>
                  </form>
                  <button onClick={() => setIsMemberModalOpen(false)} className="w-full py-4 text-slate-400 font-bold mt-2">Cancel</button>
               </div>
            )}

            {isBudgetModalOpen && (
               <div className="text-center">
                  <h3 className="text-xl font-bold mb-6">Set Budget</h3>
                  <form onSubmit={handleUpdateBudget}>
                    <input 
                      type="number" 
                      required 
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      placeholder="₹" 
                      className={`w-full p-4 rounded-2xl mb-4 text-lg font-bold ${darkMode ? 'bg-slate-800 border-none' : 'bg-slate-50 border-none'}`} 
                    />
                    <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold">Save</button>
                  </form>
                  <button onClick={() => setIsBudgetModalOpen(false)} className="w-full py-4 text-slate-400 font-bold mt-2">Cancel</button>
               </div>
            )}

            {isExportModalOpen && (
               <div className="text-center">
                  <h3 className="text-xl font-bold mb-6">Export Options</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => { downloadCSV(); setIsExportModalOpen(false); }} 
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm ${darkMode ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-white text-emerald-600 border border-slate-200'}`}
                    >
                      <FileText size={20} /> Download as CSV (Excel)
                    </button>
                    <button 
                      onClick={() => { downloadPDF(); setIsExportModalOpen(false); }} 
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm ${darkMode ? 'bg-slate-800 text-rose-400 border border-slate-700' : 'bg-white text-rose-600 border border-slate-200'}`}
                    >
                      <FileDown size={20} /> Download as PDF
                    </button>
                  </div>
                  <button onClick={() => setIsExportModalOpen(false)} className="w-full py-4 text-slate-400 font-bold mt-4">Cancel</button>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className={`fixed bottom-6 left-6 right-6 h-20 backdrop-blur-xl border rounded-[32px] shadow-2xl flex items-center justify-around px-4 z-30 transition-all duration-300 ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-black/40' : 'bg-white/90 border-slate-100 shadow-slate-200'}`}>
        <button 
          onClick={() => setActiveTab('home')}
          className={`p-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? (darkMode ? 'text-emerald-400' : 'text-slate-900') : 'text-slate-400'}`}
        >
          <Home size={24} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          className={`p-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'analysis' ? (darkMode ? 'text-emerald-400' : 'text-slate-900') : 'text-slate-400'}`}
        >
          <PieChart size={24} />
          <span className="text-[10px] font-bold">Analysis</span>
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`p-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'transactions' ? (darkMode ? 'text-emerald-400' : 'text-slate-900') : 'text-slate-400'}`}
        >
          <Wallet size={24} />
          <span className="text-[10px] font-bold">Transactions</span>
        </button>
        <button 
          onClick={() => setActiveTab('advisor')}
          className={`p-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'advisor' ? (darkMode ? 'text-emerald-400' : 'text-slate-900') : 'text-slate-400'}`}
        >
          <Sparkles size={24} />
          <span className="text-[10px] font-bold">Advisor</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`p-4 flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? (darkMode ? 'text-emerald-400' : 'text-slate-900') : 'text-slate-400'}`}
        >
          <Settings size={24} />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
