import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Kebijakan Privasi</h1>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 leading-relaxed">RuangTemu berkomitmen untuk melindungi privasi pengguna.</p>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Data yang Kami Kumpulkan</h2>
            <ul className="text-gray-600 space-y-2">
              <li>Nama, email, dan nomor telepon untuk identifikasi akun</li>
              <li>Tanggal lahir dan minat untuk keperluan matching</li>
              <li>Bukti pembayaran untuk verifikasi transaksi</li>
            </ul>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Penggunaan Data</h2>
            <p className="text-gray-600">Data digunakan untuk: proses matching peserta dinner, mengirimkan notifikasi terkait booking, dan meningkatkan kualitas layanan.</p>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Keamanan Data</h2>
            <p className="text-gray-600">Data Anda disimpan dengan enkripsi dan tidak dibagikan kepada pihak ketiga tanpa izin Anda.</p>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Hubungi Kami</h2>
            <p className="text-gray-600">Pertanyaan terkait privasi: <a href="mailto:halo@ruangtemu.biz.id" className="text-brand-600 hover:underline">halo@ruangtemu.biz.id</a></p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
