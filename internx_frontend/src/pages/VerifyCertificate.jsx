import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios.js'
import { CheckCircle, XCircle, GraduationCap, Award } from 'lucide-react'

export default function VerifyCertificate() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get(`/certificates/verify/${id}/`)
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 to-navy-700 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <GraduationCap size={36} className="text-gold-400" />
            <span className="text-4xl font-extrabold text-white">InternX</span>
          </div>
          <p className="text-navy-200 mt-1">Certificate Verification</p>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <XCircle size={52} className="mx-auto text-red-400 mb-3" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Certificate Not Found</h2>
              <p className="text-gray-500 text-sm">
                This certificate ID is invalid or does not exist in our system.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-navy-500 to-navy-700 p-6 text-center text-white">
                <CheckCircle size={44} className="mx-auto text-green-400 mb-2" />
                <h2 className="text-xl font-bold">Certificate Verified ✓</h2>
                <p className="text-navy-200 text-sm mt-1">This is an authentic InternX certificate</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Award size={20} className="text-gold-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Certificate Holder</p>
                    <p className="font-bold text-gray-800">{data.student_name}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Course Completed</p>
                  <p className="font-bold text-navy-500">{data.course_title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Issued On</p>
                    <p className="font-semibold text-gray-700 text-sm">{data.issued_at}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Certificate ID</p>
                    <p className="font-mono text-xs text-gray-600 break-all">{data.certificate_id}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1 text-green-600 text-sm font-medium pt-2">
                  <CheckCircle size={16} />
                  Issued by InternX AI Learning Platform
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
