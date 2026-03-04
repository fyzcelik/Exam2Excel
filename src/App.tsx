import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Download, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { processExamPdf } from './services/gemini';
import { ExamQuestion } from './types';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setQuestions([]);
    } else {
      setError('Lütfen geçerli bir PDF dosyası yükleyin.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  } as any);

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await processExamPdf(file);
      setQuestions(result);
    } catch (err) {
      setError('Dosya işlenirken bir hata oluştu. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (questions.length === 0) return;

    const headers = ["Soru ID", "Soru", "A", "B", "C", "D", "E", "Doğru Cevap"];

    const rows = questions.map((q) => ({
      "Soru ID": q["Soru ID"] ?? "",
      "Soru": q["Soru"] ?? "",
      "A": q["A"] ?? "",
      "B": q["B"] ?? "",
      "C": q["C"] ?? "",
      "D": q["D"] ?? "",
      "E": q["E"] ?? "",
      "Doğru Cevap": q["Doğru Cevap"] ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });

    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sorular");

    worksheet["!cols"] = headers.map((h) => ({ wch: 30 }));

    XLSX.writeFile(workbook, `Sinav_Sorulari_${Date.now()}.xlsx`);
  };

  const reset = () => {
    setFile(null);
    setQuestions([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">Exam2Excel</h1>
          </div>
          {questions.length > 0 && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Excel Olarak İndir
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload & Status */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Dosya Yükle</h2>

              {!file ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400'
                    }`}
                >
                  <input {...getInputProps()} />
                  <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">PDF dosyasını buraya sürükleyin</p>
                  <p className="text-xs text-slate-400 mt-1">veya tıklayarak seçin</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={reset} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>

                  {!questions.length && (
                    <button
                      onClick={handleProcess}
                      disabled={loading}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          İşleniyor...
                        </>
                      ) : (
                        'Soruları Çıkart'
                      )}
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {questions.length > 0 && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">İşlem Tamamlandı</p>
                    <p className="text-xs text-emerald-600">{questions.length} soru başarıyla çıkartıldı.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-semibold mb-2">Nasıl Çalışır?</h3>
                <ul className="text-sm text-indigo-100 space-y-3">
                  <li className="flex gap-2">
                    <span className="bg-indigo-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
                    PDF formatındaki sınav dosyanızı yükleyin.
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-indigo-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
                    AI teknolojisi ile soruları ve şıkları otomatik olarak ayrıştıralım.
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-indigo-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
                    Sonuçları kontrol edin ve tek tıkla Excel formatında indirin.
                  </li>
                </ul>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <FileSpreadsheet className="w-32 h-32" />
              </div>
            </div>
          </div>

          {/* Right Column: Preview Table */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Önizleme</h2>
                {questions.length > 0 && (
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    {questions.length} Satır
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                {questions.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">ID</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Soru</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">A</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">B</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">C</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">D</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">E</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{"Doğru Cevap"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {questions.map((q, idx) => (
                        <motion.tr
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={idx}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-4 text-sm font-mono text-slate-500">{q["Soru ID"]}</td>
                          <td className="px-4 py-4 text-sm font-medium text-slate-900 min-w-[300px] max-w-[400px]">
                            <p className="line-clamp-2">{q["Soru"]}</p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{q["A"]}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{q["B"]}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{q["C"]}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{q["D"]}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{q["E"]}</td>
                          <td className="px-4 py-4 text-sm font-bold text-indigo-600">{q["Doğru Cevap"]}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                      <Loader2 className={`w-8 h-8 ${loading ? 'animate-spin text-indigo-500' : 'text-slate-300'}`} />
                    </div>
                    <p className="text-sm font-medium">
                      {loading ? 'Sorular ayrıştırılıyor...' : 'Henüz veri yok. Lütfen bir PDF yükleyin.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
