import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Syarat &amp; Ketentuan</h1>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 leading-relaxed">Dengan menggunakan platform RuangTemu, Anda setuju dengan syarat dan ketentuan berikut:</p>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">1. Penggunaan Platform</h2>
            <p className="text-gray-600">RuangTemu adalah platform social dining yang menghubungkan individu dalam makan malam grup kecil. Pengguna wajib berusia minimal 18 tahun.</p>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">2. Pembayaran</h2>
            <p className="text-gray-600">Pembayaran dilakukan melalui QRIS secara manual. Booking dianggap sah setelah pembayaran terverifikasi oleh admin.</p>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">3. Pembatalan</h2>
            <p className="text-gray-600">Pembatalan lebih dari 7 hari sebelum dinner akan mendapat refund. Pembatalan kurang dari 7 hari tidak mendapat refund.</p>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">4. Privasi</h2>
            <p className="text-gray-600">Data pribadi Anda digunakan semata-mata untuk proses matching dan komunikasi terkait dinner. Kami tidak menjual data kepada pihak ketiga.</p>
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">5. Perilaku</h2>
            <p className="text-gray-600">Pengguna diharapkan berperilaku sopan dan menghormati sesama peserta. Pelanggaran dapat mengakibatkan penangguhan akun.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
