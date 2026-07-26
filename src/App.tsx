import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/modules/auth/Pages';
import { ResetPasswordPage } from '@/modules/auth/ResetPasswordPage';
import { ProfilPage } from '@/modules/profil/Pages';
import {
  MasterTanahListPage,
  MasterTanahTambahPage,
  MasterTanahDetailPage,
  MasterTanahDetailSlugPage
} from '@/modules/master-tanah/Pages';
import {
  TransaksiListPage,
  TransaksiTambahPage,
  TransaksiPenyatuanPage,
  TransaksiPerubahanDataPage
} from '@/modules/transaksi/Pages';
import { KelolaUserPage } from '@/modules/kelola-user/Pages';
import { BantuanPage } from '@/modules/help/Pages';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/master-tanah" replace />} />

          {/* Menu 1: Master Tanah */}
          <Route path="/master-tanah" element={<MasterTanahListPage />} />
          <Route path="/master-tanah/tambah" element={<MasterTanahTambahPage />} />
          {/* Slug link untuk halaman "Lihat Detail Sertifikat" berdasarkan Nomor Sertifikat */}
          <Route path="/master-tanah/sertifikat/:slug" element={<MasterTanahDetailSlugPage />} />
          <Route path="/master-tanah/:id" element={<MasterTanahDetailPage />} />

          {/* Menu 2: Transaksi */}
          <Route path="/transaksi" element={<TransaksiListPage />} />
          <Route path="/transaksi/tambah" element={<TransaksiTambahPage />} />
          <Route path="/transaksi/penyatuan" element={<TransaksiPenyatuanPage />} />
          <Route path="/transaksi/perubahan-data" element={<TransaksiPerubahanDataPage />} />

          {/* Menu 3: Kelola User */}
          <Route path="/kelola-user" element={<KelolaUserPage />} />

          {/* Menu 4: Pusat Bantuan */}
          <Route path="/bantuan" element={<BantuanPage />} />

          {/* Setting Profil Akun (dari AvatarMenu) */}
          <Route path="/profil" element={<ProfilPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/master-tanah" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
