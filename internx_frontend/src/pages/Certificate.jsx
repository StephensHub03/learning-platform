import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import { Award, Download, ExternalLink } from 'lucide-react'

export default function Certificate() {
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/certificates/')
      .then(r => setCerts(r.data.results || r.data))
      .catch(() => toast.error('Failed to load certificates'))
      .finally(() => setLoading(false))
  }, [])

  const download = async (cert) => {
    try {
      const response = await api.get(
        `/certificates/${cert.certificate_id}/download/`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `InternX_Certificate_${cert.certificate_id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Certificate downloaded! 🎓')
    } catch {
      toast.error('Download failed. Certificate may still be generating.')
    }
  }

  return (
    <Layout title="My Certificates">
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certs.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Award size={52} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-lg">No certificates yet</p>
          <p className="text-sm mt-1">Complete a course assignment to earn your certificate</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {certs.map(cert => (
            <div
              key={cert.id}
              className="card overflow-hidden border-l-4 border-l-gold-500"
            >
              {/* Certificate header */}
              <div className="bg-gradient-to-r from-navy-500 to-navy-700 p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={20} className="text-gold-400" />
                  <span className="text-gold-400 font-bold text-sm uppercase tracking-wider">
                    Certificate of Completion
                  </span>
                </div>
                <h3 className="font-bold text-lg leading-tight">{cert.course_title}</h3>
              </div>

              <div className="p-5">
                <p className="text-gray-500 text-sm mb-1">
                  Issued to: <span className="font-semibold text-gray-700">{cert.student_name}</span>
                </p>
                <p className="text-gray-500 text-sm mb-3">
                  Issued on: <span className="font-medium">{new Date(cert.issued_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
                <p className="text-xs text-gray-400 font-mono mb-4 break-all">
                  ID: {cert.certificate_id}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => download(cert)}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2"
                  >
                    <Download size={15} /> Download PDF
                  </button>
                  <a
                    href={cert.verification_url} target="_blank" rel="noopener noreferrer"
                    className="btn-outline flex items-center gap-2 text-sm py-2 px-3"
                    title="Verify Certificate"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
