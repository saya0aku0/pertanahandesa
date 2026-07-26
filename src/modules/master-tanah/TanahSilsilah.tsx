import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnakBidang, getBidangSumberGabungan, getTanah } from './tanah.service';
import { Tanah } from './tanah.types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface TanahSilsilahProps {
  tanah: Tanah;
}

interface SilsilahNode {
  tanah: Tanah;
  anak: SilsilahNode[];
}

async function buildTree(root: Tanah, depth = 0): Promise<SilsilahNode> {
  if (depth > 5) return { tanah: root, anak: [] }; // batas kedalaman, jaga-jaga hemat read
  const anakList = await getAnakBidang(root.id);
  const anak = await Promise.all(anakList.map((a) => buildTree(a, depth + 1)));
  return { tanah: root, anak };
}

function NodeView({ node, level }: { node: SilsilahNode; level: number }) {
  const navigate = useNavigate();
  return (
    <div style={{ marginLeft: level * 20 }} className="mt-2">
      <button
        onClick={() => navigate(`/master-tanah/${node.tanah.id}`)}
        className="text-left bg-white border rounded-lg px-3 py-2 text-sm hover:bg-primary-50 min-h-[44px] w-full md:w-auto"
      >
        <span className="font-medium">{node.tanah.nomorSertifikat}</span>
        <span className="text-gray-500"> — {node.tanah.pemilikSaatIni}</span>
        {node.tanah.statusGabung === 'sudah-digabung' && (
          <span className="ml-2 text-xs text-amber-600">(sudah digabung)</span>
        )}
      </button>
      {node.anak.map((child) => (
        <NodeView key={child.tanah.id} node={child} level={level + 1} />
      ))}
    </div>
  );
}

/** Pohon silsilah pemecahan & penyatuan lahan untuk satu bidang tanah (§3, §10.1) */
export function TanahSilsilah({ tanah }: TanahSilsilahProps) {
  const [tree, setTree] = useState<SilsilahNode | null>(null);
  const [loading, setLoading] = useState(true);

  const [sumberGabungan, setSumberGabungan] = useState<Tanah[]>([]);
  const [bidangHasilGabungan, setBidangHasilGabungan] = useState<Tanah | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      buildTree(tanah),
      getBidangSumberGabungan(tanah.id),
      tanah.mergedIntoTanahId ? getTanah(tanah.mergedIntoTanahId) : Promise.resolve(null)
    ]).then(([t, sumber, hasilGabungan]) => {
      setTree(t);
      setSumberGabungan(sumber);
      setBidangHasilGabungan(hasilGabungan);
      setLoading(false);
    });
  }, [tanah]);

  if (loading) return <LoadingSpinner label="Memuat silsilah..." />;

  const punyaAnak = tree && tree.anak.length > 0;
  const punyaSumberGabungan = sumberGabungan.length > 0;
  const sudahDigabung = tanah.statusGabung === 'sudah-digabung' && bidangHasilGabungan;

  if (!punyaAnak && !punyaSumberGabungan && !sudahDigabung) {
    return (
      <p className="text-sm text-gray-500">
        Bidang ini belum pernah dipecah, digabung, atau menjadi bagian penyatuan lahan.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sudahDigabung && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-amber-800 mb-1">⚠️ Bidang ini sudah digabung</p>
          <p className="text-amber-700">
            Data ini diarsipkan sebagai bagian dari riwayat. Pemilik saat ini sudah pindah ke bidang
            gabungan:
          </p>
          <button
            onClick={() => navigate(`/master-tanah/${bidangHasilGabungan!.id}`)}
            className="mt-2 text-left bg-white border rounded-lg px-3 py-2 text-sm hover:bg-amber-100 min-h-[44px] w-full md:w-auto"
          >
            <span className="font-medium">{bidangHasilGabungan!.nomorSertifikat}</span>
            <span className="text-gray-500"> — {bidangHasilGabungan!.pemilikSaatIni}</span>
          </button>
        </div>
      )}

      {punyaSumberGabungan && (
        <div>
          <h3 className="font-semibold text-sm mb-2">
            Hasil Penyatuan dari {sumberGabungan.length} Bidang Sumber
          </h3>
          <div className="space-y-2">
            {sumberGabungan.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/master-tanah/${s.id}`)}
                className="text-left bg-white border rounded-lg px-3 py-2 text-sm hover:bg-primary-50 min-h-[44px] w-full block"
              >
                <span className="font-medium">{s.nomorSertifikat}</span>
                <span className="text-gray-500"> — {s.luas.toLocaleString('id-ID')} m² — {s.pemilikSaatIni}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {punyaAnak && tree && (
        <div>
          <h3 className="font-semibold text-sm mb-2">Silsilah Pemecahan Lahan</h3>
          <NodeView node={tree} level={0} />
        </div>
      )}
    </div>
  );
}
