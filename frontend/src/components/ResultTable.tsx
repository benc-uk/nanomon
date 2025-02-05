import { ResultExtended } from '../types'
import StatusPill from './StatusPill'

export default function ResultTable({ results }: { results: ResultExtended[] }) {
  return (
    <table className="table table-hover">
      <thead className="table-primary">
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Status</th>
          <th scope="col">Value</th>
          <th scope="col">Message</th>
          <th scope="col">Output</th>
        </tr>
      </thead>
      <tbody>
        {results.map((result) => (
          <tr key={result.monitor_id + result.date}>
            <td className={result.statusDetails.class}>{result.dateNice}</td>
            <td className={result.statusDetails.class}>
              <StatusPill statusCode={result.status} />
            </td>
            <td className={result.statusDetails.class}>{result.value}</td>
            <td className={result.statusDetails.class}>{result.message}</td>
            <td className={result.statusDetails.class}>
              <details className={result.outputs ? '' : 'd-none'}>
                <summary>Click to see output</summary>
                <ul className="table-outs">
                  {Object.entries(result.outputs || {}).map(([key, value]) => {
                    // Guard against objects, arrays etc
                    if (typeof value === 'object' || Array.isArray(value)) {
                      value = JSON.stringify(value)
                    }

                    return (
                      <li key={key}>
                        <strong>{key}:</strong> {value}
                      </li>
                    )
                  })}
                </ul>
              </details>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
