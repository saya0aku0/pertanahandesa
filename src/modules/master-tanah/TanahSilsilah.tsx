import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnakBidang } from './tanah.service';
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
      </button>
      {node.anak.map((child) => (
        <NodeView key={child.tanah.id} node={child} level={level + 1} />
      ))}
    </div>
  );
}

/** Pohon silsilah pemecahan lahan untuk satu bidang tanah (§3, §10.1) */
export function TanahSilsilah({ tanah }: TanahSilsilahProps) {
  const [tree, setTree] = useState<SilsilahNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buildTree(tanah).then((t) => {
      setTree(t);
      setLoading(false);
    });
  }, [tanah]);

  if (loading) return <LoadingSpinner label="Memuat silsilah..." />;
  if (!tree || tree.anak.length === 0) {
    return <p className="text-sm text-gray-500">Bidang ini belum pernah dipecah.</p>;
  }

  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">Silsilah Pemecahan Lahan</h3>
      <NodeView node={tree} level={0} />
    </div>
  );
}
