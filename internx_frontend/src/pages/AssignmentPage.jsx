import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import { Clock, ChevronRight, CheckCircle, XCircle } from 'lucide-react'

export default function AssignmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState(null)
  const [answers, setAnswers] = useState({}) // { question_id: choice_id }
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    api.get(`/assignments/${id}/`)
      .then(r => {
        setAssignment(r.data)
        if (r.data.time_limit_minutes > 0) {
          setTimeLeft(r.data.time_limit_minutes * 60)
        }
      })
      .catch(() => toast.error('Failed to load assignment'))
      .finally(() => setLoading(false))
  }, [id])

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, result])

  const selectAnswer = (questionId, choiceId) => {
    if (result) return
    setAnswers(prev => ({ ...prev, [questionId]: choiceId }))
  }

  const handleSubmit = useCallback(async () => {
    if (submitting || result) return
    setSubmitting(true)
    const payload = {
      answers: Object.entries(answers).map(([q, c]) => ({
        question_id: parseInt(q),
        choice_id: parseInt(c),
      })),
      time_taken_seconds: Math.round((Date.now() - startTime) / 1000),
    }
    try {
      const { data } = await api.post(`/assignments/${id}/submit/`, payload)
      setResult(data)
      if (data.status === 'passed') {
        toast.success('You passed! 🎉 Your certificate is being generated.')
      } else {
        toast.error('You did not pass. Better luck next time.')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }, [answers, id, startTime, submitting, result])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (loading) return (
    <Layout title="Assignment">
      <div className="flex items-center justify-center h-60">
        <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  )

  // Result view
  if (result) {
    const pct = parseFloat(result.percentage).toFixed(1)
    const passed = result.status === 'passed'
    return (
      <Layout title="Result">
        <div className="max-w-2xl mx-auto">
          {/* Result card */}
          <div className={`rounded-2xl p-8 text-center mb-6 ${
            passed ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
          }`}>
            {passed
              ? <CheckCircle size={56} className="mx-auto text-green-500 mb-3" />
              : <XCircle size={56} className="mx-auto text-red-400 mb-3" />
            }
            <h2 className={`text-3xl font-extrabold mb-1 ${passed ? 'text-green-700' : 'text-red-600'}`}>
              {passed ? '🎉 Passed!' : '😔 Not Passed'}
            </h2>
            <p className="text-gray-500 mb-4">{result.assignment_title}</p>
            <div className="text-5xl font-black text-navy-500 mb-1">{pct}%</div>
            <p className="text-gray-400 text-sm">{result.score} / {result.total_marks} marks</p>
            {passed && (
              <p className="mt-4 text-green-600 text-sm font-medium">
                🏆 Your certificate is being generated and will be emailed to you!
              </p>
            )}
          </div>

          {/* Answer review */}
          <div className="card p-5">
            <h3 className="font-bold text-navy-500 mb-4">Answer Review</h3>
            <div className="space-y-4">
              {result.answers?.map((a, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border ${
                    a.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <p className="font-medium text-sm text-gray-800 mb-2">Q{i + 1}: {a.question_text}</p>
                  <p className="text-sm text-gray-600">
                    Your answer: <span className="font-medium">{a.selected_choice_text || 'Not answered'}</span>
                    {!a.is_correct && (
                      <span className="text-green-600"> → Correct: <strong>{a.correct_choice_text}</strong></span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => navigate('/results')} className="btn-outline flex-1">
              View All Results
            </button>
            {passed && (
              <button onClick={() => navigate('/certificates')} className="btn-gold flex-1">
                🏆 My Certificate
              </button>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // MCQ view
  const questions = assignment?.questions || []
  const answered = Object.keys(answers).length

  return (
    <Layout title={assignment?.title}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="card p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-navy-500">{assignment?.title}</p>
            <p className="text-xs text-gray-400">
              {answered} / {questions.length} answered · Pass: {assignment?.pass_percentage}%
            </p>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 font-mono font-bold text-lg px-4 py-2 rounded-xl ${
              timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-navy-50 text-navy-500'
            }`}>
              <Clock size={16} />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-5 mb-6">
          {questions.map((q, qi) => (
            <div key={q.id} className="card p-5">
              <p className="font-semibold text-gray-800 mb-4">
                <span className="text-navy-400 font-bold mr-2">Q{qi + 1}.</span>
                {q.text}
              </p>
              <div className="space-y-2">
                {q.choices.map(choice => {
                  const selected = answers[q.id] === choice.id
                  return (
                    <button
                      key={choice.id}
                      onClick={() => selectAnswer(q.id, choice.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-3 ${
                        selected
                          ? 'border-navy-500 bg-navy-50 text-navy-700'
                          : 'border-gray-200 hover:border-navy-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selected ? 'border-navy-500 bg-navy-500' : 'border-gray-300'
                      }`}>
                        {selected && <span className="w-2 h-2 bg-white rounded-full" />}
                      </span>
                      {choice.text}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || answered === 0}
          className="btn-gold w-full py-4 text-base font-bold flex items-center justify-center gap-2"
        >
          {submitting
            ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
            : <><ChevronRight size={20} /> Submit Assignment ({answered}/{questions.length})</>
          }
        </button>
      </div>
    </Layout>
  )
}
