import { useState } from 'react'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'

export default function AssignmentForm({ courseId, onSuccess, onCancel }) {
  const [step, setStep] = useState(1) // 1: Assignment Info, 2: Questions
  const [assignmentId, setAssignmentId] = useState(null)
  
  const [info, setInfo] = useState({
    title: '',
    description: '',
    pass_percentage: 60,
    time_limit_minutes: 30,
    auto_certificate: true
  })

  const [questions, setQuestions] = useState([
    { text: '', explanation: '', marks: 1, choices: [
      { text: '', is_correct: true },
      { text: '', is_correct: false }
    ]}
  ])

  const [loading, setLoading] = useState(false)

  const createAssignment = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/assignments/', { ...info, course: courseId })
      setAssignmentId(data.id)
      setStep(2)
      toast.success('Basic info saved! Now add questions.')
    } catch (err) {
      toast.error('Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  const addQuestionField = () => {
    setQuestions([...questions, { text: '', explanation: '', marks: 1, choices: [
      { text: '', is_correct: true },
      { text: '', is_correct: false }
    ]}])
  }

  const removeQuestionField = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx))
  }

  const updateQuestion = (idx, field, value) => {
    const newQs = [...questions]
    newQs[idx][field] = value
    setQuestions(newQs)
  }

  const updateChoice = (qIdx, cIdx, field, value) => {
    const newQs = [...questions]
    if (field === 'is_correct' && value === true) {
      // Set others to false (only one correct answer for now)
      newQs[qIdx].choices.forEach((c, i) => c.is_correct = (i === cIdx))
    } else {
      newQs[qIdx].choices[cIdx][field] = value
    }
    setQuestions(newQs)
  }

  const addChoice = (qIdx) => {
    const newQs = [...questions]
    newQs[qIdx].choices.push({ text: '', is_correct: false })
    setQuestions(newQs)
  }

  const removeChoice = (qIdx, cIdx) => {
    const newQs = [...questions]
    newQs[qIdx].choices = newQs[qIdx].choices.filter((_, i) => i !== cIdx)
    setQuestions(newQs)
  }

  const saveQuestions = async () => {
    setLoading(true)
    try {
      // Save questions sequentially
      for (const q of questions) {
        await api.post(`/assignments/${assignmentId}/add_question/`, q)
      }
      toast.success('Assignment created with questions! 🎉')
      onSuccess()
    } catch (err) {
      toast.error('Failed to save questions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl my-8 animate-slide-up shadow-xl border border-gray-100">
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-navy-500">
            {step === 1 ? 'Step 1: Assignment Details' : 'Step 2: MCQ Questions'}
          </h3>
          <div className="flex gap-1.5">
            <div className={`w-8 h-1.5 rounded-full ${step >= 1 ? 'bg-gold-500' : 'bg-gray-200'}`} />
            <div className={`w-8 h-1.5 rounded-full ${step >= 2 ? 'bg-gold-500' : 'bg-gray-200'}`} />
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={createAssignment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input 
                placeholder="e.g. Final MCQ Test" required className="input" 
                value={info.title} onChange={e => setInfo({...info, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                placeholder="Instructions for students" rows={3} className="input resize-none" 
                value={info.description} onChange={e => setInfo({...info, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pass %</label>
                <input 
                  type="number" min="0" max="100" required className="input" 
                  value={info.pass_percentage} onChange={e => setInfo({...info, pass_percentage: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (Min)</label>
                <input 
                  type="number" min="0" required className="input" 
                  value={info.time_limit_minutes} onChange={e => setInfo({...info, time_limit_minutes: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="btn-primary flex-1 py-3" disabled={loading}>
                Next: Add Questions →
              </button>
              <button type="button" onClick={onCancel} className="btn-outline flex-1 py-3">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 bg-navy-50/50 rounded-xl border border-navy-100 relative">
                  <button 
                    onClick={() => removeQuestionField(qIdx)}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                  
                  <div className="space-y-3">
                    <input 
                      placeholder={`Question ${qIdx + 1} text...`} required className="input bg-white" 
                      value={q.text} onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                    />
                    
                    <div className="grid grid-cols-1 gap-2">
                       {q.choices.map((c, cIdx) => (
                         <div key={cIdx} className="flex gap-2 items-center">
                            <button 
                              onClick={() => updateChoice(qIdx, cIdx, 'is_correct', !c.is_correct)}
                              className={`p-2 rounded-lg transition ${c.is_correct ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <input 
                              placeholder={`Choice ${cIdx + 1}`} className="input bg-white flex-1" 
                              value={c.text} onChange={e => updateChoice(qIdx, cIdx, 'text', e.target.value)}
                            />
                            {q.choices.length > 2 && (
                               <button onClick={() => removeChoice(qIdx, cIdx)} className="text-red-400 p-2"><Trash2 size={14} /></button>
                            )}
                         </div>
                       ))}
                       <button 
                        onClick={() => addChoice(qIdx)}
                        className="text-xs text-navy-500 font-bold flex items-center gap-1 hover:underline mt-1 ml-10"
                       >
                         <Plus size={12} /> Add Choice
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={addQuestionField}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-navy-200 text-navy-500 font-bold rounded-xl hover:bg-navy-50 transition"
            >
              <Plus size={18} /> Add Another Question
            </button>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button 
                onClick={saveQuestions} 
                className="btn-primary flex-1 py-3" 
                disabled={loading || questions.length === 0}
              >
                {loading ? 'Publishing…' : 'Publish Assignment 🎉'}
              </button>
              <button type="button" onClick={onCancel} className="btn-outline flex-1 py-3">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
