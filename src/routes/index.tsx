import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="flex items-center justify-center py-20">
      <main>
        <header className="space-y-1 text-left">
          <h1 className="text-xl font-bold">Slik OJK Analysis</h1>
          <p className="text-center text-gray-500">
            Aplikasi untuk menganalisis data OJK
          </p>
        </header>
      </main>
    </main>
  )
}
