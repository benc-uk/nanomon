type FooterProps = {
  refreshTime: number
  loading: boolean
  updateText: string
  paused: boolean

  setPaused: (paused: boolean) => void
}

export default function Footer({ refreshTime, loading, updateText, paused, setPaused }: FooterProps) {
  return (
    <div className="footer text-muted">
      {loading && (
        <div className="spinner-border spinner-border-sm text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      )}
      <span>🕒 {updateText}</span>
      &mdash; <span>{paused ? 'Auto update paused' : `Auto update every ${refreshTime / 1000} seconds`}</span> &mdash;
      <a className="badge rounded-pill text-bg-light" type="button" onClick={paused ? () => setPaused(false) : () => setPaused(true)}>
        {paused ? 'UNPAUSE' : 'PAUSE'}
      </a>
    </div>
  )
}
