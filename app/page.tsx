import Canvas from '@/components/Canvas';

export default function Home() {
  return (
    <main className="flex h-screen flex-col">
      <header className="bg-gray-900 p-4 border-b border-gray-800 shrink-0">
        <h1 className="text-2xl font-bold">Solar System Music Sequencer</h1>
      </header>
      <div className="flex-1 min-h-0">
        <Canvas className="h-full" />
      </div>
    </main>
  );
}
