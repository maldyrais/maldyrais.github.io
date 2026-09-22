export default function PageLoader({ label = 'Memuat halaman' }) {
  return (
    <div
      className="page-loader"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="page-loader-visual" aria-hidden="true">
        <span className="page-loader-ring" />
        <span className="page-loader-dot" />

        <img
          src="/favicon.png"
          alt=""
          className="page-loader-mark"
          draggable="false"
        />
      </div>

      <div className="page-loader-copy">
        <strong>Maldy Rais</strong>
        <span>{label}</span>
        <small>読み込み中</small>
      </div>

      <span className="page-loader-track" aria-hidden="true">
        <span />
      </span>
    </div>
  )
}