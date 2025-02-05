import { niceDate } from '../utils'

type FooterProps = {
  refreshTime: number
  loading: boolean
  updated: Date
  paused: boolean

  setPaused: (paused: boolean) => void
}

export default function Footer({ refreshTime, loading, updated, paused, setPaused }: FooterProps) {
  return (
    <div className="footer bg-primary text-light p-2 fixed-bottom d-flex justify-content-between">
      <div>
        {loading && (
          <>
            <div className="spinner-border spinner-border-sm text-info" role="status"></div> Refreshing...
          </>
        )}
        {!loading && (updated ? `🕒 ${niceDate(updated.toISOString())}` : 'Never')}
      </div>
      <a
        className={`fs-6 px-3 navbtn-user ${paused ? 'bg-dark' : ''}`}
        type="button"
        onClick={paused ? () => setPaused(false) : () => setPaused(true)}
      >
        {paused ? 'Update paused' : `Update: ${refreshTime / 1000} secs`}
      </a>
    </div>
  )
}
