/**
 * User avatar: shows the uploaded photo when present, otherwise a colored
 * circle with the first initial. Shared by Profile and Battle so partners
 * see each other's photos.
 */
export default function Avatar({ url, color = '#cbfb45', name = '', size = 56, className = '' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  const dim = { width: size, height: size }

  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name}'s avatar` : 'avatar'}
        style={dim}
        className={`rounded-full object-cover ring-1 ring-white/10 ${className}`}
        loading="lazy"
      />
    )
  }

  return (
    <div
      style={{ ...dim, backgroundColor: color }}
      className={`flex items-center justify-center rounded-full font-bold text-surface ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initial}</span>
    </div>
  )
}
