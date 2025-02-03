import { useEffect, useState } from 'react'
import ResultTable from '../components/ResultTable'
import { useAPI, useConfig } from '../providers'
import { Result, ResultExtended } from '../types'
import { getStatus, niceDate } from '../utils'
import Footer from '../components/Footer'

let timeoutId: number

export default function Results() {
  const api = useAPI()
  const config = useConfig()
  const refreshTime = config.REFRESH_TIME * 1000

  const [results, setResults] = useState<ResultExtended[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [updateText, setUpdateText] = useState<string>('Never updated')
  const [paused, setPaused] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function fetchMonitors(repeat = true) {
      setLoading(true)
      let fetchedResults: Result[] = []
      try {
        fetchedResults = await api.getResults()
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        }
        console.error(err)
      }

      const results = fetchedResults.map((result) => ({
        ...result,
        statusDetails: getStatus(result.status),
        dateNice: niceDate(result.date),
      })) as ResultExtended[]

      setUpdateText(new Date().toLocaleTimeString())
      setResults(results)
      setLoading(false)

      if (!paused && repeat) {
        timeoutId = setTimeout(fetchMonitors, refreshTime)
      }
    }

    if (!paused) {
      fetchMonitors(false)
      timeoutId = setTimeout(fetchMonitors, refreshTime)
    }

    return () => clearTimeout(timeoutId)
  }, [paused, api, refreshTime])

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        {error}
      </div>
    )
  }

  if (results.length === 0 && !loading) {
    return (
      <div className="alert alert-light" role="alert">
        No results yet, no monitors have been run 😔
      </div>
    )
  }

  return (
    <>
      <ResultTable results={results} />
      <Footer refreshTime={refreshTime} loading={loading} updateText={updateText} paused={paused} setPaused={setPaused} />
    </>
  )
}
