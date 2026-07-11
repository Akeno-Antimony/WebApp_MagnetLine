import Simulation from '@/components/Simulation';

export default function Page() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b', padding: '40px' }}>
      <div>
        <h1 style={{ color: '#fff', fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>
          リアルタイム 2D磁力線シミュレーター
        </h1>
        <Simulation />
      </div>
    </main>
  );
}
