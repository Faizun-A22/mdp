import React, { useState, useEffect, useRef } from 'react';
import { storageAPI } from '../utils/storage';
import { Plus, Search, Trash2, Edit3, X, FileSpreadsheet, Download, Check, AlertCircle, Info, Send, RefreshCw, Loader2, Link, ChevronLeft, Calendar, FileText, BarChart2, Image, Undo } from 'lucide-react';

export default function Outstanding({ user }) {
  const [data, setData] = useState([]);
  const [palletTypes, setPalletTypes] = useState([]);
  const [search, setSearch] = useState('');
  
  // Selected Pallet Type/Batch to view details (CRUD)
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Filter state
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'report'

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isKirimanModalOpen, setIsKirimanModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  
  // Form State - Tambah PO
  const [formData, setFormData] = useState({
    batchId: '',
    tanggal: new Date().toISOString().split('T')[0],
    tanggalKirim: '',
    customer: '',
    nomorPo: '',
    noReff: '',
    ukuran: '',
    jumlahPo: 0,
    kiriman: 0,
    retur: 0
  });

  // Form State - Edit PO
  const [editingItem, setEditingItem] = useState(null);

  // Form State - Input Kiriman Baru
  const [kirimanItem, setKirimanItem] = useState(null);
  const [newKirimanVal, setNewKirimanVal] = useState(0);

  // Form State - Input Retur Baru
  const [isReturModalOpen, setIsReturModalOpen] = useState(false);
  const [returItem, setReturItem] = useState(null);
  const [newReturVal, setNewReturVal] = useState(0);
  const [newNoReffVal, setNewNoReffVal] = useState('');
  const [newTanggalKirimVal, setNewTanggalKirimVal] = useState(new Date().toISOString().split('T')[0]);

  // Searchable pallet combobox state
  const [palletSearchAdd, setPalletSearchAdd] = useState('');
  const [showPalletDropAdd, setShowPalletDropAdd] = useState(false);
  const [palletSearchEdit, setPalletSearchEdit] = useState('');
  const [showPalletDropEdit, setShowPalletDropEdit] = useState(false);

  // Inline edit delivery state (Rincian modal)
  const [editingDeliveryId, setEditingDeliveryId] = useState(null);
  const [editDeliveryDraft, setEditDeliveryDraft] = useState({ tanggalKirim: '', noReff: '', qtyKirim: 0 });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const pos = await storageAPI.getOutstandingPOs();
    const types = await storageAPI.getPalletTypes();
    let dels = await storageAPI.getDeliveries();

    // Self-healing: if any PO has kiriman > 0 but no deliveries exist for it, create a mock delivery record
    let newDelsAdded = false;
    const updatedDels = [...dels];
    pos.forEach(po => {
      if (po.kiriman > 0) {
        const hasDelivery = updatedDels.some(d => d.poId === po.id);
        if (!hasDelivery) {
          updatedDels.push({
            id: 'del_heal_' + po.id,
            poId: po.id,
            tanggalKirim: po.tanggalKirim || po.tanggal || new Date().toISOString().split('T')[0],
            noReff: po.noReff || '',
            qtyKirim: po.kiriman
          });
          newDelsAdded = true;
        }
      }
    });

    if (newDelsAdded) {
      dels = updatedDels;
      await storageAPI.saveDeliveries(dels);
    }

    setData(pos);
    setPalletTypes(types);
    setDeliveries(dels);
    if (types.length > 0) {
      setFormData(prev => ({
        ...prev,
        ukuran: types[0].ukuran,
        customer: types[0].nama
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        ukuran: '1000x1200 mm'
      }));
    }
  };

  const isAdmin = user?.role === 'admin';

  // Helper to extract unique years from data
  const getUniqueYears = () => {
    const years = new Set();
    data.forEach(item => {
      if (item.tanggal) {
        const y = item.tanggal.substring(0, 4);
        if (y && !isNaN(Number(y))) {
          years.add(y);
        }
      }
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort((a, b) => b - a);
  };

  // Group data by batchId (Jenis Pallet)
  const getBatches = () => {
    const groups = {};
    
    // Filter data berdasarkan search, bulan, dan tahun
    const filtered = data.filter(item => {
      // 1. Text Search
      const q = search.toLowerCase();
      const matchesSearch = (
        item.customer.toLowerCase().includes(q) ||
        item.nomorPo.toLowerCase().includes(q) ||
        item.ukuran.toLowerCase().includes(q) ||
        (item.batchId && item.batchId.toLowerCase().includes(q))
      );

      // 2. Month Filter
      let matchesMonth = true;
      if (filterMonth !== 'all' && item.tanggal) {
        matchesMonth = item.tanggal.substring(5, 7) === filterMonth;
      }

      // 3. Year Filter
      let matchesYear = true;
      if (filterYear !== 'all' && item.tanggal) {
        matchesYear = item.tanggal.substring(0, 4) === filterYear;
      }

      return matchesSearch && matchesMonth && matchesYear;
    });

    filtered.forEach(item => {
      const bId = item.batchId || 'Lainnya';
      if (!groups[bId]) {
        groups[bId] = [];
      }
      groups[bId].push(item);
    });

    return groups;
  };

  // Get all active POs across all batches where sisaPo > 0, filtered by search and month/year
  const getOutstandingPOsList = () => {
    return data.filter(item => {
      if (item.sisaPo <= 0) return false;

      const q = search.toLowerCase();
      const matchesSearch = (
        item.customer.toLowerCase().includes(q) ||
        item.nomorPo.toLowerCase().includes(q) ||
        item.ukuran.toLowerCase().includes(q) ||
        (item.batchId && item.batchId.toLowerCase().includes(q))
      );

      let matchesMonth = true;
      if (filterMonth !== 'all' && item.tanggal) {
        matchesMonth = item.tanggal.substring(5, 7) === filterMonth;
      }

      let matchesYear = true;
      if (filterYear !== 'all' && item.tanggal) {
        matchesYear = item.tanggal.substring(0, 4) === filterYear;
      }

      return matchesSearch && matchesMonth && matchesYear;
    }).sort((a, b) => {
      const nameCompare = a.customer.localeCompare(b.customer, 'id', { sensitivity: 'base' });
      if (nameCompare !== 0) return nameCompare;
      return new Date(a.tanggal) - new Date(b.tanggal);
    });
  };

  const handleCreateNewBatch = () => {
    const newBatchName = prompt("Masukkan nama Jenis Pallet / Kotak baru:", `GREENCORE`);
    if (!newBatchName) return;

    setFormData(prev => ({
      ...prev,
      batchId: newBatchName,
      customer: newBatchName, // Mapped to customer column in DB
      ukuran: palletTypes[0]?.ukuran || '1000x1200 mm',
      nomorPo: '',
      jumlahPo: 0,
      kiriman: 0
    }));
    setSelectedBatch(newBatchName);
    setIsModalOpen(true);
  };

  const handleSavePO = async (e) => {
    e.preventDefault();
    const poId = 'os_' + Date.now();
    const newItem = {
      id: poId,
      batchId: selectedBatch || formData.batchId || `Batch PO`,
      tanggal: formData.tanggal,
      tanggalKirim: formData.tanggalKirim || '',
      customer: formData.customer || selectedBatch || 'PT Unknown',
      nomorPo: formData.nomorPo,
      noReff: formData.noReff || '',
      ukuran: formData.ukuran,
      jumlahPo: Number(formData.jumlahPo),
      kiriman: Number(formData.kiriman),
      kirimanAwal: Number(formData.kiriman), // Base kiriman manual
      sisaPo: Number(formData.jumlahPo) - Number(formData.kiriman),
      retur: Number(formData.retur || 0)
    };

    // Save POs FIRST (so FK constraint is satisfied before deliveries)
    const updated = [newItem, ...data];
    setData(updated);
    await storageAPI.saveOutstandingPOs(updated);

    // THEN save deliveries
    let updatedDeliveries = [...deliveries];
    if (newItem.kiriman > 0) {
      updatedDeliveries.push({
        id: 'del_' + Date.now() + '_init',
        poId: poId,
        tanggalKirim: newItem.tanggalKirim || newItem.tanggal || new Date().toISOString().split('T')[0],
        noReff: newItem.noReff || '',
        qtyKirim: newItem.kiriman
      });
      setDeliveries(updatedDeliveries);
      await storageAPI.saveDeliveries(updatedDeliveries);
    }

    setIsModalOpen(false);
    setPalletSearchAdd('');
    
    // Reset form
    setFormData(prev => ({
      ...prev,
      nomorPo: '',
      noReff: '',
      tanggalKirim: '',
      jumlahPo: 0,
      kiriman: 0,
      retur: 0
    }));
  };

  const handleUpdatePO = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const jumlahPo = Number(editingItem.jumlahPo);
    const kiriman = Number(editingItem.kiriman);
    const retur = Number(editingItem.retur || 0);

    let updatedDeliveries = [...deliveries];
    const poDels = updatedDeliveries.filter(d => d.poId === editingItem.id);

    if (poDels.length === 0) {
      if (kiriman > 0) {
        updatedDeliveries.push({
          id: 'del_edit_init_' + editingItem.id,
          poId: editingItem.id,
          tanggalKirim: editingItem.tanggalKirim || editingItem.tanggal || new Date().toISOString().split('T')[0],
          noReff: editingItem.noReff || '',
          qtyKirim: kiriman
        });
      }
    } else if (poDels.length === 1 && (poDels[0].id.includes('init') || poDels[0].id.includes('heal') || poDels[0].id.includes('edit_init'))) {
      updatedDeliveries = updatedDeliveries.map(d => {
        if (d.id === poDels[0].id) {
          return {
            ...d,
            qtyKirim: kiriman,
            noReff: editingItem.noReff || '',
            tanggalKirim: editingItem.tanggalKirim || d.tanggalKirim
          };
        }
        return d;
      });
    }

    setDeliveries(updatedDeliveries);
    await storageAPI.saveDeliveries(updatedDeliveries);

    const finalPoDels = updatedDeliveries.filter(d => d.poId === editingItem.id);
    const finalKiriman = finalPoDels.reduce((sum, d) => sum + d.qtyKirim, 0) || kiriman;
    const uniqueRefs = Array.from(new Set(finalPoDels.map(d => d.noReff).filter(Boolean))).join(', ') || editingItem.noReff;
    const sortedPoDels = [...finalPoDels].sort((a, b) => new Date(b.tanggalKirim) - new Date(a.tanggalKirim));
    const latestTglKirim = sortedPoDels.length > 0 ? sortedPoDels[0].tanggalKirim : editingItem.tanggalKirim;

    const updated = data.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...editingItem,
          jumlahPo,
          kiriman: finalKiriman,
          kirimanAwal: finalKiriman,
          sisaPo: Math.max(0, jumlahPo - finalKiriman),
          retur,
          noReff: uniqueRefs,
          tanggalKirim: latestTglKirim
        };
      }
      return item;
    });

    setData(updated);
    await storageAPI.saveOutstandingPOs(updated);
    setIsEditModalOpen(false);
    setEditingItem(null);
    setPalletSearchEdit('');
  };

  const handleAddKiriman = async (e) => {
    e.preventDefault();
    if (!kirimanItem) return;

    // 1. Buat record pengiriman baru
    const newDelivery = {
      id: 'del_' + Date.now(),
      poId: kirimanItem.id,
      tanggalKirim: newTanggalKirimVal || new Date().toISOString().split('T')[0],
      noReff: newNoReffVal.trim(),
      qtyKirim: Number(newKirimanVal)
    };

    // 2. Simpan ke state dan database
    const updatedDeliveries = [newDelivery, ...deliveries];
    setDeliveries(updatedDeliveries);
    await storageAPI.saveDeliveries(updatedDeliveries);

    // 3. Hitung ulang total kiriman & sisa PO induk
    const poDels = updatedDeliveries.filter(d => d.poId === kirimanItem.id);
    const totalKiriman = poDels.filter(d => d.qtyKirim > 0).reduce((sum, d) => sum + d.qtyKirim, 0);
    const totalRetur = poDels.filter(d => d.qtyKirim < 0).reduce((sum, d) => sum + Math.abs(d.qtyKirim), 0);
    const uniqueRefs = Array.from(new Set(poDels.map(d => d.noReff).filter(Boolean))).join(', ');
    
    // Cari tanggal kirim terbaru
    const sortedPoDels = [...poDels].sort((a, b) => new Date(b.tanggalKirim) - new Date(a.tanggalKirim));
    const latestTglKirim = sortedPoDels.length > 0 ? sortedPoDels[0].tanggalKirim : '';

    const updatedPOs = data.map(item => {
      if (item.id === kirimanItem.id) {
        return {
          ...item,
          kiriman: totalKiriman,
          kirimanAwal: totalKiriman,
          retur: totalRetur,
          sisaPo: Math.max(0, Number(item.jumlahPo) - totalKiriman + totalRetur),
          noReff: uniqueRefs,
          tanggalKirim: latestTglKirim || item.tanggalKirim
        };
      }
      return item;
    });

    setData(updatedPOs);
    await storageAPI.saveOutstandingPOs(updatedPOs);

    setIsKirimanModalOpen(false);
    setKirimanItem(null);
    setNewKirimanVal(0);
    setNewNoReffVal('');
    setNewTanggalKirimVal(new Date().toISOString().split('T')[0]);
  };

  const handleAddRetur = async (e) => {
    e.preventDefault();
    if (!returItem) return;

    // 1. Buat record retur baru (qtyKirim bernilai negatif)
    const newDelivery = {
      id: 'del_' + Date.now(),
      poId: returItem.id,
      tanggalKirim: newTanggalKirimVal || new Date().toISOString().split('T')[0],
      noReff: newNoReffVal.trim(),
      qtyKirim: -Number(newReturVal)
    };

    // 2. Simpan ke state dan database
    const updatedDeliveries = [newDelivery, ...deliveries];
    setDeliveries(updatedDeliveries);
    await storageAPI.saveDeliveries(updatedDeliveries);

    // 3. Hitung ulang total kiriman, retur & sisa PO induk
    const poDels = updatedDeliveries.filter(d => d.poId === returItem.id);
    const totalKiriman = poDels.filter(d => d.qtyKirim > 0).reduce((sum, d) => sum + d.qtyKirim, 0);
    const totalRetur = poDels.filter(d => d.qtyKirim < 0).reduce((sum, d) => sum + Math.abs(d.qtyKirim), 0);
    const uniqueRefs = Array.from(new Set(poDels.map(d => d.noReff).filter(Boolean))).join(', ');
    
    // Cari tanggal kirim terbaru
    const sortedPoDels = [...poDels].sort((a, b) => new Date(b.tanggalKirim) - new Date(a.tanggalKirim));
    const latestTglKirim = sortedPoDels.length > 0 ? sortedPoDels[0].tanggalKirim : '';

    const updatedPOs = data.map(item => {
      if (item.id === returItem.id) {
        return {
          ...item,
          kiriman: totalKiriman,
          kirimanAwal: totalKiriman,
          retur: totalRetur,
          sisaPo: Math.max(0, Number(item.jumlahPo) - totalKiriman + totalRetur),
          noReff: uniqueRefs,
          tanggalKirim: latestTglKirim || item.tanggalKirim
        };
      }
      return item;
    });

    setData(updatedPOs);
    await storageAPI.saveOutstandingPOs(updatedPOs);

    setIsReturModalOpen(false);
    setReturItem(null);
    setNewReturVal(0);
    setNewNoReffVal('');
    setNewTanggalKirimVal(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus PO ini?")) return;
    const updated = data.filter(item => item.id !== id);
    setData(updated);
    await storageAPI.saveOutstandingPOs(updated);

    const updatedDeliveries = deliveries.filter(d => d.poId !== id);
    setDeliveries(updatedDeliveries);
    await storageAPI.saveDeliveries(updatedDeliveries);
  };



  const handleDeleteDelivery = async (deliveryId, poId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pengiriman/retur ini?")) return;

    // 1. Filter out the deleted delivery
    const updatedDeliveries = deliveries.filter(d => d.id !== deliveryId);
    setDeliveries(updatedDeliveries);
    await storageAPI.saveDeliveries(updatedDeliveries);

    // 2. Recalculate parent PO metrics
    const poDels = updatedDeliveries.filter(d => d.poId === poId);
    const totalKiriman = poDels.filter(d => d.qtyKirim > 0).reduce((sum, d) => sum + d.qtyKirim, 0);
    const totalRetur = poDels.filter(d => d.qtyKirim < 0).reduce((sum, d) => sum + Math.abs(d.qtyKirim), 0);
    const childRefs = poDels.map(d => d.noReff).filter(Boolean);
    const uniqueRefs = Array.from(new Set(childRefs)).join(', ');
    
    const sortedPoDels = [...poDels].sort((a, b) => new Date(b.tanggalKirim) - new Date(a.tanggalKirim));
    const latestTglKirim = sortedPoDels.length > 0 ? sortedPoDels[0].tanggalKirim : '';

    const updatedPOs = data.map(item => {
      if (item.id === poId) {
        const newPo = {
          ...item,
          kiriman: totalKiriman,
          kirimanAwal: totalKiriman,
          retur: totalRetur,
          sisaPo: Math.max(0, Number(item.jumlahPo) - totalKiriman + totalRetur),
          noReff: uniqueRefs,
          tanggalKirim: latestTglKirim
        };
        // Update historyItem state in-place so the modal refreshes with updated parent info
        setHistoryItem(newPo);
        return newPo;
      }
      return item;
    });

    setData(updatedPOs);
    await storageAPI.saveOutstandingPOs(updatedPOs);
  };

  const handleUpdateDelivery = async (deliveryId, poId) => {
    if (!editDeliveryDraft.qtyKirim || Number(editDeliveryDraft.qtyKirim) === 0) {
      alert('Kuantitas tidak boleh kosong atau nol.');
      return;
    }

    // 1. Update the delivery record
    const updatedDeliveries = deliveries.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          tanggalKirim: editDeliveryDraft.tanggalKirim || d.tanggalKirim,
          noReff: editDeliveryDraft.noReff,
          qtyKirim: Number(editDeliveryDraft.qtyKirim)
        };
      }
      return d;
    });

    setDeliveries(updatedDeliveries);
    await storageAPI.saveDeliveries(updatedDeliveries);

    // 2. Recalculate parent PO metrics
    const poDels = updatedDeliveries.filter(d => d.poId === poId);
    const totalKiriman = poDels.filter(d => d.qtyKirim > 0).reduce((sum, d) => sum + d.qtyKirim, 0);
    const totalRetur = poDels.filter(d => d.qtyKirim < 0).reduce((sum, d) => sum + Math.abs(d.qtyKirim), 0);
    const childRefs = poDels.map(d => d.noReff).filter(Boolean);
    const uniqueRefs = Array.from(new Set(childRefs)).join(', ');
    const sortedPoDels = [...poDels].sort((a, b) => new Date(b.tanggalKirim) - new Date(a.tanggalKirim));
    const latestTglKirim = sortedPoDels.length > 0 ? sortedPoDels[0].tanggalKirim : '';

    const updatedPOs = data.map(item => {
      if (item.id === poId) {
        const newPo = {
          ...item,
          kiriman: totalKiriman,
          kirimanAwal: totalKiriman,
          retur: totalRetur,
          sisaPo: Math.max(0, Number(item.jumlahPo) - totalKiriman + totalRetur),
          noReff: uniqueRefs,
          tanggalKirim: latestTglKirim
        };
        setHistoryItem(newPo);
        return newPo;
      }
      return item;
    });

    setData(updatedPOs);
    await storageAPI.saveOutstandingPOs(updatedPOs);

    // 3. Close inline edit
    setEditingDeliveryId(null);
    setEditDeliveryDraft({ tanggalKirim: '', noReff: '', qtyKirim: 0 });
  };



  const downloadLaporanHarianPOGambar = () => {
    const today = new Date();
    const hariNames  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];
    const hariName   = hariNames[today.getDay()];
    const tanggalStr = `${today.getDate()} ${bulanNames[today.getMonth()]} ${today.getFullYear()}`;

    const osList = getOutstandingPOsList();

    if (osList.length === 0) {
      alert("Tidak ada data outstanding PO untuk diekspor!");
      return;
    }

    const W = 1122; // A4 landscape width
    const HEADER_H = 150;
    const ROW_H = 40;
    const FOOTER_H = 60;
    const H = HEADER_H + (osList.length * ROW_H) + FOOTER_H + 40;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background - White
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Accent header grad
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 8);

    const PAD = 50;
    let y = 50;

    // Title - Dark Text
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('LAPORAN OUTSTANDING PO (BELUM LUNAS)', PAD, y);

    y += 28;
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`CV Mitra Dunia Palletindo  ·  Hari ${hariName}, ${tanggalStr}`, PAD, y);

    // Summary stats - Dark Indigo text
    const totalSisa = osList.reduce((acc, p) => acc + Number(p.sisaPo || 0), 0);
    const totalPoQty = osList.reduce((acc, p) => acc + Number(p.jumlahPo || 0), 0);
    const totalKirim = osList.reduce((acc, p) => acc + Number(p.kiriman || 0), 0);
    const totalRetur = osList.reduce((acc, p) => acc + Number(p.retur || 0), 0);
    const realisasiPercent = totalPoQty > 0 ? (totalKirim / totalPoQty) * 100 : 0;

    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4f46e5';
    const statsStr = `Total PO: ${osList.length}  |  Total Order: ${totalPoQty.toLocaleString('id-ID')} Pcs  |  Qty Kirim: ${totalKirim.toLocaleString('id-ID')} Pcs (${realisasiPercent.toFixed(0)}%)  |  OS Kirim: ${totalSisa.toLocaleString('id-ID')} Pcs`;
    ctx.fillText(statsStr, PAD, y + 25);

    y += 50;

    // Columns - total width: 1022
    const cols = [
      { w: 36,  label: 'No', align: 'center' },
      { w: 90,  label: 'Tgl PO', align: 'center' },
      { w: 90,  label: 'Tgl Kirim', align: 'center' },
      { w: 175, label: 'Pelanggan / Customer', align: 'left' },
      { w: 165, label: 'Nomor PO', align: 'left' },
      { w: 155, label: 'No. Reff', align: 'left' },
      { w: 90,  label: 'Ukuran', align: 'center' },
      { w: 85,  label: 'Qty Order', align: 'right' },
      { w: 85,  label: 'Qty Kirim', align: 'right' },
      { w: 85,  label: 'OS Kirim', align: 'right' }
    ];

    // Header bg
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(PAD, y - 22, W - PAD * 2, 34);

    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#334155';
    
    let currentX = PAD + 10;
    cols.forEach(col => {
      let textX = currentX;
      if (col.align === 'center') {
        textX = currentX + col.w / 2 - ctx.measureText(col.label).width / 2;
      } else if (col.align === 'right') {
        textX = currentX + col.w - ctx.measureText(col.label).width - 10;
      }
      ctx.fillText(col.label, textX, y);
      currentX += col.w;
    });

    y += 20;

    osList.forEach((item, idx) => {
      // Light Zebra Striping
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(PAD, y - 14, W - PAD * 2, ROW_H);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(PAD, y + ROW_H - 14); ctx.lineTo(W - PAD, y + ROW_H - 14); ctx.stroke();

      let cx = PAD + 10;

      const drawCell = (text, w, color = '#334155', weight = 'normal', align = 'center') => {
        ctx.fillStyle = color;
        ctx.font = `${weight} 12px "Segoe UI", Arial, sans-serif`;
        let tx = cx;
        if (align === 'center') {
          tx = cx + w / 2 - ctx.measureText(text).width / 2;
        } else if (align === 'right') {
          tx = cx + w - ctx.measureText(text).width - 10;
        }
        ctx.fillText(text, tx, y + 10);
        cx += w;
      };

      drawCell((idx + 1).toString(), cols[0].w, '#475569', 'bold');
      drawCell(item.tanggal || '-', cols[1].w, '#334155', 'normal', 'center');
      drawCell(item.tanggalKirim || '-', cols[2].w, '#4f46e5', 'normal', 'center');
      drawCell(item.customer.toUpperCase(), cols[3].w, '#0f172a', 'bold', 'left');
      // Truncate Nomor PO if too long
      const nomorPoText = item.nomorPo.length > 22 ? item.nomorPo.substring(0, 20) + '…' : item.nomorPo;
      drawCell(nomorPoText, cols[4].w, '#0f172a', 'bold', 'left');
      const noReffText = (item.noReff || '-').length > 20 ? (item.noReff || '-').substring(0, 18) + '…' : (item.noReff || '-');
      drawCell(noReffText, cols[5].w, '#334155', 'normal', 'left');
      drawCell(item.ukuran.replace(/\s*mm\s*/gi,''), cols[6].w, '#475569');
      drawCell(item.jumlahPo.toLocaleString('id-ID'), cols[7].w, '#334155', 'normal', 'right');
      drawCell(item.kiriman.toLocaleString('id-ID'), cols[8].w, '#047857', 'bold', 'right');
      drawCell(item.sisaPo.toLocaleString('id-ID'), cols[9].w, '#be123c', 'bold', 'right');

      y += ROW_H;
    });

    // Outer border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(PAD, 128, W - PAD * 2, y - 128 - 14);

    // Footer
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(PAD, H - 35); ctx.lineTo(W - PAD, H - 35); ctx.stroke();

    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`MDP WH Pallet Management  ·  Laporan Outstanding PO Terfilter  ·  Total ${osList.length} PO`, PAD, H - 16);

    const link = document.createElement('a');
    link.download = `Laporan_Outstanding_PO_${today.toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadLaporanPengirimanBatchGambar = (batchName) => {
    const today = new Date();
    const hariNames  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];
    const hariName   = hariNames[today.getDay()];
    const tanggalStr = `${today.getDate()} ${bulanNames[today.getMonth()]} ${today.getFullYear()}`;

    // Get POs for this specific batch
    const items = (batches[batchName] || []).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    if (items.length === 0) {
      alert("Tidak ada data PO untuk jenis pallet ini!");
      return;
    }

    const W = 1122; // A4 landscape width
    const HEADER_H = 150;
    const ROW_H = 40;
    const FOOTER_H = 60;
    const H = HEADER_H + (items.length * ROW_H) + FOOTER_H + 40;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background - White
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Accent header grad
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#10b981'); // Emerald
    grad.addColorStop(1, '#3b82f6'); // Blue
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 8);

    const PAD = 50;
    let y = 50;

    // Title - Dark Text
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`LAPORAN DETAIL PENGIRIMAN PALLET: ${batchName.toUpperCase()}`, PAD, y);

    y += 28;
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`CV Mitra Dunia Palletindo  ·  Hari ${hariName}, ${tanggalStr}`, PAD, y);

    // Summary stats for this batch - Dark Emerald text
    const summary = getBatchSummary(batchName, items);
    const totalRetur = items.reduce((acc, p) => acc + Number(p.retur || 0), 0);
    const realisasiPercent = summary.totalPo > 0 ? (summary.totalKiriman / summary.totalPo) * 100 : 0;

    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#059669';
    const statsStr = `Total PO: ${items.length}  |  Total Order: ${summary.totalPo.toLocaleString('id-ID')} Pcs  |  Qty Kirim: ${summary.totalKiriman.toLocaleString('id-ID')} Pcs (${realisasiPercent.toFixed(0)}%)  |  OS Kirim: ${summary.totalSisa.toLocaleString('id-ID')} Pcs`;
    ctx.fillText(statsStr, PAD, y + 25);

    y += 50;

    // Columns - total width: 1022
    const cols = [
      { w: 36,  label: 'No', align: 'center' },
      { w: 90,  label: 'Tgl PO', align: 'center' },
      { w: 90,  label: 'Tgl Kirim', align: 'center' },
      { w: 175, label: 'Nomor PO', align: 'left' },
      { w: 175, label: 'No. Reff', align: 'left' },
      { w: 90,  label: 'Ukuran', align: 'center' },
      { w: 85,  label: 'Qty Order', align: 'right' },
      { w: 85,  label: 'Qty Kirim', align: 'right' },
      { w: 90,  label: 'OS Kirim', align: 'right' },
      { w: 106, label: 'Status', align: 'center' }
    ];

    // Header bg
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(PAD, y - 22, W - PAD * 2, 34);

    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#334155';
    
    let currentX = PAD + 10;
    cols.forEach(col => {
      let textX = currentX;
      if (col.align === 'center') {
        textX = currentX + col.w / 2 - ctx.measureText(col.label).width / 2;
      } else if (col.align === 'right') {
        textX = currentX + col.w - ctx.measureText(col.label).width - 10;
      }
      ctx.fillText(col.label, textX, y);
      currentX += col.w;
    });

    y += 20;

    items.forEach((item, idx) => {
      // Light Zebra Striping
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(PAD, y - 14, W - PAD * 2, ROW_H);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(PAD, y + ROW_H - 14); ctx.lineTo(W - PAD, y + ROW_H - 14); ctx.stroke();

      let cx = PAD + 10;

      const drawCell = (text, w, color = '#334155', weight = 'normal', align = 'center') => {
        ctx.fillStyle = color;
        ctx.font = `${weight} 11px "Segoe UI", Arial, sans-serif`;
        let tx = cx;
        if (align === 'center') {
          tx = cx + w / 2 - ctx.measureText(text).width / 2;
        } else if (align === 'right') {
          tx = cx + w - ctx.measureText(text).width - 10;
        }
        ctx.fillText(text, tx, y + 10);
        cx += w;
      };

      drawCell((idx + 1).toString(), cols[0].w, '#475569', 'bold');
      drawCell(item.tanggal || '-', cols[1].w, '#334155', 'normal', 'center');
      drawCell(item.tanggalKirim || '-', cols[2].w, '#4f46e5', 'normal', 'center');
      // Truncate long text to prevent column overflow
      const nPo = item.nomorPo.length > 22 ? item.nomorPo.substring(0, 20) + '…' : item.nomorPo;
      drawCell(nPo, cols[3].w, '#1e3a8a', 'bold', 'left');
      const nRef = (item.noReff || '-').length > 22 ? (item.noReff || '-').substring(0, 20) + '…' : (item.noReff || '-');
      drawCell(nRef, cols[4].w, '#334155', 'normal', 'left');
      drawCell(item.ukuran.replace(/\s*mm\s*/gi,''), cols[5].w, '#475569');
      drawCell(item.jumlahPo.toLocaleString('id-ID'), cols[6].w, '#334155', 'normal', 'right');
      drawCell(item.kiriman.toLocaleString('id-ID'), cols[7].w, '#047857', 'bold', 'right');
      drawCell(item.sisaPo.toLocaleString('id-ID'), cols[8].w, item.sisaPo > 0 ? '#e11d48' : '#64748b', item.sisaPo > 0 ? 'bold' : 'normal', 'right');

      // Status Badge (Light Themes)
      if (item.sisaPo <= 0) {
        ctx.fillStyle = '#d1fae5'; // emerald-100
        ctx.fillRect(cx + 15, y - 2, cols[10].w - 30, 18);
        ctx.fillStyle = '#065f46'; // emerald-800
        ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
        const txt = 'LUNAS';
        const tx = cx + cols[10].w / 2 - ctx.measureText(txt).width / 2;
        ctx.fillText(txt, tx, y + 10);
        cx += cols[10].w;
      } else {
        ctx.fillStyle = '#fee2e2'; // red-100
        ctx.fillRect(cx + 10, y - 2, cols[10].w - 20, 18);
        ctx.fillStyle = '#991b1b'; // red-800
        ctx.font = 'bold 8px "Segoe UI", Arial, sans-serif';
        const txt = 'BELUM LUNAS';
        const tx = cx + cols[10].w / 2 - ctx.measureText(txt).width / 2;
        ctx.fillText(txt, tx, y + 10);
        cx += cols[10].w;
      }

      y += ROW_H;
    });

    // Outer border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(PAD, 128, W - PAD * 2, y - 128 - 14);

    // Footer
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(PAD, H - 35); ctx.lineTo(W - PAD, H - 35); ctx.stroke();

    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`MDP WH Pallet Management  ·  Laporan Pengiriman ${batchName}  ·  Total ${items.length} PO`, PAD, H - 16);

    const link = document.createElement('a');
    link.download = `Laporan_Pengiriman_${batchName}_${today.toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const batches = getBatches();

  // Hitung ringkasan data per batch (Jenis Pallet)
  const getBatchSummary = (batchName, items) => {
    const totalPo = items.reduce((acc, item) => acc + Number(item.jumlahPo || 0), 0);
    const totalKiriman = items.reduce((acc, item) => acc + Number(item.kiriman || 0), 0);
    const totalRetur = items.reduce((acc, item) => acc + Number(item.retur || 0), 0);
    const totalSisa = items.reduce((acc, item) => acc + Number(item.sisaPo || 0), 0);
    return { totalPo, totalKiriman, totalRetur, totalSisa };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-650 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-12 translate-x-12 opacity-10">
          <FileSpreadsheet className="w-80 h-80" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Outstanding PO Sidoarjo</h1>
            <p className="mt-2 text-indigo-100 max-w-xl text-sm sm:text-base">
              Kelola sisa pesanan pallet (Outstanding PO) untuk setiap jenis pallet. Pilih nama jenis pallet untuk melihat detail dan melakukan CRUD.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setSelectedBatch(null);
                setFormData({
                  tanggal: new Date().toISOString().split('T')[0],
                  tanggalKirim: '',
                  nomorPo: '',
                  noReff: '',
                  customer: palletTypes[0]?.nama || '',
                  batchId: palletTypes[0]?.nama || '',
                  ukuran: palletTypes[0]?.ukuran || '1000x1200 mm',
                  jumlahPo: 0,
                  kiriman: 0,
                  retur: 0
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all text-sm backdrop-blur-md cursor-pointer border border-white/10"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah PO Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warning/Info Box for Supabase Setup */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-xs text-amber-800">
        <Info className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="space-y-1">
          <span className="font-bold block">💡 Perlu Sinkronisasi Database Supabase?</span>
          <span>
            Jika Anda menemui error <strong>"Could not find table mdp_outstanding_po"</strong>, mohon jalankan script SQL tabel baru 
            di SQL Editor Supabase Anda. Anda dapat menyalin script SQL tersebut di file <code>supabase_schema.sql</code> baris 119.
          </span>
        </div>
      </div>

      {/* Search & Filter Bar (Global) */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={selectedBatch ? "Cari No PO, Ukuran..." : "Cari Jenis Pallet, No PO..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>
          
          {/* Filter Bulan */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-650"
          >
            <option value="all">Semua Bulan</option>
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>

          {/* Filter Tahun */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-650"
          >
            <option value="all">Semua Tahun</option>
            {getUniqueYears().map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={downloadLaporanHarianPOGambar}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-650 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 shrink-0 border border-indigo-100 shadow-3xs cursor-pointer transition-colors"
        >
          <Image className="w-3.5 h-3.5" />
          <span>Download Laporan PO (Gambar)</span>
        </button>
      </div>

      {/* View Mode Toggle */}
      {!selectedBatch && (
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Tampilan Kartu</span>
          </button>
          <button
            onClick={() => setViewMode('report')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'report'
                ? 'bg-white text-indigo-650 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Laporan Ringkasan PO (Belum Lunas)</span>
          </button>
        </div>
      )}

      {/* Main Layout: Conditional View */}
      {selectedBatch ? (
        /* ==================== DETAIL VIEW (CRUD PO) ==================== */
        <div className="space-y-6 animate-in slide-in-from-right duration-250">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedBatch(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm bg-white border border-slate-200/80 px-4 py-2 rounded-xl shadow-2xs cursor-pointer hover:bg-slate-50 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Menu Utama</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadLaporanPengirimanBatchGambar(selectedBatch)}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs cursor-pointer transition-all border border-emerald-100"
              >
                <Image className="w-4 h-4" />
                <span>Download Laporan Gambar</span>
              </button>
              <button
                onClick={() => {
                  const matchedType = palletTypes.find(t => t.nama === selectedBatch);
                  setFormData({
                    tanggal: new Date().toISOString().split('T')[0],
                    tanggalKirim: '',
                    nomorPo: '',
                    noReff: '',
                    customer: selectedBatch,
                    batchId: selectedBatch,
                    ukuran: matchedType ? matchedType.ukuran : (palletTypes[0]?.ukuran || '1000x1200 mm'),
                    jumlahPo: 0,
                    kiriman: 0,
                    retur: 0
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah PO Baru</span>
              </button>
            </div>
          </div>

          {/* Pallet Type Summary Card inside Detail View */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
            <div className="space-y-1">
              <span className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Jenis Pallet / Customer</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase">{selectedBatch}</h2>
              <span className="text-xs text-slate-400 block font-medium">Total Pesanan: {(batches[selectedBatch] || []).length} PO</span>
            </div>
            
            <div className="flex gap-6 w-full sm:w-auto">
              <div className="text-center sm:text-right flex-1 sm:flex-none">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total PO</span>
                <span className="text-base font-black text-slate-700">{getBatchSummary(selectedBatch, batches[selectedBatch] || []).totalPo.toLocaleString('id-ID')}</span>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
              <div className="text-center sm:text-right flex-1 sm:flex-none">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Terkirim</span>
                <span className="text-base font-black text-emerald-600">{getBatchSummary(selectedBatch, batches[selectedBatch] || []).totalKiriman.toLocaleString('id-ID')}</span>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
              <div className="text-center sm:text-right flex-1 sm:flex-none">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Retur</span>
                <span className="text-base font-black text-amber-600">{getBatchSummary(selectedBatch, batches[selectedBatch] || []).totalRetur.toLocaleString('id-ID')}</span>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
              <div className="text-center sm:text-right flex-1 sm:flex-none">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Sisa PO (Outstanding)</span>
                <span className="text-base font-black text-indigo-650">{getBatchSummary(selectedBatch, batches[selectedBatch] || []).totalSisa.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Table Data PO for Selected Customer */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3.5">Tanggal PO</th>
                    <th className="px-6 py-3.5">Tanggal Kirim</th>
                    <th className="px-6 py-3.5">Nomor PO</th>
                    <th className="px-6 py-3.5">No. Reff</th>
                    <th className="px-6 py-3.5">Ukuran</th>
                    <th className="px-6 py-3.5 text-right">Jumlah PO</th>
                    <th className="px-6 py-3.5 text-right">Total Kiriman (Otomatis Sync)</th>
                    <th className="px-6 py-3.5 text-right">Retur</th>
                    <th className="px-6 py-3.5 text-right">Sisa PO (Outstanding)</th>
                    <th className="px-6 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!(batches[selectedBatch]) || batches[selectedBatch].length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center text-slate-400 font-medium">
                        Belum ada data PO untuk jenis pallet ini. Silakan klik "Tambah PO Baru" di kanan atas.
                      </td>
                    </tr>
                  ) : (
                    batches[selectedBatch].map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-colors text-sm">
                        <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">{item.tanggal}</td>
                        <td className="px-6 py-4 font-semibold text-indigo-600 whitespace-nowrap">{item.tanggalKirim || '-'}</td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{item.nomorPo}</td>
                        <td className="px-6 py-4 text-slate-650">{item.noReff || '-'}</td>
                        <td className="px-6 py-4 text-slate-650">{item.ukuran}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">{item.jumlahPo.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 bg-emerald-50/20">
                          <div>{item.kiriman.toLocaleString('id-ID')}</div>
                          <div className="text-[9px] text-slate-400 font-medium font-sans">
                            (Base: {(item.kirimanAwal || 0).toLocaleString('id-ID')})
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-amber-600 bg-amber-50/20">
                          {item.retur || 0}
                        </td>
                        <td className="px-6 py-4 text-right font-black whitespace-nowrap">
                          {item.sisaPo > 0 ? (
                            <span className="text-indigo-650 bg-indigo-50/15 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                              {item.sisaPo.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-200">
                              <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3.5px]" />
                              <span>LUNAS</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setKirimanItem(item);
                                setNewNoReffVal(item.noReff || '');
                                setNewKirimanVal(0);
                                setIsKirimanModalOpen(true);
                              }}
                              className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 hover:text-indigo-700 font-bold py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Input Kiriman Tambahan"
                            >
                              <Send className="w-3 h-3" />
                              <span>Kirim</span>
                            </button>
                            <button
                              onClick={() => {
                                setReturItem(item);
                                setNewNoReffVal(item.noReff || '');
                                setNewReturVal(0);
                                setIsReturModalOpen(true);
                              }}
                              className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-650 hover:text-amber-700 font-bold py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Input Retur Pallet"
                            >
                              <Undo className="w-3 h-3" />
                              <span>Retur</span>
                            </button>
                            <button
                              onClick={() => {
                                setHistoryItem(item);
                                setIsHistoryModalOpen(true);
                              }}
                              className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-bold py-1 px-2 rounded-lg text-xs transition-colors border border-slate-200 cursor-pointer"
                              title="Lihat Rincian Pengiriman"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Rincian</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setPalletSearchEdit(item.customer || '');
                                setIsEditModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit PO"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus PO"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : viewMode === 'report' ? (
        /* ==================== DASHBOARD REPORT VIEW ==================== */
        <div className="space-y-6 animate-in fade-in duration-250">
          {(() => {
            const osList = getOutstandingPOsList();
            const totalPoCount = osList.length;
            const totalSisa = osList.reduce((acc, p) => acc + Number(p.sisaPo || 0), 0);
            const totalPoQty = osList.reduce((acc, p) => acc + Number(p.jumlahPo || 0), 0);
            const totalKirim = osList.reduce((acc, p) => acc + Number(p.kiriman || 0), 0);
            const realisasiPercent = totalPoQty > 0 ? (totalKirim / totalPoQty) * 100 : 0;

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total PO Belum Lunas</span>
                    <span className="text-2xl font-black text-slate-800 block mt-1">{totalPoCount.toLocaleString('id-ID')} PO</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs border-b-4 border-b-indigo-650">
                    <span className="text-[10px] text-indigo-650 font-bold block uppercase tracking-wider">Total Sisa / Kekurangan (OS)</span>
                    <span className="text-2xl font-black text-indigo-650 block mt-1">{totalSisa.toLocaleString('id-ID')} Pallet</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs border-b-4 border-b-emerald-600">
                    <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">Terkirim / Realisasi</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-emerald-600">{totalKirim.toLocaleString('id-ID')} Pcs</span>
                      <span className="text-xs text-slate-400 font-bold">({realisasiPercent.toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="font-extrabold text-sm text-slate-800">
                      Daftar Outstanding PO Lintas Bulan ({totalPoCount} Baris Belum Lunas)
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={downloadLaporanHarianPOGambar}
                        className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 font-bold py-1.5 px-3 rounded-xl text-xs transition-colors cursor-pointer border border-indigo-100 shadow-3xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Laporan PO (Gambar)</span>
                      </button>
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">
                        Hanya menampilkan sisa PO &gt; 0
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-6 py-3">Tanggal PO</th>
                          <th className="px-6 py-3">Tanggal Kirim</th>
                          <th className="px-6 py-3">No. Reff</th>
                          <th className="px-6 py-3">Jenis Pallet (Customer)</th>
                          <th className="px-6 py-3">Nomor PO</th>
                          <th className="px-6 py-3">Ukuran</th>
                          <th className="px-6 py-3 text-right">Order Qty</th>
                          <th className="px-6 py-3 text-right">Qty Kirim</th>
                          <th className="px-6 py-3 text-right">OS Kirim</th>
                          <th className="px-6 py-3 text-right">Retur</th>
                          <th className="px-6 py-3">Visualisasi Progres</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {osList.length === 0 ? (
                          <tr>
                            <td colSpan="11" className="px-6 py-12 text-center text-slate-400 font-medium">
                              Tidak ada outstanding PO (semua PO lunas atau tidak ada data yang cocok dengan filter).
                            </td>
                          </tr>
                        ) : (
                          osList.map((item) => {
                            const percent = item.jumlahPo > 0 ? (item.kiriman / item.jumlahPo) * 100 : 0;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-6 py-3.5 text-slate-500 font-medium whitespace-nowrap">{item.tanggal}</td>
                                <td className="px-6 py-3.5 text-indigo-600 font-semibold whitespace-nowrap">{item.tanggalKirim || '-'}</td>
                                <td className="px-6 py-3.5 text-slate-650 font-bold whitespace-nowrap">{item.noReff || '-'}</td>
                                <td className="px-6 py-3.5 font-bold text-indigo-650 uppercase">{item.customer}</td>
                                <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-700">{item.nomorPo}</td>
                                <td className="px-6 py-3.5 text-slate-650">{item.ukuran}</td>
                                <td className="px-6 py-3.5 text-right font-semibold text-slate-700">{item.jumlahPo.toLocaleString('id-ID')}</td>
                                <td className="px-6 py-3.5 text-right font-semibold text-emerald-600">{item.kiriman.toLocaleString('id-ID')}</td>
                                <td className="px-6 py-3.5 text-right font-black text-rose-600 bg-rose-50/20">{item.sisaPo.toLocaleString('id-ID')}</td>
                                <td className="px-6 py-3.5 text-right font-semibold text-amber-600 bg-amber-50/20">{item.retur || 0}</td>
                                <td className="px-6 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-3 w-44">
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                      <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }}></div>
                                      <div className="h-full bg-rose-500 flex-1"></div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold w-6">{percent.toFixed(0)}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        /* ==================== LIST VIEW (PALLET TYPE CARDS) ==================== */
        <div className="space-y-6">
          {/* Pallet Type Cards Grid */}
          {Object.keys(batches).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-250 border-dashed rounded-3xl text-center">
              <Info className="w-10 h-10 text-slate-400 mb-3" />
              <h3 className="font-bold text-slate-700 text-lg">Belum Ada Jenis Pallet Outstanding PO</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-sm">
                Gunakan <strong>Sinkronisasi Google Sheets</strong> di atas atau buat jenis pallet baru secara manual.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(batches)
                .sort((a, b) => a[0].localeCompare(b[0], 'id', { sensitivity: 'base' }))
                .map(([batchName, items]) => {
                const summary = getBatchSummary(batchName, items);
                const progressPercentage = summary.totalPo > 0 ? (summary.totalKiriman / summary.totalPo) * 100 : 0;
                
                return (
                  <div
                    key={batchName}
                    onClick={() => setSelectedBatch(batchName)}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer group flex flex-col justify-between h-56 border-b-4 border-b-indigo-650"
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-650 border border-indigo-100 rounded-md uppercase tracking-wider">
                          {items.length} PO
                        </span>
                        <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all rotate-180" />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight pt-2 group-hover:text-indigo-650 transition-colors uppercase leading-tight">
                        {batchName}
                      </h3>
                    </div>

                    {/* Mini stats */}
                    <div className="grid grid-cols-3 gap-2 border-y border-slate-100 py-3 my-3">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Total PO</span>
                        <span className="text-xs font-extrabold text-slate-700">{summary.totalPo.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Kirim (Sync)</span>
                        <span className="text-xs font-extrabold text-emerald-600">{summary.totalKiriman.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Sisa PO</span>
                        <span className="text-xs font-black text-indigo-650">{summary.totalSisa.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>Realisasi Kirim</span>
                        <span className="text-slate-650">{progressPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Tambah PO Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-650 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Tambah PO Baru</h3>
                <p className="text-[11px] text-indigo-200">Jenis Pallet: {selectedBatch || formData.batchId}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePO} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tanggal PO</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tanggal Kirim</label>
                  <input
                    type="date"
                    value={formData.tanggalKirim || ''}
                    onChange={(e) => setFormData({ ...formData, tanggalKirim: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nomor PO</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PO-00123"
                    value={formData.nomorPo}
                    onChange={(e) => setFormData({ ...formData, nomorPo: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">No. Reff</label>
                  <input
                    type="text"
                    placeholder="Contoh: 162.AC/A"
                    value={formData.noReff}
                    onChange={(e) => setFormData({ ...formData, noReff: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650"
                  />
                </div>
              </div>

              {/* Jenis Pallet – Searchable Combobox */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-500 uppercase">Jenis Pallet</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Ketik nama pallet..."
                  value={palletSearchAdd}
                  onFocus={() => setShowPalletDropAdd(true)}
                  onBlur={() => setTimeout(() => setShowPalletDropAdd(false), 150)}
                  onChange={(e) => {
                    setPalletSearchAdd(e.target.value);
                    setShowPalletDropAdd(true);
                  }}
                  className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                {showPalletDropAdd && (() => {
                  const allOpts = palletTypes.length > 0
                    ? palletTypes
                    : Array.from(new Set(data.map(i => i.customer))).map(n => ({ nama: n, ukuran: '' }));
                  const filtered = allOpts
                    .filter(t => t.nama.toLowerCase().includes(palletSearchAdd.toLowerCase()))
                    .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
                  return filtered.length > 0 ? (
                    <ul className="absolute z-50 mt-1 w-full bg-white border border-indigo-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {filtered.map((type) => (
                        <li
                          key={type.id ?? type.nama}
                          onMouseDown={() => {
                            setFormData(prev => ({
                              ...prev,
                              customer: type.nama,
                              batchId: type.nama,
                              ukuran: type.ukuran || prev.ukuran
                            }));
                            setPalletSearchAdd(type.nama);
                            setShowPalletDropAdd(false);
                          }}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 font-medium flex justify-between items-center"
                        >
                          <span>{type.nama}</span>
                          {type.ukuran && <span className="text-[10px] text-slate-400 font-normal">{type.ukuran}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : null;
                })()}
              </div>

              {/* Ukuran Pallet – auto-filled, read-only display */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Ukuran Pallet</label>
                <div className="w-full text-sm p-2 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 font-semibold min-h-[36px]">
                  {formData.ukuran || <span className="text-slate-300 font-normal italic">Otomatis terisi saat pilih jenis pallet</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Qty Order</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.jumlahPo || ''}
                    onChange={(e) => setFormData({ ...formData, jumlahPo: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650 font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Qty Kirim</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.kiriman || 0}
                    onChange={(e) => setFormData({ ...formData, kiriman: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650 font-bold text-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Retur</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.retur || 0}
                    onChange={(e) => setFormData({ ...formData, retur: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650 font-bold text-amber-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit PO */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-slate-800 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Edit Detail PO</h3>
                <p className="text-[11px] text-slate-300">Jenis Pallet: {editingItem.batchId}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePO} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tanggal PO</label>
                  <input
                    type="date"
                    required
                    value={editingItem.tanggal}
                    onChange={(e) => setEditingItem({ ...editingItem, tanggal: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tanggal Kirim</label>
                  <input
                    type="date"
                    value={editingItem.tanggalKirim || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, tanggalKirim: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nomor PO</label>
                  <input
                    type="text"
                    required
                    value={editingItem.nomorPo}
                    onChange={(e) => setEditingItem({ ...editingItem, nomorPo: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">No. Reff</label>
                  <input
                    type="text"
                    placeholder="Contoh: 162.AC/A"
                    value={editingItem.noReff || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, noReff: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650"
                  />
                </div>
              </div>

              {/* Jenis Pallet – Searchable Combobox (Edit Modal) */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-500 uppercase">Jenis Pallet</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Ketik nama pallet..."
                  value={palletSearchEdit}
                  onFocus={() => setShowPalletDropEdit(true)}
                  onBlur={() => setTimeout(() => setShowPalletDropEdit(false), 150)}
                  onChange={(e) => {
                    setPalletSearchEdit(e.target.value);
                    setShowPalletDropEdit(true);
                  }}
                  className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                {/* Show current value as badge */}
                {editingItem.customer && !showPalletDropEdit && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] bg-indigo-50 text-indigo-650 border border-indigo-100 rounded-md px-2 py-0.5 font-semibold">{editingItem.customer}</span>
                    <span className="text-[9px] text-slate-400">(aktif)</span>
                  </div>
                )}
                {showPalletDropEdit && (() => {
                  const allOpts = palletTypes.length > 0
                    ? palletTypes
                    : Array.from(new Set(data.map(i => i.customer))).map(n => ({ nama: n, ukuran: '' }));
                  const filtered = allOpts
                    .filter(t => t.nama.toLowerCase().includes(palletSearchEdit.toLowerCase()))
                    .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
                  return filtered.length > 0 ? (
                    <ul className="absolute z-50 mt-1 w-full bg-white border border-indigo-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {filtered.map((type) => (
                        <li
                          key={type.id ?? type.nama}
                          onMouseDown={() => {
                            setEditingItem(prev => ({
                              ...prev,
                              customer: type.nama,
                              batchId: type.nama,
                              ukuran: type.ukuran || prev.ukuran
                            }));
                            setPalletSearchEdit(type.nama);
                            setShowPalletDropEdit(false);
                          }}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 font-medium flex justify-between items-center"
                        >
                          <span>{type.nama}</span>
                          {type.ukuran && <span className="text-[10px] text-slate-400 font-normal">{type.ukuran}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : null;
                })()}
              </div>

              {/* Ukuran Pallet – auto-filled (Edit Modal) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Ukuran Pallet</label>
                <div className="w-full text-sm p-2 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 font-semibold min-h-[36px]">
                  {editingItem.ukuran || <span className="text-slate-300 font-normal italic">Otomatis terisi saat pilih jenis pallet</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Qty Order</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingItem.jumlahPo}
                    onChange={(e) => setEditingItem({ ...editingItem, jumlahPo: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Qty Kirim</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.kiriman}
                    onChange={(e) => setEditingItem({ ...editingItem, kiriman: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650 font-bold text-emerald-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Retur</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.retur || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, retur: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 focus:outline-indigo-650 font-bold text-amber-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Input Kiriman Baru */}
      {isKirimanModalOpen && kirimanItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm">Input Kiriman Pallet</h3>
                <p className="text-[10px] text-indigo-200">{kirimanItem.nomorPo} - {kirimanItem.customer}</p>
              </div>
              <button onClick={() => setIsKirimanModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-white transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddKiriman} className="p-5 space-y-4">
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Jumlah PO:</span>
                  <span className="font-bold text-slate-700">{kirimanItem.jumlahPo.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Terkirim Saat Ini (Total):</span>
                  <span className="font-bold text-emerald-650">{kirimanItem.kiriman.toLocaleString('id-ID')}</span>
                </div>
                <div className="w-full h-px bg-indigo-100/50 my-1"></div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-slate-500">Sisa Outstanding:</span>
                  <span className="font-black text-indigo-650">{kirimanItem.sisaPo.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Tanggal Kirim</label>
                <input
                  type="date"
                  required
                  value={newTanggalKirimVal}
                  onChange={(e) => setNewTanggalKirimVal(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-indigo-600 font-bold text-slate-700 bg-slate-50/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Qty Kirim Baru</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newKirimanVal || ''}
                    onChange={(e) => setNewKirimanVal(Number(e.target.value))}
                    placeholder="Jumlah..."
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-indigo-600 font-extrabold text-emerald-650 bg-slate-50/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">No. Reff</label>
                  <input
                    type="text"
                    value={newNoReffVal}
                    onChange={(e) => setNewNoReffVal(e.target.value)}
                    placeholder="Contoh: SJ-001"
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-indigo-600 font-bold text-slate-700 bg-slate-50/30"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsKirimanModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Kirim</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Input Retur Baru */}
      {isReturModalOpen && returItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-amber-650 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm">Input Retur Pallet</h3>
                <p className="text-[10px] text-amber-200">{returItem.nomorPo} - {returItem.customer}</p>
              </div>
              <button onClick={() => setIsReturModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-white transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddRetur} className="p-5 space-y-4">
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Jumlah PO:</span>
                  <span className="font-bold text-slate-700">{returItem.jumlahPo.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Terkirim Saat Ini (Total):</span>
                  <span className="font-bold text-emerald-650">{returItem.kiriman.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Retur Saat Ini (Total):</span>
                  <span className="font-bold text-amber-650">{(returItem.retur || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="w-full h-px bg-amber-100/50 my-1"></div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-slate-500">Sisa Outstanding:</span>
                  <span className="font-black text-indigo-650">{returItem.sisaPo.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Tanggal Retur</label>
                <input
                  type="date"
                  required
                  value={newTanggalKirimVal}
                  onChange={(e) => setNewTanggalKirimVal(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-amber-600 font-bold text-slate-700 bg-slate-50/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Qty Retur Baru</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newReturVal || ''}
                    onChange={(e) => setNewReturVal(Number(e.target.value))}
                    placeholder="Jumlah..."
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-amber-600 font-extrabold text-amber-650 bg-slate-50/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">No. Reff</label>
                  <input
                    type="text"
                    value={newNoReffVal}
                    onChange={(e) => setNewNoReffVal(e.target.value)}
                    placeholder="Contoh: RJ-001"
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-amber-600 font-bold text-slate-700 bg-slate-50/30"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReturModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Undo className="w-3 h-3" />
                  <span>Retur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rincian Pengiriman (History) */}
      {isHistoryModalOpen && historyItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-650 px-6 py-4 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-base">Rincian Pengiriman PO</h3>
                <p className="text-[11px] text-indigo-200">
                  PO: {historyItem.nomorPo} - {historyItem.customer}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setHistoryItem(null);
                }} 
                className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Info PO */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Ukuran</span>
                  <span className="font-bold text-slate-700">{historyItem.ukuran}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Total Order</span>
                  <span className="font-bold text-slate-700">{historyItem.jumlahPo.toLocaleString('id-ID')} Pcs</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Terkirim</span>
                  <span className="font-bold text-emerald-600">{historyItem.kiriman.toLocaleString('id-ID')} Pcs</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Retur</span>
                  <span className="font-bold text-amber-600">{(historyItem.retur || 0).toLocaleString('id-ID')} Pcs</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Sisa PO</span>
                  <span className="font-bold text-indigo-650">{(historyItem.sisaPo || 0).toLocaleString('id-ID')} Pcs</span>
                </div>
              </div>

              {/* Tabel Pengiriman */}
              <div className="border border-slate-250/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-3 text-center w-12">No</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Tipe</th>
                      <th className="px-4 py-3">No. Reff / SJ</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-center w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {deliveries.filter(d => d.poId === historyItem.id).length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-slate-450 font-medium">
                          Belum ada riwayat pengiriman/retur untuk PO ini.
                        </td>
                      </tr>
                    ) : (
                      deliveries
                        .filter(d => d.poId === historyItem.id)
                        .sort((a, b) => new Date(b.tanggalKirim) - new Date(a.tanggalKirim))
                        .map((delivery, idx) => {
                          const isEditing = editingDeliveryId === delivery.id;
                          const isRetur = delivery.qtyKirim < 0;
                          return isEditing ? (
                            /* ── Edit Row ── */
                            <tr key={delivery.id} className="bg-indigo-50/40">
                              <td className="px-3 py-2 text-center font-bold text-indigo-400 text-xs">{idx + 1}</td>
                              <td className="px-2 py-2">
                                <input
                                  type="date"
                                  value={editDeliveryDraft.tanggalKirim}
                                  onChange={e => setEditDeliveryDraft(prev => ({ ...prev, tanggalKirim: e.target.value }))}
                                  className="w-full text-xs p-1.5 rounded-lg border border-indigo-200 focus:outline-indigo-400"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <select
                                  value={editDeliveryDraft.qtyKirim < 0 ? 'retur' : 'kirim'}
                                  onChange={e => {
                                    const selectRetur = e.target.value === 'retur';
                                    setEditDeliveryDraft(prev => ({
                                      ...prev,
                                      qtyKirim: selectRetur ? -Math.abs(prev.qtyKirim) : Math.abs(prev.qtyKirim)
                                    }));
                                  }}
                                  className="w-full text-xs p-1.5 rounded-lg border border-indigo-200 focus:outline-indigo-400 font-bold"
                                >
                                  <option value="kirim">Kirim</option>
                                  <option value="retur">Retur</option>
                                </select>
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  placeholder="No. Reff / SJ"
                                  value={editDeliveryDraft.noReff}
                                  onChange={e => setEditDeliveryDraft(prev => ({ ...prev, noReff: e.target.value }))}
                                  className="w-full text-xs p-1.5 rounded-lg border border-indigo-200 focus:outline-indigo-400 font-mono"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={Math.abs(editDeliveryDraft.qtyKirim) || ''}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    const draftRetur = editDeliveryDraft.qtyKirim < 0;
                                    setEditDeliveryDraft(prev => ({
                                      ...prev,
                                      qtyKirim: draftRetur ? -val : val
                                    }));
                                  }}
                                  className="w-full text-xs p-1.5 rounded-lg border border-indigo-200 focus:outline-indigo-400 font-bold text-right text-slate-700"
                                />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleUpdateDelivery(delivery.id, historyItem.id)}
                                    className="p-1 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                                    title="Simpan"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingDeliveryId(null);
                                      setEditDeliveryDraft({ tanggalKirim: '', noReff: '', qtyKirim: 0 });
                                    }}
                                    className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Batal"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            /* ── Normal Row ── */
                            <tr key={delivery.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-2.5 font-medium">{delivery.tanggalKirim}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${isRetur ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                  {isRetur ? 'Retur' : 'Kirim'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-600">{delivery.noReff || '-'}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-slate-800">{Math.abs(delivery.qtyKirim).toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingDeliveryId(delivery.id);
                                      setEditDeliveryDraft({
                                        tanggalKirim: delivery.tanggalKirim || '',
                                        noReff: delivery.noReff || '',
                                        qtyKirim: delivery.qtyKirim
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Pengiriman"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDelivery(delivery.id, historyItem.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Pengiriman"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    setHistoryItem(null);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
