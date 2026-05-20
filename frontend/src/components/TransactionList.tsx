import React from 'react';
import { ShoppingCart, Lightbulb, Utensils, Car, Film, Banknote, Clock, User } from 'lucide-react';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  category: string;
  timestamp: string;
  user_name?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  darkMode?: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Groceries': return <ShoppingCart size={18} />;
    case 'Utilities': return <Lightbulb size={18} />;
    case 'Dining': return <Utensils size={18} />;
    case 'Transport': return <Car size={18} />;
    case 'Entertainment': return <Film size={18} />;
    default: return <Banknote size={18} />;
  }
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, darkMode }) => {
  // Helper to format time correctly for Indian locale
  const formatTime = (ts: string) => {
    // Ensure the date is treated as UTC if it doesn't specify a timezone
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

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Activity</h3>
        <button className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">See all</button>
      </div>
      
      <div className="space-y-4">
        {transactions.map((t) => (
          <div 
            key={t.id} 
            className={`flex items-center justify-between p-4 rounded-3xl premium-shadow border transition-all duration-300 active:scale-[0.98] ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${
                t.category === 'Groceries' ? 'bg-pastel-green text-emerald-700' : 
                t.category === 'Dining' ? 'bg-pastel-red text-rose-700' : 
                t.category === 'Utilities' ? 'bg-pastel-blue text-blue-700' : 'bg-pastel-yellow text-amber-700'
              }`}>
                {getCategoryIcon(t.category)}
              </div>
              <div>
                <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{t.description}</div>
                <div className="flex items-center gap-2 mt-0.5">
                   {t.user_name && (
                     <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full">
                        <User size={8} /> {t.user_name}
                     </div>
                   )}
                   <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={10} /> {formatTime(t.timestamp)}
                   </div>
                </div>
              </div>
            </div>
            <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              ₹{t.amount.toLocaleString()}
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-slate-400 font-medium italic">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
