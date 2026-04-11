import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import api from '../api/axios.js'
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

export default function Results() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/results/')
      .then(r => setResults(r.data.results || r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout title="My Results">
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <TrendingUp size={44} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No submissions yet</p>
          <p className="text-sm mt-1">Complete an assignment to see your results here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map(r => {
            const passed = r.status === 'passed'
            const pct = parseFloat(r.percentage).toFixed(1)
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {passed
                      ? <CheckCircle size={28} className="text-green-500 flex-shrink-0" />
                      : <XCircle size={28} className="text-red-400 flex-shrink-0" />
                    }
                    <div>
                      <h4 className="font-bold text-navy-500">{r.assignment_title}</h4>
                      <p className="text-gray-400 text-sm">{r.course_title}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-extrabold ${passed ? 'text-green-600' : 'text-red-500'}`}>
                      {pct}%
                    </div>
                    <div className="text-xs text-gray-400">{r.score} / {r.total_marks}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      passed ? 'bg-green-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {Math.round(r.time_taken_seconds / 60)}min taken
                  </span>
                  <span>
                    Submitted {new Date(r.submitted_at).toLocaleDateString()}
                  </span>
                  {r.has_certificate && (
                    <span className="badge-gold flex items-center gap-1">
                      🏆 Certificate earned
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
