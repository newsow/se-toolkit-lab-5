import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import './App.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
)

interface Lab {
  id: number
  title: string
}

interface ScoreBucket {
  bucket: string
  count: number
}

interface ScoresResponse {
  lab_id: number
  buckets: ScoreBucket[]
}

interface TimelineEntry {
  date: string
  submissions: number
}

interface TimelineResponse {
  lab_id: number
  timeline: TimelineEntry[]
}

interface TaskPassRate {
  task_id: number
  task_title: string
  pass_rate: number
}

interface PassRatesResponse {
  lab_id: number
  tasks: TaskPassRate[]
}

interface DashboardData {
  scores: ScoresResponse | null
  timeline: TimelineResponse | null
  passRates: PassRatesResponse | null
  labs: Lab[]
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: DashboardData }
  | { status: 'error'; message: string }

type FetchAction =
  | { type: 'fetch_start' }
  | { type: 'fetch_success'; data: DashboardData }
  | { type: 'fetch_error'; message: string }

const STORAGE_KEY = 'api_key'

function Dashboard() {
  const [token] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)
  const [state, setState] = useState<FetchState>({ status: 'idle' })

  useEffect(() => {
    if (!token) {
      setState({ status: 'idle' })
      return
    }

    async function fetchLabs(): Promise<Lab[]> {
      const res = await fetch('/items/', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const items: { id: number; type: string; title: string }[] = await res.json()
      return items
        .filter((item) => item.type === 'lab')
        .map((item) => ({ id: item.id, title: item.title }))
    }

    async function fetchDashboardData(labId: number): Promise<{
      scores: ScoresResponse
      timeline: TimelineResponse
      passRates: PassRatesResponse
    }> {
      const [scoresRes, timelineRes, passRatesRes] = await Promise.all([
        fetch(`/analytics/scores?lab=${labId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/analytics/timeline?lab=${labId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/analytics/pass-rates?lab=${labId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!scoresRes.ok) throw new Error(`Scores: HTTP ${scoresRes.status}`)
      if (!timelineRes.ok) throw new Error(`Timeline: HTTP ${timelineRes.status}`)
      if (!passRatesRes.ok) throw new Error(`Pass rates: HTTP ${passRatesRes.status}`)

      const [scores, timeline, passRates] = await Promise.all([
        scoresRes.json() as Promise<ScoresResponse>,
        timelineRes.json() as Promise<TimelineResponse>,
        passRatesRes.json() as Promise<PassRatesResponse>,
      ])

      return { scores, timeline, passRates }
    }

    async function loadData() {
      setState({ status: 'loading' })
      try {
        const labs = await fetchLabs()
        if (labs.length === 0) {
          setState({
            status: 'success',
            data: { scores: null, timeline: null, passRates: null, labs },
          })
          return
        }

        const labId = selectedLabId ?? labs[0].id
        if (selectedLabId === null) {
          setSelectedLabId(labId)
        }

        const { scores, timeline, passRates } = await fetchDashboardData(labId)
        setState({
          status: 'success',
          data: { scores, timeline, passRates, labs },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setState({ status: 'error', message })
      }
    }

    loadData()
  }, [token, selectedLabId])

  function handleLabChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const labId = Number(e.target.value)
    setSelectedLabId(labId)
  }

  if (!token) {
    return (
      <div className="token-form">
        <h1>Dashboard</h1>
        <p>Please enter your API key in the main app to view the dashboard.</p>
      </div>
    )
  }

  if (state.status === 'loading') {
    return <p>Loading...</p>
  }

  if (state.status === 'error') {
    return <p>Error: {state.message}</p>
  }

  if (state.status === 'success' && state.data.labs.length === 0) {
    return <p>No labs available.</p>
  }

  if (state.status !== 'success') {
    return null
  }

  const { scores, timeline, passRates, labs } = state.data

  const scoreChartData = scores
    ? {
        labels: scores.buckets.map((b) => b.bucket),
        datasets: [
          {
            label: 'Students',
            data: scores.buckets.map((b) => b.count),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      }
    : null

  const timelineChartData = timeline
    ? {
        labels: timeline.timeline.map((t) => t.date),
        datasets: [
          {
            label: 'Submissions',
            data: timeline.timeline.map((t) => t.submissions),
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
          },
        ],
      }
    : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  }

  return (
    <div>
      <header className="app-header">
        <h1>Dashboard</h1>
        <select value={selectedLabId ?? ''} onChange={handleLabChange}>
          {labs.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.title}
            </option>
          ))}
        </select>
      </header>

      <div className="dashboard-grid">
        <section className="chart-section">
          <h2>Score Buckets</h2>
          {scoreChartData ? (
            <div style={{ height: '300px' }}>
              <Bar data={scoreChartData} options={chartOptions} />
            </div>
          ) : (
            <p>No score data available.</p>
          )}
        </section>

        <section className="chart-section">
          <h2>Submissions Per Day</h2>
          {timelineChartData ? (
            <div style={{ height: '300px' }}>
              <Line data={timelineChartData} options={chartOptions} />
            </div>
          ) : (
            <p>No timeline data available.</p>
          )}
        </section>

        <section className="table-section">
          <h2>Pass Rates Per Task</h2>
          {passRates && passRates.tasks.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {passRates.tasks.map((task) => (
                  <tr key={task.task_id}>
                    <td>{task.task_title}</td>
                    <td>{(task.pass_rate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No pass rate data available.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
