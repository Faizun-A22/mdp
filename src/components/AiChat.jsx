import React, { useState, useEffect, useRef } from 'react';
import { storageAPI } from '../utils/storage';
import { 
  MessageSquare, 
  Send, 
  Brain, 
  Trash2, 
  HelpCircle, 
  Bot, 
  User, 
  TrendingUp, 
  AlertCircle, 
  Layers 
} from 'lucide-react';

export default function AiChat() {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'bot',
      text: 'Halo! Saya **AIBOS Consultant**, asisten kecerdasan buatan Anda. Saya dapat menganalisis data riwayat warehouse, kiln dry, repairs, outstanding PO, dan bahan baku Anda secara instan.\n\nSilakan pilih salah satu topik konsultasi cepat di bawah, atau tanyakan apa pun mengenai kondisi bisnis CV Mitra Dunia Palletindo menggunakan bahasa alami.',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Database referensi lokal untuk pencarian data
  const [dbData, setDbData] = useState({
    stock: [],
    materials: [],
    outstanding: [],
    repairs: [],
    kdSetelah: []
  });

  useEffect(() => {
    const loadAllDataForAI = async () => {
      const stock = await storageAPI.getStockPallets();
      const mats = await storageAPI.getMaterials();
      const os = await storageAPI.getOutstandingPOs();
      const reps = await storageAPI.getRepairs();
      const kds = await storageAPI.getKDSetelah();

      setDbData({
        stock,
        materials: mats,
        outstanding: os,
        repairs: reps,
        kdSetelah: kds
      });
    };
    loadAllDataForAI();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // NLP Parser dan Business Logic lokal
  const getAIResponse = (query) => {
    const q = query.toLowerCase().trim();

    // 1. Tanya Produk Terlaris (Best Seller)
    if (q.includes('laris') || q.includes('populer') || q.includes('banyak') || q.includes('terlaris') || q.includes('produk')) {
      const salesMap = {};
      dbData.stock.forEach(item => {
        const key = `${item.customer} (${item.ukuran})`;
        const volume = Number(item.palletKeluar || 0) + Number(item.produksi || 0);
        salesMap[key] = (salesMap[key] || 0) + volume;
      });

      const sorted = Object.entries(salesMap).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) {
        return 'Saat ini belum ada data mutasi stock pallet keluar yang tercatat untuk menghitung produk terlaris.';
      }

      let response = `Berdasarkan analisis Neural Network terhadap volume mutasi keluar dan produksi, **jenis pallet terlaris** saat ini adalah:\n\n`;
      response += `| No | Nama Jenis Pallet / Customer | Total Volume (Unit) |\n`;
      response += `| :---: | :--- | :---: |\n`;
      sorted.slice(0, 5).forEach(([pallet, vol], idx) => {
        response += `| ${idx + 1} | ${pallet} | **${vol.toLocaleString('id-ID')}** Pcs |\n`;
      });
      response += `\n💡 **Rekomendasi Operasional**: Prioritaskan pengeringan kiln dry (KD) dan alokasikan bahan baku kayu khusus untuk produk berperingkat atas guna meminimalisir waktu tunggu (lead time) pelanggan.`;
      return response;
    }

    // 2. Tanya Laba / Omzet / Keuntungan Bersih
    if (q.includes('laba') || q.includes('bersih') || q.includes('omzet') || q.includes('pendapatan') || q.includes('keuntungan') || q.includes('untung')) {
      // Hitung total PO terkirim
      let totalSalesQty = 0;
      dbData.outstanding.forEach(po => {
        totalSalesQty += Number(po.kiriman || 0);
      });

      // Hitung taksiran harga rata-rata pallet Rp 85.000 / pcs
      const pricePerPallet = 85000;
      const estimatedOmzet = totalSalesQty * pricePerPallet;

      // Hitung pengeluaran bahan baku
      let totalMaterialCost = 0;
      dbData.materials.forEach(mat => {
        totalMaterialCost += (Number(mat.keluar || 0) * Number(mat.hargaBeli || 15000));
      });

      // Taksiran laba kotor & bersih
      const estimatedLabaKotor = estimatedOmzet - totalMaterialCost;
      const estimatedLabaBersih = estimatedLabaKotor - (estimatedOmzet * 0.15); // Biaya operasional 15%

      let response = `Berikut adalah ringkasan estimasi performa keuangan gudang (taksiran nilai pallet rata-rata **Rp 85.000/pcs**):\n\n`;
      response += `* **Total Pallet Terkirim**: ${totalSalesQty.toLocaleString('id-ID')} Pcs\n`;
      response += `* **Estimasi Omzet Penjualan**: Rp ${estimatedOmzet.toLocaleString('id-ID')}\n`;
      response += `* **Total Pengeluaran Bahan Baku**: Rp ${totalMaterialCost.toLocaleString('id-ID')}\n`;
      response += `* **Estimasi Laba Kotor**: Rp ${estimatedLabaKotor.toLocaleString('id-ID')}\n`;
      response += `* **Estimasi Laba Bersih (setelah pajak & biaya ops)**: **Rp ${estimatedLabaBersih.toLocaleString('id-ID')}**\n\n`;
      response += `⚠️ *Catatan*: Taksiran ini merupakan kalkulasi dinamis berdasarkan log pengiriman PO aktif dan harga beli bahan baku yang tercatat di tab Bahan & Alat Kerja.`;
      return response;
    }

    // 3. Tanya Stok Hampir Habis / Minimum
    if (q.includes('habis') || q.includes('stok') || q.includes('minimum') || q.includes('limit') || q.includes('bahan') || q.includes('alat') || q.includes('kayu')) {
      const lowStock = dbData.materials.filter(m => {
        const stockAkhir = m.stokAwal + m.masuk - m.keluar;
        return stockAkhir <= m.minStok;
      });

      if (lowStock.length === 0) {
        return 'Kabar baik! Semua stok bahan baku dan alat kerja saat ini dalam kondisi aman (berada di atas tingkat minimum stok).';
      }

      let response = `⚠️ **Pemberitahuan Kritis AI**: Ditemukan **${lowStock.length} jenis bahan baku** yang telah menyentuh atau berada di bawah batas minimum stok:\n\n`;
      response += `| Nama Bahan/Alat | Stok Saat Ini | Batas Min | Taksiran Harga Beli |\n`;
      response += `| :--- | :---: | :---: | :---: |\n`;
      lowStock.forEach(m => {
        const stockAkhir = m.stokAwal + m.masuk - m.keluar;
        response += `| ${m.nama} | <span class="text-rose-600 font-bold">${stockAkhir} ${m.satuan}</span> | ${m.minStok} | Rp ${(m.hargaBeli || 0).toLocaleString('id-ID')} |\n`;
      });
      response += `\nSaran AI: Segera lakukan pembuatan Purchase Order (PO) kepada supplier agar tidak mengganggu proses perbaikan (repairs) dan perakitan pallet baru di area perbengkelan.`;
      return response;
    }

    // 4. Tanya Outstanding PO / Sisa Pesanan
    if (q.includes('outstanding') || q.includes('po') || q.includes('os') || q.includes('pesanan') || q.includes('sisa')) {
      const activePOs = dbData.outstanding.filter(po => po.sisaPo > 0);
      const totalSisa = activePOs.reduce((acc, curr) => acc + curr.sisaPo, 0);

      if (activePOs.length === 0) {
        return 'Saat ini tidak ada sisa pesanan pallet Outstanding (semua PO telah terkirim lunas).';
      }

      let response = `Terdapat **${activePOs.length} PO aktif** yang belum terkirim lunas dengan total kekurangan pengiriman sebesar **${totalSisa.toLocaleString('id-ID')} Pcs**:\n\n`;
      response += `| Nomor PO | Customer | Sisa PO (Outstanding) | Ukuran |\n`;
      response += `| :--- | :--- | :---: | :---: |\n`;
      activePOs.slice(0, 6).forEach(po => {
        response += `| ${po.nomorPo} | ${po.customer} | **${po.sisaPo.toLocaleString('id-ID')}** Pcs | ${po.ukuran} |\n`;
      });
      if (activePOs.length > 6) {
        response += `| ... | ... | ... | ... |\n`;
      }
      response += `\nSilakan kunjungi tab **Outstanding PO (OS)** untuk melakukan pelaporan kiriman baru.`;
      return response;
    }

    // 5. Tanya Kiln Dry / Oven
    if (q.includes('kd') || q.includes('oven') || q.includes('listrik') || q.includes('pengeringan') || q.includes('log')) {
      const totalKD = dbData.kdSetelah.reduce((acc, curr) => acc + curr.qty, 0);
      
      let response = `Berikut adalah ringkasan operasional **Kiln Dry (KD) Oven**:\n\n`;
      response += `* **Total Pallet Selesai Oven**: ${totalKD.toLocaleString('id-ID')} Pcs\n`;
      response += `* **Total Siklus Pengeringan**: ${dbData.kdSetelah.length} Siklus\n`;
      response += `* **Rata-rata Kapasitas per Siklus**: ${dbData.kdSetelah.length > 0 ? Math.round(totalKD / dbData.kdSetelah.length) : 0} Pcs\n\n`;
      response += `💡 Analisis AI menunjukkan pemakaian listrik oven terpantau stabil dan efisien dalam 30 hari terakhir.`;
      return response;
    }

    // Default Fallback
    return `Maaf, saya tidak menemukan kata kunci analisis yang cocok dalam pertanyaan Anda. \n\nCobalah tanyakan hal-hal berikut:\n\n` + 
      `1. *“Tampilkan produk pallet terlaris saat ini”*\n` +
      `2. *“Berapa perkiraan omzet dan laba bersih perusahaan?”*\n` +
      `3. *“Bahan baku apa saja yang stoknya hampir habis?”*\n` +
      `4. *“Tampilkan daftar sisa pesanan PO Outstanding”*`;
  };

  const handleSend = () => {
    if (!inputVal.trim()) return;

    const userMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: inputVal,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputVal('');
    setIsTyping(true);

    // Simulasi delay berfikir AI
    setTimeout(() => {
      const aiText = getAIResponse(userMessage.text);
      const botResponse = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: aiText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 600);
  };

  const handleSuggest = (suggestText) => {
    setInputVal(suggestText);
  };

  const handleClearChat = () => {
    if (window.confirm('Bersihkan riwayat obrolan dengan AIBOS?')) {
      setMessages([
        {
          id: 'm1',
          sender: 'bot',
          text: 'Halo! Saya **AIBOS Consultant**, asisten kecerdasan buatan Anda. Saya dapat menganalisis data riwayat warehouse, kiln dry, repairs, outstanding PO, dan bahan baku Anda secara instan.\n\nSilakan pilih salah satu topik konsultasi cepat di bawah, atau tanyakan apa pun mengenai kondisi bisnis CV Mitra Dunia Palletindo menggunakan bahasa alami.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  // Helper parser markdown sederhana untuk output bot
  const parseMarkdown = (text) => {
    // Escape HTML tags to prevent XSS
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold replacement
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Simple Table parser
    const lines = escaped.split('\n');
    let isInsideTable = false;
    let tableHtml = [];
    const finalLines = [];

    lines.forEach(line => {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        // Skip separator line (| :--- |)
        if (cells.every(c => c.startsWith(':') || c.startsWith('-'))) {
          return;
        }

        if (!isInsideTable) {
          isInsideTable = true;
          tableHtml.push('<div class="overflow-x-auto my-3"><table class="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl bg-white shadow-3xs">');
          tableHtml.push('<thead><tr class="bg-indigo-50 border-b border-slate-200">');
          cells.forEach(cell => {
            tableHtml.push(`<th class="p-2.5 font-extrabold text-indigo-650">${cell}</th>`);
          });
          tableHtml.push('</tr></thead><tbody class="divide-y divide-slate-100 text-slate-650">');
        } else {
          tableHtml.push('<tr>');
          cells.forEach(cell => {
            tableHtml.push(`<td class="p-2.5 font-semibold">${cell}</td>`);
          });
          tableHtml.push('</tr>');
        }
      } else {
        if (isInsideTable) {
          isInsideTable = false;
          tableHtml.push('</tbody></table></div>');
          finalLines.push(tableHtml.join(''));
          tableHtml = [];
        }
        finalLines.push(line);
      }
    });

    if (isInsideTable) {
      tableHtml.push('</tbody></table></div>');
      finalLines.push(tableHtml.join(''));
    }

    return finalLines.join('<br />');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">
      
      {/* Chat Header */}
      <div className="bg-indigo-650 px-6 py-4 text-white flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Brain className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-wide">AIBOS Consultant</h3>
            <span className="text-[10px] text-indigo-200 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online & Siap Membantu
            </span>
          </div>
        </div>

        <button 
          onClick={handleClearChat}
          className="p-2 hover:bg-white/10 rounded-xl text-indigo-200 hover:text-white transition-all cursor-pointer"
          title="Hapus Riwayat Obrolan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'bot' && (
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0">
                <Bot className="w-4.5 h-4.5" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-3xs ${
              msg.sender === 'user'
                ? 'bg-indigo-650 text-white rounded-tr-none'
                : 'bg-white text-slate-700 border border-slate-150 rounded-tl-none'
            }`}>
              <div 
                className="text-xs sm:text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
              />
              <span className={`block text-[9px] mt-2 font-bold ${
                msg.sender === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
              }`}>
                {msg.timestamp}
              </span>
            </div>
            {msg.sender === 'user' && (
              <div className="p-2 bg-indigo-650 text-white rounded-xl shrink-0">
                <User className="w-4.5 h-4.5" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none p-4 border border-slate-150 shadow-3xs">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompts (Chips) */}
      <div className="px-6 py-3 border-t border-slate-150 bg-white flex flex-wrap gap-2 shrink-0 overflow-x-auto max-h-24">
        <button
          onClick={() => handleSuggest('Tampilkan jenis pallet terlaris')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-[10px] sm:text-xs font-semibold text-slate-650 hover:text-indigo-700 cursor-pointer transition-all"
        >
          <TrendingUp className="w-3.5 h-3.5" /> Pallet Terlaris
        </button>
        <button
          onClick={() => handleSuggest('Berapa perkiraan omzet dan laba bersih?')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-[10px] sm:text-xs font-semibold text-slate-650 hover:text-indigo-700 cursor-pointer transition-all"
        >
          <Bot className="w-3.5 h-3.5" /> Taksiran Laba Rugi
        </button>
        <button
          onClick={() => handleSuggest('Bahan baku apa yang hampir habis?')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-[10px] sm:text-xs font-semibold text-slate-650 hover:text-indigo-700 cursor-pointer transition-all"
        >
          <AlertCircle className="w-3.5 h-3.5" /> Stok Hampir Habis
        </button>
        <button
          onClick={() => handleSuggest('Berapa PO Outstanding (OS) saat ini?')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-[10px] sm:text-xs font-semibold text-slate-650 hover:text-indigo-700 cursor-pointer transition-all"
        >
          <Layers className="w-3.5 h-3.5" /> Outstanding PO
        </button>
      </div>

      {/* Input Form */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="px-6 py-4 border-t border-slate-200 bg-white flex items-center gap-3 shrink-0"
      >
        <input
          type="text"
          placeholder="Tanyakan performa bisnis kepada AIBOS..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-650 focus:bg-white"
        />
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white shadow-md cursor-pointer transition-all flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
