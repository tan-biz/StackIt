/**
 * Unified full-page loading screen matching the Dashboard design.
 *
 * Two variants:
 *  - **fullscreen** (default): centers vertically across the entire viewport.
 *  - **inline**: fits inside an existing card / section without min-h-screen.
 */
export default function LoadingScreen({ inline = false }: { inline?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${inline ? 'p-8' : 'min-h-screen'}`}>
      <div className="text-center animate-fade-in">
        <div className="font-display mb-4 text-5xl">
          <span className="text-gradient">Stack</span>
          <span className="text-accent">It</span>
        </div>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
